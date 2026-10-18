export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: unknown; output: unknown; }
  UUID: { input: string; output: string; }
};

export type PortalMutation = {
  __typename?: 'PortalMutation';
  authorizePortalDownload: Scalars['String']['output'];
  savePortalPreferences: Scalars['JSON']['output'];
  submitPatientReport: Scalars['JSON']['output'];
};


export type PortalMutationAuthorizePortalDownloadArgs = {
  linkId: Scalars['UUID']['input'];
  releaseId: Scalars['UUID']['input'];
  versionId: Scalars['UUID']['input'];
};


export type PortalMutationSavePortalPreferencesArgs = {
  density: Scalars['String']['input'];
  expectedVersion: Scalars['Int']['input'];
  linkId: Scalars['UUID']['input'];
  mode: Scalars['String']['input'];
};


export type PortalMutationSubmitPatientReportArgs = {
  category: Scalars['String']['input'];
  linkId: Scalars['UUID']['input'];
  requestId: Scalars['UUID']['input'];
  text: Scalars['String']['input'];
};

export type PortalQuery = {
  __typename?: 'PortalQuery';
  portalLinks: Scalars['JSON']['output'];
  portalRecord: Scalars['JSON']['output'];
  portalRecords: Scalars['JSON']['output'];
  portalReports: Scalars['JSON']['output'];
  portalSession: Scalars['JSON']['output'];
  portalWorkspace: Scalars['JSON']['output'];
};


export type PortalQueryPortalRecordArgs = {
  linkId: Scalars['UUID']['input'];
  releaseId: Scalars['UUID']['input'];
};


export type PortalQueryPortalRecordsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  linkId: Scalars['UUID']['input'];
};


export type PortalQueryPortalReportsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  linkId: Scalars['UUID']['input'];
};


export type PortalQueryPortalWorkspaceArgs = {
  linkId: Scalars['UUID']['input'];
};
