import Diag = require("VSS/Diag");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");
import TFS_Agile_ProductBacklog_DM = require("Agile/Scripts/Backlog/ProductBacklogDataManager");
import TFS_Agile_WorkItemChanges = require("Agile/Scripts/Common/WorkItemChanges");

export class GridReorderBehavior implements TFS_Agile_ProductBacklog_Grid.IGridReorderBehavior {
    constructor(
        protected _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid,
        protected _filter: TFS_Agile_WorkItemChanges.ISelectionFilter,
        protected _enumerator: TFS_Agile_WorkItemChanges.ILocationEnumerator,
        protected _validator: TFS_Agile_WorkItemChanges.ILocationValidator,
        protected _selector: TFS_Agile_WorkItemChanges.ILocationSelector,
        protected _backlogLevelHelper: TFS_Agile_WorkItemChanges.BacklogLevelHelper) {
    }

    public isReorderRequirementDisabled: boolean;

    public calculateMoveWorkItemsEffect(
        sourceWorkItemIds: number[], targetWorkItemId: number, isReparentingGesture: boolean, isAboveFirstOrBelowLast?: boolean)
        : TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect {

        if (!TFS_Agile.areAdvancedBacklogFeaturesEnabled()) {
            return null; // drag/drop not allowed for stakeholder
        }

        targetWorkItemId = (isAboveFirstOrBelowLast && this._grid._getWorkItemDataIndex(targetWorkItemId) === 0) ? 0 : targetWorkItemId;

        // Filter top level items
        var filteredSourceIds = this._filter.filter(sourceWorkItemIds);

        // Enumerate all possible drop locations
        var locations: TFS_Agile_WorkItemChanges.ILocation[];
        locations = this._enumerator.getLocations(targetWorkItemId, filteredSourceIds);

        if (isReparentingGesture) {
            locations = locations.concat(this._enumerator.getLocationsForExplicitReparent(targetWorkItemId, filteredSourceIds));
        }

        if (!locations || locations.length === 0) {
            return null;
        }

        // Start paging in the relavent workitem if we dont have them already.
        this._grid.pageLocations(locations, () => { });

        // Filter to valid locations
        locations = locations.filter(l => this._validator.isValid(filteredSourceIds, l));
        if (!locations || locations.length === 0) {
            return null;
        }

        // Select best match
        var selectedLocation = this._selector.select(filteredSourceIds, locations);

        Diag.Debug.assert(!!selectedLocation, "No location selected");

        return <TFS_Agile_ProductBacklog_DM.IWorkItemMoveEffect>{
            workItemIds: filteredSourceIds,
            targetLocation: selectedLocation,
            isValid: true
        };
    }

    public shouldExpandRow(draggingRowType: string, droppingRowType: string): boolean {
        Diag.Debug.assertParamIsNotNull(draggingRowType, "draggingRowType");
        Diag.Debug.assertParamIsNotNull(droppingRowType, "droppingRowType");
        Diag.Debug.assertIsObject(this._backlogLevelHelper, "backlogLevelHelper must be defined");

        let draggingRowLevel = this._backlogLevelHelper.getLevel(draggingRowType);
        let droppingRowLevel = this._backlogLevelHelper.getLevel(droppingRowType);

        // Expand if dragging row is higher level than dropping row
        return draggingRowLevel > droppingRowLevel;
    }
}