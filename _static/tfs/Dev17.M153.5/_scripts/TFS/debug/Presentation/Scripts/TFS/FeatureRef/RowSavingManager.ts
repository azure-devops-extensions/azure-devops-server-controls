import "VSS/LoaderPlugins/Css!Presentation/FeatureRef/RowSavingManager";

import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");
import Resources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_PendingOperationHelper = require("Presentation/Scripts/TFS/FeatureRef/PendingOperationHelper");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

export class RowSavingManager {
    public static SAVING_ROW_CLASS: string = "saving-row";
    public static SAVING_GUTTER_CLASS: string = "saving-row-gutter";

    private _idToDataIndex: (id: number) => number;
    private _dataIndexToId: (dataIndex: number) => number;
    private _savingRows: IDictionaryNumberTo<number[]>;
    private _disabledRows: IDictionaryNumberTo<number[]>;
    private _delayedSaveRows: IDictionaryNumberTo<number>;
    private _callsForRowDisableMap: IDictionaryNumberTo<number>;

    // Note: We cannot type this right row, people are accessing it directly. 
    public _grid: any;

    /**
     * Manages displaying rows in the grid with a saving indicator.
     * 
     * @param grid Grid control to bind to.
     * @param idToDataIndex Function for converting an ID to a data index in the grid.
     * @param dataIndexToId Function for converting a dataIndex to an id.
     */
    constructor(grid: any, idToDataIndex: (id: number) => number, dataIndexToId: (dataIndex: number) => number) {
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
        this._grid.enableEvent("rowupdated");
        this._grid.getElement().bind("rowupdated", Utils_Core.delegate(this, this._updateRowHandler));
    }

    /**
     * Determines if a row is in the process of saving.
     * 
     * @param id ID of the row to check.
     * @return 
     */
    public isRowSaving(id: number): boolean {


        Diag.Debug.assertParamIsNotNull(id, "id");

        return id in this._savingRows || id in this._callsForRowDisableMap || id in this._disabledRows;
    }

    /**
     * Change WorkItem Id
     * 
     * @param oldId old id
     * @param newId new id
     */
    public changeId(oldId: number, newId: number) {
        Diag.Debug.assertParamIsNumber(oldId, "oldId");
        Diag.Debug.assertParamIsNumber(newId, "newId");

        var dependentIds: number[];

        var oldIdKey = oldId.toString(10);

        if (this._savingRows.hasOwnProperty(oldIdKey)) {
            dependentIds = this._savingRows[oldId];
            delete this._savingRows[oldId];
            this._savingRows[newId] = dependentIds;
        }

        if (this._delayedSaveRows.hasOwnProperty(oldIdKey)) {
            delete this._delayedSaveRows[oldId];
            this._delayedSaveRows[newId] = newId;
        }
        TFS_PendingOperationHelper.PendingOperationHelper.clearOperation(oldId.toString());
        TFS_PendingOperationHelper.PendingOperationHelper.addOperation(newId.toString());
    }

    /**
     * Mark a row as processing, but dont add to pending operation.
     * 
     * @param id ID associated with the row being disabled.
     * @param dependentIds 
     *     A list of workItemIds associated with rows that are to be processed to guard
     *     against the occurence of potential wrong operations while workItem with id is disabled.
     *     When the row is enabled the dependent rows will be re-enabled (provided
     *     there are no other disabled rows that also disable the same row).
     * 
     */
    public markRowAsProcessing(id: number, dependentIds?: number[]) {
        this._disableRow(id, dependentIds, false);
    }

    /**
     * Clear the row processing indicator and enable the row.
     * 
     * @param id ID associated with the row being enabled.
     */
    public clearRowProcessing(id: number) {
        this._enableRow(id, false);
    }

    /**
     * Mark a row as saving.
     * 
     * @param id ID associated with the row being saved.
     * @param dependentIds 
     *     A list of workItemIds associated with rows that are to be disabled to guard
     *     against the occurence of potential wrong operations while workItem with id is saving.
     *     When the row saving is cleared the dependent rows will be re-enabled (provided
     *     there are no other saving rows that also disable the same row).
     * 
     */
    public markRowAsSaving(id: number, dependentIds?: number[]) {
        this._disableRow(id, dependentIds, true);
    }

    /**
     * Clear the row saving indicator.
     * 
     * @param id ID associated with the row being saved.
     */
    public clearRowSaving(id: number) {
        this._enableRow(id, true);
    }

