import { Action } from "VSS/Flux/Action";
import { ChangeListSearchCriteria, GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { 
    ChangeList,
    GitHistoryQueryResults,
    GitIdentityReference,
    GitObjectType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { WebClientGraphRow, GitCommitArtifactsMap } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { IHistoryGraph } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissions } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

export interface HistoryItemsLoadedPayload {
    gitHistoryQueryResult: GitHistoryQueryResults;
    searchCriteria: ChangeListSearchCriteria;
    dataOptions: GitHistoryDataOptions;
    resultsObjectType: GitObjectType;
    appendToExistingResults: boolean;
    skipResultsForNextFetch: number;
    webClientGraphRows: WebClientGraphRow[];
    isGitGraphFeatureEnabled: boolean;
    fetchRenameHistoryCalled?: boolean;
}

export enum CommitOrder {
    dateOrder,
    topoOrder
}

export enum GitLogHistoryMode {
    simplified,
    firstParent,
    fullHistory,
    fullHistorySimplifyMerges
}

export interface GitHistoryQueryArguments {
    startFromVersion: GitVersionDescriptor;
    notInVersion: GitVersionDescriptor;
    order: CommitOrder;
    path: string;
    historyMode: GitLogHistoryMode;
    stopAtAdds: boolean;
    fromDate: string;
    toDate: string;
    author: string;
    committer: string;
    skip: number;
    maxResultCount: number;
}

export interface GitArtifactsQueryArguments {
    fetchBuildStatuses: boolean;
    fetchPullRequests: boolean;
    fetchTags: boolean;
    startFromVersion: GitVersionDescriptor;
    commitIds: string[];
}

export interface GitCommitLookupArguments {
    fromCommitId: string;
    toCommitId: string;
    skip: number;
    maxResultCount: number;
}

export interface GitGraphQueryArguments {
    fetchGraph: boolean;
    emptyLineLengthLimit: number;
    emptyLineLengthMultiplier: boolean;
    order: CommitOrder;
}

export interface GitHistoryDataProviderArguments {
    gitCommitLookupArguments: GitCommitLookupArguments;
    gitHistoryQueryArguments: GitHistoryQueryArguments;
    gitArtifactsQueryArguments: GitArtifactsQueryArguments;
    gitGraphQueryArguments: GitGraphQueryArguments;
}

export interface GitHistorySearchCriteria extends ChangeListSearchCriteria {
    gitLogHistoryMode: string;
    alias: string;
}

export interface ExtendedGitIdentityReference extends GitIdentityReference {
    imageUrl: string;
}

export interface GitHistoryDataOptions {
    fetchBuildStatuses: boolean;
    fetchGraph: boolean;
    fetchPullRequests: boolean;
    fetchTags: boolean;
}

export interface IMessage {
    key: string;
    title: string;
    content: string;
}

export interface HistoryPermissionSet {
    hasCreateTagPermission: boolean;
    hasCreateBranchPermission: boolean;
    isPermissionLoaded: boolean;
}

/**
 * A container for the current instances of the actions that can be triggered in History tab.
 */
export class HistoryTabActionsHub {
    public historyItemsLoaded = new Action<HistoryItemsLoadedPayload>();
    public historyArtifactsLoaded = new Action<GitCommitArtifactsMap>();
    public historyFullCommentLoaded = new Action<ChangeList>();
    public historyItemsLoadStarted = new Action<void>();
    public historyItemsLoadErrorRaised = new Action<Error>();
    public errorFlushed = new Action<Error>();
    public historyItemsCleared = new Action<void>();
    public historyArtifactsLoadStarted = new Action<void>();
    public historyGraphRowSelected = new Action<IHistoryGraph>();
    public historyGraphRowUnSelected = new Action<IHistoryGraph>();
    public historyGraphMessageDismissed = new Action<string>();
    public toggleFilterPanelVisibility = new Action<void>();
    public permissionsUpdated = new Action<GitRepositoryPermissionSet>();
    public settingsPermissionsUpdated = new Action<SettingsPermissions>();
}
