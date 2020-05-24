import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import { WebApiTagDefinition } from "TFS/Core/Contracts";
import WebApi_Contracts = require("VSS/WebApi/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");
import {VersionControlClientServiceBase} from "VersionControl/Scripts/VersionControlClientServiceBase";
import {IVersionControlClientService} from "VersionControl/Scripts/IVersionControlClientService";
import {GitClientService} from "VersionControl/Scripts/GitClientService";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");
import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { tfvcVersionStringToVersionDescriptor } from "VersionControl/Scripts/VersionSpecUtils";

export class TfvcClientService
    extends VersionControlClientServiceBase
    implements IVersionControlClientService {

    private _projectInfoByName: { [projectName: string]: VCContracts.VersionControlProjectInfo; };
    private _cachedProjects: VCContracts.VersionControlProjectInfo[];
    private _httpClient: VCWebApi.TfvcHttpClient;

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);

        this._projectInfoByName = {};
        this._httpClient = tfsConnection.getHttpClient<VCWebApi.TfvcHttpClient>(VCWebApi.TfvcHttpClient);
    }

    public beginGetProjectInfo(projectNameOrId: string, callback: (projectInfo: VCContracts.VersionControlProjectInfo) => void, errorCallback?: IErrorCallback) {

        let projectInfo = this._projectInfoByName[projectNameOrId];

        if (VSS.queuedRequestHasResult(projectInfo)) {
            callback.call(this, projectInfo);
            return;
        }

        VSS.queueRequest(this, this._projectInfoByName, projectNameOrId, callback, errorCallback || VSS.handleError, (succeeded, failed) => {
            this._httpClient.beginGetProjectInfo(projectNameOrId).then(
                (projectInfoResult: VCContracts.VersionControlProjectInfo) => {
                    succeeded(projectInfoResult);
                }, failed);
        });
    }

    public beginGetProjectInfos(callback: (projectInfos: VCContracts.VersionControlProjectInfo[]) => void, errorCallback?: IErrorCallback) {

        VSS.queueRequest(this, this, "_cachedProjects", callback, errorCallback || VSS.handleError, (succeeded, failed) => {
            this._httpClient.beginGetProjectInfos().then(
                (projectInfoResult: VCContracts.VersionControlProjectInfo[]) => {
                    succeeded(projectInfoResult);
                }, failed);
        });
    }

    public _setProjectInfoFromViewData(projectId: string, projectName: string, projectInfo: VCContracts.VersionControlProjectInfo) {
        this._projectInfoByName[projectId] = projectInfo;
        this._projectInfoByName[projectName] = projectInfo;
    }

    public beginGetHistory(
        repositoryContext: RepositoryContext,
        searchCriteria: VCContracts.ChangeListSearchCriteria,
        callback?: (result: VCLegacyContracts.HistoryQueryResults) => void,
        errorCallback?: IErrorCallback) {

        let queryParams = {
            repositoryId: repositoryContext.getRepositoryId() || "",
            searchCriteria: Utils_Core.stringifyMSJSON(searchCriteria)
        };

        Ajax.postMSJSON(this._getApiLocation("history"), queryParams, (queryResultModel: VCLegacyContracts.HistoryQueryResults) => {

            $.each(queryResultModel.results, (i, historyEntry) => {
                this._processChangeList(historyEntry.changeList);
            });

            if (searchCriteria.excludeDeletes) {
                queryResultModel.results = $.grep(queryResultModel.results, (historyEntry: VCLegacyContracts.HistoryEntry) => {
                    if ((historyEntry.itemChangeType & VCContracts.VersionControlChangeType.Delete) !== 0) {
                        return false;
                    }
                    return true;
                });
            }

            if ($.isFunction(callback)) {
                callback.call(this, queryResultModel);
            }

        }, errorCallback);
    }

    public beginGetChangesets(
        path: string,
        version: string,
        callback?: (changesets: VCLegacyContracts.TfsChangeList[]) => void,
        errorCallback?: IErrorCallback) {

        Ajax.getMSJSON(this._getApiLocation("changesets"), {
            path: path,
            version: version
        }, callback, errorCallback);
    }

    /**
     *  Checkin changes to TFVC.
     *
     *  @param changesetToCreate The changeset to checkin
     *  @param callback Callback method called with the new changeset reference
     *  @param errorCallback Method called upon failure to checkin
     */
    public beginCreateChangeset(
        changesetToCreate: VCContracts.TfvcChangeset,
        callback?: (newChangeset: VCContracts.TfvcChangesetRef) => void,
        errorCallback?: IErrorCallback) {

        this._httpClient.beginCreateChangeset(changesetToCreate).then(
            (newChangeset: VCContracts.TfvcChangesetRef) => {
                if ($.isFunction(callback)) {
                    callback(newChangeset);
                }
            }, errorCallback || VSS.handleError);
    }

    public beginCreateProjectFolder(
        projectUri: string,
        callback?: () => void,
        errorCallback?: IErrorCallback) {

        Ajax.postHTML(this._getApiLocation("createProjectFolder"), {
            projectUri: projectUri
        }, callback, errorCallback);
    }

    public beginGetShelvesets(
        owner: string,
        callback?: (shelvesets: VCLegacyContracts.TfsChangeList[]) => void,
        errorCallback?: IErrorCallback) {

        Ajax.getMSJSON(this._getApiLocation("shelvesets"), { owner: owner }, callback, errorCallback);
    }

    public beginGetAnnotateTfsDiffs(
        diffParameters: VCLegacyContracts.TfsAnnotateDiffParameters[],
        callback?: (diffModels: VCLegacyContracts.FileDiff[]) => void,
        errorCallback?: IErrorCallback) {

        Ajax.postMSJSON(this._getApiLocation("annotateTfsDiffs"), {
            annotateDiffParameters: Utils_Core.stringifyMSJSON(diffParameters)
        }, callback, errorCallback);
    }

    public beginGetItem(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (item: VCLegacyContracts.ItemModel) => void,
        errorCallback?: IErrorCallback) {

        let scopePath: string;
        let recursionLevel: VCLegacyContracts.VersionControlRecursionType = (detailsOptions && detailsOptions.recursionLevel) ? detailsOptions.recursionLevel : VCLegacyContracts.VersionControlRecursionType.None;
        let includeContentMetadata: boolean = detailsOptions && detailsOptions.includeContentMetadata;

        if (recursionLevel !== VCLegacyContracts.VersionControlRecursionType.None) {
            scopePath = path;
            path = "";
        }

        if (includeContentMetadata) {
            this.beginGetItems(
                repositoryContext,
                [{
                    version: version,
                    path: scopePath || path
                }],
                detailsOptions,
                (items: VCLegacyContracts.ItemModel[]) => {
                    if ($.isFunction(callback)) {
                        let result: VCLegacyContracts.ItemModel;
                        if (items && items.length) {
                            result = items[0];
                        }
                        callback(result);
                    }
                },
                errorCallback);
        }
        else {
            let versionDescriptor: any = null;
            if (version) {
                versionDescriptor = tfvcVersionStringToVersionDescriptor(version);
            }

            this._httpClient.beginGetItem(path, scopePath, versionDescriptor, <any>recursionLevel, "", false).then(
                (items: VCContracts.TfvcItem[]) => {
                    let result: VCLegacyContracts.TfsItem;

                    if ($.isArray(items)) {
                        result = this._tfvcItemArrayToLegacyItemModel(items, recursionLevel);
                    }
                    else {
                        result = this._tfvcItemArrayToLegacyItemModel([<VCContracts.TfvcItem>(<any>items)]);
                    }

                    if ($.isFunction(callback)) {
                        callback(result);
                    }
                }, errorCallback || VSS.handleError);
        }
    }

    public beginGetItems(
        repositoryContext: RepositoryContext,
        itemsToFetch,
        detailsOptions?: VCLegacyContracts.ItemDetailsOptions,
        callback?: (items: VCLegacyContracts.ItemModel[]) => void,
        errorCallback?: IErrorCallback) {

        let recursionLevel: VCLegacyContracts.VersionControlRecursionType = (detailsOptions && detailsOptions.recursionLevel) ? detailsOptions.recursionLevel : VCLegacyContracts.VersionControlRecursionType.None;

        let requestData: VCContracts.TfvcItemRequestData = {
            includeContentMetadata: detailsOptions ? detailsOptions.includeContentMetadata : false,
            includeLinks: null,
            itemDescriptors: $.map(itemsToFetch, (item: any, index: number) => {
                let versionDescriptor: VCContracts.TfvcVersionDescriptor = tfvcVersionStringToVersionDescriptor(item.version);
                return <VCContracts.TfvcItemDescriptor>{
                    path: item.path,
                    version: versionDescriptor.version,
                    versionOption: versionDescriptor.versionOption,
                    versionType: versionDescriptor.versionType,
                    recursionLevel: <any>recursionLevel
                };
            })
        };

        return this._httpClient.beginGetItemsBatch(requestData).then(
            (itemArrays: VCContracts.TfvcItem[][]) => {
                let resultItems: VCLegacyContracts.ItemModel[] = [];

                $.each(itemArrays, (i: number, items: VCContracts.TfvcItem[]) => {
                    resultItems.push(this._tfvcItemArrayToLegacyItemModel(items, recursionLevel));
                });

                if ($.isFunction(callback)) {
                    callback(resultItems);
                }
            }, errorCallback || VSS.handleError);
    }

    public beginGetItemContent(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (item: any) => void,
        errorCallback?: IErrorCallback) {

        let scopePath: string = "";
        let recursionLevel = VCLegacyContracts.VersionControlRecursionType.None;

        let versionDescriptor: VCContracts.TfvcVersionDescriptor = null;
        if (version) {
            versionDescriptor = tfvcVersionStringToVersionDescriptor(version);
        }

        this._httpClient.beginGetItemContent(path, scopePath, versionDescriptor, recursionLevel).then(
            (result: any[]) => {
                if (result[2].status != 206) {
                    if ($.isFunction(callback)) {
                        callback(result[0]);
                    }
                } else {
                    if ($.isFunction(errorCallback)) {
                        errorCallback(VCResources.FileSizeTooLarge);
                    }
                }
            }, (error: any) => {
                if ($.isFunction(errorCallback)) {
                    errorCallback(error);
                }
            });

    }

    /**
     * Uses Tfvc GetItem REST API to retrieve item content and metadata.
     */
    public beginGetItemContentJson(
        repositoryContext: RepositoryContext,
        path: string,
        version: string,
        callback?: (content: VCLegacyContracts.FileContent) => void,
        errorCallback?: IErrorCallback) {

        const projectId = repositoryContext.getProjectId();
        const fileName = null;
        const download = false;
        const scopePath = null;
        const recursionLevel = VCLegacyContracts.VersionControlRecursionType.None;
        const versionDescriptor = version ? tfvcVersionStringToVersionDescriptor(version) : null;
        const includeContent = true;

        this._httpClient.beginGetItemAjaxResult(
            path,
            projectId,
            fileName,
            download,
            scopePath,
            recursionLevel,
            versionDescriptor,
            includeContent)
            .then((result: { tfvcItem: VCContracts.TfvcItem, textStatus: string, jqXHR: JQueryXHR }) => {
                const fileContent: VCLegacyContracts.FileContent = this.itemModelToLegacyFileContent(result.tfvcItem);
                if (result.jqXHR.status == 206 /* PartialContent */) {
                    fileContent.exceededMaxContentLength = true;
                }
                callback(fileContent);
            }, errorCallback || VSS.handleError);
    }

    public getHttpClient(): VCWebApi.TfvcHttpClient {
        return this._httpClient;
    }

    private _tfvcItemArrayToLegacyItemModel(items: VCContracts.TfvcItem[], recursionLevel?: VCLegacyContracts.VersionControlRecursionType): VCLegacyContracts.TfsItem {
        let result: VCLegacyContracts.TfsItem;

        if (items && items.length) {
            let rootItem: VCContracts.TfvcItem = items[0];
            let version: string = null;
            if (rootItem.isPendingChange) {
                version = VCSpecs.VersionSpec.tfvcFromUri(rootItem.url).toVersionString();
            } else {
                version = "C" + rootItem.version;
            }

            result = <VCLegacyContracts.TfsItem>{
                changeDate: rootItem.changeDate,
                changeset: rootItem.version,
                contentMetadata: this._newFileContentMetadataToLegacyFileContentMetadata(rootItem.contentMetadata),
                deletionId: rootItem.deletionId,
                isBranch: rootItem.isBranch,
                isFolder: rootItem.isFolder,
                isPendingChange: rootItem.isPendingChange,
                isSymLink: rootItem.isSymLink,
                serverItem: rootItem.path,
                url: rootItem.url,
                version: version,
                versionDescription: rootItem.version ? rootItem.version.toString() : null
            };

            if (items.length > 1 || (recursionLevel && (recursionLevel as VCLegacyContracts.VersionControlRecursionType) !== VCLegacyContracts.VersionControlRecursionType.None)) {
                let nextRecursionLevel = recursionLevel === VCLegacyContracts.VersionControlRecursionType.Full ? VCLegacyContracts.VersionControlRecursionType.Full : null;
                result.childItems = $.map(items.slice(1), (childItem: VCContracts.TfvcItem, index: number) => {
                    return this._tfvcItemArrayToLegacyItemModel([childItem], nextRecursionLevel);
                });
            }
        }

        return result;
    }

    private _newFileContentMetadataToLegacyFileContentMetadata(metadata: VCContracts.FileContentMetadata): VCLegacyContracts.FileContentMetadata {
        if (metadata) {

            //old webaccess code returned extension with no dot
            let extension: string;
            if (metadata.extension) {
                let lastDot: number = metadata.extension.lastIndexOf(".");
                if (lastDot > -1) {
                    extension = metadata.extension.substr(lastDot + 1);
                }
                else {
                    extension = metadata.extension;
                }
            }

            return <VCLegacyContracts.FileContentMetadata>{
                contentType: metadata.contentType,
                encoding: metadata.encoding,
                extension: extension,
                fileName: metadata.fileName,
                isBinary: metadata.isBinary,
                isImage: metadata.isImage,
                vsLink: metadata.vsLink
            };
        }
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
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginGetPullRequest(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginCreatePullRequest(
        targetRepo: VCContracts.GitRepository,
        sourceRepo: VCContracts.GitRepository,
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
        data: VCContracts.GitPullRequest,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginUpdatePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginAddPullRequestTfsReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
        data: any,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    beginAddPullRequestAadReviewers(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewers: WebApi_Contracts.IdentityRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }

    public beginDeletePullRequestReviewer(
        repositoryContext: RepositoryContext,
        pullRequestId: number,
        reviewerId: string,
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

    public beginGetReferencedWorkItems(
        resourceRefs: WebApi_Contracts.ResourceRef[],
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
    }
}

