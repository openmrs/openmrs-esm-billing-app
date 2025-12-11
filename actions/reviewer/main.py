import os
import sys
import logging
import re
import json
import javalang
import esprima
from typing import Any, Dict, List, Optional, Tuple, Union
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get environment variables
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN') or os.environ.get('INPUT_GITHUB_TOKEN')
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
REPO_NAME = os.environ.get('GITHUB_REPOSITORY')
PR_NUMBER = int(os.environ.get('INPUT_PR_NUMBER', 0))

if not all([GITHUB_TOKEN, GOOGLE_API_KEY, REPO_NAME, PR_NUMBER]):
    logger.error("Missing required environment variables")
    logger.error(f"GITHUB_TOKEN: {'Set' if GITHUB_TOKEN else 'Missing'}")
    logger.error(f"GOOGLE_API_KEY: {'Set' if GOOGLE_API_KEY else 'Missing'}")
    logger.error(f"REPO_NAME: {REPO_NAME or 'Missing'}")
    logger.error(f"PR_NUMBER: {PR_NUMBER or 'Missing'}")
    sys.exit(1)

try:
    from github import Github
    from google.generativeai import configure, GenerativeModel
    from google.generativeai.types import GenerationConfig
    
    # Configure Google's Generative AI
    configure(api_key=GOOGLE_API_KEY)
    
    # Initialize GitHub client
    g = Github(GITHUB_TOKEN)
    
    # Initialize Gemini model
    model = GenerativeModel('gemini-2.5-flash')
    generation_config = GenerationConfig(
        temperature=0.2,
        top_p=0.95,
        top_k=40,
        max_output_tokens=8192,
    )
    
except ImportError as e:
    logger.error(f"Failed to import required packages: {e}")
    logger.error("Please make sure all dependencies are installed from requirements.txt")
    sys.exit(1)

# Define a simple tool decorator if not available
if 'tool' not in globals():
    def tool(func):
        """Simple decorator to mark functions as tools"""
        func.is_tool = True
        return func

# Initialize Google's Generative AI
model = None
try:
    from google.generativeai import configure, GenerativeModel
    configure(api_key=GOOGLE_API_KEY)
    model = GenerativeModel('gemini-2.5-flash')
    logger.info("Successfully initialized Gemini model")
except ImportError as e:
    logger.error(f"Failed to initialize Google's Generative AI: {e}")
    logger.warning("Code review will proceed without AI capabilities")

try:
    from github import Github
except ImportError as e:
    logger.error("Failed to import PyGithub. Make sure it's installed.")
    raise

# --- Inputs from GitHub Action Environment ---
GITHUB_TOKEN = os.environ.get("INPUT_GITHUB_TOKEN")
REPO_NAME = os.environ.get("GITHUB_REPOSITORY")
PR_NUMBER = int(os.environ.get("INPUT_PR_NUMBER", 0))

g = Github(GITHUB_TOKEN)

# --- Define Tools ---
@tool
def get_pr_diff() -> Dict[str, Any]:
    """Fetches the diff for the current PR with file contents and detects project type."""
    repo = g.get_repo(REPO_NAME)
    pr = repo.get_pull(PR_NUMBER)
    files = pr.get_files()
    
    # Get all file paths for project type detection
    all_files = [file.filename for file in files]
    project_type = detect_project_type(all_files)
    
    pr_data = {
        'title': pr.title,
        'description': pr.body or '',
        'project_type': project_type,
        'files': {}
    }
    
    for file in files:
        # Skip binary files and large files (>1MB)
        if file.size > 1024 * 1024:  # 1MB
            continue
            
        try:
            # Get file contents for analysis
            file_content = repo.get_contents(file.filename, ref=pr.head.sha).decoded_content.decode('utf-8')
            
            # Analyze the file based on project type
            issues = analyze_file(file.filename, file_content, pr_data['project_type'])
            
            pr_data['files'][file.filename] = {
                'status': file.status,
                'additions': file.additions,
                'deletions': file.deletions,
                'changes': file.changes,
                'patch': file.patch or '',
                'issues': issues
            }
            
        except Exception as e:
            logging.warning(f"Could not analyze {file.filename}: {str(e)}")
            continue
    
    return pr_data

