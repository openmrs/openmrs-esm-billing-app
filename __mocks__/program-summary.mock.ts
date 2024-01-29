export const mockProgram = {
  HIV: {
    ldlValue: '100',
    ldlDate: '2023-08-06',
    cd4: '500',
    cd4Date: '2023-08-07',
    cd4Percent: '30',
    cd4PercentDate: '2023-08-10',
    whoStage: 'Stage 2',
    whoStageDate: '2023-08-11',
    lastEncDetails: {
      regimenShortDisplay: 'Regimen ABC',
      startDate: '2023-08-01',
    },
  },
  TB: {
    tbTreatmentNumber: 'TB-123',
    tbDiseaseClassification: 'TB Disease',
    tbDiseaseClassificationDate: '2023-08-09',
    tbPatientClassification: 'TB Patient',
    lastTbEncounter: {
      regimenShortDisplay: 'TB Regimen XYZ',
    },
  },
  mchMother: {
    hivStatus: 'Positive',
    hivStatusDate: '2023-08-13',
    onHaart: 'Yes',
    onHaartDate: '2023-08-14',
  },
  mchChild: {
    currentProphylaxisUsed: 'Prophylaxis ABC',
    currentProphylaxisUsedDate: '2023-08-05',
    currentFeedingOption: 'Feeding Option XYZ',
    currentFeedingOptionDate: '2023-08-01',
    milestonesAttained: 'Milestone 1, Milestone 2',
    milestonesAttainedDate: '2023-08-02',
    heiOutcome: 'HEI Outcome XYZ',
    heiOutcomeDate: '2023-08-20',
    hivStatus: 'Negative',
    hivStatusDate: '2023-08-21',
  },
};
