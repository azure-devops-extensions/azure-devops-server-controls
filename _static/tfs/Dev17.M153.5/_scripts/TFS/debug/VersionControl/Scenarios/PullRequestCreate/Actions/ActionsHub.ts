import { Action } from "VSS/Flux/Action";

import { GitRepository, GitRef } from "TFS/VersionControl/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { PullRequestProperties } from "VersionControl/Scenarios/PullRequestCreate/Stores/PullRequestPropertiesStore";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { ChangeList, GitCommit, GitHistoryQueryResults } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export class ActionsHub {

    public sourceBranchUpdated = new Action<BranchUpdatedPayload>();
    public targetBranchUpdated = new Action<BranchUpdatedPayload>();
    public refInfoUpdated = new Action<RefInfoUpdatedPayload>();
    public mergeBaseUpdated = new Action<MergeBasePayload>();
    public existingPullRequestIdUpdated = new Action<PullRequestIdPayload>();
    public branchesSwitched = new Action<void>();
    public contextUpdated = new Action<ContextPayload>();
    public repositoriesRegistered = new Action<RegisterRepositoriesPayload>();
    public forkParentUpdated = new Action<RepositoryIdPayload>();

    public pullRequestPropertiesUpdated = new Action<PullRequestProperties>();
    public defaultPullRequestPropertiesUpdated = new Action<PullRequestProperties>();

    public validationSucceed = new Action<void>();
    public createPullRequestStarted = new Action<void>();
    public createPullRequestFailed = new Action<void>();

    public diffCommitStarted = new Action<BranchCompareStartedPayload>();
    public diffCommitUpdated = new Action<DiffCommitUpdatedPayload>();
    public commitsHistoryStarted = new Action<BranchCompareStartedPayload>();
    public commitsHistoryUpdated = new Action<CommitHistoryUpdatedPayload>();
    public commitsHistoryFullCommentRetrieved = new Action<ChangeList>();

    public addNotification = new Action<Notification>();
    public clearNotifications = new Action<void>();

    public setFeatureFlags = new Action<ISetFeatureFlagsPayload>();

    public onNavigateToNewTargetRepo = new Action<void>();

    public templateUpdated = new Action<string>();
    public templateListUpdated = new Action<string[]>();
    public defaultTemplatePathUpdated = new Action<string>();
}

export interface PullRequestIdPayload {
    pullRequestId: number;
}

export interface MergeBasePayload {
    gitCommitVersionSpec: GitCommitVersionSpec;
}

export interface ContextPayload {
    tfsContext: TfsContext;
    repoContext: RepositoryContext;
}

export interface BranchUpdatedPayload {
    repository: GitRepository;
    branchName: string;
}

export interface RefInfoUpdatedPayload {
    repositoryId: string;
    ref: GitRef;
}

export interface RegisterRepositoriesPayload {
    repositories: GitRepository[];
}

export interface RepositoryIdPayload {
    repositoryId: string;
}

export interface BranchCompareStartedPayload {
    sourceVersionString: string;
    targetVersionString: string;
}

export interface DiffCommitUpdatedPayload {
    sourceVersionString: string;
    targetVersionString: string;
    commit: GitCommit;
}

export interface CommitHistoryUpdatedPayload {
    sourceVersionString: string;
    targetVersionString: string;
    history: GitHistoryQueryResults;
}

export interface ISetFeatureFlagsPayload {
    // an array of feature flag keys with toggles that indicate if they are on or off
    features: IDictionaryStringTo<boolean>;
}
