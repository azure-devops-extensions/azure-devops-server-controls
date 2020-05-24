import { Action } from "VSS/Flux/Action";
import { IContentRenderer } from "Presentation/Scripts/TFS/TFS.ContentRendering";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ItemModel, FileContent } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ISuggestionObject } from "VersionControl/Scenarios/Shared/Suggestion";
import {
    GitCodeMetricsData,
    TfvcCodeMetricsData,
    WitMetricsData,
} from "ProjectOverview/Scripts/Generated/Contracts";
import { CodeMetricsData } from "ProjectOverview/Scripts/Models";
import { UpsellTypes, MembersData, ProjectOverviewData } from "ProjectOverview/Scripts/Generated/Contracts";
import { ReadmeActionsHub } from "ProjectOverview/Scripts/Shared/ReadmeActionsHub";

export enum WitAvailabilityStatus {
    AvailabilityUnknown,
    Created,
    NoneCreated
}

export enum ReleaseAvailabilityStatus {
    AvailabilityUnknown,
    DefinitionsPresent,
    DefinitionsAbsent,
    ProviderAbsent
}

export interface DeploymentMetricsData {
    deploymentsPassed: number;
    deploymentsNotPassed: number;
}

export interface TryDeploymentMetricsData {
    deploymentMetricsData: DeploymentMetricsData;
    releaseAvailabilityStatus: ReleaseAvailabilityStatus;
}

export interface ProjectLanguageMetricsData {
    name: string;
    languagePercentage: number;
}

export interface BuildMetricsPayload {
    buildsPassed: number;
    buildsNotPassed: number;
}

export interface CandidateUpsellsPayload {
    candidateUpsells: UpsellTypes[];
}

export interface PermissionsPayload {
    permissibleUpsells: UpsellTypes[]; // subset of candidate upsell
    hasEditReadmePermission: boolean;
    hasViewRightPanePermission: boolean;
    hasBuildPermission: boolean;
}


/**
 * A container for the current instances of the actions that can be triggered from project overview page
 */
export class ActionsHub extends ReadmeActionsHub {
    public projectOverviewDataLoaded = new Action<ProjectOverviewData>();
    public projectOverviewDataLoadFailed = new Action<void>();
    public projectDescriptionUpdated = new Action<string>();
    public projectDescriptionUpdateFailed = new Action<string>();
    public projectTagsFetched = new Action<string[]>();
    public projectLanguagesFetched = new Action<ProjectLanguageMetricsData[]>();
    public projectTagsSaved = new Action<string[]>();
    public allProjectTagsFetched = new Action<string[]>();
    public currentTagsUpdated = new Action<string[]>();
    public prjectTagsErrorMessageUpdated = new Action<string>();
    public upsellDismissed = new Action<UpsellTypes>();
    public descriptionEditingToggled = new Action<void>();
    public descriptionEditingDisabled = new Action<void>();
    public errorMessageCleared = new Action<void>();
    public numberOfDaysChanged = new Action<number>();
    public codeMetricsChanged = new Action<CodeMetricsData>();
    public gitMetricsChanged = new Action<GitCodeMetricsData>();
    public tfvcMetricsChanged = new Action<TfvcCodeMetricsData>();
    public workMetricsChanged = new Action<WitMetricsData>();
    public workMetricsAvailabilityChanged = new Action<boolean>();
    public projectMembersFetched = new Action<MembersData>();
    public membersFetchFailed = new Action<string>();
    public deploymentMetricsChanged = new Action<DeploymentMetricsData>();
    public deploymentMetricsAndAvailabilityChanged = new Action<TryDeploymentMetricsData>();
    public buildMetricsChanged = new Action<BuildMetricsPayload>();
    public candidateUpsellsUpdated = new Action<CandidateUpsellsPayload>();
    public permissionsUpdated = new Action<PermissionsPayload>();
    public projectImageInformationFetched = new Action<boolean>();
}
