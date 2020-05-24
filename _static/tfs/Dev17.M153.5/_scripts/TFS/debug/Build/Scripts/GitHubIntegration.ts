/// <reference types="jquery" />

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");
import {RepositoryTypes} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCContracts = require("TFS/VersionControl/Contracts");
import { WebApiTagDefinition } from "TFS/Core/Contracts";
import * as GitItemUtils from "VersionControl/Scripts/GitItemUtils";
import {IVersionControlClientService} from "VersionControl/Scripts/IVersionControlClientService";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {VersionControlClientServiceBase} from "VersionControl/Scripts/VersionControlClientServiceBase";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");

import Service = require("VSS/Service");
import SHCommon = require("VSS/Common/Contracts/FormInput");
import Utils_String = require("VSS/Utils/String");
import WebApi_Contracts = require("VSS/WebApi/Contracts");

export class GitHubRepository {
    public name: string;
    private _url: string;
    public id: string;
    public data: { [key: string]: string; };
    constructor(Repo: SHCommon.InputValue) {
        this.name = Repo.displayValue;
        this._url = Repo.value;
        this.data = Repo.data;
    }
}

export class GitHubRepositoryContext extends RepositoryContext {

    private _gitRepository: GitHubRepository;
    private _serviceHooksclient: IVersionControlClientService;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, gitRepository: GitHubRepository) {
        super(tfsContext, RepositoryType.GitHub, "/");
        this._gitRepository = gitRepository;
    }

    public static create(gitRepository: GitHubRepository, tfsContext?: TFS_Host_TfsContext.TfsContext) {
        return new GitHubRepositoryContext(tfsContext || TFS_Host_TfsContext.TfsContext.getDefault(), gitRepository);
    }

    public getRepository() {
        return this._gitRepository;
    }

    public _createClient(): IVersionControlClientService {
        return new GitHubClientService();
    }

    public getClient() {
        if (!this._serviceHooksclient) {
            this._serviceHooksclient = this._createClient();
        }
        return this._serviceHooksclient;
    }

    public getServiceHooksClient() {
        // Convenience method for use until TS generics are supported.
        return this.getClient();
    }

    public comparePaths(a: string, b: string): number {
        return Utils_String.localeComparer(a, b);
    }

    public getRepositoryId(): string {
        return this._gitRepository.id;
    }
}

export class GitHubClientService extends VersionControlClientServiceBase implements IVersionControlClientService {
    private _buildClient: BuildClient.BuildClientService;
    private _itemMap: IDictionaryStringTo<VCLegacyContracts.GitItem> = {};
    private _itemsFetched: IDictionaryStringTo<boolean> = {};

    constructor(buildClient?: BuildClient.BuildClientService) {
        super();
        var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        if (!buildClient) {
            buildClient = Service.getCollectionService(BuildClient.BuildClientService);
        }
        this._buildClient = buildClient;
    }

