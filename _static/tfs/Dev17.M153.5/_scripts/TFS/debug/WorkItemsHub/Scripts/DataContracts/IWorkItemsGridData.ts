import { IObjectWithKey } from "OfficeFabric/DetailsList";

export interface IWorkItemsGridRow extends IObjectWithKey {
    id: number;
    isCompleted: boolean;
    values: any[];
    tagWidthsCache: IDictionaryStringTo<number>;
}

export type IWorkItemsGridData = IWorkItemsGridRow[];
