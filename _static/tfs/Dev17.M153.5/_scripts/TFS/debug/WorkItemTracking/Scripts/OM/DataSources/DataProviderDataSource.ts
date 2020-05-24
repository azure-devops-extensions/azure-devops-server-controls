import { ILinkTypes, IWorkItemData, IWorkItemTypeData, IFieldProjectData, IFieldEntry } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { format, equals } from "VSS/Utils/String";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { parseMSJSON } from "VSS/Utils/Core";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { WebPageDataProviderPageSource } from "VSS/Common/Contracts/Platform";
import { CacheStatus } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IWorkItemDataSource } from "WorkItemTracking/Scripts/OM/DataSources/Interfaces";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { WorkItemMetadataCacheInformationManager } from "WorkItemTracking/Scripts/OM/WorkItemMetadataCacheInformationManager";
import { getPageContext } from "VSS/Context";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import { getDefaultWebContext } from "VSS/Context";

export interface IWorkItemMetadataCacheResult<TCacheData> {
    /**
     * Indicating whether data was sent to the client
     *
     * Note: typed as string and enum due to difference in serialization between old and new web platform
     */
    status: CacheStatus | string;

    /** Cache stamp for the meta data */
    stamp: string;

    /** Meta data payload */
    data: TCacheData;
}

/**
 * Data returned by the data provider for a single work item
 */
export interface IWorkItemDataProviderPayload {
    /** Id of serialized work item */
    "work-item-id"?: number;

    "work-item-data"?: IWorkItemData;

    /** Serialized work item */
    "work-item-data-serialized"?: string;

    "includes-history": boolean;

    "work-item-project-field-data"?: IWorkItemMetadataCacheResult<IFieldProjectData>;
    "work-item-type-data"?: IWorkItemMetadataCacheResult<IWorkItemTypeData>;
    "work-item-link-data"?: IWorkItemMetadataCacheResult<ILinkTypes>;
}

interface IWorkItemDataProviderRequestProperties {
    "id": number;
    "include-history"?: boolean;
    "include-in-recent-activity"?: boolean;
    "is-deleted"?: boolean;
    "cookie"?: string;

    /** Whether meta data for the work item should be included or not */
    includeMetadata?: boolean;
}

export const WorkItemDataProviderId = "ms.vss-work-web.work-item-data-provider";

/**
 * Data source for the single work item provider
 */
export class WorkItemDataProviderSource implements IWorkItemDataSource {

    private _dataProviderData: IWorkItemDataProviderPayload;
    private _cacheInformationManager: WorkItemMetadataCacheInformationManager;

    constructor(cacheInformationManager: WorkItemMetadataCacheInformationManager) {
        this._cacheInformationManager = cacheInformationManager;
    }

    private getWorkItemData(id: number): IWorkItemData {
        if (!this._containsWorkItemData(id)) {
            return null;
        }

        const providerData: IWorkItemDataProviderPayload = this._getDataProviderData();
        return this._processWorkItemData(id, providerData);
    }

    public beginGetWorkItemData(
        projectId: string, ids: number[], isDeleted?: boolean, includeInRecentActivity?: boolean, includeHistory?: boolean): Promise<IWorkItemData[]> {
        if (ids.length !== 1) {
            // This data provider can only resolve a single work item
            return Promise.resolve(null);
        }

        const id = ids[0];

        // Check local data island first
        if (!includeHistory && this._containsWorkItemData(id)) {
            return Promise.resolve([this.getWorkItemData(id)]);
        }

        const pageContext = getPageContext();
        const navHistoryService = getNavigationHistoryService();

        // Fall back, query data provider
        const dataProviderRequestProperties: IWorkItemDataProviderRequestProperties = {
            "id": ids[0],
            "include-history": includeHistory,
            "include-in-recent-activity": includeInRecentActivity,
            "is-deleted": isDeleted,
            "cookie": this._cacheInformationManager && this._cacheInformationManager.readInformationForNonWITLocation()
        };

        return getService(WebPageDataService, getDefaultWebContext())
            .getDataAsync(WorkItemDataProviderId, null, dataProviderRequestProperties)
            .then((dataProviderData: IWorkItemDataProviderPayload) => {
                this._dataProviderData = dataProviderData;
                return [this._processWorkItemData(id, this._dataProviderData)];
            });
    }

