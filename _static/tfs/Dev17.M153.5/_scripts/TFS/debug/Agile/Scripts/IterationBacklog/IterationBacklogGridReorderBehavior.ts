import { GridReorderBehavior } from "Agile/Scripts/Backlog/GridReorderBehavior";
import TFS_Agile_ProductBacklog_DM = require("Agile/Scripts/Backlog/ProductBacklogDataManager");
import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");
import TFS_Agile_WorkItemChanges = require("Agile/Scripts/Common/WorkItemChanges");
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");


export class IterationBacklogGridReorderBehavior extends GridReorderBehavior {
    public isReorderRequirementDisabled: boolean = false;
    public workItemsBlockingReorder: number[] = [];

    constructor(
        _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid,
        _filter: TFS_Agile_WorkItemChanges.ISelectionFilter,
        _enumerator: TFS_Agile_WorkItemChanges.ILocationEnumerator,
        _validator: TFS_Agile_WorkItemChanges.ILocationValidator,
        _selector: TFS_Agile_WorkItemChanges.ILocationSelector,
        _backlogLevelHelper: TFS_Agile_WorkItemChanges.BacklogLevelHelper,
        protected _itemHierarchy: TFS_Agile_WorkItemChanges.IWorkItemDataHierarchy) {
        super(_grid, _filter, _enumerator, _validator, _selector, _backlogLevelHelper);
    }

    public calculateMoveWorkItemsEffect(
        sourceWorkItemIds: number[], targetWorkItemId: number, isReparentingGesture: boolean, isAboveFirstOrBelowLast?: boolean)
        : TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect {
        if (!sourceWorkItemIds || !sourceWorkItemIds.length ||
            (this.isReorderRequirementDisabled && sourceWorkItemIds.some(id => this._isWorkItemOfRequirementType(id)))) {
            // If reordering is disabled, there is no valid drop location
            return null;
        }

        return super.calculateMoveWorkItemsEffect(sourceWorkItemIds, targetWorkItemId, isReparentingGesture, isAboveFirstOrBelowLast);
    }

    /** Determines whether there is a requirement/requirement hierarchy in this view and enables/disabled ordering accordingly */
    public updateReorderRequirementStatus() {
        var dataManager = this._grid.getDataManager();
        var workItemIds = dataManager.getWorkItemIds();

        this.isReorderRequirementDisabled = false;

        $.each(workItemIds, (index, workItemId) => {
            if (this._isWorkItemOfRequirementType(workItemId)) {
                // Work items with no parent or parent item on a different backlog level has real parent id of 0
                if (dataManager.getRealParentId(index) !== 0) {
                    this.isReorderRequirementDisabled = true;
                    this.workItemsBlockingReorder.push(workItemId);
                }
            }
        });
    }

    private _isWorkItemOfRequirementType(workItemId: number): boolean {
        let workItemData = this._itemHierarchy.getData(workItemId);
        return workItemData && Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().requirementBacklog.workItemTypes, workItemData.type, Utils_String.ignoreCaseComparer);
    }
}
