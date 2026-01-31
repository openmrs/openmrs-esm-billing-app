# O3 Billing App

![OpenMRS CI](https://github.com/openmrs/openmrs-esm-billing-app/actions/workflows/ci.yml/badge.svg)

A frontend module for O3 that manages healthcare billing workflows. It allows users to:

- Generate and manage bills
- Capture payments and insurance details
- Configure billable services and categories
- Integrate with visits and patient dashboards

This frontend module depends on the backend [Billing Module](https://github.com/openmrs/openmrs-module-billing). It also uses core OpenMRS REST APIs for visit attributes (to track payment status on visits) and concept lookups (to resolve service types and patient categories).

For more information, please see the
[OpenMRS Frontend Developer Documentation](https://openmrs.atlassian.net/wiki/x/IABBHg).

## Local development

Check out the developer documentation [in the OpenMRS Wiki](https://openmrs.atlassian.net/wiki/x/IABBHg).

This repo uses [yarn](https://yarnpkg.com).

To install the dependencies, run:

```bash
yarn
```

To start a dev server, run:

```bash
yarn start
```

Once the dev server launches, log in and select a location. You will get redirected to the home page. Once there:

- Navigate to the Billing dashboard on the left panel to view the billing history. Additional billing functionality exists in the Patient Chart. You'll also find the Billable Services dashboard in the System Administration page.

## Running tests

To run tests, run:

```bash
yarn test
```

To run tests in `watch` mode, run:

```bash
yarn test:watch
```

To run a specific test file, pass a pattern:

```bash
yarn test -- billing-dashboard
```

To generate a `coverage` report, run:

```bash
yarn coverage
```

This repo also includes a `yarn verify` script that runs linting, type checking, and tests via Turbo.

To run end-to-end tests, run:

```bash
yarn test-e2e
```

Read the [e2e testing guide](https://openmrs.atlassian.net/wiki/x/Z8CEAQ) to learn more about End-to-End tests in this project.

## Configuration

You can customize billing behavior using OpenMRS frontend config overrides.

### Example Config

```json
{
  "@openmrs/esm-billing-app": {
    "defaultCurrency": "UGX",
    "pageSize": 20,
    "patientCategory": {
      "paymentDetails": "<visit-attribute-type-uuid>",
      "paymentMethods": "<visit-attribute-type-uuid>",
      "policyNumber": "<visit-attribute-type-uuid>",
      "insuranceScheme": "<visit-attribute-type-uuid>",
      "patientCategory": "<visit-attribute-type-uuid>",
      "formPayloadPending": "<visit-attribute-type-uuid>"
    },
    "categoryConcepts": {
      "payingDetails": "<concept-uuid>",
      "nonPayingDetails": "<concept-uuid>",
      "insuranceDetails": "<concept-uuid>"
    },
    "nonPayingPatientCategories": {
      "childUnder5": "<concept-uuid>",
      "student": "<concept-uuid>"
    },
    "postBilledItems": {
      "cashPoint": "<cash-point-uuid>",
      "cashier": "<provider-uuid>"
    },
    "serviceTypes": {
      "billableService": "<concept-set-uuid>"
    },
    "waiverPaymentModeUuid": "<payment-mode-uuid>"
  }
}
```

All UUIDs must reference resources that exist in your OpenMRS instance. See `src/config-schema.ts` for defaults and detailed descriptions of each property. Configuration can be managed via the app shell or import-map-deployer.

#### Visit attribute types

The `patientCategory` config keys map to visit attribute types that store billing information on each visit. The following must exist in your backend:

| Config key | Purpose | Default UUID |
| --- | --- | --- |
| `paymentDetails` | Whether the patient is paying or non-paying | `fbc0702d-b4c9-4968-be63-af8ad3ad6239` |
| `paymentMethods` | Payment method (cash, insurance, etc.) | `8553afa0-bdb9-4d3c-8a98-05fa9350aa85` |
| `policyNumber` | Insurance policy number | `aac48226-d143-4274-80e0-264db4e368ee` |
| `insuranceScheme` | Insurance scheme name | `3a988e33-a6c0-4b76-b924-01abb998944b` |
| `patientCategory` | Patient category classification | `3b9dfac8-9e4d-11ee-8c90-0242ac120002` |
| `formPayloadPending` | Whether a billing form submission is pending | `919b51c9-8e2e-468f-8354-181bf3e55786` |

#### Bill creation prerequisites

Creating a bill requires a valid cash point and cashier (provider) UUID. The backend's `BillResource.save()` will attempt to load these from the cashier's active timesheet if the `billing.timesheetRequired` global property is set. Otherwise, the values from `postBilledItems.cashPoint` and `postBilledItems.cashier` in the frontend config are used. If neither is available, bill creation will fail.

### Demo content alignment

If you are using the [demo content package](https://github.com/openmrs/openmrs-content-referenceapplication-demo), the following backend seeds are relevant (paths relative to that repo):

- Billable services: `configuration/backend_configuration/billableservices/billableServices.csv`
- Payment modes: `configuration/backend_configuration/paymentmodes/paymentModes.csv`
- Cash points: `configuration/backend_configuration/cashpoints/cashPoints.csv`
- Visit attribute types: `configuration/backend_configuration/attributetypes/attribute_types-core_demo.csv`
- Receipt number generator: `configuration/backend_configuration/globalproperties/billing-core_demo.xml`

The following frontend config defaults match UUIDs seeded by the demo content:

| Config key | Default UUID | Demo content match |
| --- | --- | --- |
| `patientCategory.paymentDetails` | `fbc0702d...` | "Patient Type" visit attribute type |
| `patientCategory.paymentMethods` | `8553afa0...` | "Payment Method" visit attribute type |
| `patientCategory.policyNumber` | `aac48226...` | "Insurance Policy Number" visit attribute type |
| `patientCategory.insuranceScheme` | `3a988e33...` | "Insurance Scheme" visit attribute type |
| `postBilledItems.cashPoint` | `54065383...` | "OPD Cash Point" cash point |

The following defaults are **not seeded** by the demo content and must be created manually or overridden:

| Config key | Default UUID | What's needed |
| --- | --- | --- |
| `patientCategory.patientCategory` | `3b9dfac8...` | A visit attribute type for patient category classification |
| `patientCategory.formPayloadPending` | `919b51c9...` | A visit attribute type for pending form status |
| `postBilledItems.cashier` | `f9badd80...` | A provider UUID for the default cashier |
| `waiverPaymentModeUuid` | `eb6173cb...` | A payment mode for bill waivers |
| `serviceTypes.billableService` | `21b8cf43...` | A concept set whose members define billable service types |

## Troubleshooting

If you notice that your local version of the application is not working or that there's a mismatch between what you see locally versus what's in [dev3](https://dev3.openmrs.org/openmrs/spa), you likely have outdated versions of core libraries. To update core libraries, run the following commands:

```bash
# Upgrade core libraries
yarn up openmrs@next @openmrs/esm-framework@next
```

### Reset version specifiers to `next`. Don't commit actual version numbers

```bash
git checkout package.json
```

### Run `yarn` to recreate the lockfile

```bash
yarn
```

Please see the [Implementer Documentation](https://wiki.openmrs.org/pages/viewpage.action?pageId=224527013) for more information about configuring modules.

## Design Patterns

For documentation about our design patterns, please visit our [design system](https://zeroheight.com/23a080e38/p/880723--introduction) documentation website.

## Deployment

See [Creating a Distribution](https://openmrs.atlassian.net/wiki/x/IABBHg) for information about adding frontend modules to a distribution.

## Contributing

For more information on how to get started, please refer to [OpenMRS Frontend Developer Documentation](https://openmrs.atlassian.net/wiki/x/94ABCQ).

Detailed documentation on the Billing Module can be found [in the OpenMRS Wiki](https://openmrs.atlassian.net/wiki/x/0w2bAQ).