    /**
     * Disables a row.
     * 
     * @param id ID associated with the row being disabled.
     * @param dependentIds 
     *     A list of workItemIds associated with rows that are to be disabled to guard
     *     against the occurence of potential wrong operations while workItem with id is disabled.
     *     When the row is enabled the dependent rows will be re-enabled (provided
     *     there are no other disabled rows that also disable the same row).
     * 
     * @param saving true, if the row is being saved, false otherwise
     */
    private _disableRow(id: number, dependentIds?: number[], saving?: boolean) {
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
            TFS_PendingOperationHelper.PendingOperationHelper.addOperation(id.toString());
        }
    }

    /**
     * Clear the row saving/processing indicator and enable the row.
     * 
     * @param id ID associated with the row being enabled.
     * @param saving true, if the row is being saved, false otherwise
     */
    private _enableRow(id: number, saving: boolean) {
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
            TFS_PendingOperationHelper.PendingOperationHelper.clearOperation(id.toString());
        }
    }

    /**
     * Event handler passed to the grid that will be triggered whenever a row is updated on the grid
     * 
     * @param rowInfo Information about the row which has been updated.
     */
    private _updateRowHandler(event, rowInfo: any) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(rowInfo, "rowInfo");

        var id = this._dataIndexToId(rowInfo.dataIndex);

        if (typeof (id) !== "undefined") {
            this._updateRow(id, rowInfo);
        }
    }

    /**
     * Update row
     * 
     * @param id ID of the row to update.
     * @param rowInfo OPTIONAL: If the row info is known, it can be provided so it does not need to be looked up again.
     */
    public _updateRow(id: number, rowInfo?: any) {
        Diag.Debug.assertParamIsNotNull(id, "id");

        // If we do not have the row info, then look it up.
        if (!rowInfo) {
            var dataIndex = this._idToDataIndex(id);

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

            var modifyRow = (enabled: boolean = false) => {
                $row.toggleClass(RowSavingManager.SAVING_ROW_CLASS, enabled);

                if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileBacklogOneClickOpen)) {
                    let $links: JQuery = $row.find("a");
                    $links.attr("tabindex", enabled ? 0 : -1);
                    $links.toggleClass("disabled", enabled);
                }
            };

            let idKey = id.toString(10);

            if (this._savingRows.hasOwnProperty(idKey) || this._disabledRows.hasOwnProperty(idKey)) {
                //Check if the row is saving or is disabled
                modifyRow();
                if (!this._delayedSaveRows.hasOwnProperty(idKey)) {
                    // schedule a timer to run in .5 sec to check if the item still saving and mark it for delay if so
                    Utils_Core.delay(this, 500, function () {
                        // check if the row is still pending save and not in the delayed save lookup
                        if ((this._savingRows.hasOwnProperty(idKey) || this._disabledRows.hasOwnProperty(id)) && !this._delayedSaveRows.hasOwnProperty(idKey)) {
                            this._delayedSaveRows[id] = id;
                            this._updateRow(id);
                        }
                    });
                }
                else if ($gutterRow) {
                    $gutterRow.addClass(RowSavingManager.SAVING_GUTTER_CLASS);
                    $gutterRow.attr("title", this._savingRows.hasOwnProperty(idKey) ? Resources.Saving : "");
                }
            }
            else if (this._callsForRowDisableMap.hasOwnProperty(idKey)) {
                //Check if the row is to be disabled
                modifyRow();
            }
            else {
                //Remove disable/saving css
                if ($row.hasClass(RowSavingManager.SAVING_ROW_CLASS)) {
                    modifyRow(true);
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

    public updateIdToDataIndex(idToDataIndex: (id: number) => number) {
        this._idToDataIndex = idToDataIndex;
    }

    /**
     * Increments the number of requests made for a row to be disabled.
     * 
     * @param id ID associated with the row being disabled.
     */
    private _incrementDisableCalls(id: number) {
        Diag.Debug.assertParamIsNumber(id, "id");

        var disableCallsForWorkItemId = this._callsForRowDisableMap[id] || 0;
        disableCallsForWorkItemId++;

        this._callsForRowDisableMap[id] = disableCallsForWorkItemId;
    }

    /**
     * Decrements the number of requests made for a row to be disabled; removes the row id if the count is le zero.
     * 
     * @param id ID associated with the row being disabled.
     */
    private _decrementDisableCalls(id: number) {
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