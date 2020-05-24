import * as Utils_String from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitPullRequest, GitRepository } from "TFS/VersionControl/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { BranchFavoriteStatus } from "VersionControl/Scripts/Stores/PullRequestReview/RefFavoritesStore";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

export class PullRequestCardInfo {
    public gitPullRequest: GitPullRequest;

    public targetRepositoryContext: GitRepositoryContext;
    public sourceRepositoryContext: GitRepositoryContext;

    private sourceRepository: GitRepository;
    private targetRepository: GitRepository;

    public authorDisplayName: string;
    public pullRequestHref: string;

    public targetBranchRefName: string;
    public targetBranchName: string;
    public targetBranchLabel: string;
    public targetBranchExplorerUrl: string;
    public targetBranchFavoriteId: number;
    public targetBranchCanFavorite: boolean;

    public sourceBranchRefName: string;
    public sourceBranchName: string;
    public sourceBranchLabel: string;
    public sourceBranchExplorerUrl: string;
    public sourceBranchFavoriteId: number;
    public sourceBranchCanFavorite: boolean;

    public targetRepositoryName: string;
    public targetRepositoryUrl: string;
    public targetRepositoryToolTip: string;

    public sourceRepositoryName: string;
    public sourceRepositoryUrl: string;
    public sourceRepositoryToolTip: string;

    public isFork: boolean;

    constructor(
        pullRequest: GitPullRequest,
        targetRepositoryContext?: RepositoryContext,
        sourceBranchFavorite?: BranchFavoriteStatus,
        targetBranchFavorite?: BranchFavoriteStatus,
    ) {

        this.gitPullRequest = pullRequest;

        this.targetRepositoryContext = targetRepositoryContext ?
            targetRepositoryContext as any as GitRepositoryContext :
            new GitRepositoryContext(TfsContext.getDefault(), pullRequest.repository);

        if (pullRequest.repository) {
            this.targetRepository = pullRequest.repository;
            if (pullRequest.repository.name){
                this.targetRepositoryName = pullRequest.repository.name;
                this.targetRepositoryUrl = PullRequestCardInfo._computeRepositoryUrl(this.targetRepositoryContext);
                this.targetRepositoryToolTip = PullRequestCardInfo._computeRepositoryToolTip(pullRequest.repository);
            }
        }

        if (pullRequest.forkSource && pullRequest.forkSource.repository) {
            this.sourceRepository = pullRequest.forkSource.repository;
            this.sourceRepositoryContext = new GitRepositoryContext(TfsContext.getDefault(), this.sourceRepository);

            if (pullRequest.forkSource.repository.name) {
                this.sourceRepositoryName = this.sourceRepository ? this.sourceRepository.name : "";
                this.sourceRepositoryUrl = PullRequestCardInfo._computeRepositoryUrl(this.sourceRepositoryContext);
                this.sourceRepositoryToolTip = PullRequestCardInfo._computeRepositoryToolTip(this.sourceRepository);
            } else {
                this.sourceRepositoryName = VCResources.PullRequest_ForkRepositoryDeleted;
                this.sourceRepositoryToolTip = VCResources.PullRequest_ForkRepositoryDeletedTooltip;
            }
        } else {
            this.sourceRepository = this.targetRepository;
            this.sourceRepositoryContext = this.targetRepositoryContext;
            this.sourceRepositoryName = this.targetRepositoryName;
            this.sourceRepositoryUrl = this.targetRepositoryUrl;
            this.sourceRepositoryToolTip = this.targetRepositoryToolTip;
        }

        if (this.sourceRepository && this.targetRepository) {
            this.isFork = this.sourceRepository.id !== this.targetRepository.id;
        }

        this.pullRequestHref = PullRequestCardInfo._computePullRequestHref(
            this.targetRepositoryContext,
            this.gitPullRequest.pullRequestId);
        this.authorDisplayName = pullRequest.createdBy.displayName;

        this.targetBranchRefName = pullRequest.targetRefName;
        this.targetBranchName = PullRequestCardInfo._getBranchFriendlyName(pullRequest.targetRefName);
        this.targetBranchExplorerUrl = PullRequestCardInfo._computeBranchExplorerUrl(
            this.targetRepositoryContext,
            this.targetBranchName);
        this.targetBranchLabel = Utils_String.format(VCResources.PullRequest_TargetBranch, this.targetBranchName);
        if (targetBranchFavorite) {
            this.targetBranchFavoriteId = targetBranchFavorite.favoriteId;
            this.targetBranchCanFavorite = targetBranchFavorite.canFavorite;
        }

        this.sourceBranchRefName = pullRequest.forkSource ? pullRequest.forkSource.name : pullRequest.sourceRefName;
        this.sourceBranchName = PullRequestCardInfo._getBranchFriendlyName(this.sourceBranchRefName);

        if (this.sourceRepository && this.sourceRepository.name) {
            this.sourceBranchExplorerUrl = PullRequestCardInfo._computeBranchExplorerUrl(
                this.sourceRepositoryContext,
                this.sourceBranchName);
        }

        this.sourceBranchLabel = Utils_String.format(VCResources.PullRequest_SourceBranch, this.sourceBranchName);
        if (sourceBranchFavorite) {
            this.sourceBranchFavoriteId = sourceBranchFavorite.favoriteId;
            this.sourceBranchCanFavorite = !this.isFork && sourceBranchFavorite.canFavorite;
        }
    }

    private static _computeRepositoryUrl(repositoryContext: GitRepositoryContext): string {
        const repository = repositoryContext.getRepository();
        return repository ?
            VersionControlUrls.getExplorerUrl(repositoryContext, null, null, null, PullRequestCardInfo._getRouteData(repository))
            : "";
    }

    private static _computeRepositoryToolTip(repository: GitRepository): string {
        return (repository && repository.project) ?
            Utils_String.htmlEncode(repository.project.name + "\\" + repository.name)
            : "";
    }

    private static _computePullRequestHref(
        repositoryContext: GitRepositoryContext,
        pullRequestId: number): string {
        const repository = repositoryContext.getRepository();

        return VersionControlUrls.getPullRequestUrl(
            repositoryContext,
            pullRequestId,
            null,
            null,
            PullRequestCardInfo._getRouteData(repository));
    }

    private static _computeBranchExplorerUrl(
        repositoryContext: GitRepositoryContext,
        branchName: string): string {
        const repository = repositoryContext.getRepository();

        return VersionControlUrls.getExplorerUrl(
            repositoryContext,
            null,
            null,
            { version: new VCSpecs.GitBranchVersionSpec(branchName).toVersionString() },
            PullRequestCardInfo._getRouteData(repository)
        );
    }

    private static _getRouteData(repository: GitRepository): any {
        if (!repository || !repository.project) {
            return null;
        }
        return { project: repository.project.name };
    }

    private static _getBranchFriendlyName(branchRef: string): string {
        const refsHeads = "refs/heads/";
        if ((branchRef || "").indexOf(refsHeads) === 0) {
            return branchRef.substr(refsHeads.length);
        } else {
            return branchRef;
        }
    }

}