def format_issue(issue: Dict, file_path: str, line_offset: int = 0) -> str:
    """Format an issue as a GitHub comment."""
    line = issue.get('line', 1) + line_offset
    return (
        f"### {issue['severity'].upper()}: {issue.get('message', 'Issue found')}\n"
        f"**File:** `{file_path}` (line {line})\n"
        f"**Rule:** {issue.get('rule_id', 'N/A')}\n"
        "\n---\n"
    )

@tool
def post_review_comment(comment: str, file_path: str, line: int, issue_id: str = None) -> str:
    """Posts a review comment to the current PR.
    
    Args:
        comment: The comment text to post
        file_path: The path to the file being commented on
        line: The line number in the file to comment on
        issue_id: Optional issue ID to group related comments
    """
    repo = g.get_repo(REPO_NAME)
    pr = repo.get_pull(PR_NUMBER)
    
    # Create a pull request review
    pr.create_review_comment(
        body=comment,
        commit=pr.head.sha,
        path=file_path,
        line=line
    )
    
    return f"Comment posted to {file_path} on line {line}"

def generate_review_summary(pr_data: Dict) -> str:
    """Generate a summary of the code review findings."""
    project_type = pr_data.get('project_type', 'unknown')
    project_type_name = 'OpenMRS Frontend (O3)' if project_type == 'frontend' else 'OpenMRS Backend (Java)'
    
    total_issues = 0
    error_count = 0
    warning_count = 0
    info_count = 0
    
    # Count issues by severity
    for file_data in pr_data['files'].values():
        for issue in file_data.get('issues', []):
            total_issues += 1
            if issue['severity'] == 'error':
                error_count += 1
            elif issue['severity'] == 'warning':
                warning_count += 1
            else:
                info_count += 1
    
    # Generate summary markdown
    summary = [
        "# OpenMRS Code Review Report\n",
        f"## PR: {pr_data['title']}\n",
        f"## Project Type: {project_type_name}\n",
        "## Summary\n",
        f"- :x: **Errors:** {error_count}",
        f"- :warning: **Warnings:** {warning_count}",
        f"- :information_source: **Suggestions:** {info_count}\n",
        "---\n"
    ]
    
    # Add details for each file
    for file_path, file_data in pr_data['files'].items():
        if not file_data.get('issues'):
            continue
            
        summary.append(f"## File: `{file_path}`\n")
        
        # Group issues by line number
        issues_by_line = {}
        for issue in file_data['issues']:
            line = issue.get('line', 1)
            if line not in issues_by_line:
                issues_by_line[line] = []
            issues_by_line[line].append(issue)
        
        # Add issues for each line
        for line, issues in sorted(issues_by_line.items()):
            summary.append(f"### Line {line}\n")
            for issue in issues:
                summary.append(format_issue(issue, file_path))
    
    return "\n".join(summary)

# --- OpenMRS Code Review Rules ---

# Common rules for all files
COMMON_RULES = [
    {
        'id': 'license-header',
        'description': 'Files should include the OpenMRS license header',
        'pattern': r'This Source Code Form is subject to the terms of the Mozilla Public License',
        'severity': 'error',
        'file_patterns': ['*.ts', '*.tsx', '*.js', '*.jsx', '*.java']
    },
    {
        'id': 'trailing-whitespace',
        'description': 'Remove trailing whitespace',
        'pattern': r'\s+$',
        'severity': 'warning',
        'file_patterns': ['*']
    }
]

# TypeScript/React specific rules
TYPESCRIPT_RULES = [
    {
        'id': 'typescript-naming',
        'description': 'Use camelCase for variables and functions, PascalCase for types and interfaces',
        'severity': 'warning'
    },
    {
        'id': 'react-hooks',
        'description': 'Follow React Hooks rules (only call hooks at the top level, only call hooks from React functions)',
        'severity': 'error'
    },
    {
        'id': 'prop-types',
        'description': 'Use TypeScript interfaces for prop types instead of PropTypes',
        'severity': 'warning'
    }
]

