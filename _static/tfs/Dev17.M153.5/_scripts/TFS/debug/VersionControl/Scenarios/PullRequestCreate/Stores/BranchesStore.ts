import { GitRepository, GitRef } from "TFS/VersionControl/Contracts";
import * as Constants from "VersionControl/Scenarios/PullRequestCreate/Constants";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitBranchVersionSpec, GitCommitVersionSpec, VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as VSSStore from "VSS/Flux/Store";
import * as Utils_Array from "VSS/Utils/Array";

export interface BranchInfo {
    branchVersionSpec: GitBranchVersionSpec;

    // these might be null if we have not been able to load them yet
    repository?: GitRepository;
    commitVersionSpec?: GitCommitVersionSpec;
}

export class BranchesStore extends VSSStore.Store {
    private _sourceBranch: BranchInfo = null;
    private _targetBranch: BranchInfo = null;
    private _mergeBase: GitCommitVersionSpec = null;
    private _existingPullRequestId: number = null;

    // cache of repo objects by ID (so we can look up repo names)
    private _knownRepositories: IDictionaryStringTo<GitRepository>;
    private _currentRepository: GitRepository;
    private _forkParentRepositoryId: string;
    private _tfsContext: TfsContext;

    constructor() {
        super();

        this._knownRepositories = {};
    }

    public updateSourceBranch(
        repository: GitRepository,
        branchName: string): void {

        this._sourceBranch = { repository, branchVersionSpec: !branchName ? null : new GitBranchVersionSpec(branchName) };
        this._updateSourceAndTargetRepositories();
        this._mergeBase = null;
        this._existingPullRequestId = null;

        this.emitChanged();
    }

    public updateTargetBranch(
        repository: GitRepository,
        branchName: string): void {

        this._targetBranch = { repository, branchVersionSpec: !branchName ? null : new GitBranchVersionSpec(branchName) };

        this._updateSourceAndTargetRepositories();
        this._mergeBase = null;
        this._existingPullRequestId = null;

        this.emitChanged();
    }

    public onRefInfoUpdated(repositoryId: string, ref: GitRef) {

        if (this._targetBranch && this._targetBranch.branchVersionSpec.toFullName() === ref.name && this._targetBranch.repository.id === repositoryId) {
            this._targetBranch.commitVersionSpec = new GitCommitVersionSpec(ref.objectId);
            this.emitChanged();
        }

        if (this._sourceBranch && this._sourceBranch.branchVersionSpec.toFullName() === ref.name && this._sourceBranch.repository.id === repositoryId) {
            this._sourceBranch.commitVersionSpec = new GitCommitVersionSpec(ref.objectId);
            this.emitChanged();
        }
        this._mergeBase = null;
    }

    public onMergeBaseUpdated(mergeBase: GitCommitVersionSpec) {
        this._mergeBase = mergeBase;
    }

    public onExistingPullRequestIdUpdated(pullRequestId: number) {
        this._existingPullRequestId = pullRequestId;
    }

    public onContextUpdated(repository: GitRepository, tfsContext: TfsContext): void {
        this._knownRepositories[repository.id] = repository;
        this._currentRepository = repository;
        this._tfsContext = tfsContext;

        this._updateSourceAndTargetRepositories();
        this.emitChanged();
    }

    public registerRepositoryList(repositories: GitRepository[]): void {
        // Clear out any existing data
        this._knownRepositories = {};
        repositories.forEach(repository => { this._knownRepositories[repository.id] = repository; });

        this._updateSourceAndTargetRepositories();
        this.emitChanged();
    }

    public updateForkParent(repositoryId: string): void {
        this._forkParentRepositoryId = repositoryId;
        this.emitChanged();
    }

    private _updateSourceAndTargetRepositories(): void {
        if (this._sourceBranch) {
            this._sourceBranch.repository = this._sourceBranch.repository
                ? this._knownRepositories[this._sourceBranch.repository.id]
                : this._currentRepository;
        }

        if (this._targetBranch) {
            // Check to see if the target repository is still valid (it may not be after the source changes), and reset it if it is not
            const targetRepo = this._targetBranch.repository
                ? this._knownRepositories[this._targetBranch.repository.id]
                : null;

            this._targetBranch.repository = targetRepo || this.getParentFork() || this._currentRepository;
        }
    }

    public switchBranches(): void {
        if (this._sourceBranch || this._targetBranch) {
            const newTarget = this._sourceBranch;
            this._sourceBranch = this._targetBranch;
            this._targetBranch = newTarget;
            this._mergeBase = null;
            this._existingPullRequestId = null;
            this.emitChanged();
        }
    }

    public getSourceBranch(): BranchInfo {
        return this._sourceBranch;
    }

    public getTargetBranch(): BranchInfo {
        return this._targetBranch;
    }

    // repo and branch are separate calls because we may not have selected any branch and we stil
    // want the repository

    public getSourceRepository(): GitRepository {
        return this._sourceBranch && this._sourceBranch.repository ? this._sourceBranch.repository : this._currentRepository;
    }

    public getTargetRepository(): GitRepository {
        return this._targetBranch && this._targetBranch.repository ? this._targetBranch.repository : this.getParentFork() || this._currentRepository;
    }

    public getSourceRepositoryContext(): GitRepositoryContext {
        return GitRepositoryContext.create(this.getSourceRepository(), this._tfsContext);
    }

    public getParentFork(): GitRepository {
        if (this._knownRepositories) {
            return this._forkParentRepositoryId ? this._knownRepositories[this._forkParentRepositoryId] : null;
        }

        return null;
    }

    public getSourceSpec(): string {
        return this._resolveSpecString(this.getSourceBranch());
    }

    public getTargetSpec(): string {
        const branch = this.getTargetBranch();

        if (!branch) {
            return null;
        }

        if (this.isFork() && !this._mergeBase) {
            throw new Error("Merge base must be re-calculated for forks.");
        }

        if (this._mergeBase) {
            return this._mergeBase.toVersionString()
        }
        else {
            return branch.commitVersionSpec ? branch.commitVersionSpec.toVersionString() : branch.branchVersionSpec.toVersionString();
        }
    }

    private _resolveSpecString(branch: BranchInfo): string {
        if (!branch) {
            return null;
        }

        return branch.commitVersionSpec ? branch.commitVersionSpec.toVersionString() : branch.branchVersionSpec.toVersionString();
    }

    public hasExistingPullRequest(): boolean {
        if (!(this._existingPullRequestId == Constants.NO_PULL_REQUEST_FOUND || this._existingPullRequestId > 0)) {
            throw new Error("Pull request Id not initialized in BranchesStore.");
        }

        return this._existingPullRequestId !== Constants.NO_PULL_REQUEST_FOUND;
    }

    public hasBranches(): boolean {
        return (
            !!this._sourceBranch &&
            !!this._sourceBranch.branchVersionSpec &&
            !!this._targetBranch &&
            !!this._targetBranch.branchVersionSpec);
    }

    public isFork(): boolean {
        return this._sourceBranch &&
            this._sourceBranch.repository &&
            this._targetBranch &&
            this._targetBranch.repository &&
            this._sourceBranch.repository.id !== this._targetBranch.repository.id;
    }

    public getAvailableRepositories(): GitRepository[] {
        return Object.keys(this._knownRepositories).map(key => this._knownRepositories[key]).sort((a, b) => a.name.localeCompare(b.name));
    }
}
