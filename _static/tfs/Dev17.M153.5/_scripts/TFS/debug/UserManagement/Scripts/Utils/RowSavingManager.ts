import Grids = require("VSS/Controls/Grids");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Diag = require("VSS/Diag");
import Helpers = require("UserManagement/Scripts/Utils/Helpers");

var eventService = Events_Services.getService();
var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export class RowSavingManager {

    public static SAVING_ROW_CLASS: string = "saving-row";
    public static SAVING_GUTTER_CLASS: string = "saving-row-gutter";

    private _idToDataIndex: any;
    private _dataIndexToId: any;
    private _savingRows: any;
    private _disabledRows: any;
    private _delayedSaveRows: any;
    private _callsForRowDisableMap: any;

    public _grid: any;

    constructor(grid: Grids.Grid, idToDataIndex: Function, dataIndexToId: Function) {
        /// <summary>Manages displaying rows in the grid with a saving indicator.</summary>
        /// <param name="grid" type="Grids.Grid">Grid control to bind to.</param>
        /// <param name="idToDataIndex" type="function">Function for converting an ID to a data index in the grid.</param>
        /// <param name="dataIndexToId" type="function">Function for converting a dataIndex to an id.</param>

        Diag.Debug.assertParamIsObject(grid, "grid");
        Diag.Debug.assertParamIsFunction(idToDataIndex, "idToDataIndex");
        Diag.Debug.assertParamIsFunction(dataIndexToId, "dataIndexToId");

        this._grid = grid;
        this._idToDataIndex = idToDataIndex;
        this._dataIndexToId = dataIndexToId;
        this._savingRows = {};
        this._disabledRows = {};
        this._delayedSaveRows = {};
        this._callsForRowDisableMap = {};

        // Register for the row updated event on the grid and enable the event.
        this._grid.enableEvent(Grids.GridO.EVENT_ROW_UPDATED);
        this._grid.getElement().bind(Grids.GridO.EVENT_ROW_UPDATED, delegate(this, this._updateRowHandler));
    }

    public isRowSaving(id: any): boolean {
        /// <summary>Determines if a row is in the process of saving.</summary>
        /// <param name="id" type="object">ID of the row to check.</param>
        /// <returns type="boolean" />

        Diag.Debug.assertParamIsNotNull(id, "id");

        return id in this._savingRows || id in this._callsForRowDisableMap || id in this._disabledRows;
    }

    public changeId(oldId: number, newId: number) {
        /// <summary>Change WorkItem Id</summary>
        /// <param name="oldId" type="number">old id</param>
        /// <param name="newId" type="number">new id</param>

        Diag.Debug.assertParamIsNumber(oldId, "oldId");
        Diag.Debug.assertParamIsNumber(newId, "newId");

        var dependentIds;

        if (this._savingRows.hasOwnProperty(oldId)) {
            dependentIds = this._savingRows[oldId];
            delete this._savingRows[oldId];
            this._savingRows[newId] = dependentIds;
        }

        if (this._delayedSaveRows.hasOwnProperty(oldId)) {
            delete this._delayedSaveRows[oldId];
            this._delayedSaveRows[newId] = newId;
        }
        Helpers.PendingOperationHelper.clearOperation(oldId.toString());
        Helpers.PendingOperationHelper.addOperation(newId.toString());
    }

    public markRowAsProcessing(id: any, dependentIds?: any[]) {
        /// <summary>Mark a row as processing, but dont add to pending operation.</summary>
        /// <param name="id" type="object">ID associated with the row being disabled.</param>
        /// <param name="dependentIds" type="Array" elementType="Number" optional="true">
        ///     A list of workItemIds associated with rows that are to be processed to guard
        ///     against the occurence of potential wrong operations while workItem with id is disabled.
        ///     When the row is enabled the dependent rows will be re-enabled (provided
        ///     there are no other disabled rows that also disable the same row).
        ///</param>

        this._disableRow(id, dependentIds, false);
    }

    public clearRowProcessing(id: any) {
        /// <summary>Clear the row processing indicator and enable the row.</summary>
        /// <param name="id" type="object">ID associated with the row being enabled.</param>

        this._enableRow(id, false);
    }

    public markRowAsSaving(id: any, dependentIds?: any[]) {
        /// <summary>Mark a row as saving.</summary>
        /// <param name="id" type="object">ID associated with the row being saved.</param>
        /// <param name="dependentIds" type="Array" elementType="Number" optional="true">
        ///     A list of workItemIds associated with rows that are to be disabled to guard
        ///     against the occurence of potential wrong operations while workItem with id is saving.
        ///     When the row saving is cleared the dependent rows will be re-enabled (provided
        ///     there are no other saving rows that also disable the same row).
        ///</param>

        this._disableRow(id, dependentIds, true);
    }

    public clearRowSaving(id: any) {
        /// <summary>Clear the row saving indicator.</summary>
        /// <param name="id" type="object">ID associated with the row being saved.</param>

        this._enableRow(id, true);
    }

    private _disableRow(id: any, dependentIds?: any[], saving?: boolean) {
        /// <summary>Disables a row.</summary>
        /// <param name="id" type="object">ID associated with the row being disabled.</param>
        /// <param name="dependentIds" type="Array" elementType="Number" optional="true">
        ///     A list of workItemIds associated with rows that are to be disabled to guard
        ///     against the occurence of potential wrong operations while workItem with id is disabled.
        ///     When the row is enabled the dependent rows will be re-enabled (provided
        ///     there are no other disabled rows that also disable the same row).
        /// </param>
        /// <param name="saving" type="Boolean" optional="true">true, if the row is being saved, false otherwise</param>
        Diag.Debug.assertParamIsNotNull(id, "id");

        var i, l;

        dependentIds = dependentIds || [];

        if (saving === true) {
            this._savingRows[id] = dependentIds;
        }
        else {
            this._disabledRows[id] = dependentIds;
        }

        for (i = 0, l = dependentIds.length; i < l; i++) {
            this._incrementDisableCalls(dependentIds[i]);
            this._updateRow(dependentIds[i]);
        }

        this._updateRow(id);

        if (saving === true) {
            // Since an item is in the process of saving, add it to the pending operation helper
            // so that the user will get prompted when they try to navigate away from the page.
            Helpers.PendingOperationHelper.addOperation(id.toString());
        }
    }

    private _enableRow(id: any, saving: boolean) {
        /// <summary>Clear the row saving/processing indicator and enable the row.</summary>
        /// <param name="id" type="object">ID associated with the row being enabled.</param>
        /// <param name="saving" type="Boolean">true, if the row is being saved, false otherwise</param>

        Diag.Debug.assertParamIsNotNull(id, "id");

        var i, l,
            disabledRows;

        if (saving === true) {
            disabledRows = this._savingRows[id];
        }
        else {
            disabledRows = this._disabledRows[id];
        }

        // Unmark the row as saving and update the row. Check for disabled rows

        if (typeof disabledRows !== 'undefined') {
            if (saving === true) {
                delete this._savingRows[id];
            }
            else {
                delete this._disabledRows[id];
            }

            for (i = 0, l = disabledRows.length; i < l; i++) {
                this._decrementDisableCalls(disabledRows[i]);
                this._updateRow(disabledRows[i]);
            }

            this._updateRow(id);
        }

        if (saving === true) {
            // Since the item is done saving, remove the pending operation so the user will not get
            // prompted when they navigate away from the page.
            Helpers.PendingOperationHelper.clearOperation(id.toString());
        }
    }

    private _updateRowHandler(event, rowInfo: any) {
        /// <summary>Event handler passed to the grid that will be triggered whenever a row is updated on the grid</summary>
        /// <param name="rowInfo" type="object">Information about the row which has been updated.</param>

        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(rowInfo, "rowInfo");

        var id = this._dataIndexToId(rowInfo.dataIndex);

        if (typeof (id) !== "undefined") {
            this._updateRow(id, rowInfo);
        }
    }

    public _updateRow(id: string, rowInfo?: any) {
        /// <summary>Update row</summary>
        /// <param name="id" type="String">ID of the row to update.</param>
        /// <param name="rowInfo" type="object" optional="true">OPTIONAL: If the row info is known, it can be provided so it does not need to be looked up again.</param>

        Diag.Debug.assertParamIsNotNull(id, "id");

        var dataIndex;

        // If we do not have the row info, then look it up.
        if (!rowInfo) {
            dataIndex = this._idToDataIndex(id);

            if (typeof (dataIndex) === "undefined") {
                // If dataIndex is undefined then the row is no longer in the grid. This can happen when an error was encountered while saving the work item.
                return;
            }

            rowInfo = this._grid.getRowInfo(dataIndex);
        }

        // It is possible that we did not find the rowInfo. This can happen when marking a row as saving that is collapsed. Note
        // that if this particular row is still marked as saving when it becomes visible our _updateRowHandler will be called
        // which will ensure the row styling is applied to indicate the saving state.
        if (rowInfo) {

            var $row = rowInfo.row;
            var $gutterRow = rowInfo.gutterRow;

            if (this._savingRows.hasOwnProperty(id) || this._disabledRows.hasOwnProperty(id)) {
                //Check if the row is saving or is disabled
                $row.addClass(RowSavingManager.SAVING_ROW_CLASS);
                if (!this._delayedSaveRows.hasOwnProperty(id)) {
                    // schedule a timer to run in .5 sec to check if the item still saving and mark it for delay if so
                    Utils_Core.delay(this, 500, function () {
                        // check if the row is still pending save and not in the delayed save lookup
                        if ((this._savingRows.hasOwnProperty(id) || this._disabledRows.hasOwnProperty(id)) && !this._delayedSaveRows.hasOwnProperty(id)) {
                            this._delayedSaveRows[id] = id;
                            this._updateRow(id);
                        }
                    });
                }
                else if ($gutterRow) {
                    $gutterRow.addClass(RowSavingManager.SAVING_GUTTER_CLASS);
                    $gutterRow.attr("title", this._savingRows.hasOwnProperty(id) ? "Saving" : "");
                }
            }
            else if (this._callsForRowDisableMap.hasOwnProperty(id)) {
                //Check if the row is to be disabled
                $row.addClass(RowSavingManager.SAVING_ROW_CLASS);
            }
            else {
                //Remove disable/saving css
                if ($row.hasClass(RowSavingManager.SAVING_ROW_CLASS)) {
                    $row.removeClass(RowSavingManager.SAVING_ROW_CLASS);
                }

                if ($gutterRow) {
                    if ($gutterRow.hasClass(RowSavingManager.SAVING_GUTTER_CLASS)) {
                        $gutterRow.removeClass(RowSavingManager.SAVING_GUTTER_CLASS);
                    }
                    $gutterRow.attr("title", "");
                }

                if (this._delayedSaveRows[id]) {
                    delete this._delayedSaveRows[id];
                }
            }
        }
    }

    private _incrementDisableCalls(id: any) {
        /// <summary>Increments the number of requests made for a row to be disabled.</summary>
        /// <param name="id" type="object">ID associated with the row being disabled.</param>

        Diag.Debug.assertParamIsNumber(id, "id");

        var disableCallsForWorkItemId = this._callsForRowDisableMap[id] || 0;
        disableCallsForWorkItemId++;

        this._callsForRowDisableMap[id] = disableCallsForWorkItemId;
    }

    private _decrementDisableCalls(id: any) {
        /// <summary>Decrements the number of requests made for a row to be disabled; removes the row id if the count is le zero.</summary>
        /// <param name="id" type="object">ID associated with the row being disabled.</param>

        Diag.Debug.assertParamIsNumber(id, "id");

        var disableCallsForWorkItemId = this._callsForRowDisableMap[id] || 0;
        disableCallsForWorkItemId--;

        if (disableCallsForWorkItemId <= 0) {
            delete this._callsForRowDisableMap[id];
        }
        else {
            this._callsForRowDisableMap[id] = disableCallsForWorkItemId;
        }
    }
}

VSS.initClassPrototype(RowSavingManager, {
    _grid: null,
    _idToDataIndex: null,
    _dataIndexToId: null,
    _savingRows: null,
    _disabledRows: null,
    _delayedSaveRows: null,
    _callsForRowDisableMap: null
});