export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Date (isoformat) */
  Date: { input: string; output: string; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: unknown; output: unknown; }
  UUID: { input: string; output: string; }
};

export type Allergy = {
  __typename?: 'Allergy';
  reaction: Scalars['String']['output'];
  severity: Scalars['String']['output'];
  substance: Scalars['String']['output'];
};

export type AllergyInput = {
  reaction?: Scalars['String']['input'];
  severity?: Scalars['String']['input'];
  substance: Scalars['String']['input'];
};

export type BranchType = {
  __typename?: 'BranchType';
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
};

export type ClinicalHistory = {
  __typename?: 'ClinicalHistory';
  allergies: Array<Allergy>;
  allergyState: Scalars['String']['output'];
  authorName: Scalars['String']['output'];
  conditions: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  medicalHistory: Scalars['String']['output'];
  medicationState: Scalars['String']['output'];
  medications: Array<Medication>;
  pastProcedures: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  version: Scalars['Int']['output'];
};

export type ClinicalRevisionPage = {
  __typename?: 'ClinicalRevisionPage';
  endVersion?: Maybe<Scalars['Int']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<ClinicalHistory>;
};

export type DocumentType = {
  __typename?: 'DocumentType';
  contentType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  documentId: Scalars['UUID']['output'];
  encounterId?: Maybe<Scalars['UUID']['output']>;
  id: Scalars['UUID']['output'];
  label: Scalars['String']['output'];
  scanState: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  version: Scalars['Int']['output'];
};

export type EncounterType = {
  __typename?: 'EncounterType';
  amendmentReason: Scalars['String']['output'];
  branchId: Scalars['UUID']['output'];
  content: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
  editable: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  isAmendment: Scalars['Boolean']['output'];
  latestFinalizedVersion: Scalars['Int']['output'];
  patientHistoryRevisionId?: Maybe<Scalars['UUID']['output']>;
  patientId: Scalars['UUID']['output'];
  patientName: Scalars['String']['output'];
  reason: Scalars['String']['output'];
  revisionId?: Maybe<Scalars['UUID']['output']>;
  revisions: Array<RevisionType>;
  status: Scalars['String']['output'];
  template?: Maybe<Scalars['JSON']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  version: Scalars['Int']['output'];
};

