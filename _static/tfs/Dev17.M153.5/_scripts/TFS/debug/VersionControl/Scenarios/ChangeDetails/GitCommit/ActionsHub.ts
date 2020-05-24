import { Action } from "VSS/Flux/Action";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { GitCommit, GitStatus } from "TFS/VersionControl/Contracts";
import { ActionsHub as ActionsHubBase } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { GitTag } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import {
    ChangeList,
    GitCommit as LegacyGitCommit,
    ItemModel,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitPermissions } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
export * from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";

export interface BranchStats {
    name: string;
    url: string;
    associatedPRStats?: PullRequestStats;
}

export interface PullRequestStats {
    id: string;
    title: string;
    url: string;
}

export interface IGitMergeCommitParentChangeListLoadedPayload {
    gitMergeChangeList: ChangeList;
    gitMergeParentId: string;
}

export interface IGitMergeCommitParentChangeListSelectedPayload {
    gitMergeParentId: string;
}

export interface IDiffParentDetails {
    diffParent: LegacyGitCommit;
    parentId: string;
}

export interface ICommitDetailsPageData {
    commitDetails: LegacyGitCommit;
    selectedItemDetails: ItemModel;
    diffParentDetails: IDiffParentDetails;
}

export interface ICommitDetailsReadPageData {
    commitDetails: GitCommit;
    selectedItemDetails: ItemModel;
    diffParentDetails: IDiffParentDetails;
    allChangesIncluded: boolean;
}

/*
 ** A container for the current instances of the actions that can be triggered in the change details page.
 */
export class ActionsHub extends ActionsHubBase {
    public buildStatusesLoaded = new Action<GitStatus[]>();
    public branchStatsLoaded = new Action<BranchStats>();
    public pullRequestStatsLoaded = new Action<PullRequestStats>();
    public pullRequestsDataLoaded = new Action<PullRequestCardInfo[]>();
    public identitiesForPRDataFetched = new Action<IdentityRef[]>();
    public identitiesForPRDataFailed = new Action<void>();
    public defaultBranchPrFound = new Action<number>();
    public pullRequestForBranchLoaded = new Action<PullRequestStats>();
    public gitCommitParentDetailsLoaded = new Action<LegacyGitCommit[]>();
    public gitMergeCommitParentChangeListLoaded = new Action<IGitMergeCommitParentChangeListLoadedPayload>();
    public gitMergeCommitParentChangeListSelected = new Action<IGitMergeCommitParentChangeListSelectedPayload>();
    public tagsFetched = new Action<GitTag[]>(); 
    public pusherLoaded = new Action<IdentityRef>();
    public permissionsUpdated = new Action<GitPermissions>();
}