    /**
     * Preparing the InputValueQuery Controller to fetch the file content from server
     * 
     * @param repositoryContext: selected repo context
     * @param path: path to the file
     * @param version: version can commit id, tag, or branch name
     * @param callback: success callback
     * @param errorCallback: error callback
     */
    public beginGetItemContent(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (item: string) => void,
        errorCallback?: IErrorCallback) {

        var repository = repositoryContext.getRepository();
        var dictionary: { [key: string]: any } = {};

        dictionary[GitHubConstants.repositoryType] = RepositoryTypes.GitHub;
        dictionary[GitHubConstants.refsUrl] = repository.data[GitHubConstants.refsUrl];
        dictionary[GitHubConstants.repo] = repository.name;
        dictionary[GitHubConstants.branch] = repository.data[GitHubConstants.branch];
        dictionary[GitHubConstants.definitionId] = repository.data[GitHubConstants.definitionId];
        dictionary[GitHubConstants.project] = repositoryContext.getTfsContext().contextData.project.id;
        dictionary[GitHubConstants.path] = path;
        dictionary[GitHubConstants.version] = version;

        if (repository.data[GitHubConstants.username]) {
            dictionary[GitHubConstants.accessToken] = repository.data[GitHubConstants.username];
        }
        if (repository.data[GitHubConstants.connectedServiceId]) {
            dictionary[GitHubConstants.connectedServiceId] = repository.data[GitHubConstants.connectedServiceId];
        }

        var inputValues: SHCommon.InputValues[] = [];
        inputValues.push(<SHCommon.InputValues>{ inputId: GitHubConstants.repoFileContent });
        var query: SHCommon.InputValuesQuery = <SHCommon.InputValuesQuery>{
            currentValues: dictionary,
            inputValues: inputValues
        };

        this._buildClient.beginQueryInputValues(query).then(
            (query: SHCommon.InputValuesQuery) => {

                var value = query.inputValues[0];

                if (value && value.possibleValues) {
                    var result = value.possibleValues[0].value;
                    if ($.isFunction(callback)) {
                        callback(result);
                    }
                }
                if (value && value.error) {
                    var error = value.error.message;
                    if ($.isFunction(errorCallback)) {
                        errorCallback(error);
                    }
                }
            },
            (error) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }
            });
    }

    public beginGetItem(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (item: VCLegacyContracts.ItemModel) => void,
        errorCallback?: IErrorCallback) {

        // this is called by the source explorer control when the path chooser is loaded

        var repository = repositoryContext.getRepository();
        var dictionary: { [key: string]: any } = {};

        // yes, we are not setting dictionary[GitHubConstants.path], and yes, this is by design
        // since..
        // 1. only empty path is considered as root path by git service hooks, but "/" is root path per source explorer tree, we always get initial items under root path
        // 2. github api returns items per recursive level 1..however, the service hooks github publishers, ignores those items and returns only items at requested path
        //    we should be able to return children at recursive level 1 as well from that API - ParseBlobs of Microsoft.VisualStudio.Services.ServiceHooks.Sdk.Server.GitHubServiceHooksPublisher
        //    source explorer tree depends on this behaviour to accurately fetch and select items
        //    until we have service hooks api to return items with children, we will manage selection of items using _itemMap
        // fetching items under a particular path is handled by beginGetItems

        if (path != "/") {
            // There is no point in moving further in code to make any calls here, we always make root/empty path call in this method, just select the item instead
            if ($.isFunction(callback) && this._itemMap[path]) {
                callback(this._itemMap[path]);
                return;
            }
        }

        dictionary[GitHubConstants.repositoryType] = RepositoryTypes.GitHub;
        dictionary[GitHubConstants.refsUrl] = repository.data[GitHubConstants.refsUrl];
        dictionary[GitHubConstants.repo] = repository.name;
        dictionary[GitHubConstants.branch] = repository.data[GitHubConstants.branch];
        dictionary[GitHubConstants.definitionId] = repository.data[GitHubConstants.definitionId];
        dictionary[GitHubConstants.project] = repositoryContext.getTfsContext().contextData.project.id;

        if (repository.data[GitHubConstants.username]) {
            dictionary[GitHubConstants.accessToken] = repository.data[GitHubConstants.username];
        }
        if (repository.data[GitHubConstants.connectedServiceId]) {
            dictionary[GitHubConstants.connectedServiceId] = repository.data[GitHubConstants.connectedServiceId];
        }

        var inputValues: SHCommon.InputValues[] = [];
        inputValues.push(<SHCommon.InputValues>{ inputId: GitHubConstants.repoContent });
        var query: SHCommon.InputValuesQuery = <SHCommon.InputValuesQuery> {
            currentValues: dictionary,
            inputValues: inputValues
        };

        this._buildClient.beginQueryInputValues(query).then(
            (query: SHCommon.InputValuesQuery) => {
                var gitItems: VCContracts.GitItem[] = [];

                // gitItemArrayToLegacyGitItem takes the first item in the array and adds all subsequent items as its children
                // so here we create that root item
                var gitItem: VCContracts.GitItem = <VCContracts.GitItem>{
                    childItems: [],
                    commitId: "",
                    content: null,
                    contentMetadata: null,
                    gitObjectType: VCContracts.GitObjectType.Tree,
                    isFolder: true,
                    isSymLink: false,
                    latestProcessedChange: null,
                    objectId: "",
                    originalObjectId: null,
                    path: "/",
                    url: "",
                    _links: null
                };
                gitItems.push(gitItem);

                $.each(query.inputValues, (i: number, entry: SHCommon.InputValues) => {
                    $.each(entry.possibleValues, (j: number, value: SHCommon.InputValue) => {
                        var item: VCContracts.GitItem = <VCContracts.GitItem>{
                            childItems: [],
                            content: null,
                            contentMetadata: null,
                            isSymLink: false,
                            isFolder: value.data[GitHubConstants.isFolder] === 'True',
                            path: this._ensurePath(value.data[GitHubConstants.path]),
                            url: value.data[GitHubConstants.url],
                            _links: null,
                            commitId: null,
                            gitObjectType: null,
                            latestProcessedChange: null,
                            objectId: null,
                            originalObjectId: null
                        };
                        gitItems.push(item);
                        this._itemMap[value.data[GitHubConstants.path]] = GitItemUtils.gitItemToLegacyGitItem(item, null);
                    });
                });

                var versionDescriptor: any = null;
                var gitItemL: VCLegacyContracts.GitItem = GitItemUtils.gitItemArrayToLegacyGitItem(gitItems, repository.data[GitHubConstants.branch], versionDescriptor);
                if ($.isFunction(callback)) {
                    callback(gitItemL);
                    if (this._itemMap[path]) {
                        callback(this._itemMap[path]);
                    }
                }
            });
    }

    public beginGetItems(
        repositoryContext: RepositoryContext,
        itemsToFetch,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (items: VCLegacyContracts.ItemModel[]) => void,
        errorCallback?: IErrorCallback) {

        // this is called by the source tree control when a folder node is expanded

        var repository = repositoryContext.getRepository();
        var dictionary: { [key: string]: any } = {};
        var path = this._ensurePath(itemsToFetch[0].path, false);

        if (this._itemsFetched[path]) {
            // already fetched item, noop, preventing any duplicate calls
            return;
        }

        dictionary[GitHubConstants.repositoryType] = RepositoryTypes.GitHub;
        dictionary[GitHubConstants.refsUrl] = repository.data[GitHubConstants.refsUrl];
        dictionary[GitHubConstants.repo] = repository.name;
        dictionary[GitHubConstants.branch] = repository.data[GitHubConstants.branch];
        dictionary[GitHubConstants.definitionId] = repository.data[GitHubConstants.definitionId];
        dictionary[GitHubConstants.project] = repositoryContext.getTfsContext().contextData.project.id;
        dictionary[GitHubConstants.path] = path;

        if (repository.data[GitHubConstants.username]) {
            dictionary[GitHubConstants.accessToken] = repository.data[GitHubConstants.username];
        }
        if (repository.data[GitHubConstants.connectedServiceId]) {
            dictionary[GitHubConstants.connectedServiceId] = repository.data[GitHubConstants.connectedServiceId];
        }

        var inputValues: SHCommon.InputValues[] = [];
        inputValues.push(<SHCommon.InputValues>{ inputId: GitHubConstants.repoContent });
        var query: SHCommon.InputValuesQuery = <SHCommon.InputValuesQuery> {
            currentValues: dictionary,
            inputValues: inputValues
        };

        this._buildClient.beginQueryInputValues(query).then(
            (query: SHCommon.InputValuesQuery) => {
                var gitItems: VCContracts.GitItem[] = [];

                this._itemsFetched[path] = true;

                $.each(query.inputValues, (i: number, entry: SHCommon.InputValues) => {
                    $.each(entry.possibleValues, (j: number, value: SHCommon.InputValue) => {
                        var item: VCContracts.GitItem = <VCContracts.GitItem>{
                            childItems: [],
                            content: null,
                            contentMetadata: null,
                            isSymLink: false,
                            isFolder: value.data[GitHubConstants.isFolder] === 'True',
                            path: this._ensurePath(value.data[GitHubConstants.path]),
                            url: value.data[GitHubConstants.url],
                            commitId: null,
                            latestProcessedChange: null,
                            objectId: null,
                            originalObjectId: null,
                            _links: null,
                            gitObjectType: null
                        };
                        
                        gitItems.push(item);
                        this._itemMap[value.data[GitHubConstants.path]] = GitItemUtils.gitItemToLegacyGitItem(item, null);

                        if (value.data[GitHubConstants.children]) {
                            $.each(value.data[GitHubConstants.children], (k: number, child: SHCommon.InputValue) => {
                                var childItem: VCContracts.GitItem = <VCContracts.GitItem>{
                                    childItems: [],
                                    content: null,
                                    contentMetadata: null,
                                    isSymLink: false,
                                    isFolder: child.data[GitHubConstants.isFolder] === 'True',
                                    path: this._ensurePath(child.data[GitHubConstants.path]),
                                    url: child.data[GitHubConstants.url],
                                    commitId: null,
                                    latestProcessedChange: null,
                                    objectId: null,
                                    originalObjectId: null,
                                    _links: null,
                                    gitObjectType: null
                                };
                                gitItems.push(childItem);
                                this._itemMap[child.data[GitHubConstants.path]] = GitItemUtils.gitItemToLegacyGitItem(childItem, null);
                            });
                        }
                    });
                });
                var resultItems: VCLegacyContracts.ItemModel[] = [];
                if (gitItems && gitItems.length > 0) {
                    resultItems.push(GitItemUtils.gitItemArrayToLegacyGitItem(gitItems, itemsToFetch[0].version, null));
                }

                if ($.isFunction(callback)) {
                    callback(resultItems);
                }
            });
    }

    public beginGetItemContentJson(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (content: VCLegacyContracts.FileContent) => void,
        errorCallback?: IErrorCallback) { }

    public beginGetFileDiff(
        repositoryContext: RepositoryContext,
        diffParameters: VCLegacyContracts.FileDiffParameters,
        callback?: (diffModel: VCLegacyContracts.FileDiff) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginGetFileDiffs(
        repositoryContext: RepositoryContext,
        diffParameters: VCLegacyContracts.FileDiffParameters[],
        callback?: (diffModels: VCLegacyContracts.FileDiff[]) => void,
        errorCallback?: IErrorCallback) {

    }

    public beginGetHistory(
        repositoryContext: RepositoryContext,
        searchCriteria: VCContracts.ChangeListSearchCriteria,
        callback?: (result: VCLegacyContracts.HistoryQueryResults) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginGetChangeList(
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number,
        callback: (changeList: VCLegacyContracts.ChangeList) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginFetchMoreChanges(
        repositoryContext: RepositoryContext,
        changeList: VCLegacyContracts.ChangeList,
        maxChangesToInclude: number,
        callback: (changeList: VCLegacyContracts.ChangeList) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginGetChangeListChanges(
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number,
        skipCount: number,
        callback: (result: VCLegacyContracts.ChangeQueryResults) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginGetAssociatedWorkItems(
        repositoryContext: RepositoryContext,
        versions: string[],
        callback?: (workItems: VCContracts.AssociatedWorkItem[]) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginGetAuthors(
        repositoryContext: RepositoryContext,
        callback: (authors: VCLegacyContracts.TeamIdentityReference[]) => void,
        errorCallback?: IErrorCallback) {
    }
    
    public beginGetUserPreferences(
        callback: (preferences: VCWebAccessContracts.VersionControlUserPreferences) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginUpdateUserPreferences(
        preferences: VCWebAccessContracts.VersionControlUserPreferences,
        callback?: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginGetRepositoryOptions(
        repositoryContext: RepositoryContext,
        callback: (results: VCWebAccessContracts.VersionControlRepositoryOption[]) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginUpdateRepositoryOption(
        repositoryContext: RepositoryContext,
        option: VCWebAccessContracts.VersionControlRepositoryOption,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginGetPullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: (pullRequest: VCContracts.GitPullRequest) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginGetPullRequestSearch(
        searchCriteria: VCContracts.GitPullRequestSearchCriteria,
        top: number,
        skip: number,
        callback: (pullRequests: VCContracts.GitPullRequest[]) => void,
        errorCallback?: IErrorCallback) {
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
    }

    public beginUpdatePullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        data: any,
        callback: (pullRequest: VCContracts.GitPullRequest) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginUpdatePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: (reviewer: VCContracts.IdentityRefWithVote) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginAddPullRequestTfsReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: (reviewer: VCContracts.IdentityRefWithVote) => void,
        errorCallback?: IErrorCallback) {
    }

    public beginAddPullRequestAadReviewers(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewers: WebApi_Contracts.IdentityRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginGetPullRequestWorkItemsResourceRef(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: IResultCallback,
        commitsTop?: number,
        commitsSkip?: number,
        errorCallback?: IErrorCallback) {
    }

    public beginDeletePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        callback: () => void,
        errorCallback?: IErrorCallback) {
    }

    public beginGetReferencedWorkItems(
        resourceRefs: WebApi_Contracts.ResourceRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginGetPullRequestPolicyEvaluations(
        repositoryContext: RepositoryContext,
        projectId: string,
        pullRequestArtifactId: string,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public _setUserPreferencesFromViewData(
        preferences: VCWebAccessContracts.VersionControlUserPreferences) {
    }

    public _getChangeListFromJsonIsland(
        $jsonIsland: JQuery,
        remove: boolean) {
    }

    private _ensurePath(path: string, pathShouldBeRooted: boolean = true) {
        if (path) {
            if (pathShouldBeRooted) {
                if (path[0] != "/") {
                    path = "/" + path;
                }
            }
            else {
                if (path[0] == "/") {
                    path = path.slice(1, path.length);
                }
            }
        }
        return path;
    }
}

export module GitHubConstants {
    export var accessToken: string = "accessToken";
    export var repo: string = "repo";
    export var branchesUrl: string = "branchesUrl";
    export var repoBranches: string = "repoBranches";
    export var apiUrl: string = "apiUrl";
    export var cloneUrl: string = "cloneUrl";
    export var refsUrl: string = "refsUrl";
    export var username: string = "username";
    export var repos: string = "repos";
    export var gitHubPublisher: string = "github";
    export var branch: string = "branch";
    export var repoContent: string = "repoContent";
    export var path: string = "path";
    export var defaultBranch: string = "defaultBranch";
    export var repositoryType: string = "repositoryType";
    export var definitionId: string = "definitionId";
    export var isFolder: string = "isFolder";
    export var url: string = "url";
    export var children: string = "children";
    export var connectedServiceId = "connectedServiceId";
    export var project: string = "project";
    export var repoFileContent: string = "repoFileContent";
    export var version: string = "version";
}
