import { Action } from "VSS/Flux/Action";
import { GitCommitRef, GitPullRequest, GitPush, GitStatus } from "TFS/VersionControl/Contracts";
import { GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface PushesSearchFilterData {
    userName?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    excludeUsers?: string;
    itemVersion?: string;
    allRefs?: boolean;
}

export interface GitPushRefExtended {
    push: GitPush;
    headCommit: GitCommitRef;
    pullRequest: GitPullRequest;
    isForcePush: boolean;
    status: GitStatus[];
}

export interface BranchUpdatesLoadedPayload {
    pushes: GitPushRefExtended[];
    hasMoreUpdates: boolean;
}

export interface RepositoryChangedPayload {
    repositoryContext?: RepositoryContext;
}

export class ActionsHub {
    public branchUpdatesCleared = new Action<void>();
    public branchUpdatesLoadErrorRaised = new Action<Error>();
    public branchUpdatesClearAllErrorsRaised = new Action<void>();
    public branchUpdatesLoaded = new Action<BranchUpdatesLoadedPayload>();
    public moreBranchUpdatesLoaded = new Action<BranchUpdatesLoadedPayload>();
    public branchUpdatesLoadStarted = new Action<void>();
    public moreBranchUpdatesLoadStarted = new Action<void>();

    public currentRepositoryChanged = new Action<RepositoryChangedPayload>();
    public pushesSearchCriteriaChanged = new Action<PushesSearchFilterData>();
    public filterPanelVisibilityToggled = new Action<void>();
    public permissionUpdate = new Action<GitRepositoryPermissionSet>();
}
