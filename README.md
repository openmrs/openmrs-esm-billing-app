# OpenMRS 3.x Billing ESM

The OpenMRS Billing Module is designed to streamline the financial operations within healthcare settings by facilitating the management of patient billing, payments, and service pricing. This module integrates seamlessly with the OpenMRS platform, allowing healthcare providers to generate bills, track payments, and manage various billable services. It is an essential tool for ensuring transparency and accuracy in financial transactions within healthcare facilities, contributing to efficient service delivery.

**Current Version:** 1.2.0
**OpenMRS Framework:** 10.x
**Build Tool:** Rspack

## How It Works

The Billing App integrates with both the OpenMRS frontend framework and a backend billing module to provide comprehensive billing functionality:

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenMRS 3.x Frontend                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         @openmrs/esm-billing-app                      │  │
│  │  • Patient billing management                         │  │
│  │  • Payment processing                                 │  │
│  │  • Invoice generation & printing                      │  │
│  │  • Billable services/commodities management           │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │ OpenMRS REST API                    │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenMRS Backend + Billing Module               │
│  • Bill storage and management                             │
│  • Payment processing                                       │
│  • Cash point management                                    │
│  • Service pricing                                          │
└─────────────────────────────────────────────────────────────┘
```

### Backend Dependency

**Required:** [openmrs-module-billing](https://github.com/openmrs/openmrs-module-billing)

This frontend module depends on the backend billing module which:
- Stores and manages bills in the database
- Handles payment transactions
- Manages cash points and service pricing
- Provides REST API endpoints for billing operations

**Install the backend module:**
```bash
# In your OpenMRS server directory
mvn org.openmrs.module:oapg-sdk:omod:install \
  -DmoduleId=openmrs-module-billing \
  -DmoduleVersion=<version> \
  -DopenmrsServerUrl=http://localhost:8080/openmrs \
  -DadminUser=admin \
  -DadminPassword=admin123
