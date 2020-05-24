import * as StoreBase from "VSS/Flux/Store";
import { TriageViewActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/TriageViewActionsCreator";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export interface IWorkItemFilterData {
    isFiltering: boolean;
    filteredWorkItemIds: number[];
    filterState: FilterState;
}

export class WorkItemFilterStore extends StoreBase.Store {
    private _workItemFilterData;

    constructor(actions: TriageViewActionsHub) {
        super();

        actions.WorkItemFilterCleared.addListener(() => {
            this._workItemFilterData = {
                isFiltering: false,
                filteredWorkItemIds: [],
                filterState: null
            }
        });

        actions.WorkItemFilterApplied.addListener((data: IWorkItemFilterData) => {
           this._workItemFilterData = data;
        });
    }

    public getWorkItemFilterData(): IWorkItemFilterData {
        return this._workItemFilterData;
    }
}
