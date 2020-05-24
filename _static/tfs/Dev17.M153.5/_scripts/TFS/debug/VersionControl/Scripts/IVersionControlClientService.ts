import WebApi_Contracts = require("VSS/WebApi/Contracts");
import { WebApiTagDefinition } from "TFS/Core/Contracts";
import VCContracts = require("TFS/VersionControl/Contracts");
import {GitClientService} from "VersionControl/Scripts/GitClientService";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import {IAjaxRequestContextOptions} from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import Q = require("q");

export interface IVersionControlClientService {

    beginGetItem(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (item: VCLegacyContracts.ItemModel) => void,
        errorCallback?: IErrorCallback);

    beginGetItems(
        repositoryContext: RepositoryContext,
        itemsToFetch,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (items: VCLegacyContracts.ItemModel[]) => void,
        errorCallback?: IErrorCallback);

    beginGetItemContentJson(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (content: VCLegacyContracts.FileContent) => void,
        errorCallback?: IErrorCallback);

    beginGetFileDiff(
        repositoryContext: RepositoryContext,
        diffParameters: VCLegacyContracts.FileDiffParameters,
        callback?: (diffModel: VCLegacyContracts.FileDiff) => void,
        errorCallback?: IErrorCallback);

    beginGetHistory(
        repositoryContext: RepositoryContext,
        searchCriteria: VCContracts.ChangeListSearchCriteria,
        callback?: (result: VCLegacyContracts.HistoryQueryResults) => void,
        errorCallback?: IErrorCallback);

    beginGetChangeList(
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number,
        callback: (changeList: VCLegacyContracts.ChangeList) => void,
        errorCallback?: IErrorCallback);

    beginGetChangeListPromise(
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number): Q.Promise<VCLegacyContracts.ChangeList>;

    beginFetchMoreChanges(
        repositoryContext: RepositoryContext,
        changeList: VCLegacyContracts.ChangeList,
        maxChangesToInclude: number,
        callback: (changeList: VCLegacyContracts.ChangeList) => void,
        errorCallback?: IErrorCallback);

    beginGetChangeListChanges(
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number,
        skipCount: number,
        callback: (result: VCLegacyContracts.ChangeQueryResults) => void,
        errorCallback?: IErrorCallback);

    beginGetAssociatedWorkItems(
        repositoryContext: RepositoryContext,
        versions: string[],
        callback?: (workItems: VCContracts.AssociatedWorkItem[]) => void,
        errorCallback?: IErrorCallback);

    beginGetAssociatedWorkItemsPromise(
        rrepositoryContext: RepositoryContext,
        versions: string[]): Q.Promise<VCContracts.AssociatedWorkItem[]>;

    beginGetAuthors(
        repositoryContext: RepositoryContext,
        callback: (authors: VCLegacyContracts.TeamIdentityReference[]) => void,
        errorCallback?: IErrorCallback,
        options?: IAjaxRequestContextOptions);

    beginGetUserPreferences(
        callback: (preferences: VCWebAccessContracts.VersionControlUserPreferences) => void,
        errorCallback?: IErrorCallback);

    beginUpdateUserPreferences(
        preferences: VCWebAccessContracts.VersionControlUserPreferences,
        callback?: IResultCallback,
        errorCallback?: IErrorCallback);

    beginGetAllGitRepositoriesOptions(
        callback: (results: VCWebAccessContracts.VersionControlRepositoryOption[]) => void,
        errorCallback?: IErrorCallback);

    beginGetRepositoryOptions(
        repositoryContext: RepositoryContext,
        callback: (results: VCWebAccessContracts.VersionControlRepositoryOption[]) => void,
        errorCallback?: IErrorCallback);

    beginUpdateRepositoryOption(
        repositoryContext: RepositoryContext,
        option: VCWebAccessContracts.VersionControlRepositoryOption,
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginGetPullRequestSearch(
        searchCriteria: VCContracts.GitPullRequestSearchCriteria,
        top: number,
        skip: number,
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginGetPullRequests(
        repositoryContext: RepositoryContext,
        status: any,
        creatorId: any,
        reviewerId: any,
        sourceBranchName: any,
        targetBranchName: any,
        top: number,
        skip: number,
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginGetPullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginCreatePullRequest(
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
        errorCallback?: IErrorCallback);

    beginUpdatePullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        data: VCContracts.GitPullRequest,
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginUpdatePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginAddPullRequestTfsReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginAddPullRequestAadReviewers(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewers: WebApi_Contracts.IdentityRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginDeletePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginGetPullRequestWorkItemsResourceRef(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: IResultCallback,
        commitsTop?: number,
        commitsSkip?: number,
        errorCallback?: IErrorCallback);

    beginGetReferencedWorkItems(
        resourceRefs: WebApi_Contracts.ResourceRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback);

    beginGetItemContent(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (item: any) => void,
        errorCallback?: IErrorCallback);

    _setUserPreferencesFromViewData(
        preferences: VCWebAccessContracts.VersionControlUserPreferences);

    _getChangeListFromJsonIsland(
        $jsonIsland: JQuery,
        remove: boolean);
}