```

### Data Flow

1. **Patient Registration** → Patient is registered in OpenMRS with visit attributes for billing
2. **Service Delivery** → Healthcare provider delivers services to patient
3. **Bill Creation** → Provider creates bill with line items for services rendered
4. **Payment Processing** → Cashier processes payment via cash point
5. **Invoice Generation** → System generates printable invoice with facility branding
6. **Waiver Management** → Approved waivers can be applied to reduce bill amounts

## Local Development

Check out the developer documentation [here](http://o3-dev.docs.openmrs.org).

This monorepo uses [yarn](https://yarnpkg.com).

To install the dependencies, run:

```bash
yarn install
```

To start a dev server, run:

```bash
yarn start
```

To build the module, run:

```bash
yarn build
```

### Accessing the App

Once the dev server launches:

1. Log in with your OpenMRS credentials
2. Select a location (session location)
3. Navigate to **Implementers tools** → **Feature flags**
4. Toggle on **Billing Module** feature flag
5. Access billing functionality from the home page or patient chart

For user documentation, refer to this [Billing User Manual](https://www.notion.so/ucsf-ighs/Billing-User-Manual-7f0427617e714b7db14432312cbb7cad)

## Configuration

The Billing App requires configuration to work with your specific OpenMRS instance. Configuration is done via OpenMRS frontend config overrides.

### Where to Configure

Create or edit the configuration file in your OpenMRS configuration directory:

**For Docker deployments:** `openmrs-config/spa-config.json`
**For local development:** `frontend/config.json`

### Required Configuration Steps

#### Step 1: Identify Required UUIDs

You need to find the UUIDs for the following concepts and visit attribute types in your OpenMRS instance:

**Patient Category Visit Attribute Types:**
- Payment Details Attribute Type UUID
- Payment Methods Attribute Type UUID
- Policy Number Attribute Type UUID
- Insurance Scheme Attribute Type UUID
- Patient Category Attribute Type UUID
- Form Payload Pending Attribute Type UUID

**Patient Category Concepts:**
- Paying Details Concept UUID
- Non-Paying Details Concept UUID
- Insurance Details Concept UUID

**To find UUIDs:**
1. Navigate to **System Administration** → **Concepts** (for concept UUIDs)
2. Navigate to **System Administration** → **Visit Attribute Types** (for attribute type UUIDs)
3. Click on the concept/attribute type and copy the UUID from the URL

#### Step 2: Configure the App

Add the billing app configuration to your spa-config.json:

```json
{
  "@openmrs/esm-billing-app": {
    "defaultCurrency": "KES",
    "pageSize": 20,
    "logo": {
      "src": "https://your-facility.com/logo.png",
      "alt": "Facility Logo"
    },
    "country": "Kenya",
    "patientCategory": {
      "paymentDetails": "fbc0702d-b4d4-42d2-af4d-d250a1fd2590",
      "paymentMethods": "8553afa0-bdb9-4d3c-8a98-05fa9350aa85",
      "policyNumber": "3a988e33-a6c0-4b76-b924-01abb998944b",
      "insuranceScheme": "aac48226-d143-4a33-9e7c-d95821a137a6",
      "patientCategory": "3b9dfac8-9e4d-11ee-8c90-0242ac120002",
      "formPayloadPending": "919b51c9-8e2e-468f-8354-181bf3e55786"
    },
    "categoryConcepts": {
      "payingDetails": "44b34972-6630-4e5a-a9f6-a6eb0f109650",
      "nonPayingDetails": "f3fb2d88-cccd-422c-8766-be101ba7bd2e",
      "insuranceDetails": "beac329b-f1dc-4a33-9e7c-d95821a137a6"
    },
    "nonPayingPatientCategories": {
      "childUnder5": "1528AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      "student": "159465AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    },
    "postBilledItems": {
      "cashPoint": "54065383-b4d4-42d2-af4d-d250a1fd2590",
      "cashier": "f9badd80-ab76-11e2-9e96-0800200c9a66",
      "priceUuid": "7b9171ac-d3c1-49b4-beff-c9902aee5245"
    },
    "serviceTypes": "21b8cf43-9f9f-4d02-9f4a-d710ece54261",
    "showEditBillButton": false
  }
}
```

### Configuration Properties Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| **Branding** | | | |
| `logo.src` | string | `''` | URL to facility logo for invoice printing |
| `logo.alt` | string | `''` | Alt text for logo image |
| `country` | string | `'Kenya'` | Country name displayed on invoice headers |
| **Display** | | | |
| `defaultCurrency` | string | `'UGX'` | ISO currency code (KES, UGX, GBP, USD, etc.) |
| `pageSize` | number | `10` | Number of items per page in tables |
| `showEditBillButton` | boolean | `false` | Show/hide edit bill button |
| **Patient Categories** | | | |
| `patientCategory.paymentDetails` | string | - | UUID for payment details visit attribute |
| `patientCategory.paymentMethods` | string | - | UUID for payment methods visit attribute |
| `patientCategory.policyNumber` | string | - | UUID for policy number visit attribute |
| `patientCategory.insuranceScheme` | string | - | UUID for insurance scheme visit attribute |
| `patientCategory.patientCategory` | string | - | UUID for patient category visit attribute |
| `categoryConcepts.payingDetails` | string | - | UUID for paying patient category concept |
| `categoryConcepts.nonPayingDetails` | string | - | UUID for non-paying patient category concept |
| `categoryConcepts.insuranceDetails` | string | - | UUID for insured patient category concept |
| **Special Categories** | | | |
| `nonPayingPatientCategories.childUnder5` | string | - | UUID for children under 5 category |
| `nonPayingPatientCategories.student` | string | - | UUID for student category |
| **Backend Integration** | | | |
| `postBilledItems.cashPoint` | string | - | UUID for cash point location |
| `postBilledItems.cashier` | string | - | UUID for cashier provider |
| `postBilledItems.priceUuid` | string | - | UUID for default price list |
| `serviceTypes` | string | - | UUID for service types concept |

### Configuration Example: Complete Setup

```json
{
  "@openmrs/esm-billing-app": {
    "defaultCurrency": "KES",
    "pageSize": 25,
    "logo": {
      "src": "https://facility.example.com/assets/logo.png",
      "alt": "Example Hospital Logo"
    },
    "country": "Uganda",
    "patientCategory": {
      "paymentDetails": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "paymentMethods": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "policyNumber": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "insuranceScheme": "d4e5f6a7-b8c9-0123-def0-123456789012",
      "patientCategory": "e5f6a7b8-c9d0-1234-ef01-234567890123",
      "formPayloadPending": "f6a7b8c9-d0e1-2345-f012-345678901234"
    },
    "categoryConcepts": {
      "payingDetails": "a7b8c9d0-e1f2-3456-0123-456789012345",
      "nonPayingDetails": "b8c9d0e1-f2a3-4567-1234-567890123456",
      "insuranceDetails": "c9d0e1f2-a3b4-5678-2345-678901234567"
    }
  }
}
```

## Running Tests

To run tests, run:

```bash
yarn test
```

To run tests in watch mode, run:

```bash
yarn test:watch
```

To generate a coverage report, run:

```bash
yarn coverage
```

To run end-to-end tests, run:

```bash
yarn test-e2e
```

### Updating Playwright

The Playwright version in the [Bamboo e2e Dockerfile](e2e/support/bamboo/playwright.Dockerfile#L2) and the `package.json` file must match. If you update the Playwright version in one place, you must update it in the other.

## Troubleshooting

### Build Issues

If you encounter build errors:

```bash
# Clear cache and rebuild
rm -rf node_modules dist .rspack
yarn install
yarn build
```

### Configuration Not Applied

If configuration changes don't appear:

1. Check that your spa-config.json has valid JSON syntax
2. Verify the module name matches: `@openmrs/esm-billing-app`
3. Restart the dev server after configuration changes
4. Clear browser cache and reload

### Backend Connection Issues

If the app can't connect to the backend:

1. Verify the billing backend module is installed and started
2. Check OpenMRS is running at the configured URL
3. Verify your session location has appropriate permissions
4. Check browser console for specific error messages

### Outdated Dependencies

If you notice that your local version of the application is not working or that there's a mismatch between what you see locally versus what's in [dev3](https://dev3.openmrs.org/openmrs/spa), you likely have outdated versions of core libraries:

```bash
# Upgrade core libraries
yarn up openmrs@next @openmrs/esm-framework@next

