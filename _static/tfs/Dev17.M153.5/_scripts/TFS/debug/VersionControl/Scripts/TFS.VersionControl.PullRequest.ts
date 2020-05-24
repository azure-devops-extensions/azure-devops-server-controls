import * as VCContracts from "TFS/VersionControl/Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

export interface IBranchStatus {
    refName: string;
    isDefault: boolean;
    isDeleted: boolean;
    friendlyName: string;
    versionSpec: string;
    url: string;
    headOutOfDate: boolean;
    isUserCreated: boolean;

    equals(branchStatus: IBranchStatus): boolean;
}

export class BranchStatus implements IBranchStatus {
    refName: string;
    headOutOfDate: boolean;
    headCommitId: string;
    url: string;
    isDefault: boolean;

    public isUserCreated: boolean;

    constructor(repositoryContext: RepositoryContext, refName: string, headOutOfDate: boolean, headCommitId: string) {
        this.isDefault = repositoryContext.getRepository().defaultBranch === refName;
        this.refName = refName;
        this.headCommitId = headCommitId;
        this.headOutOfDate = headOutOfDate;
        this.url = VersionControlUrls.getExplorerUrl(repositoryContext, null, null, { version: new VCSpecs.GitBranchVersionSpec(this.friendlyName).toVersionString() });
    }

    public get isDeleted(): boolean {
        return this.headCommitId === null;
    }

    public get friendlyName(): string {
        if ((this.refName || "").indexOf("refs/heads/") === 0) {
            return this.refName.substr("refs/heads/".length);
        }
        else {
            return this.refName;
        }
    }

    public get versionSpec(): string {
        return new VCSpecs.GitCommitVersionSpec(this.headCommitId).toVersionString();
    }

    public equals(branchStatus: IBranchStatus): boolean {
        if (!branchStatus) {
            return false;
        }

        return branchStatus.isDefault == this.isDefault
            && branchStatus.refName == this.refName
            && branchStatus.headOutOfDate == this.headOutOfDate
            && branchStatus.versionSpec == this.versionSpec;
    }
}

export interface IPullRequestBranchStatus {
    pullRequestId: number;
    sourceBranchStatus: IBranchStatus;
    targetBranchStatus: IBranchStatus;
    targetVersionSpec: string;
    sourceVersionSpec: string;

    // implement non-ref equality check
    equals(branchStatus: IPullRequestBranchStatus): boolean;
}

export class PullRequestBranchStatus implements IPullRequestBranchStatus {
    private _pullRequest: VCContracts.GitPullRequest;
    public sourceBranchStatus: IBranchStatus;
    public targetBranchStatus: IBranchStatus;

    constructor(pullRequest: VCContracts.GitPullRequest, sourceBranchStatus: IBranchStatus, targetBranchStatus: IBranchStatus) {
        this._pullRequest = pullRequest;
        this.sourceBranchStatus = sourceBranchStatus;
        this.targetBranchStatus = targetBranchStatus;
    }

    public get pullRequestId(): number {
        if (!this._pullRequest) {
            return -1;
        }
        return this._pullRequest.pullRequestId;
    }

    public get targetVersionSpec(): string {
        if (this._pullRequest.status !== VCContracts.PullRequestStatus.Active || this.targetBranchStatus.isDeleted) {
            return new VCSpecs.GitCommitVersionSpec(this._pullRequest.lastMergeTargetCommit.commitId).toVersionString();
        }

        return this.targetBranchStatus.versionSpec;
    }

    public get sourceVersionSpec(): string {
        if (this._pullRequest.status !== VCContracts.PullRequestStatus.Active || this.sourceBranchStatus.isDeleted) {
            return new VCSpecs.GitCommitVersionSpec(this._pullRequest.lastMergeSourceCommit.commitId).toVersionString();
        }

        return this.sourceBranchStatus.versionSpec;
    }

    public equals(branchStatus: IPullRequestBranchStatus): boolean {
        if (!branchStatus) {
            return false;
        }

        return this.sourceBranchStatus.equals(branchStatus.sourceBranchStatus)
            && this.targetBranchStatus.equals(branchStatus.targetBranchStatus)
            && this.pullRequestId == branchStatus.pullRequestId;
    }
}