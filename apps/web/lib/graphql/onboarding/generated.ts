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
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: unknown; output: unknown; }
  UUID: { input: string; output: string; }
};

export type Mutation = {
  __typename?: 'Mutation';
  cancelClinicOnboarding: Scalars['JSON']['output'];
  completeClinicOnboarding: Scalars['JSON']['output'];
  completeOnboardingIntroduction: Scalars['JSON']['output'];
  removeOnboardingLogo: Scalars['JSON']['output'];
  requestOnboardingCode: Scalars['JSON']['output'];
  requestOnboardingResume: Scalars['JSON']['output'];
  saveOnboardingStep: Scalars['JSON']['output'];
  startClinicOnboarding: Scalars['JSON']['output'];
  updateClinicBranding: Scalars['JSON']['output'];
  updateClinicInformation: Scalars['JSON']['output'];
  updateClinicSpecialties: Scalars['JSON']['output'];
  updatePracticeDetails: Scalars['JSON']['output'];
  verifyOnboardingEmail: Scalars['JSON']['output'];
  verifyOnboardingInvitation: Scalars['JSON']['output'];
};


export type MutationCompleteClinicOnboardingArgs = {
  expectedVersion: Scalars['Int']['input'];
  requestId: Scalars['UUID']['input'];
};


export type MutationCompleteOnboardingIntroductionArgs = {
  skipped?: Scalars['Boolean']['input'];
};


export type MutationRemoveOnboardingLogoArgs = {
  expectedVersion: Scalars['Int']['input'];
};


export type MutationSaveOnboardingStepArgs = {
  complete?: Scalars['Boolean']['input'];
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
  step: Scalars['String']['input'];
};


export type MutationUpdateClinicBrandingArgs = {
  complete?: Scalars['Boolean']['input'];
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
};


export type MutationUpdateClinicInformationArgs = {
  complete?: Scalars['Boolean']['input'];
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
};


export type MutationUpdateClinicSpecialtiesArgs = {
  complete?: Scalars['Boolean']['input'];
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
};


export type MutationUpdatePracticeDetailsArgs = {
  complete?: Scalars['Boolean']['input'];
  data: Scalars['JSON']['input'];
  expectedVersion: Scalars['Int']['input'];
};


export type MutationVerifyOnboardingEmailArgs = {
  code: Scalars['String']['input'];
};


export type MutationVerifyOnboardingInvitationArgs = {
  token: Scalars['String']['input'];
};

export type OnboardingQuery = {
  __typename?: 'OnboardingQuery';
  availableClinicTypes: Scalars['JSON']['output'];
  availableSpecialties: Scalars['JSON']['output'];
  brandingPresets: Scalars['JSON']['output'];
  onboardingInvitation: Scalars['JSON']['output'];
  onboardingNotices: Scalars['JSON']['output'];
  onboardingProgress: Scalars['JSON']['output'];
  onboardingSession: Scalars['JSON']['output'];
};

export type OnboardingBootQueryVariables = Exact<{ [key: string]: never; }>;


export type OnboardingBootQuery = { onboardingInvitation: unknown, availableSpecialties: unknown, availableClinicTypes: unknown, brandingPresets: unknown, onboardingNotices: unknown };

export type OnboardingSessionQueryVariables = Exact<{ [key: string]: never; }>;


export type OnboardingSessionQuery = { onboardingSession: unknown };

export type ExchangeClinicInviteMutationVariables = Exact<{
  token: string;
}>;


export type ExchangeClinicInviteMutation = { verifyOnboardingInvitation: unknown };

export type RequestClinicCodeMutationVariables = Exact<{ [key: string]: never; }>;


export type RequestClinicCodeMutation = { requestOnboardingCode: unknown };

export type VerifyClinicEmailMutationVariables = Exact<{
  code: string;
}>;


export type VerifyClinicEmailMutation = { verifyOnboardingEmail: unknown };

export type FinishClinicIntroMutationVariables = Exact<{
  skipped: boolean;
}>;


