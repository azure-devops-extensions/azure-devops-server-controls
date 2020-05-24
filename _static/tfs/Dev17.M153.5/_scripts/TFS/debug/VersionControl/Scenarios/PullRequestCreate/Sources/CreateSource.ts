import * as Q from "q";

import { ContractSerializer } from "VSS/Serialization";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import { ResourceRef } from "VSS/WebApi/Contracts";
import { WebApiTagDefinition } from "TFS/Core/Contracts";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as Constants from "VersionControl/Scenarios/PullRequestCreate/Constants";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";

import { PersonMentionTranslator } from "VersionControl/Scripts/Utils/DiscussionUtils";

import {
    AssociatedWorkItem,
    ChangeListSearchCriteria,
    GitPullRequest,
    GitRepositoryRef,
    GitPullRequestSearchCriteria,
    GitRef,
    GitRepository,
    PullRequestStatus,
    TypeInfo
} from "TFS/VersionControl/Contracts";

import * as ReactSource from "VersionControl/Scripts/Sources/Source";

import { getFullRefNameFromBranch } from "VersionControl/Scripts/GitRefUtility";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCPullRequestsControls from "VersionControl/Scripts/Controls/PullRequest";
import * as Telemetry from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

const DATA_ISLAND_CONTRIBUTION_ID = "ms.vss-code-web.pull-request-create-data-provider";
const DATA_ISLAND_PREFIX = "pullrequestcreate";
const DATA_ISLAND_EXISTING_PR_SUFFIX = "ActivePullRequest";
const DATA_ISLAND_SOURCE_REF_SUFFIX = "sourceRef";
const DATA_ISLAND_TARGET_REF_SUFFIX = "targetRef";
const DATA_ISLAND_TEMPLATE_SUFFIX = "template";
const DATA_ISLAND_TEMPLATES_SUFFIX  = "templateList";
const DATA_ISLAND_FORK_REPOSITORIES_SUFFIX = "ForkRepositories";
const DATA_ISLAND_FORK_PARENT_SUFFIX = "SourceRepositoryForkParent";
const DATA_ISLAND_DEFAULT_TEMPLATE_PATH_SUFFIX = "defaultTemplatePath";
const DATA_ISLAND_TEMPLATE_QUERY_STRING_SUFFIX = "templateQueryString";

export interface ForkDataProviderResult {
    repositories: GitRepository[];
    parentRepositoryId: string;
    template: string;
    templateList: string[];
    defaultTemplatePath: string;
}

export interface ICreateSource {
    getCachedTemplateQueryString(): string;
    getCachedSourceRef(): string;
    getRepositoryForkData(repositoryId: string, repositoryContext: GitRepositoryContext): IPromise<ForkDataProviderResult>;
    getCachedTargetRef(): string;
    getExistingPullRequestId(
        targetRepositoryId: string,
        sourceRepositoryId: string,
        sourceBranchName: string,
        targetBranchName: string): IPromise<number>;
    getCommitDiff(
        repositoryContext: GitRepositoryContext,
        sourceBranchVersion: string,
        targetBranchVersion: string): IPromise<VCLegacyContracts.GitCommit>;
    getAssociatedWorkItems(repositoryContext: GitRepositoryContext, versions: string[]): IPromise<AssociatedWorkItem[]>;
    getHistory(repositoryContext: GitRepositoryContext, source: string, target: string, top: number): IPromise<VCLegacyContracts.GitHistoryQueryResults>;
    getMergeBase(
        targetRepositoryId: string,
        targetCommitId: string,
        sourceRepositoryId: string,
        sourceCommitId: string): IPromise<GitCommitVersionSpec>;
    getChangeList(repoContext: GitRepositoryContext, version: string, maxChanges: number): IPromise<VCLegacyContracts.ChangeList>;
    getRef(repository: GitRepository, branchName: string): Q.Promise<GitRef>
    createPullRequest(
        sourceRepo: GitRepository,
        targetRepo: GitRepository,
        sourceBranchName: string,
        targetBranchName: string,
        title: string,
        description: string,
        reviewers: IdentityRef[],
        workItemRefs: ResourceRef[],
        labels: WebApiTagDefinition[],
        isDraft: boolean): IPromise<GitPullRequest>;
    getTemplateContent(
        repoContext: GitRepositoryContext,
        targetRepo: string,
        path: string): Q.Promise<string>;
}

export class CreateSource extends ReactSource.CachedSource implements ICreateSource {
    private _client: GitClientService;
    private _gitClient: GitHttpClient;

    constructor() {
        super(DATA_ISLAND_CONTRIBUTION_ID, DATA_ISLAND_PREFIX);
        this._client = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getService<GitClientService>(GitClientService);
        this._gitClient = this._getGitClient();
    }

    public getCachedTemplateQueryString(): string {
        const cached = this.fromCache(DATA_ISLAND_TEMPLATE_QUERY_STRING_SUFFIX);
        if(!cached) {
            return null;
        }

        return decodeURIComponent(<string>cached);
    }

