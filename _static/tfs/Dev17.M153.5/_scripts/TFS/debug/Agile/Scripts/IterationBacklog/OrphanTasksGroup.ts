import { BacklogBehaviorConstants } from "Agile/Scripts/Backlog/Constants";
import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");
import { ControlUtils } from "Agile/Scripts/Common/Utils";
import ProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import Diag = require("VSS/Diag");

export class OrphanTasksGroup extends TFS_Agile_ProductBacklog_Grid.GridGroupRowBase {
    constructor(options?: any, preprocessor?: any) {
        // The Orphan Task row is always -1
        super(-1, options, preprocessor);
    }

    /**
     * Get the type of the custom group
     * 
     * @return A RowType value indicating the type .
     */
    public getRowType(): TFS_Agile_ProductBacklog_Grid.GroupRowType {

        return TFS_Agile_ProductBacklog_Grid.GroupRowType.OrphanTasks;
    }

    public getDefaultRow(): { [id: string]: string } {
        /// <summary>Gets the fields corresponding to the default row.</summary>
        /// <returns>A dictionary with field names & values.</returns>

        let customRow: { [id: string]: string } = {};
        let defaultWorkItemType = BacklogConfigurationService.getBacklogConfiguration().requirementBacklog.defaultWorkItemType;

        customRow[WITConstants.CoreFieldRefNames.WorkItemType] = defaultWorkItemType;
        customRow[WITConstants.CoreFieldRefNames.Title] = ProductBacklogResources.GroupRow_OrphanTasks;
        customRow[WITConstants.CoreFieldRefNames.Id] = "" + this.getRowId();

        return customRow;
    }

    /**
     * Get the list of all child rows that match the isChildRow check.
     * 
     * @return An array of type number that contains the indices of the child rows in the gridOptions object.
     */
    public getChildRows(): number[] {

        const sourceIds: number[] = this._gridOptions.sourceIds;
        const targetIds: number[] = this._gridOptions.targetIds;
        Diag.Debug.assert(sourceIds.length === targetIds.length);

        const result: number[] = [];
        const tempRowId = this.getRowId();
        for (let idx = 0; idx < sourceIds.length; idx++) {
            if (targetIds[idx] !== tempRowId && sourceIds[idx] === tempRowId) {
                result.push(idx);
            }
        }

        return result;
    }

    /**
     * Builds hierarchy of a custom row and child rows under it .
     * 
     * @param childRows An array of indices of child rows
     * @param rowInfo An optional rowInfo object that may contain any additional fields for the default row
     * @return The updated options object.
     */
    public buildHierarchy(childRows: number[], rowInfo?: { [id: string]: string }): any {

        var options = this.getGridOptions();

        // If there are no child rows, just return the default options.
        if (!childRows.length) {
            return options;
        }

        var customParent = this.getRowId();

        // If any preprocesssing, such as fixing the aggregator first before inserting the custom row, 
        // needs to be done, do it now. 
        if (this._preprocessor && $.isFunction(this._preprocessor)) {
            this._preprocessor.call(this, options, childRows, customParent);
        }

        // Build the custom row by setting the specified fields. 
        const columns = options.payload.columns;
        const defaultRowFields = this.getDefaultRow();
        $.extend(defaultRowFields, rowInfo);
        const customRow = [];
        for (let idx = 0; idx < columns.length; idx++) {
            if (columns[idx] in defaultRowFields) {
                customRow[idx] = defaultRowFields[columns[idx]];
            }
            else {
                customRow[idx] = null;
            }
        }

        // Insert the custom row at the beginning of the grid's rows. 
        options.payload.rows.splice(0, 0, customRow);

        return options;
    }

    /**
     * Get the renderer object used for drawing the row.
     * 
     * @param rowInfo The rowInfo object that contains the jQuery data for the row
     * @param rowIndex The index into the _rows object.
     * @param dataIndex The index into the _workItems array.
     * @return A ICustomRowRenderer object specific to this group ; since this is a base class, return null.
     */
    public getRowRenderer(rowInfo: any, rowIndex: number, dataIndex: number): TFS_Agile_ProductBacklog_Grid.ICustomRowRenderer {

        return new OrphanTasksRowRenderer(rowInfo, rowIndex, dataIndex);
    }
}

export class OrphanTasksRowRenderer implements TFS_Agile_ProductBacklog_Grid.ICustomRowRenderer {
    /**
     * Get the renderer object used for drawing the row.
     * 
     * @param rowInfo The rowInfo object that contains the jQuery data for the row
     * @param rowIndex The index into the _rows object.
     * @param dataIndex The index into the _workItems array.
     * @return A ICustomRowRenderer object specific to this group.
     */
    constructor(rowInfo, rowIndex, dataIndex) {

        this.attachEvents(rowInfo);
    }

    /**
     * Attach mouse/keyboard handlers for special behavior on the custom row.
     * 
     * @param rowInfo The rowInfo object that contains the jQuery data for the row
     */
    public attachEvents(rowInfo: any) {

        rowInfo.row.on("dblclick", this.handleEvent);
    }

    /**
     * Handle a specific event, such as click/double-click etc.
     * 
     * @param event The event object for the raised event
     */
    public handleEvent(event: any) {

        // If the user hasn't clicked on the expand icon, don't propagate this event. 
        if (!($(event.target).hasClass("grid-tree-icon"))) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /**
     * Get the CSS class corresponding to this custom row.
     * 
     * @return A string with the CSS class name.
     */
    public getCssClass(): string {

        return "orphan-tasks-grid-row";
    }

    /**
     * Get the color for the workItem type corresponding to this custom row.
     * 
     * @return A string with actual color used.
     */
    public getTypeColor(): string {

        return ControlUtils.getCSSPropertyValue("dummyParent", "border-left-color");
    }

    /**
     * Get the list of all fields that should be displayed ; RemainingWork is handled separately by the Grid
     * 
     * @return A array of strings with the field names
     */
    public getDisplayFields() {

        var fields: string[] = [
            WITConstants.CoreFieldRefNames.Title,
            BacklogBehaviorConstants.BACKLOG_BUTTONS_COLUMN_NAME
        ];

        return fields;
    }
}