export type FinishClinicIntroMutation = { completeOnboardingIntroduction: unknown };

export type SaveOnboardingStepMutationVariables = Exact<{
  step: string;
  data: unknown;
  version: number;
  complete: boolean;
}>;


export type SaveOnboardingStepMutation = { saveOnboardingStep: unknown };

export type CompleteClinicSetupMutationVariables = Exact<{
  version: number;
  key: string;
}>;


export type CompleteClinicSetupMutation = { completeClinicOnboarding: unknown };

export type RemoveClinicLogoMutationVariables = Exact<{
  version: number;
}>;


export type RemoveClinicLogoMutation = { removeOnboardingLogo: unknown };

export type RequestClinicResumeMutationVariables = Exact<{ [key: string]: never; }>;


export type RequestClinicResumeMutation = { requestOnboardingResume: unknown };


export const OnboardingBootDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OnboardingBoot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onboardingInvitation"}},{"kind":"Field","name":{"kind":"Name","value":"availableSpecialties"}},{"kind":"Field","name":{"kind":"Name","value":"availableClinicTypes"}},{"kind":"Field","name":{"kind":"Name","value":"brandingPresets"}},{"kind":"Field","name":{"kind":"Name","value":"onboardingNotices"}}]}}]} as unknown as DocumentNode<OnboardingBootQuery, OnboardingBootQueryVariables>;
export const OnboardingSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OnboardingSession"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onboardingSession"}}]}}]} as unknown as DocumentNode<OnboardingSessionQuery, OnboardingSessionQueryVariables>;
export const ExchangeClinicInviteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExchangeClinicInvite"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyOnboardingInvitation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}]}]}}]} as unknown as DocumentNode<ExchangeClinicInviteMutation, ExchangeClinicInviteMutationVariables>;
export const RequestClinicCodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestClinicCode"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestOnboardingCode"}}]}}]} as unknown as DocumentNode<RequestClinicCodeMutation, RequestClinicCodeMutationVariables>;
export const VerifyClinicEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifyClinicEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"code"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifyOnboardingEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"code"},"value":{"kind":"Variable","name":{"kind":"Name","value":"code"}}}]}]}}]} as unknown as DocumentNode<VerifyClinicEmailMutation, VerifyClinicEmailMutationVariables>;
export const FinishClinicIntroDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FinishClinicIntro"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skipped"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeOnboardingIntroduction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skipped"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skipped"}}}]}]}}]} as unknown as DocumentNode<FinishClinicIntroMutation, FinishClinicIntroMutationVariables>;
export const SaveOnboardingStepDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveOnboardingStep"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"step"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"data"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"complete"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveOnboardingStep"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"step"},"value":{"kind":"Variable","name":{"kind":"Name","value":"step"}}},{"kind":"Argument","name":{"kind":"Name","value":"data"},"value":{"kind":"Variable","name":{"kind":"Name","value":"data"}}},{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}},{"kind":"Argument","name":{"kind":"Name","value":"complete"},"value":{"kind":"Variable","name":{"kind":"Name","value":"complete"}}}]}]}}]} as unknown as DocumentNode<SaveOnboardingStepMutation, SaveOnboardingStepMutationVariables>;
export const CompleteClinicSetupDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompleteClinicSetup"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeClinicOnboarding"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}},{"kind":"Argument","name":{"kind":"Name","value":"requestId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}]}]}}]} as unknown as DocumentNode<CompleteClinicSetupMutation, CompleteClinicSetupMutationVariables>;
export const RemoveClinicLogoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveClinicLogo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeOnboardingLogo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"expectedVersion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}}]}]}}]} as unknown as DocumentNode<RemoveClinicLogoMutation, RemoveClinicLogoMutationVariables>;
export const RequestClinicResumeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RequestClinicResume"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestOnboardingResume"}}]}}]} as unknown as DocumentNode<RequestClinicResumeMutation, RequestClinicResumeMutationVariables>;