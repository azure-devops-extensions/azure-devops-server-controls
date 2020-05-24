import Q = require("q");

import Git_Client = require("TFS/VersionControl/GitRestClient");
import ReactSource = require("VersionControl/Scripts/Sources/Source");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Utils_String = require("VSS/Utils/String");
import VCContracts = require("TFS/VersionControl/Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCPullRequest = require("VersionControl/Scripts/TFS.VersionControl.PullRequest");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import { getGitRefService } from "VersionControl/Scripts/Services/GitRefService";

export interface IGitRepositorySource {
    checkBranchStatusAsync(
        branchRefName: string,
        branchCommitIdAtLastMerge: string):
        IPromise<VCPullRequest.IBranchStatus>;
    deleteRef(repositoryId: string, oldObjectId: string, refName: string): IPromise<VCContracts.GitRefUpdateResult>;
    invalidateRefsCache(): void;
    getItemDetailAsync(path: string, version: string): IPromise<VCLegacyContracts.ItemModel>;
    queryCommitsAsync(sourceBranchVersion: string, targetBranchVersion: string, top: number): IPromise<VCContracts.GitCommitRef[]>;
    queryBypassPermission(refName: string): boolean;
    queryTeamExpansionEnabled(): boolean;
    queryRepositoryUseLimitedRef(): boolean;
    resetCache(): void;
}

export class GitRepositorySource extends ReactSource.CachedSource implements IGitRepositorySource {
    private static DATA_ISLAND_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-data-provider";
    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailProvider";

    private _gitRestClient: Git_Client.GitHttpClient;
    private _repositoryId: string;
    private _projectId: string;

    // diff commit and item detail rely on the legacy API
    private _repositoryContext: GitRepositoryContext;

    constructor(projectId: string, repositoryId: string, repositoryContext: GitRepositoryContext) {
        super(GitRepositorySource.DATA_ISLAND_PROVIDER_ID, GitRepositorySource.DATA_ISLAND_CACHE_PREFIX);

        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);
        this._repositoryId = repositoryId;
        this._projectId = projectId;

        this._repositoryContext = repositoryContext;
    }

    /**
     * Create a branch status object based on the result of a git ref query.
     * @param branchRefName
     * @param branchCommitIdAtLastMerge
     */
    public checkBranchStatusAsync(
        branchRefName: string,
        branchCommitIdAtLastMerge: string):
        IPromise<VCPullRequest.IBranchStatus> {

        return this._getGitRefAsync(branchRefName)
            .then(gitRefs => {
                // create success result first
                const result = new VCPullRequest.BranchStatus(this._repositoryContext, branchRefName, false, null);

                if (gitRefs && gitRefs.length > 0) {
                    // The refs endpoint matches ref name that start with the ref requested
                    // In 99% of the cases the array will have only one ref, it will have more 
                    // than one incase there is a ref called "refs/heads/bug" && "refs/heads/bugfixes"
                    let ref: VCContracts.GitRef = null;
                    $.each(gitRefs, (index, gitRef: VCContracts.GitRef) => {
                        if (Utils_String.localeComparer(gitRef.name, branchRefName) === 0) {
                            ref = gitRef;
                            return false;
                        }
                    });

                    if (ref) {
                        result.headCommitId = ref.objectId;
                        result.headOutOfDate = Utils_String.ignoreCaseComparer(result.headCommitId, branchCommitIdAtLastMerge) !== 0;

                        const { currentIdentity } = this._repositoryContext.getTfsContext();
                        result.isUserCreated = ref.creator && ref.creator.id === currentIdentity.id;
                    }
                }

                return result;
            });
    }

    /**
     * Query git ref info for a given branch.
     * @param branchRefName
     */
    private _getGitRefAsync(branchRefName: string): IPromise<VCContracts.GitRef[]> {
        const cached = this.fromCacheAsync<VCContracts.GitRef[]>(
            "GitRef." + branchRefName,
            VCContracts.TypeInfo.GitRef);
        if (cached) {
            return cached;
        }

        if (branchRefName.slice(0, 5) == "refs/") {
            branchRefName = branchRefName.substr(5);
        }

        return this._gitRestClient.getRefs(this._repositoryId, this._projectId, branchRefName);
    }

    public deleteRef(repositoryId: string, oldObjectId: string, refName: string): IPromise<VCContracts.GitRefUpdateResult> {
        const refUpdate: VCContracts.GitRefUpdate = {
            repositoryId: repositoryId,
            name: refName,
            oldObjectId: oldObjectId,
            newObjectId: "0000000000000000000000000000000000000000",
            isLocked: undefined,
        }

        this.invalidateRefsCache();

        return this._gitRestClient.updateRefs([refUpdate], repositoryId)
            .then(resultList => {
                if (!resultList[0].success) {
                    throw new Error(resultList[0].customMessage || VCContracts.GitRefUpdateStatus[resultList[0].updateStatus]);
                }

                return resultList[0];
            });
    }

    public invalidateRefsCache(): void {
        getGitRefService(this._repositoryContext).invalidateCache();
    }

    /**
     * Retrieve details about a Git repo item.
     */
    public getItemDetailAsync(path: string, version: string): IPromise<VCLegacyContracts.ItemModel> {
        return Q.Promise<VCLegacyContracts.ItemModel>((resolve, reject) => {
            (<GitRepositoryContext>this._repositoryContext).getGitClient().beginGetItem(
                this._repositoryContext,
                path,
                version, <VCLegacyContracts.ItemDetailsOptions>{
                    includeContentMetadata: true,
                    includeVersionDescription: true
                }, (item: VCLegacyContracts.ItemModel) => {
                    resolve(item);
                }, (error) => {
                    reject(error);
                });
        });
    }

    /**
     * Query commits between two branches.
     * @param sourceBranchVersion
     * @param targetBranchVersion
     * @param top maximum number of commits to retrieve
     */
    public queryCommitsAsync(sourceBranchVersion: string, targetBranchVersion: string, top: number = 250): IPromise<VCContracts.GitCommitRef[]> {

        const searchCriteria: VCContracts.GitQueryCommitsCriteria = <any>{
            top: top,
            itemVersion: targetBranchVersion,
            compareVersion: sourceBranchVersion
        }

        return this._gitRestClient.getCommitsBatch(searchCriteria, this._repositoryId, this._projectId);
    }

    /**
     * Query permission to bypass blocking policis on referenced branch.
     * @param ref
     */
    public queryBypassPermission(refName: string): boolean {

        if (!refName) {
            return false;
        }

        // check for cached value in data island only (not calling a REST API to get this data)
        return this.fromCache<boolean>("PolicyBypassPermission." + refName);
    }

    public queryTeamExpansionEnabled(): boolean {
        return this.fromCache<boolean>("TeamExpansionEnabled");
    }

    public queryRepositoryUseLimitedRef(): boolean {
        return this.fromCache<boolean>("RepositoryUseLimitedRef");
    }
}
