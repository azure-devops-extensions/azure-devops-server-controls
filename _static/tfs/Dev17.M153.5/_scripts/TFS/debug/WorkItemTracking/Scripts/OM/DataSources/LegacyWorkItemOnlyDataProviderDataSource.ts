import { ILinkTypes, IWorkItemData, IWorkItemTypeData, IFieldProjectData, IFieldEntry } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { format, equals } from "VSS/Utils/String";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { parseMSJSON } from "VSS/Utils/Core";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { CacheStatus } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IWorkItemDataSource } from "WorkItemTracking/Scripts/OM/DataSources/Interfaces";
import { IWorkItemDataProviderPayload, WorkItemDataProviderId } from "WorkItemTracking/Scripts/OM/DataSources/DataProviderDataSource";

/**
 * Data source for single work item provider without meta data
 *
 * @description This is only needed until we can fully enable the data provider flag
 */
export class LegacyWorkItemOnlyDataProviderDataSource implements IWorkItemDataSource {
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

        // We don't have the work item
        return null;
    }

    private _processWorkItemData(id: number, workItemProviderData: IWorkItemDataProviderPayload, clear: boolean = true): IWorkItemData {
        let workItemData = workItemProviderData && workItemProviderData["work-item-data"];

        if (!workItemData) {
            const serializedWorkItemData = workItemProviderData && workItemProviderData["work-item-data-serialized"];
            workItemData = parseMSJSON(serializedWorkItemData);
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

    // The following methods are not supported in this data source
    public beginGetWorkItemTypeData = (projectId: string, typeNames: string[]): Promise<IWorkItemTypeData[]> => null;
    public beginGetFields = (): Promise<IFieldEntry[]> => null;
    public beginGetFieldProjectData = (projectId: string): Promise<IFieldProjectData> => null;
    public beginGetLinkTypes = (): Promise<ILinkTypes> => null;

    private _containsWorkItemData(id: number): boolean {
        const pageData: IWorkItemDataProviderPayload = this._getDataProviderData();
        return pageData && pageData["work-item-id"] === id && pageData["work-item-data"] !== undefined;
    }

    private _getDataProviderData(): IWorkItemDataProviderPayload {
        const service: WebPageDataService = getService(WebPageDataService);
        return service.getPageData(WorkItemDataProviderId);
    }
}