# Java specific rules
JAVA_RULES = [
    {
        'id': 'java-naming',
        'description': 'Follow Java naming conventions (PascalCase for classes, camelCase for methods and variables, UPPER_SNAKE_CASE for constants)',
        'severity': 'warning'
    },
    {
        'id': 'openmrs-annotations',
        'description': 'Use OpenMRS-specific annotations where appropriate (e.g., @Handler, @Authorized, etc.)',
        'severity': 'info'
    },
    {
        'id': 'spring-annotations',
        'description': 'Follow Spring best practices for dependency injection and component scanning',
        'severity': 'info'
    }
]

def check_license_header(file_content: str) -> List[Dict]:
    """Check if the file contains the OpenMRS license header."""
    license_headers = [
        "This Source Code Form is subject to the terms of the Mozilla Public License",
        "openmrs.org/license"
    ]
    
    issues = []
    if not any(header in file_content[:500] for header in license_headers):
        issues.append({
            'line': 1,
            'message': 'Missing or invalid OpenMRS license header',
            'severity': 'error',
            'rule_id': 'license-header'
        })
    return issues

def analyze_java_file(file_path: str, file_content: str) -> List[Dict]:
    """Analyze Java file for OpenMRS coding standards."""
    issues = check_license_header(file_content)
    
    try:
        # Parse Java code
        tree = javalang.parse.parse(file_content)
        
        # Check for common Java issues
        for path, node in tree.filter(javalang.tree.ClassDeclaration):
            # Check class naming convention
            if not re.match(r'^[A-Z][a-zA-Z0-9]*$', node.name):
                issues.append({
                    'line': node.position.line if hasattr(node, 'position') and node.position else 1,
                    'message': f'Class name "{node.name}" should be in PascalCase',
                    'severity': 'warning',
                    'rule_id': 'java-naming'
                })
                
    except Exception as e:
        issues.append({
            'line': 1,
            'message': f'Error parsing Java file: {str(e)}',
            'severity': 'error',
            'rule_id': 'java-parse-error'
        })
    
    return issues

def analyze_typescript_file(file_path: str, file_content: str) -> List[Dict]:
    """Analyze TypeScript/React file for OpenMRS coding standards."""
    issues = check_license_header(file_content)
    
    try:
        # Parse TypeScript/JSX code
        ast = esprima.parseScript(file_content, {
            'jsx': True,
            'tolerant': True
        })
        
        # Check for React hooks usage
        react_hooks = ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef']
        
        def check_node(node):
            nonlocal issues
            if hasattr(node, 'callee') and hasattr(node.callee, 'name') and node.callee.name in react_hooks:
                # Check if hook is called at the top level
                if not (hasattr(node, 'parent') and node.parent.type in ['FunctionDeclaration', 'ArrowFunctionExpression']):
                    issues.append({
                        'line': node.loc.start.line if hasattr(node, 'loc') else 1,
                        'message': f'React Hook "{node.callee.name}" is called conditionally. Hooks must be called in the exact same order in every component render.',
                        'severity': 'error',
                        'rule_id': 'react-hooks'
                    })
        
        # Traverse AST to find React hooks
        def traverse(node):
            check_node(node)
            for _, value in ast.walk(node):
                if isinstance(value, (list, tuple)):
                    for item in value:
                        if hasattr(item, 'type'):
                            traverse(item)
                elif hasattr(value, 'type'):
                    traverse(value)
        
        traverse(ast)
        
    except Exception as e:
        issues.append({
            'line': 1,
            'message': f'Error parsing TypeScript/JSX file: {str(e)}',
            'severity': 'error',
            'rule_id': 'typescript-parse-error'
        })
    
    return issues