    private _processWorkItemData(id: number, workItemProviderData: IWorkItemDataProviderPayload, clear: boolean = true): IWorkItemData {
        let workItemData = workItemProviderData && workItemProviderData["work-item-data"];

        if (!workItemData) {
            const serializedWorkItemData = workItemProviderData && workItemProviderData["work-item-data-serialized"];
            if (serializedWorkItemData) {
                workItemData = parseMSJSON(serializedWorkItemData);
            }
        }

        if (!workItemData) {
            throw format(Resources.WorkItemNotFoundClientException, id);
        }

        if (clear) {
            delete workItemProviderData["work-item-id"];
            delete workItemProviderData["work-item-data"];
            delete workItemProviderData["work-item-data-serialized"];
        }

        return workItemData;
    }

    public beginGetWorkItemTypeData(projectId: string, typeNames: string[]): Promise<IWorkItemTypeData[]> {
        if (typeNames.length > 1) {
            // This data provider can only ever return data for a single work item type
            return Promise.resolve(null);
        }

        const pageData: IWorkItemDataProviderPayload = this._getDataProviderData();
        const cachedData = pageData && pageData["work-item-type-data"];
        if (cachedData) {
            if (isCacheUpToDate(cachedData)) {
                // When we get here, the server thinks we have the data, but the client still tries to resolve
                // it from the data provider (i.e., it's not in the cache), so return null to allow falling back to another
                // data source
                return Promise.resolve(null);
            }

            if (cachedData.data) {
                const workItemTypeData: IWorkItemTypeData = cachedData.data;

                if (!equals(workItemTypeData.projectGuid, projectId, true)) {
                    return Promise.resolve(null);
                }

                if (!equals(typeNames[0], workItemTypeData.referenceName, true) && !equals(typeNames[0], workItemTypeData.name, true)) {
                    return Promise.resolve(null);
                }

                if (this._canDeserializeRules(workItemTypeData)) {
                    workItemTypeData.rules.fieldRules = parseMSJSON(workItemTypeData.rules.fieldRules);
                }

                return Promise.resolve([workItemTypeData]);
            }
        }

        return Promise.resolve(null);
    }

    public beginGetFields(): Promise<IFieldEntry[]> {
        return null;
    }

    public beginGetFieldProjectData(projectId: string): Promise<IFieldProjectData> {
        const pageData: IWorkItemDataProviderPayload = this._getDataProviderData();
        const cachedData = pageData && pageData["work-item-project-field-data"];
        if (cachedData) {
            if (isCacheUpToDate(cachedData)) {
                return Promise.resolve(null);
            }

            if (cachedData.data && cachedData.data.projects) {
                const isProjectIdOrNameMatch = cachedData.data.projects.some((project) => {
                    return equals(projectId, project.guid, true) || equals(projectId, project.name, true);
                });

                if (!isProjectIdOrNameMatch) {
                    return Promise.resolve(null);
                }
            }

            return Promise.resolve(cachedData.data);
        }
    }

    public beginGetLinkTypes(): Promise<ILinkTypes> {
        const pageData: IWorkItemDataProviderPayload = this._getDataProviderData();
        const cachedData = pageData && pageData["work-item-link-data"];
        if (cachedData) {
            if (isCacheUpToDate(cachedData)) {
                return Promise.resolve(null);
            }

            return Promise.resolve(cachedData.data);
        }
    }

    private _canDeserializeRules(workItemTypeData: IWorkItemTypeData): boolean {
        return workItemTypeData &&
            workItemTypeData.rules &&
            workItemTypeData.rules.fieldRules &&
            (typeof workItemTypeData.rules.fieldRules === "string" || workItemTypeData.rules.fieldRules instanceof String);
    }

    private _containsWorkItemData(id: number): boolean {
        const pageData: IWorkItemDataProviderPayload = this._getDataProviderData();
        return pageData && pageData["work-item-id"] === id && pageData["work-item-data"] !== undefined;
    }

    private _getDataProviderData(): IWorkItemDataProviderPayload {
        if (!this._dataProviderData) {
            const service: WebPageDataService = getService(WebPageDataService);
            this._dataProviderData = service.getPageData(WorkItemDataProviderId);
        }
        return this._dataProviderData;
    }
}

function isCacheUpToDate<T>(cachedData: IWorkItemMetadataCacheResult<T>): boolean {
    return cachedData.status === CacheStatus.UpToDate
        || (typeof cachedData.status === "string" && cachedData.status === CacheStatus[CacheStatus.UpToDate]);
}
