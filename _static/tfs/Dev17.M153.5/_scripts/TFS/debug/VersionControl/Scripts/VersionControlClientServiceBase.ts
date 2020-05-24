import * as Q from "q";
import * as Serialization from "VSS/Serialization";
import { getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import { stringifyMSJSON, parseMSJSON } from "VSS/Utils/Core";
import { errorHandler, queueRequest } from "VSS/VSS";
import { IVssHttpClientOptions } from "VSS/WebApi/RestClient";

import * as Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { AssociatedWorkItem, ItemModel } from "TFS/VersionControl/Contracts";

import { ContentJsonParseErrorTFS } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as ChangeListIdentityHelper from "VersionControl/Scripts/ChangeListIdentityHelper";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

export class VersionControlClientServiceBase extends TfsService {

    protected _userPreferences: VCWebAccessContracts.VersionControlUserPreferences;

    public _getApiLocation(action?: string) {
        return this.getTfsContext().getActionUrl(action || "", "versioncontrol", { area: "api" });
    }

    /** 
     * Takes a function that has a success and error callback and return a promise 
     * instead. Works as long as last two arguments are the callback and error callback
     */
    private invokeAndGetPromise<T>(func, ...args) {
        return Q.Promise<T>((resolve, reject) => {
            let success = (value: T) => { resolve(<any>value); }
            let failure = (error) => { reject(error); };

            args.push(success, failure);

            func.apply(this, args);
        });
    }

    public beginGetFileDiff(
        repositoryContext: RepositoryContext,
        diffParameters: VCLegacyContracts.FileDiffParameters,
        successCallback: (diffModel: VCLegacyContracts.FileDiff) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.file-diff-data-provider";
        const repositoryId = repositoryContext.getRepositoryId() || "";
        const requestParams = {
            repositoryId,
            diffParameters,
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    public beginGetChangeList(
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number,
        callback: (changeList: VCLegacyContracts.ChangeList) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.change-data-provider";
        const requestParams = {
            repositoryId: repositoryContext.getRepositoryId() || "",
            version: version,
            maxChanges: maxChangesToInclude
        };

        const successCallback = (data) => {
            this._processChangeList(data);
            callback(data);
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    public beginGetChangeListPromise = (
        repositoryContext: RepositoryContext,
        version: string,
        maxChangesToInclude: number) => {

        return this.invokeAndGetPromise<VCLegacyContracts.ChangeList>(this.beginGetChangeList, repositoryContext, version, maxChangesToInclude);
    };

    public beginFetchMoreChanges(
        repositoryContext: RepositoryContext,
        changeList: VCLegacyContracts.ChangeList,
        maxChangesToInclude: number,
        callback: (changeList: VCLegacyContracts.ChangeList) => void,
        errorCallback?: IErrorCallback) {

        this.beginGetChangeListChanges(
            repositoryContext,
            changeList.version,
            maxChangesToInclude,
            changeList.changes ? changeList.changes.length : 0, (resultModel) => {

                let changes = resultModel.results,
                    changeCounts: any;

                changeList.changes = (changeList.changes || []).concat(changes);
                changeList.allChangesIncluded = !resultModel.moreResultsAvailable;

                changeCounts = this._convertChangeCountsToObject(resultModel.changeCounts);
                if (changeCounts) {
                    if (changeList.changeCounts) {
                        $.each(changeList.changeCounts, (changeType, count) => {
                            changeCounts[changeType] = (changeCounts[changeType] || 0) + count;
                        });
                    }
                    changeList.changeCounts = changeCounts;
                }

                if ($.isFunction(callback)) {
                    callback.call(this, changeList);
                }
            },
            errorCallback);
    }

    public beginGetChangeListChanges(
        repositoryContext: RepositoryContext,
        version: string,
        maxChanges: number,
        skipCount: number,
        successCallback: (result: VCLegacyContracts.ChangeQueryResults) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.changelist-changes-data-provider";
        const repositoryId = repositoryContext.getRepositoryId() || "";
        const requestParams = {
            repositoryId,
            version,
            maxChanges,
            skipCount,
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    public beginGetAssociatedWorkItems(
        repositoryContext: RepositoryContext,
        versions: string[],
        successCallback: (workItems: AssociatedWorkItem[]) => void,
        errorCallback?: IErrorCallback) {

        const dataProviderId = "ms.vss-code-web.associated-workitems-data-provider";
        const repositoryId = repositoryContext.getRepositoryId() || "";
        const requestParams = {
            repositoryId,
            versions,
        };

        this._queryDataProvider(dataProviderId, requestParams, repositoryContext, successCallback, errorCallback);
    }

    public beginGetAssociatedWorkItemsPromise = (
        repositoryContext: RepositoryContext,
        versions: string[]) => {

        return this.invokeAndGetPromise<AssociatedWorkItem[]>(this.beginGetAssociatedWorkItems, repositoryContext, versions);
    };

    public beginGetAuthors(
        repositoryContext: RepositoryContext,
        callback: (authors: VCLegacyContracts.TeamIdentityReference[]) => void,
        errorCallback?: IErrorCallback,
        options?: Ajax.IAjaxRequestContextOptions) {

        queueRequest(this, repositoryContext, "_authors", callback, errorCallback, (succeeded, failed) => {
            Ajax.getMSJSON(this._getApiLocation("authors"), {
                repositoryId: repositoryContext.getRepositoryId() || ""
            }, (authors) => {
                succeeded(authors);
            }, failed,
            options);
        });
    }

    public beginGetUserPreferences(
        callback: (preferences: VCWebAccessContracts.VersionControlUserPreferences) => void,
        errorCallback?: IErrorCallback) {

        if (this._userPreferences) {
            callback.call(this, this._userPreferences);
        }
        else {
            queueRequest(this, this, "_userPreferencesAsync", callback, errorCallback, (succeeded, failed) => {
                Ajax.getMSJSON(this._getApiLocation("userPreferences"), {}, (preferences) => {
                    if (!this._userPreferences) {
                        this._userPreferences = preferences;
                    }
                    succeeded(this._userPreferences);
                }, failed);
            });
        }
    }

    public beginUpdateUserPreferences(
        preferences: VCWebAccessContracts.VersionControlUserPreferences,
        callback?: IResultCallback,
        errorCallback?: IErrorCallback) {

        this._userPreferences = preferences;
        Ajax.postHTML(this._getApiLocation("updateUserPreferences"), { preferences: stringifyMSJSON(preferences) }, callback, errorCallback);
    }

    public _setUserPreferencesFromViewData(
        preferences: VCWebAccessContracts.VersionControlUserPreferences) {

        this._userPreferences = preferences;
    }

    public _getChangeListFromJsonIsland(
        $jsonIsland: JQuery,
        remove: boolean) {

        let changeList = null;

        if ($jsonIsland.length) {
            changeList = parseMSJSON($jsonIsland.html(), false);
            if (changeList) {
                this._processChangeList(changeList);
            }
            if (remove) {
                $jsonIsland.remove();
            }
        }

        return changeList;
    }

    public _processChangeList(changeList: VCLegacyContracts.ChangeList) {
        changeList.changeCounts = this._convertChangeCountsToObject(changeList.changeCounts);

        if ((<VCLegacyContracts.GitCommit>changeList).author) {
            let gitCommit = <VCLegacyContracts.GitCommit>changeList;
            if (!gitCommit.author.displayName) {
                gitCommit.author.displayName = ChangeListIdentityHelper.getUserNameWithoutEmail(gitCommit.author.id);
            }
        }
    }

    public beginGetAllGitRepositoriesOptions(
        callback: (results: VCWebAccessContracts.VersionControlRepositoryOption[]) => void,
        errorCallback?: IErrorCallback) {

        Ajax.getMSJSON(this._getApiLocation("AllGitRepositoriesOptions"), {},
            (data: VCWebAccessContracts.VersionControlRepositoryOption[]) => {
                if ($.isFunction(callback)) {
                    callback.call(this, data);
                }
            },
            errorCallback);
    }

    public beginGetRepositoryOptions(
        repositoryContext: RepositoryContext,
        callback: (results: VCWebAccessContracts.VersionControlRepositoryOption[]) => void,
        errorCallback?: IErrorCallback) {

        Ajax.getMSJSON(this._getApiLocation("RepositoryOptions"), {
            repositoryId: repositoryContext.getRepositoryId()
        },
            (data: VCWebAccessContracts.VersionControlRepositoryOption[]) => {
                if ($.isFunction(callback)) {
                    callback.call(this, data);
                }
            },
            errorCallback);
    }

    public beginUpdateRepositoryOption(
        repositoryContext: RepositoryContext,
        option: VCWebAccessContracts.VersionControlRepositoryOption,
        callback: IResultCallback,
        errorCallback?: IErrorCallback) {
        Ajax.postHTML(
            this._getApiLocation('UpdateRepositoryOption'),
            {
                repositoryId: repositoryContext.getRepositoryId(),
                option: JSON.stringify(option)
            },
            (data: any) => {
                if ($.isFunction(callback)) {
                    callback.call(this, data);
                }
            },
            errorCallback);
    }

    protected _queryDataProvider(
        dataProviderId: string,
        requestParams: any,
        repositoryContext: RepositoryContext,
        successCallback: Function,
        errorCallback?: IErrorCallback) {

        const webPageDataService = getService(WebPageDataService);
        webPageDataService.getDataAsync(dataProviderId, null, requestParams)
            .then(data => successCallback(data || {}))
            .catch(error => {
                this._handleJsonContentError(error, repositoryContext, errorCallback);
            });
    }

    /**
     * Returns a legacy FileContent object with properties set from an ItemModel.
     */
    protected itemModelToLegacyFileContent(item: ItemModel): VCLegacyContracts.FileContent {
        return {
            content: item.content,
            metadata: item.contentMetadata,
        } as VCLegacyContracts.FileContent;
    }

    private _convertChangeCountsToObject(changeCountsFromServer: any) {
        let changeCountsObject: any = null;

        if (changeCountsFromServer) {
            changeCountsObject = {};
            $.each(changeCountsFromServer, (i, item) => {
                changeCountsObject[item.Key] = item.Value;
            });
        }
        return changeCountsObject;
    }

    private _handleJsonContentError(error: any, repositoryContext: RepositoryContext, errorCallback: IErrorCallback) {
        if (error.xhr && error.xhr.statusText === "parsererror" && repositoryContext.getRepositoryType() === RepositoryType.Tfvc) {
            // We were unable to parse the file contents string. This can happen if we do not read the
            // file using the correct encoding. A user can set the file encoding in TFS to any value
            // and it doesn't have to match what the file actually uses.
            error = new Error(ContentJsonParseErrorTFS);
        }

        if (typeof errorCallback === 'function') {
            errorCallback.call(this, error);
        }
        else {
            errorHandler.showError(error);
        }
    }
}
