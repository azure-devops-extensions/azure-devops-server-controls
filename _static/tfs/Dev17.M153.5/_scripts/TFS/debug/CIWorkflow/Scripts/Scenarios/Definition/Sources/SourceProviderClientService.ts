/// <reference types="jquery" />

import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { RepositoryProperties } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { GitServiceConstants } from "CIWorkflow/Scripts/Common/Constants";

import { SourceRepositoryItem } from "TFS/Build/Contracts";
import { WebApiTagDefinition } from "TFS/Core/Contracts";
import * as VCContracts from "TFS/VersionControl/Contracts";

import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as GitItemUtils from "VersionControl/Scripts/GitItemUtils";
import { IVersionControlClientService } from "VersionControl/Scripts/IVersionControlClientService";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { VersionControlClientServiceBase } from "VersionControl/Scripts/VersionControlClientServiceBase";

import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import * as WebApi_Contracts from "VSS/WebApi/Contracts";

export class SourceProviderClientService extends VersionControlClientServiceBase implements IVersionControlClientService {
    private _buildClient: BuildClientService;
    private _itemMap: IDictionaryStringTo<VCLegacyContracts.GitItem> = {};
    private _itemsFetched: IDictionaryStringTo<boolean> = {};
    private _repositoryType: string;

    constructor(repositoryType: string, buildClient?: BuildClientService) {
        super();

        if (!buildClient) {
            buildClient = Service.getCollectionService(BuildClientService);
        }

        this._repositoryType = repositoryType;
        this._buildClient = buildClient;
    }

    // This is called by the source explorer control when the path chooser is loaded
    public beginGetItem(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (item: VCLegacyContracts.ItemModel) => void,
        errorCallback?: IErrorCallback) {

        if (path !== "/") {
            if (callback && this._itemMap[path]) {
                callback(this._itemMap[path]);
                return;
            }
        }

        const repository = repositoryContext.getRepository();
        const branch = repository.data[GitServiceConstants.branch];

        // This method is only called when the path chooser is loaded, and is only intended to be used
        // to retrieve the root's contents.  So, ignore the path passed in and request the root.
        this._getPathContents(repository, "/", branch, callback, errorCallback);
    }

    // This is called by the source tree control when a folder node is expanded
    public beginGetItems(
        repositoryContext: RepositoryContext,
        itemsToFetch: any,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (items: VCLegacyContracts.ItemModel[]) => void,
        errorCallback?: IErrorCallback) {

        const path = this._ensurePath(itemsToFetch[0].path, false);

        if (this._itemsFetched[path]) {
            // already fetched item, noop, preventing any duplicate calls
            return;
        }

        const repository = repositoryContext.getRepository();
        this._getPathContents(repository, itemsToFetch[0].path, itemsToFetch[0].version, item => callback([item]), errorCallback);
    }

   public beginGetItemContent(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (item: string) => void,
        errorCallback?: IErrorCallback) {

        const repository = repositoryContext.getRepository();
        const serviceEndpointId = repository.data[RepositoryProperties.ConnectedServiceId];
        const branch = repository.data[GitServiceConstants.branch];
        const repositoryId = repository.name;

        this._buildClient.getFileContents(serviceEndpointId, this._repositoryType, path, repositoryId, version || branch)
            .then(callback, errorCallback);
    }

