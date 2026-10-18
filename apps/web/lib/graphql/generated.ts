/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  UUID: { input: string; output: string; }
};

export type BranchType = {
  __typename?: 'BranchType';
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
};

export type OrganizationType = {
  __typename?: 'OrganizationType';
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  clinicWorkspace: WorkspaceType;
  currentUser: UserType;
  myOrganizations: Array<OrganizationType>;
};


export type QueryClinicWorkspaceArgs = {
  organizationId: Scalars['UUID']['input'];
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
};

export type WorkspaceOverviewQueryVariables = Exact<{ [key: string]: never; }>;


export type WorkspaceOverviewQuery = { currentUser: { id: string, displayName: string }, myOrganizations: Array<{ id: string, name: string }> };

export type ClinicWorkspaceQueryVariables = Exact<{
  organizationId: string;
}>;


export type ClinicWorkspaceQuery = { clinicWorkspace: { organization: { id: string, name: string }, branches: Array<{ id: string, name: string }> } };


export const WorkspaceOverviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WorkspaceOverview"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"myOrganizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<WorkspaceOverviewQuery, WorkspaceOverviewQueryVariables>;
export const ClinicWorkspaceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ClinicWorkspace"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"organizationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"clinicWorkspace"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"organizationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"organizationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"branches"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<ClinicWorkspaceQuery, ClinicWorkspaceQueryVariables>;