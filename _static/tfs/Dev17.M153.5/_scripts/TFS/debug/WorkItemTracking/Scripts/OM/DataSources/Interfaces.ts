import { ILinkTypes, IWorkItemTypeData, IFieldProjectData, IFieldEntry, IWorkItemData } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

export interface IWorkItemDataSource {
    beginGetWorkItemData(projectId: string, ids: number[], isDeleted?: boolean, includeInRecentActivity?: boolean, includeHistory?: boolean): Promise<IWorkItemData[]>;

    beginGetWorkItemTypeData(projectId: string, typeNames: string[]): Promise<IWorkItemTypeData[]>;

    beginGetLinkTypes(): Promise<ILinkTypes>;

    beginGetFieldProjectData(projectId: string): Promise<IFieldProjectData>;

    beginGetFields(): Promise<IFieldEntry[]>;
}