export type Medication = {
  __typename?: 'Medication';
  dose: Scalars['String']['output'];
  frequency: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type MedicationInput = {
  dose?: Scalars['String']['input'];
  frequency?: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addClinicalNote: EncounterType;
  addDiagnosis: EncounterType;
  addObservation: EncounterType;
  addProcedure: EncounterType;
  addTreatmentItem: Scalars['JSON']['output'];
  amendEncounter: EncounterType;
  applyConsultationTemplate: EncounterType;
  authorizeDocumentDownload: Scalars['String']['output'];
  beginDocumentUpload: DocumentType;
  createEncounter: EncounterType;
  createEncounterAmendment: EncounterType;
  createPatient: PatientDemographics;
  createTreatmentPlan: Scalars['JSON']['output'];
  editTreatmentItem: Scalars['JSON']['output'];
  finalizeEncounter: EncounterType;
  issuePortalInvitation: Scalars['JSON']['output'];
  markNotificationsRead: Scalars['Boolean']['output'];
  operationsAction: Scalars['JSON']['output'];
  previewPortalRelease: Scalars['JSON']['output'];
  publishPortalRelease: Scalars['JSON']['output'];
  registerPatient: PatientDemographics;
  reorderTreatmentPlan: Scalars['JSON']['output'];
  resetOrganizationBranding: Scalars['JSON']['output'];
  resetUserPreferences: Scalars['JSON']['output'];
  retryDocumentScan: DocumentType;
  reviewPatientReport: Scalars['JSON']['output'];
  revokePortalAccess: Scalars['Boolean']['output'];
  saveConsultationTemplate: Scalars['JSON']['output'];
  saveDashboardLayout: Scalars['JSON']['output'];
  saveFollowUp: Scalars['JSON']['output'];
  savePatientClinicalHistory: ClinicalHistory;
  saveToothFinding: EncounterType;
  setPatientAccess: PatientAssignee;
  transitionEncounter: EncounterType;
  updateDentalChart: EncounterType;
  updateEncounterDraft: EncounterType;
  updateOrganizationBranding: Scalars['JSON']['output'];
  updatePatient: PatientDemographics;
  updatePatientDemographics: PatientDemographics;
  updateTreatmentItem: Scalars['JSON']['output'];
  updateTreatmentStatus: Scalars['JSON']['output'];
  updateUserPreferences: Scalars['JSON']['output'];
  uploadMedicalDocument: DocumentType;
  withdrawPortalRelease: Scalars['JSON']['output'];
};


export type MutationAddClinicalNoteArgs = {
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  section: Scalars['String']['input'];
  text: Scalars['String']['input'];
};


export type MutationAddDiagnosisArgs = {
  data: Scalars['JSON']['input'];
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationAddObservationArgs = {
  data: Scalars['JSON']['input'];
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationAddProcedureArgs = {
  data: Scalars['JSON']['input'];
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationAddTreatmentItemArgs = {
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  planId: Scalars['UUID']['input'];
  requestId?: InputMaybe<Scalars['UUID']['input']>;
};


export type MutationAmendEncounterArgs = {
  encounterId: Scalars['UUID']['input'];
  expectedFinalizedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationApplyConsultationTemplateArgs = {
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
  templateRevisionId: Scalars['UUID']['input'];
};


export type MutationAuthorizeDocumentDownloadArgs = {
  organizationId: Scalars['UUID']['input'];
  versionId: Scalars['UUID']['input'];
};


export type MutationBeginDocumentUploadArgs = {
  encounterId?: InputMaybe<Scalars['UUID']['input']>;
  metadata: Scalars['JSON']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId?: InputMaybe<Scalars['UUID']['input']>;
  purpose: Scalars['String']['input'];
};


export type MutationCreateEncounterArgs = {
  branchId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  providerId: Scalars['UUID']['input'];
  reason: Scalars['String']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationCreateEncounterAmendmentArgs = {
  encounterId: Scalars['UUID']['input'];
  expectedFinalizedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationCreatePatientArgs = {
  data: RegisterPatientInput;
  organizationId: Scalars['UUID']['input'];
};


export type MutationCreateTreatmentPlanArgs = {
  data: Scalars['JSON']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationEditTreatmentItemArgs = {
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
  itemId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  planId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationFinalizeEncounterArgs = {
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationIssuePortalInvitationArgs = {
  data: Scalars['JSON']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationMarkNotificationsReadArgs = {
  ids: Array<Scalars['UUID']['input']>;
  organizationId: Scalars['UUID']['input'];
};


export type MutationOperationsActionArgs = {
  action: Scalars['String']['input'];
  data: Scalars['JSON']['input'];
  organizationId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationPreviewPortalReleaseArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  selection: Scalars['JSON']['input'];
};


export type MutationPublishPortalReleaseArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  previewDigest: Scalars['String']['input'];
  requestId: Scalars['UUID']['input'];
  selection: Scalars['JSON']['input'];
};


export type MutationRegisterPatientArgs = {
  data: RegisterPatientInput;
  organizationId: Scalars['UUID']['input'];
};


export type MutationReorderTreatmentPlanArgs = {
  expectedVersion: Scalars['Int']['input'];
  itemIds: Array<Scalars['UUID']['input']>;
  organizationId: Scalars['UUID']['input'];
  planId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationResetOrganizationBrandingArgs = {
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationResetUserPreferencesArgs = {
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationRetryDocumentScanArgs = {
  organizationId: Scalars['UUID']['input'];
  versionId: Scalars['UUID']['input'];
};


export type MutationReviewPatientReportArgs = {
  expectedVersion: Scalars['Int']['input'];
  historyRevisionId?: InputMaybe<Scalars['UUID']['input']>;
  organizationId: Scalars['UUID']['input'];
  reportId: Scalars['UUID']['input'];
  state: Scalars['String']['input'];
};


export type MutationRevokePortalAccessArgs = {
  expectedVersion?: Scalars['Int']['input'];
  identifier: Scalars['UUID']['input'];
  kind: Scalars['String']['input'];
  organizationId: Scalars['UUID']['input'];
  reason: Scalars['String']['input'];
};


export type MutationSaveConsultationTemplateArgs = {
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationSaveDashboardLayoutArgs = {
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  widgets: Scalars['JSON']['input'];
};


export type MutationSaveFollowUpArgs = {
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationSavePatientClinicalHistoryArgs = {
  data: SaveClinicalHistoryInput;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type MutationSaveToothFindingArgs = {
  data: Scalars['JSON']['input'];
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationSetPatientAccessArgs = {
  active: Scalars['Boolean']['input'];
  membershipId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type MutationTransitionEncounterArgs = {
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  status: Scalars['String']['input'];
};


export type MutationUpdateDentalChartArgs = {
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  findings: Scalars['JSON']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationUpdateEncounterDraftArgs = {
  content: Scalars['JSON']['input'];
  encounterId: Scalars['UUID']['input'];
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type MutationUpdateOrganizationBrandingArgs = {
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  settings: Scalars['JSON']['input'];
};


export type MutationUpdatePatientArgs = {
  data: UpdateDemographicsInput;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type MutationUpdatePatientDemographicsArgs = {
  data: UpdateDemographicsInput;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type MutationUpdateTreatmentItemArgs = {
  completedRevisionId?: InputMaybe<Scalars['UUID']['input']>;
  expectedVersion: Scalars['Int']['input'];
  itemId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  planId: Scalars['UUID']['input'];
  requestId?: InputMaybe<Scalars['UUID']['input']>;
  status: Scalars['String']['input'];
};


export type MutationUpdateTreatmentStatusArgs = {
  completedRevisionId?: InputMaybe<Scalars['UUID']['input']>;
  expectedVersion: Scalars['Int']['input'];
  itemId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  planId: Scalars['UUID']['input'];
  requestId?: InputMaybe<Scalars['UUID']['input']>;
  status: Scalars['String']['input'];
};


export type MutationUpdateUserPreferencesArgs = {
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  settings: Scalars['JSON']['input'];
};


export type MutationUploadMedicalDocumentArgs = {
  encounterId?: InputMaybe<Scalars['UUID']['input']>;
  metadata: Scalars['JSON']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type MutationWithdrawPortalReleaseArgs = {
  expectedVersion: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  reason: Scalars['String']['input'];
  releaseId: Scalars['UUID']['input'];
};

export type OrganizationType = {
  __typename?: 'OrganizationType';
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
};

export type PatientAssignee = {
  __typename?: 'PatientAssignee';
  active: Scalars['Boolean']['output'];
  branchLabel: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  membershipId: Scalars['UUID']['output'];
};

export type PatientDemographics = {
  __typename?: 'PatientDemographics';
  address?: Maybe<Scalars['String']['output']>;
  branchId: Scalars['UUID']['output'];
  createdAt: Scalars['DateTime']['output'];
  dateOfBirth?: Maybe<Scalars['Date']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  emergencyContactName?: Maybe<Scalars['String']['output']>;
  emergencyContactPhone?: Maybe<Scalars['String']['output']>;
  emergencyContactRelationship?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  guardianName?: Maybe<Scalars['String']['output']>;
  guardianPhone?: Maybe<Scalars['String']['output']>;
  guardianRelationship?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  reference: Scalars['String']['output'];
  sex: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  version: Scalars['Int']['output'];
};

export type PatientDirectoryPage = {
  __typename?: 'PatientDirectoryPage';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<PatientSummary>;
  totalCount: Scalars['Int']['output'];
};

export type PatientPage = {
  __typename?: 'PatientPage';
  endCursor?: Maybe<Scalars['UUID']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<PatientSummary>;
  totalCount: Scalars['Int']['output'];
};

export type PatientSummary = {
  __typename?: 'PatientSummary';
  dateOfBirth?: Maybe<Scalars['Date']['output']>;
  fullName: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  reference: Scalars['String']['output'];
};

export type PatientTimelineEvent = {
  __typename?: 'PatientTimelineEvent';
  action: Scalars['String']['output'];
  authorName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  encounterId?: Maybe<Scalars['UUID']['output']>;
  encounterRevisionId?: Maybe<Scalars['UUID']['output']>;
  id: Scalars['UUID']['output'];
  revisionId?: Maybe<Scalars['UUID']['output']>;
};

export type PatientTimelinePage = {
  __typename?: 'PatientTimelinePage';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<PatientTimelineEvent>;
};

export type ProviderType = {
  __typename?: 'ProviderType';
  branchId?: Maybe<Scalars['UUID']['output']>;
  displayName: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  specialty: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  appointmentAvailability: Scalars['JSON']['output'];
  appointments: Scalars['JSON']['output'];
  branchQueue: Scalars['JSON']['output'];
  chartRevisions: Scalars['JSON']['output'];
  clinicAppearance: Scalars['JSON']['output'];
  clinicDashboard: Scalars['JSON']['output'];
  clinicPatients: PatientPage;
  clinicWorkspace: WorkspaceType;
  consultationRecords: Scalars['JSON']['output'];
  consultationTemplates: Scalars['JSON']['output'];
  currentUser: UserType;
  dentalChart: Scalars['JSON']['output'];
  dentalComparison: Scalars['JSON']['output'];
  dentalReference: Scalars['JSON']['output'];
  documentRecords: Scalars['JSON']['output'];
  documentVersions: Array<DocumentType>;
  documents: Array<DocumentType>;
  eligiblePatientAssignees: Array<PatientAssignee>;
  encounter: EncounterType;
  encounters: Array<EncounterType>;
  followUps: Scalars['JSON']['output'];
  historyRecords: Scalars['JSON']['output'];
  medicalDocuments: Array<DocumentType>;
  myOrganizations: Array<OrganizationType>;
  notifications: Scalars['JSON']['output'];
  operationsSetup: Scalars['JSON']['output'];
  organizationBranding: Scalars['JSON']['output'];
  patient: PatientDemographics;
  patientAccessGrants: Array<PatientAssignee>;
  patientClinicalContext?: Maybe<ClinicalHistory>;
  patientClinicalHistory?: Maybe<ClinicalHistory>;
  patientClinicalRevisions: ClinicalRevisionPage;
  patientDemographics: PatientDemographics;
  patientDirectory: PatientDirectoryPage;
  patientHistory: PatientTimelinePage;
  patientPortalAccess: Scalars['JSON']['output'];
  patientReleases: Scalars['JSON']['output'];
  patientReports: Scalars['JSON']['output'];
  patientTimeline: PatientTimelinePage;
  patients: PatientPage;
  planRevisions: Scalars['JSON']['output'];
  providers: Array<ProviderType>;
  recentPatients: Array<PatientSummary>;
  recordAuthors: Scalars['JSON']['output'];
  releaseSourcePage: Scalars['JSON']['output'];
  releaseSources: Scalars['JSON']['output'];
  toothEvidence: Scalars['JSON']['output'];
  toothHistory: Scalars['JSON']['output'];
  treatmentPlans: Scalars['JSON']['output'];
  userPreferences: Scalars['JSON']['output'];
};


export type QueryAppointmentAvailabilityArgs = {
  data: Scalars['JSON']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type QueryAppointmentsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filters: Scalars['JSON']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type QueryBranchQueueArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  branchId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  providerId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryChartRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryClinicAppearanceArgs = {
  organizationId: Scalars['UUID']['input'];
};


export type QueryClinicDashboardArgs = {
  organizationId: Scalars['UUID']['input'];
};


export type QueryClinicPatientsArgs = {
  after?: InputMaybe<Scalars['UUID']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  query?: Scalars['String']['input'];
};


export type QueryClinicWorkspaceArgs = {
  organizationId: Scalars['UUID']['input'];
};


export type QueryConsultationRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Scalars['JSON']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryConsultationTemplatesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  includeArchived?: Scalars['Boolean']['input'];
  organizationId: Scalars['UUID']['input'];
};


export type QueryDentalChartArgs = {
  encounterId?: InputMaybe<Scalars['UUID']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  revisionId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryDentalComparisonArgs = {
  leftRevisionId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  rightRevisionId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryDentalReferenceArgs = {
  organizationId: Scalars['UUID']['input'];
};


export type QueryDocumentRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Scalars['JSON']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryDocumentVersionsArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId?: InputMaybe<Scalars['UUID']['input']>;
  versionIds: Array<Scalars['UUID']['input']>;
};


export type QueryDocumentsArgs = {
  before?: InputMaybe<Scalars['UUID']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId?: InputMaybe<Scalars['UUID']['input']>;
  purpose?: Scalars['String']['input'];
};


export type QueryEligiblePatientAssigneesArgs = {
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  query?: Scalars['String']['input'];
};


export type QueryEncounterArgs = {
  encounterId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  revisionId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryEncountersArgs = {
  before?: InputMaybe<Scalars['UUID']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryFollowUpsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryHistoryRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  filters?: InputMaybe<Scalars['JSON']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryMedicalDocumentsArgs = {
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryNotificationsArgs = {
  organizationId: Scalars['UUID']['input'];
};


export type QueryOperationsSetupArgs = {
  branchId?: InputMaybe<Scalars['UUID']['input']>;
  organizationId: Scalars['UUID']['input'];
  search?: Scalars['String']['input'];
};


export type QueryOrganizationBrandingArgs = {
  organizationId: Scalars['UUID']['input'];
};


export type QueryPatientArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientAccessGrantsArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientClinicalContextArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  revisionId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryPatientClinicalHistoryArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientClinicalRevisionsArgs = {
  afterVersion?: InputMaybe<Scalars['Int']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientDemographicsArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientDirectoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  branchId?: InputMaybe<Scalars['UUID']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  query?: Scalars['String']['input'];
  sort?: Scalars['String']['input'];
};


export type QueryPatientHistoryArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientPortalAccessArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientReleasesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientTimelineArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryPatientsArgs = {
  after?: InputMaybe<Scalars['UUID']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  query?: Scalars['String']['input'];
};


export type QueryPlanRevisionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  planId: Scalars['UUID']['input'];
};


export type QueryProvidersArgs = {
  organizationId: Scalars['UUID']['input'];
};


export type QueryRecentPatientsArgs = {
  organizationId: Scalars['UUID']['input'];
};


export type QueryRecordAuthorsArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId?: InputMaybe<Scalars['UUID']['input']>;
};


export type QueryReleaseSourcePageArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  kind: Scalars['String']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryReleaseSourcesArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryToothEvidenceArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  tooth: Scalars['String']['input'];
};


export type QueryToothHistoryArgs = {
  before?: InputMaybe<Scalars['UUID']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  tooth: Scalars['String']['input'];
};


export type QueryTreatmentPlansArgs = {
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryUserPreferencesArgs = {
  organizationId: Scalars['UUID']['input'];
};

export type RegisterPatientInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  branchId: Scalars['UUID']['input'];
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emergencyContactName?: InputMaybe<Scalars['String']['input']>;
  emergencyContactPhone?: InputMaybe<Scalars['String']['input']>;
  emergencyContactRelationship?: InputMaybe<Scalars['String']['input']>;
  fullName: Scalars['String']['input'];
  guardianName?: InputMaybe<Scalars['String']['input']>;
  guardianPhone?: InputMaybe<Scalars['String']['input']>;
  guardianRelationship?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  requestId: Scalars['UUID']['input'];
  sex?: Scalars['String']['input'];
};

export type RevisionType = {
  __typename?: 'RevisionType';
  amendmentReason: Scalars['String']['output'];
  authorName: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['UUID']['output'];
  version: Scalars['Int']['output'];
};

export type SaveClinicalHistoryInput = {
  allergies?: Array<AllergyInput>;
  allergyState?: Scalars['String']['input'];
  conditions?: Scalars['String']['input'];
  expectedVersion: Scalars['Int']['input'];
  medicalHistory?: Scalars['String']['input'];
  medicationState?: Scalars['String']['input'];
  medications?: Array<MedicationInput>;
  pastProcedures?: Scalars['String']['input'];
  reason?: Scalars['String']['input'];
};

export type UpdateDemographicsInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  dateOfBirth?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  emergencyContactName?: InputMaybe<Scalars['String']['input']>;
  emergencyContactPhone?: InputMaybe<Scalars['String']['input']>;
  emergencyContactRelationship?: InputMaybe<Scalars['String']['input']>;
  expectedVersion: Scalars['Int']['input'];
  fullName: Scalars['String']['input'];
  guardianName?: InputMaybe<Scalars['String']['input']>;
  guardianPhone?: InputMaybe<Scalars['String']['input']>;
  guardianRelationship?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  sex?: Scalars['String']['input'];
};

export type UserType = {
  __typename?: 'UserType';
  displayName: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
};

export type WorkspaceType = {
  __typename?: 'WorkspaceType';
  branches: Array<BranchType>;
  organization: OrganizationType;
  permissions: Array<Scalars['String']['output']>;
};