    public beginGetItemContentJson(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (content: VCLegacyContracts.FileContent) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetFileDiff(
        repositoryContext: RepositoryContext,
        diffParameters: VCLegacyContracts.FileDiffParameters,
        callback?: (diffModel: VCLegacyContracts.FileDiff) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetFileDiffs(
        repositoryContext: RepositoryContext,
        diffParameters: VCLegacyContracts.FileDiffParameters[],
        callback?: (diffModels: VCLegacyContracts.FileDiff[]) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetHistory(
        repositoryContext: RepositoryContext,
        searchCriteria: VCContracts.ChangeListSearchCriteria,
        callback?: (result: VCLegacyContracts.HistoryQueryResults) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetChangeList(
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number,
        callback: (changeList: VCLegacyContracts.ChangeList) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginFetchMoreChanges(
        repositoryContext: RepositoryContext,
        changeList: VCLegacyContracts.ChangeList,
        maxChangesToInclude: number,
        callback: (changeList: VCLegacyContracts.ChangeList) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetChangeListChanges(
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number,
        skipCount: number,
        callback: (result: VCLegacyContracts.ChangeQueryResults) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetAssociatedWorkItems(
        repositoryContext: RepositoryContext,
        versions: string[],
        callback?: (workItems: VCContracts.AssociatedWorkItem[]) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetAuthors(
        repositoryContext: RepositoryContext,
        callback: (authors: VCLegacyContracts.TeamIdentityReference[]) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetUserPreferences(
        callback: (preferences: VCWebAccessContracts.VersionControlUserPreferences) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginUpdateUserPreferences(
        preferences: VCWebAccessContracts.VersionControlUserPreferences,
        callback?: IResultCallback,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetRepositoryOptions(
        repositoryContext: RepositoryContext,
        callback: (results: VCWebAccessContracts.VersionControlRepositoryOption[]) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginUpdateRepositoryOption(
        repositoryContext: RepositoryContext,
        option: VCWebAccessContracts.VersionControlRepositoryOption,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetPullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: (pullRequest: VCContracts.GitPullRequest) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetPullRequestSearch(
        searchCriteria: VCContracts.GitPullRequestSearchCriteria,
        top: number,
        skip: number,
        callback: (pullRequests: VCContracts.GitPullRequest[]) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetPullRequests(
        repositoryContext: RepositoryContext,
        status: any,
        creatorId: any,
        reviewerId: any,
        sourceBranchName: any,
        targetBranchName: any,
        top: number,
        skip: number,
        callback: (pullRequests: VCContracts.GitPullRequest[], status: any, creatorId: any, reviewerId: any) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginCreatePullRequest(
        sourceRepo: VCContracts.GitRepository,
        targetRepo: VCContracts.GitRepository,
        sourceBranchName: string,
        targetBranchName: string,
        title: string,
        description: string,
        reviewers: WebApi_Contracts.IdentityRef[],
        workItemRefs: WebApi_Contracts.ResourceRef[],
        labels: WebApiTagDefinition[],
        isDraft: boolean,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginUpdatePullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        data: any,
        callback: (pullRequest: VCContracts.GitPullRequest) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginUpdatePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: (reviewer: VCContracts.IdentityRefWithVote) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginAddPullRequestTfsReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: (reviewer: VCContracts.IdentityRefWithVote) => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginAddPullRequestAadReviewers(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewers: WebApi_Contracts.IdentityRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetPullRequestWorkItemsResourceRef(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: IResultCallback,
        commitsTop?: number,
        commitsSkip?: number,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginDeletePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        callback: () => void,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetReferencedWorkItems(
        resourceRefs: WebApi_Contracts.ResourceRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public beginGetPullRequestPolicyEvaluations(
        repositoryContext: RepositoryContext,
        projectId: string,
        pullRequestArtifactId: string,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
        // not implemented
    }

    public _setUserPreferencesFromViewData(
        preferences: VCWebAccessContracts.VersionControlUserPreferences) {
        // not implemented
    }

    public _getChangeListFromJsonIsland(
        $jsonIsland: JQuery,
        remove: boolean) {
        // not implemented
    }

    private _getPathContents(
        repository: any,
        path: string,
        version: string,
        callback?: (item: VCLegacyContracts.ItemModel) => void,
        errorCallback?: IErrorCallback): void {
        const serviceEndpointId = repository.data[RepositoryProperties.ConnectedServiceId];
        const branch = repository.data[GitServiceConstants.branch];
        const repositoryId = repository.name;

        this._buildClient.getPathContents(serviceEndpointId, this._repositoryType, path, repositoryId, branch).then(
            items => {
                // gitItemArrayToLegacyGitItem takes the first item in the array and adds all subsequent items as its children
                // so here we create that root item
                const gitItems: VCContracts.GitItem[] = [this._toGitItem({ path: path, isContainer: true, url: Utils_String.empty, type: Utils_String.empty })];

                items.forEach(item => {
                    const gitItem = this._toGitItem(item);
                    gitItems.push(gitItem);

                    // Folders can only be cached if they are the item that is being retrieved
                    if (!gitItem.isFolder) {
                        this._itemMap[item.path] = GitItemUtils.gitItemToLegacyGitItem(gitItem, null);
                    }
                });

                this._itemsFetched[path] = true;
                this._itemMap[path] = GitItemUtils.gitItemArrayToLegacyGitItem(gitItems, version, null);
                if (callback) {
                    callback(this._itemMap[path]);
                }
            },
            errorCallback);
    }

    private _ensurePath(path: string, pathShouldBeRooted: boolean = true) {
        if (path) {
            if (pathShouldBeRooted) {
                if (path[0] !== "/") {
                    path = "/" + path;
                }
            }
            else {
                if (path[0] === "/") {
                    path = path.slice(1, path.length);
                }
            }
        }
        return path;
    }

    private _toGitItem(item: SourceRepositoryItem): VCContracts.GitItem {
        return {
            content: null,
            contentMetadata: null,
            isSymLink: false,
            isFolder: item.isContainer,
            path: this._ensurePath(item.path),
            url: item.url,
            _links: null,
            commitId: null,
            gitObjectType: item.isContainer ? VCContracts.GitObjectType.Tree : VCContracts.GitObjectType.Tree,
            latestProcessedChange: null,
            objectId: null,
            originalObjectId: null
        };
    }
}