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

export type PatientMutation = {
  __typename?: 'PatientMutation';
  registerPatient: PatientDemographics;
  savePatientClinicalHistory: ClinicalHistory;
  setPatientAccess: PatientAssignee;
  updatePatientDemographics: PatientDemographics;
};


export type PatientMutationRegisterPatientArgs = {
  data: RegisterPatientInput;
  organizationId: Scalars['UUID']['input'];
};


export type PatientMutationSavePatientClinicalHistoryArgs = {
  data: SaveClinicalHistoryInput;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type PatientMutationSetPatientAccessArgs = {
  active: Scalars['Boolean']['input'];
  membershipId: Scalars['UUID']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type PatientMutationUpdatePatientDemographicsArgs = {
  data: UpdateDemographicsInput;
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
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
  id: Scalars['UUID']['output'];
  revisionId?: Maybe<Scalars['UUID']['output']>;
};

export type PatientTimelinePage = {
  __typename?: 'PatientTimelinePage';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<PatientTimelineEvent>;
};

export type Query = {
  __typename?: 'Query';
  clinicPatients: PatientPage;
  clinicWorkspace: WorkspaceType;
  currentUser: UserType;
  eligiblePatientAssignees: Array<PatientAssignee>;
  myOrganizations: Array<OrganizationType>;
  patientAccessGrants: Array<PatientAssignee>;
  patientClinicalHistory?: Maybe<ClinicalHistory>;
  patientClinicalRevisions: ClinicalRevisionPage;
  patientDemographics: PatientDemographics;
  patientTimeline: PatientTimelinePage;
  recentPatients: Array<PatientSummary>;
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


export type QueryEligiblePatientAssigneesArgs = {
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
  query?: Scalars['String']['input'];
};


export type QueryPatientAccessGrantsArgs = {
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
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


export type QueryPatientTimelineArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: Scalars['Int']['input'];
  organizationId: Scalars['UUID']['input'];
  patientId: Scalars['UUID']['input'];
};


export type QueryRecentPatientsArgs = {
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
