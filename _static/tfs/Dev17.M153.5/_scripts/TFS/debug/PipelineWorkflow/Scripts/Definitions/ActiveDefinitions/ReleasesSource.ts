import * as Q from "q";

import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { CommonConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { ICancelableReleasesResult, IReleasesResult, ReleaseQueryOrder } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleasesHubDataProviderKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ensureSingleDelayedCall } from "PipelineWorkflow/Scripts/Definitions/Utils/FolderUtils";

import { EnvironmentStatus, Release, ReleaseExpands, ReleaseStatus, TypeInfo } from "ReleaseManagement/Core/Contracts";

import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import * as Serialization from "VSS/Serialization";
import { getService } from "VSS/Service";
import { Cancelable } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

export interface IReleasesHubActiveReleasesData {
    activeReleases: Release[];
    continuationToken: number;
}

export interface IReleaseSearchParameters {
    definitionId: number;
    currentlyDeployed: boolean;
    searchText: string;
    statusFilter: ReleaseStatus;
    branchFilter: string;
    tagFilter: string;
    isDeleted: boolean;
    createdBy: string;
}

let ReleasesHubActiveReleasesTypeInfo = {
    WebPageData: {
        fields: null as any
    }
};

ReleasesHubActiveReleasesTypeInfo.WebPageData.fields = {
    activeReleases: {
        isArray: true,
        typeInfo: TypeInfo.Release
    }
};

export class ReleasesSource extends ReleaseManagementSourceBase {

    constructor() {
        super();

        this._searchHandler = ensureSingleDelayedCall<IReleaseSearchParameters, ICancelableReleasesResult>((releaseSearchParameters, deferred) => this._performServerSearch(releaseSearchParameters, deferred));
    }

    public static getKey(): string {
        return "ReleasesSource";
    }

    public static instance(): ReleasesSource {
        return SourceManager.getSource(ReleasesSource);
    }

    public listReleases(definitionId: number,
        searchText: string = Utils_String.empty,
        statusFilter: ReleaseStatus = ReleaseStatus.Undefined,
        branchFilter: string = Utils_String.empty,
        isDeleted: boolean = false,
        tagFilter: string = Utils_String.empty,
        createdBy: string = Utils_String.empty,
        continuationToken: number = 0): IPromise<IReleasesResult> {

        let releaseExpands: ReleaseExpands = ReleaseExpands.Environments | ReleaseExpands.Artifacts | ReleaseExpands.Approvals | ReleaseExpands.Tags | ReleaseExpands.ManualInterventions;

        return this.getClient().getReleases(
            definitionId,
            0,
            searchText,
            statusFilter,
            EnvironmentStatus.Undefined,
            null,
            null,
            ReleaseQueryOrder.Descending,
            ReleasesSource.DefaultTopReleasesCount,
            continuationToken,
            releaseExpands,
            branchFilter,
            Utils_String.empty,
            isDeleted,
            null,
            tagFilter,
            createdBy);
    }

    public listActiveReleases(definitionId: number, continuationToken: number = 0): IPromise<IReleasesResult> {
        const webPageDataService = getService(WebPageDataService);
        const extensionService = getService(ExtensionService);
        let additionalProperties = { definitionId: definitionId, continuationToken: continuationToken };

        return webPageDataService.getDataAsync<IReleasesHubActiveReleasesData>(
            ReleasesHubDataProviderKeys.ACTIVE_RELEASES_DATA_PROVIDER,
            CommonConstants.ReleaseManagementServiceInstanceId,
            additionalProperties).then((activeReleasesData: IReleasesHubActiveReleasesData) => {

                if (activeReleasesData) {
                    // Convert the enum values, like deployment and operation status, from string to their numerical values
                    activeReleasesData = Serialization.ContractSerializer.deserialize(activeReleasesData, ReleasesHubActiveReleasesTypeInfo.WebPageData);
                    let releasesResult: IReleasesResult = {
                        releases: activeReleasesData.activeReleases,
                        continuationToken: activeReleasesData.continuationToken,
                        queryDefinitionId: definitionId
                    };
                    
                    return Q.resolve(releasesResult);
                }
                else {
                    return Q.resolve(<IReleasesResult> {
                        releases: [],
                        continuationToken: 0,
                        queryDefinitionId: definitionId
                    });
                }
            });
    }

    public searchReleases(definitionId: number, currentlyDeployed: boolean, searchText: string, statusFilter: ReleaseStatus, branchFilter: string, tagFilter: string, isDeleted: boolean, createdBy: string): IPromise<IReleasesResult> {
        // If we are starting a new search cancel any existing one that may be outstanding
        this._cancelActiveSearchRequests();

        let searchParams: IReleaseSearchParameters = {
            definitionId: definitionId,
            currentlyDeployed: currentlyDeployed,
            searchText: searchText,
            statusFilter: statusFilter,
            branchFilter: branchFilter,
            isDeleted: isDeleted,
            tagFilter: tagFilter,
            createdBy: createdBy
        };

        // For search definitions, we fetch release from server
        return this._performSearch(searchParams);
    }

    protected disposeInternal(): void {
        if (this._activeSearchCancelable) {
            this._activeSearchCancelable.cancel();
        }

        this._searchHandler = null;
        super.disposeInternal();
    }

    private _performSearch(searchParams: IReleaseSearchParameters): IPromise<IReleasesResult> {
        let deferredWrapper = Q.defer<IReleasesResult>();

        const cancelableDeferred = Q.defer<ICancelableReleasesResult>();
        if (this._searchHandler) {
            this._searchHandler(searchParams, cancelableDeferred);
        }

        cancelableDeferred.promise.done((searchResult) => {
            // Only invoke search finished if it was not cancelled and
            // we are in the inProgress state
            if (!searchResult.isCanceled) {
                deferredWrapper.resolve(searchResult.result);
            }
        }, (error) => {
            // Request failed, just ignore
        });

        return deferredWrapper.promise;
    }

    private _cancelActiveSearchRequests(): void {
        if (this._activeSearchCancelable) {
            this._activeSearchCancelable.cancel();
        }
    }

    /**
     * The implementation of the search which is used in the throttled delegate
     */
    private _performServerSearch(params: IReleaseSearchParameters, deferred: Q.Deferred<ICancelableReleasesResult>): void {
        const cancelable = new Cancelable(this);
        this._activeSearchCancelable = cancelable;

        let promise: IPromise<IReleasesResult>;
        if (params.currentlyDeployed) {
            promise = this.listActiveReleases(params.definitionId);
        }
        else {
            promise = this.listReleases(params.definitionId, params.searchText, params.statusFilter, params.branchFilter, params.isDeleted, params.tagFilter, params.createdBy);
        }

        promise.then((result: IReleasesResult) => {
            deferred.resolve({ isCanceled: cancelable.canceled, result: result });
        }, deferred.reject);
    }

    private _searchHandler: (releaseSearchParameters: IReleaseSearchParameters, deferred: Q.Deferred<ICancelableReleasesResult>) => void;
    private _activeSearchCancelable: Cancelable;

    private static readonly DefaultTopReleasesCount = 25;
}