import { ILinkTypes, IWorkItemData, IWorkItemTypeData, IFieldProjectData, IFieldEntry } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { IWorkItemDataSource } from "WorkItemTracking/Scripts/OM/DataSources/Interfaces";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { arrayContains } from "VSS/Utils/Array";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";

/**
 * Data returned by the data provider for the query hub
 */
interface IQueryDataProviderPayload {
    projectFieldData?: IFieldProjectData;
}

const DataProviderId = "ms.vss-work-web.query-data-provider";

/**
 * Data source for the query hub data provider
 */
export class QueryDataProviderSource implements IWorkItemDataSource {

    public beginGetWorkItemData(projectId: string, ids: number[], isDeleted?: boolean, includeInRecentActivity?: boolean, includeHistory?: boolean): Promise<IWorkItemData[]> {
        return null;
    }

    public beginGetWorkItemTypeData(projectId: string, typeNames: string[]): Promise<IWorkItemTypeData[]> {
        return null;
    }

    public beginGetLinkTypes(): Promise<ILinkTypes> {
        return null;
    }

    public beginGetFields(): Promise<IFieldEntry[]> {
        return null;
    }

    public beginGetFieldProjectData(projectId: string): Promise<IFieldProjectData> {
        const pageData: IQueryDataProviderPayload = this._getDataProviderData();
        const projectFieldData = pageData && pageData.projectFieldData;
        if (projectFieldData) {
            const hasProject = arrayContains(projectId, projectFieldData.projects, (id, project) => {
                return localeIgnoreCaseComparer(project.guid, id) === 0 || localeIgnoreCaseComparer(project.name, id) === 0;
            });

            if (hasProject) {
                return Promise.resolve(projectFieldData);
            }
        }

        return null;
    }

    private _getDataProviderData(): IQueryDataProviderPayload {
        const service: WebPageDataService = getService(WebPageDataService);
        return service.getPageData(DataProviderId);
    }
}