def detect_project_type(files: List[str]) -> str:
    """Detect if the project is a frontend (O3) or backend (Java) project."""
    # Check for frontend indicators
    frontend_indicators = ['package.json', 'yarn.lock', 'src/index.tsx', 'src/App.tsx']
    if any(file.endswith(tuple(['.tsx', '.ts', '.jsx', '.js'])) or file in frontend_indicators for file in files):
        return 'frontend'
    
    # Check for Java/backend indicators
    java_indicators = ['pom.xml', 'src/main/java', '.gradle']
    if any(file.endswith('.java') or any(indicator in file for indicator in java_indicators) for file in files):
        return 'backend'
    
    # Default to frontend if we can't determine
    return 'frontend'

def analyze_file(file_path: str, file_content: str, project_type: str) -> List[Dict]:
    """Analyze a file based on its type and project type."""
    if not file_content.strip():
        return []
        
    file_ext = Path(file_path).suffix.lower()
    
    # Only analyze files that match the project type
    if project_type == 'backend' and file_ext == '.java':
        return analyze_java_file(file_path, file_content)
    elif project_type == 'frontend' and file_ext in ['.ts', '.tsx', '.js', '.jsx']:
        return analyze_typescript_file(file_path, file_content)
    else:
        # For other file types, just check common rules
        return check_license_header(file_content)

# --- Agent Execution ---
INSTRUCTIONS = """
You are an OpenMRS Code Review Agent specialized in reviewing both frontend (TypeScript/React) and backend (Java) code.

For each file in the PR:
1. Analyze the code for syntax, logic, and style issues
2. Check for OpenMRS-specific coding conventions and best practices
3. For Java code, ensure it follows OpenMRS module development guidelines
4. For TypeScript/React code, ensure it follows OpenMRS 3.x frontend conventions
5. Report any issues with clear explanations and suggestions for improvement

Call `get_pr_diff` to get the code changes, then analyze them and post your review.
"""

def main():
    """Main entry point for the agent."""
    try:
        # Get PR data with analysis
        pr_data = get_pr_diff()
        
        # Generate review summary
        review_summary = generate_review_summary(pr_data)
        
        # Post the main review comment with the summary
        repo = g.get_repo(REPO_NAME)
        pr = repo.get_pull(PR_NUMBER)
        pr.create_issue_comment(review_summary)
        
        # Post individual comments for each issue
        for file_path, file_data in pr_data['files'].items():
            for issue in file_data.get('issues', []):
                if issue['severity'] in ['error', 'warning']:  # Only post comments for errors and warnings
                    try:
                        post_review_comment(
                            comment=issue.get('message', 'Issue found'),
                            file_path=file_path,
                            line=issue.get('line', 1),
                            issue_id=issue.get('rule_id')
                        )
                    except Exception as e:
                        logger.warning(f"Failed to post comment for {file_path}:{issue.get('line')} - {str(e)}")
        
        # If we found any errors, fail the check
        error_count = sum(
            1 for file_data in pr_data['files'].values() 
            for issue in file_data.get('issues', []) 
            if issue.get('severity') == 'error'
        )
        
        if error_count > 0:
            logger.error(f"Code review found {error_count} error(s). Please address them.")
            sys.exit(1)
            
        logger.info("Code review completed successfully.")
        
    except Exception as e:
        logger.error(f"Error during code review: {str(e)}", exc_info=True)
        try:
            repo = g.get_repo(REPO_NAME)
            pr = repo.get_pull(PR_NUMBER)
            pr.create_issue_comment(
                "❌ An error occurred during code review. Please check the workflow logs for details.\n"
                f"Error: {str(e)}"
            )
        except Exception as inner_e:
            logger.error(f"Failed to post error comment: {str(inner_e)}")
        sys.exit(1)

if __name__ == "__main__":
    if not PR_NUMBER:
        logger.error("No PR Number provided. Exiting.")
        sys.exit(1)

    if model is None:
        logger.error("Gemini model not initialized. Exiting.")
        sys.exit(1)
    
    main()