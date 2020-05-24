import * as BaseSortOptionsStore from "Search/Scenarios/Shared/Base/Stores/SortOptionsStore";
import * as _SortOptions from "SearchUI/SortOptions";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { WorkItemSearchRequest, WorkItemResult } from "Search/Scenarios/WebApi/WorkItem.Contracts";
import { SortActionIds } from "Search/Scenarios/WorkItem/Constants";
import { SearchStartedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";

export class SortOptionsStore extends BaseSortOptionsStore.SortOptionsStore<WorkItemResult> {
    constructor() {
        super();
        this._state.sortOption = this.relevanceSortOption;
    }
    
    public updateSortOptionOnSearch = (payload: SearchStartedPayload<WorkItemSearchRequest>) => {
        if (payload.sortScenario) {
            const { sortOptions } = payload.query;
            this._state.sortOption = sortOptions && sortOptions.length
                ? sortOptions[0]
                : this.relevanceSortOption;

            this.emitChanged();
        }
    }

    public get availableSortFields(): _SortOptions.SortField[] {
        return [
            { key: SortActionIds.AssignedTo, name: Resources.WorkItemSearchAssignedToField },
            { key: SortActionIds.ChangedDate, name: Resources.WorkItemSearchChangedDateField },
            { key: SortActionIds.CreatedDate, name: Resources.WorkItemSearchCreatedDateField },
            { key: SortActionIds.ID, name: Resources.WorkItemSearchIDField },
            { key: SortActionIds.Relevance, name: Resources.RelevanceSortOption },
            { key: SortActionIds.State, name: Resources.WorkItemSearchStateField },
            { key: SortActionIds.Tags, name: Resources.WorkItemSearchTagsField },
            { key: SortActionIds.Title, name: Resources.WorkItemSearchTitleField },
            { key: SortActionIds.WorkItemType, name: Resources.WorkItemSearchWorkItemTypeField }
        ]
    }

    private get relevanceSortOption() {
        return {
            field: SortActionIds.Relevance,
            sortOrder: SortActionIds.Descending
        };
    }
}