# Reset version specifiers to `next`
git checkout package.json

# Recreate lockfile
yarn install
```

## Design Patterns

For documentation about our design patterns, please visit our [design system](https://zeroheight.com/23a080e38/p/880723--introduction) documentation website.

## Deployment

See [Creating a Distribution](http://o3-dev.docs.openmrs.org/#/main/distribution?id=creating-a-distribution) for information about adding microfrontends to a distribution.

### Production Build

```bash
# Build for production
yarn build

# The output will be in dist/openmrs-esm-billing-app.js
```

## Contributing

For more information on how to get started, please refer to [OpenMRS Frontend Developer Documentation](https://o3-docs.openmrs.org/docs/introduction).

## Version History

### 1.2.0
- Upgraded to OpenMRS Framework 10.x
- Migrated from Webpack to Rspack
- Removed `@openmrs/esm-patient-common-lib` dependency
- Upgraded React-i18next to 16.x
- Upgraded TypeScript to 5.x
- Upgraded react-to-print to 3.x
- Added logo and country configuration
- Fixed config schema typos
- Fixed module name for Module Federation

### 1.0.0
- Initial release with OpenMRS Framework 7.x support
- Basic billing functionality
- Patient billing management
- Payment processing
- Invoice generation

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/openmrs/openmrs-esm-billing-app/issues
- OpenMRS Talk: https://talk.openmrs.org/
- OpenMRS Documentation: https://o3-docs.openmrs.org/