    public getCachedSourceRef(): string {
        const cached = this.fromCache(DATA_ISLAND_SOURCE_REF_SUFFIX);

        if (!cached) {
            return null;
        }

        return decodeURIComponent(<string>cached);
    }

    public getRepositoryForkData(sourceRepositoryId: string, repositoryContext: GitRepositoryContext): IPromise<ForkDataProviderResult> {
        if (!sourceRepositoryId || sourceRepositoryId === repositoryContext.getRepositoryId()) {
            const cachedRepositories = this.fromCache<GitRepository[]>(DATA_ISLAND_FORK_REPOSITORIES_SUFFIX, TypeInfo.GitRepository);
            const cachedParentRepository = this.fromCache<GitRepositoryRef>(DATA_ISLAND_FORK_PARENT_SUFFIX, TypeInfo.GitRepositoryRef);
            const cachedTemplate = this.fromCache(DATA_ISLAND_TEMPLATE_SUFFIX);
            const cachedTemplates = this.fromCache(DATA_ISLAND_TEMPLATES_SUFFIX);
            const cachedTemplatePath = this.fromCache(DATA_ISLAND_DEFAULT_TEMPLATE_PATH_SUFFIX);

            if (cachedRepositories || cachedParentRepository || cachedTemplate || cachedTemplates) {
                return Q.resolve<ForkDataProviderResult>({
                    repositories: cachedRepositories,
                    parentRepositoryId: cachedParentRepository ? cachedParentRepository.id : null,
                    template: cachedTemplate,
                    templateList: cachedTemplates,
                    defaultTemplatePath: cachedTemplatePath,
                } as ForkDataProviderResult);
            }
        }

        const webPageDataService = getService(WebPageDataService);
        return webPageDataService.getDataAsync(DATA_ISLAND_CONTRIBUTION_ID, null, { "sourceRepositoryId": sourceRepositoryId })
            .then(data => {
                data = data || {};

                const repoData = data[`${DATA_ISLAND_PREFIX}.${DATA_ISLAND_FORK_REPOSITORIES_SUFFIX}`] || [];
                const parentRepositoryIdData = data[`${DATA_ISLAND_PREFIX}.${DATA_ISLAND_FORK_PARENT_SUFFIX}`] || null;
                const repositories: GitRepository[] = ContractSerializer.deserialize(repoData, TypeInfo.GitRepository);
                const parentRepository: GitRepositoryRef = ContractSerializer.deserialize(parentRepositoryIdData, TypeInfo.GitRepositoryRef);
                const template = data[`${DATA_ISLAND_PREFIX}.${DATA_ISLAND_TEMPLATE_SUFFIX}`] || "";
                const templateList = data[`${DATA_ISLAND_PREFIX}.${DATA_ISLAND_TEMPLATES_SUFFIX}`] || [];
                const defaultTemplatePath = data[`${DATA_ISLAND_PREFIX}.${DATA_ISLAND_DEFAULT_TEMPLATE_PATH_SUFFIX}`] || "";

                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(
                        CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                        CustomerIntelligenceConstants.PULL_REQUEST_TEMPLATE_SELECTION_FEATURE,
                        {
                            TemplateCount: templateList ? templateList.length : 0,
                            HasDefaultTemplate: template != null,
                        }),
                    true);

                return {
                    parentRepositoryId: parentRepository ? parentRepository.id : null,
                    repositories,
                    template,
                    templateList,
                    defaultTemplatePath
                } as ForkDataProviderResult;
            });
    }

    public getCachedTargetRef(): string {
        const cached = this.fromCache<string>(DATA_ISLAND_TARGET_REF_SUFFIX);

        if (!cached) {
            return null;
        }

        return decodeURIComponent(<string>cached);
    }

    public getExistingPullRequestId(
        targetRepositoryId: string,
        sourceRepositoryId: string,
        sourceBranchName: string,
        targetBranchName: string): IPromise<number> {

        const cacheKey = `${sourceBranchName}.${targetBranchName}.${sourceRepositoryId}.${DATA_ISLAND_EXISTING_PR_SUFFIX}`;
        const cached = this.fromCacheAsync(cacheKey);

        return Q.Promise<number>((resolve, reject) => {
            if (cached) {
                cached.then(result => resolve(Number(result)));
                return;
            }

            const searchCriteria: GitPullRequestSearchCriteria = {
                repositoryId: targetRepositoryId,
                targetRefName: getFullRefNameFromBranch(targetBranchName),
                status: PullRequestStatus.Active,
                sourceRepositoryId,
                sourceRefName: getFullRefNameFromBranch(sourceBranchName),
            } as GitPullRequestSearchCriteria;

            this._client.beginGetPullRequestSearch(
                searchCriteria,
                null,
                null,
                (resultPullRequests: GitPullRequest[]) => {
                    resolve(resultPullRequests.length > 0 ? resultPullRequests[0].pullRequestId : Constants.NO_PULL_REQUEST_FOUND);
                },
                (error: any) => {
                    reject(error);
                });
        });
    }

    public getCommitDiff(
        repositoryContext: GitRepositoryContext,
        sourceBranchVersion: string,
        targetBranchVersion: string): IPromise<VCLegacyContracts.GitCommit> {

        return Q.Promise<VCLegacyContracts.GitCommit>((resolve, reject) => {
            this._client.beginGetCommitFileDiff(
                repositoryContext,
                targetBranchVersion,
                sourceBranchVersion,
                VCPullRequestsControls.MAX_CHANGES_TO_FETCH,
                0,
                result => {
                    resolve(result);
                },
                reason => {
                    reject(reason);
                });
        });
    }

    public getAssociatedWorkItems(repositoryContext: GitRepositoryContext, versions: string[]): IPromise<AssociatedWorkItem[]> {
        return this._client.beginGetAssociatedWorkItemsPromise(repositoryContext, versions);
    }

    public getHistory(repositoryContext: GitRepositoryContext, source: string, target: string, top: number): IPromise<VCLegacyContracts.GitHistoryQueryResults> {
        const searchCriteria = {
            top: top,
            itemVersion: target,
            compareVersion: source,
        } as ChangeListSearchCriteria;

        return Q.Promise<VCLegacyContracts.GitHistoryQueryResults>((resolve, reject) => {
            this._client.beginGetHistory(
                repositoryContext,
                searchCriteria,
                result => {
                    resolve(result as VCLegacyContracts.GitHistoryQueryResults)
                },
                reason => {
                    reject(reason);
                });
        });
    }

    public getMergeBase(
        targetRepositoryId: string,
        targetCommitId: string,
        sourceRepositoryId: string,
        sourceCommitId: string
    ): IPromise<GitCommitVersionSpec> {

        if (!targetRepositoryId ||
            !sourceRepositoryId ||
            !targetCommitId ||
            !sourceCommitId) {
            return Promise.reject(VCResources.PullRequestCreate_FailedToDetermineMergeBase);
        }

        return this._gitClient.getMergeBases(targetRepositoryId, targetCommitId, sourceCommitId, null, null, sourceRepositoryId)
            .then((gcr) => {
                if (gcr && gcr.length >= 1) {
                    return new GitCommitVersionSpec(gcr[0].commitId);
                }
                else if (gcr && gcr.length == 0) {
                    // no common merge base was found so use the existing target commit as the base
                    return new GitCommitVersionSpec(targetCommitId);
                }
                else {
                    const errMessage = VCResources.GetMergeBaseError;
                    throw new Error(errMessage);
                }
            });
    }

    public getChangeList(repoContext: GitRepositoryContext, version: string, maxChanges: number): IPromise<VCLegacyContracts.ChangeList> {
        return this._client.beginGetChangeListPromise(repoContext, version, maxChanges);
    }

    // store a cache of ref resolutions we have already performed.
    private _refs: IDictionaryStringTo<Q.Promise<GitRef>> = {};

    /**
     * Retrieve ref information for a given branch in a repository.
     */
    public getRef(repository: GitRepository, branchName: string): Q.Promise<GitRef> {
        if (!repository) {
            return Q.Promise<GitRef>(null);
        }

        const key = repository.id + branchName;
        let promise = this._refs[key];
        if (promise) {
            return promise;
        }

        promise = Q.Promise<GitRef>((resolve, reject) => {
            this._client.beginGetGitRef(
                repository,
                branchName,
                (refs: GitRef[]) => {
                    resolve(refs && refs[0] ? refs[0] : null);
                },
                error => reject(error));
        });

        this._refs[key] = promise;

        return promise;
    }

    public getTemplateContent(repoContext: GitRepositoryContext, targetRepoId: string, path: string): Q.Promise<string> {
        return Q.Promise<string>((resolve, reject) =>
            this._client.beginGetItemContentWithRepoId(repoContext, targetRepoId, path, null, resolve, reject));
    }

    // store a cache of pull request checks we have already performed.
    private _hasPullRequest: IDictionaryStringTo<Q.Promise<GitPullRequest>> = {};

    public createPullRequest(
        sourceRepo: GitRepository,
        targetRepo: GitRepository,
        sourceBranchName: string,
        targetBranchName: string,
        title: string,
        description: string,
        reviewers: IdentityRef[],
        workItemRefs: ResourceRef[],
        labels: WebApiTagDefinition[],
        isDraft: boolean): IPromise<GitPullRequest> {

        const key = sourceBranchName + targetBranchName + sourceRepo.id;
        let promise: Q.Promise<GitPullRequest> =
            this._hasPullRequest[key];

        // Return the cached promise if it's not yet resolved, to avoid a duplicate REST request
        // Otherwise, hit the API again and create/cache a new promise
        if (promise && promise.isPending()) {
            return promise;
        }

        promise = Q.Promise<GitPullRequest>((resolve, reject) => {
            this._client.beginCreatePullRequest(
                sourceRepo,
                targetRepo,
                sourceBranchName,
                targetBranchName,
                title,
                PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInText(description),
                reviewers,
                workItemRefs,
                labels,
                isDraft,
                (pr) => resolve(pr),
                (error) => reject(error))
        });

        this._hasPullRequest[key] = promise;

        return promise;
    }

    private _getGitClient(): GitHttpClient {
        return ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);
    }
}