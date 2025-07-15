# OpenMRS 3.x Billing ESM

![OpenMRS CI](https://github.com/openmrs/openmrs-esm-billing-app/actions/workflows/ci.yml/badge.svg)

The OpenMRS Billing Module is designed to streamline the financial operations within healthcare settings by facilitating the management of patient billing, payments, and service pricing. This module integrates seamlessly with the OpenMRS platform, allowing healthcare providers to generate bills, track payments, and manage various billable services. It is an essential tool for ensuring transparency and accuracy in financial transactions within healthcare facilities, contributing to efficient service delivery.

The **Billing ESM** is a microfrontend for OpenMRS 3.x designed to manage healthcare billing workflows. It allows users to:

- Generate and manage bills
- Capture payments and insurance details
- Configure billable services and categories
- Integrate with visits and patient dashboards

Dependency: Note that this frontend module depends on the backend module called "Billing Module": https://github.com/openmrs/openmrs-module-billing

For more information, please see the
[OpenMRS Frontend Developer Documentation](https://openmrs.atlassian.net/wiki/x/IABBHg).

## Local development

Check out the developer documentation [here](https://openmrs.atlassian.net/wiki/x/IABBHg).

This monorepo uses [yarn](https://yarnpkg.com).

To install the dependencies, run:

```bash
yarn
```

To start a dev server, run:

```bash
yarn start
```

Once the dev server launches, log in and select a location. You will get redirected to the home page. Once there:

* Go to the Implementers tools, under the feature flags, toggle on the Billing Module feature flag to access billing functionalities.
* For more information on how to navigate and use the billing module, please refer to this [documentation](https://www.notion.so/ucsf-ighs/Billing-User-Manual-7f0427617e714b7db14432312cbb7cad) 

## Running tests

To run tests for all packages, run:

```bash
yarn turbo run test
```

To run tests in `watch` mode, run:

```bash
yarn turbo run test:watch
```
To run a specific test file, run:

```bash
yarn turbo run test -- visit-notes-form
```

The above command will only run tests in the file or files that match the provided string.

You can also run the matching tests from above in watch mode by running:

```bash
yarn turbo run test:watch -- visit-notes-form
```

To generate a `coverage` report, run:

```bash
yarn turbo run coverage
```

By default, `turbo` will cache test runs. This means that re-running tests wihout changing any of the related files will return the cached logs from the last run. To bypass the cache, run tests with the `force` flag, as follows:

```bash
yarn turbo run test --force
```

To run end-to-end tests, run:

```bash
yarn test-e2e
```

Read the [e2e testing guide](https://openmrs.atlassian.net/wiki/x/Z8CEAQ) to learn more about End-to-End tests in this project.

### Updating Playwright

The Playwright version in the [Bamboo e2e Dockerfile](e2e/support/bamboo/playwright.Dockerfile#L2) and the `package.json` file must match. If you update the Playwright version in one place, you must update it in the other.

## ⚙️ Configuration

You can customize billing behavior using OpenMRS frontend config overrides.
### 🔧 Example Config

``` bash
{
  "openmrs": {
    "config": {
      "billing": {
        "defaultCurrency": "UGX",
        "pageSize": 20,
        "showEditBillButton": true,
        "patientCatergory": {
          "paymentDetails": "fbc0702d-...",
          "insuranceScheme": "aac48226-..."
        },
        "nonPayingPatientCategories": {
          "childUnder5": "1528AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        }
      }
    }
  }
}
```
``` bash
📌 Ensure all UUIDs used here exist in your OpenMRS instance.
🧩 Configuration can be managed via your MF shell app or import-map-deployer
```

## Troubleshooting

If you notice that your local version of the application is not working or that there's a mismatch between what you see locally versus what's in [dev3](https://dev3.openmrs.org/openmrs/spa), you likely have outdated versions of core libraries. To update core libraries, run the following commands:

```bash
# Upgrade core libraries
yarn up openmrs@next @openmrs/esm-framework@next
```

### Reset version specifiers to `next`. Don't commit actual version numbers.
```bash
git checkout package.json
```

### Run `yarn` to recreate the lockfile
```bash
yarn
```
## Design Patterns

For documentation about our design patterns, please visit our [design system](https://zeroheight.com/23a080e38/p/880723--introduction) documentation website.

## Configuration

Please see the [Implementer Documentation](https://wiki.openmrs.org/pages/viewpage.action?pageId=224527013) for information about configuring modules.

## Deployment

See [Creating a Distribution](https://openmrs.atlassian.net/wiki/x/IABBHg) for information about adding microfrontends to a distribution.

## Contributing

For more information on how to get started, please refer to [OpenMRS Frontend Developer Documentation](https://openmrs.atlassian.net/wiki/x/94ABCQ).
