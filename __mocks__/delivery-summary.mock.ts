export const mockLabourAndDeliveryData = {
  data: {
    results: [
      {
        uuid: '3b4daf81-7372-475c-ba5d-13c9c21d8ab1',
        display: 'Delivery 09/23/2022',
        encounterDatetime: '2022-09-23T13:11:06.000+0000',
        patient: {
          uuid: 'b835eff8-98c9-4988-887b-d93da7fbd542',
          display: '100019A - George Roberts',
          links: [
            {
              rel: 'self',
              uri: 'http://backend:8080/openmrs/ws/rest/v1/patient/b835eff8-98c9-4988-887b-d93da7fbd542',
              resourceAlias: 'patient',
            },
          ],
        },
        location: null,
        form: {
          uuid: '496c7cc3-0eea-4e84-a04c-2292949e2f7f',
          display: 'MCH Delivery Form',
          links: [
            {
              rel: 'self',
              uri: 'http://backend:8080/openmrs/ws/rest/v1/form/9e1a0c68-ca19-3482-9ffb-0a6b4e591c2a',
              resourceAlias: 'form',
            },
          ],
        },
        encounterType: {
          uuid: 'c6d09e05-1f25-4164-8860-9f32c5a02df0',
          display: 'Delivery',
          links: [
            {
              rel: 'self',
              uri: 'http://backend:8080/openmrs/ws/rest/v1/encountertype/dd528487-82a5-4082-9c72-ed246bd49591',
              resourceAlias: 'encountertype',
            },
          ],
        },
        obs: [
          {
            uuid: '04d7d2a2-8ffd-418c-9a0c-1d20dec50231',
            display: 'Covid 19 Signs and Symptom Set: Fever, Congestion, Loss of taste',
            links: [
              {
                rel: 'self',
                uri: 'http://backend:8080/openmrs/ws/rest/v1/obs/04d7d2a2-8ffd-418c-9a0c-1d20dec50231',
                resourceAlias: 'obs',
              },
            ],
          },
          {
            uuid: '5ca0c815-2c47-4cda-8c46-1e118b593ea8',
            display: 'Covid 19 Test Set: Positive, No, Respiratory PCR',
            links: [
              {
                rel: 'self',
                uri: 'http://backend:8080/openmrs/ws/rest/v1/obs/5ca0c815-2c47-4cda-8c46-1e118b593ea8',
                resourceAlias: 'obs',
              },
            ],
          },
        ],
        orders: [],
        voided: false,
        visit: null,
        encounterProviders: [],
        diagnoses: [],
        links: [
          {
            rel: 'self',
            uri: 'http://backend:8080/openmrs/ws/rest/v1/encounter/3b4daf81-7372-475c-ba5d-13c9c21d8ab1',
            resourceAlias: 'encounter',
          },
          {
            rel: 'full',
            uri: 'http://backend:8080/openmrs/ws/rest/v1/encounter/3b4daf81-7372-475c-ba5d-13c9c21d8ab1?v=full',
            resourceAlias: 'encounter',
          },
        ],
        resourceVersion: '2.2',
      },
    ],
  },
};
