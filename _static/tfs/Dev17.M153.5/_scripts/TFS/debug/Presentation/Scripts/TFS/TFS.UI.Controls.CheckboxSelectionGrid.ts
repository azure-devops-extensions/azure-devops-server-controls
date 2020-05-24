import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import Grid_DataAdapters = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export interface ICheckboxSelectionGridOptions extends Grids.IGridOptions {
    selectAllLabel: string;
    labelColumnIndex: number;
}

export class CheckboxSelectionGridO<TOptions extends ICheckboxSelectionGridOptions> extends Grids.GridO<TOptions> {

    public static enhancementTypeName: string = "tfs.checkboxselectiongrid";
    public static _DEFAULT_LABEL_COLUMN: number = 1;
    public static _HEADER_CHECKBOX_ID: string = "header-checkbox";

    private _labelColumnIndex: any;
    private _selectAllLabel: any;

    public dataProvider: any;
    public gridAdapter: any;

    /**
     * Creates new Checkbox Selection Grid Control
     * 
     * @param options The initialization options for the grid which have the following properties
     * 
     *    "columns" is a required property containing the array of grid column descriptors that have the following structure:
     *    {
     *        text:      column header text, string, optional, default: "",
     *        width:     width in pixels of the column, number, optional, default: 100,
     *        canSortBy: true if the grid can be sorted by the column, boolean, optional, default: true
     *    }
     *    "selectAllLabel" is the text used as a label for select all check box
     *    "labelColumnIndex" is the index of the column whose values to be used as labels for check boxes
     *    "sort" is an optional comparison function that will be used to sort the data.
     *         function (left, right) returns [0, 0, 0] depending on whether left is smaller, equal or larger than right.
     * 
     * 
     * @return Returns the new Checkbox Selection Grid object.
     */
    constructor(options?: TOptions) {

        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {
        Diag.Debug.assert(Boolean(options), "Expected options argument");
        Diag.Debug.assert(Boolean(options.columns), "Expected columns information in the options");

        super.initializeOptions(<TOptions>$.extend({ asyncInit: false }, options));

        this._selectAllLabel = options.selectAllLabel || "";
        this._labelColumnIndex = options.labelColumnIndex || CheckboxSelectionGridO._DEFAULT_LABEL_COLUMN;

        this._updateOptions(options);
    }

    /**
     * Populates the grid control with the given items
     * 
     * @param gridItems This is an array of root nodes that recursively define the tree of the grid.
     * 
     *    Every node of the tree has the following format:
     *    {
     *         id:       unique node id, number, required
     *         values:   node values, array, required
     *         children: array of nodes, node, optional
     *    }
     * 
     *    Here is a sample declaration of grid items:
     * 
     *    gridItems: [{
     *        id: 0,
     *        values: ["Root 1", "red", 100],
     *        children: [{
     *            id: 1,
     *            values: ["Node 1-2", "green", 10],
     *            children: [{
     *                id: 2,
     *                values: ["Leaf 1-2-1", "yellow", 70]
     *            },
     *            {
     *                id: 3,
     *                values: ["Leaf 1-2-2", "blue", 30]
     *            }]
     *        },
     *        {
     *            id: 4,
     *            values: ["Root 2", "white", 50]
     *        }]
     * 
     *        "checked" is an array of tree item ids that must be initially checked in the grid.
     *        If this parameter is not provided nothing is checked.
     * 
     * 
     * @param checkedItemIds 
     *     This is an array of tree item ids that must be initially checked in the grid.
     *     If this parameter is not provided nothing is checked.
     * 
     */
    public setGridItems(gridItems: any[], checkedItemIds: any[]) {

        Diag.Debug.assert(Boolean(gridItems), "Expected gridItems argument");
        Diag.Debug.assert(Boolean(checkedItemIds), "Expected checkedItemIds argument");

        this.dataProvider = new Grid_DataAdapters.FieldDataProvider(gridItems, { sort: this._options.sort });
        this.gridAdapter = Grid_DataAdapters.HierarchicalGridDataAdapter.bindAdapter(Grid_DataAdapters.ChecklistDataAdapter, this.dataProvider, this, { noColumn: true, checkedItemIds: checkedItemIds });
    }

    /**
     * Allows accessing the list of grid items that are currently checked.
     * 
     * @return Returns array of checked item ids.
     */
    public getCheckedItemIds() {
        var result = [];

        if (this.gridAdapter) {
            result = this.gridAdapter.getCheckedItemIds();
        }

        return result;
    }

    /**
     * OVERRIDE: Creates the element that represents content of a header cell.
     * 
     * @param column Information about the header column that is being rendered.
     * @return Returns jQuery element representing the requested header cell.
     */
    public _drawHeaderCellValue(column: any): JQuery {
        var $div = $("<div/>"),
            $checkbox,
            checked;

        if (column.index !== Grid_DataAdapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX) {
            return super._drawHeaderCellValue(column);
        }

        // TODO: The only consumer of the CheckboxSelectionGrid - the CheckedIdentityGrid currently
        // bypasses calling this function if the column is the checkbox column, so this following
        // code is effectively never called. We should have CheckedIdentityGrid use the new
        // VSS.UI.Controls.Data.ChecklistDataAdapter.

        // Get the header checkbox state from the column if it was saved there before.
        // By default the header check box is unchecked.
        checked = false;
        if (column.hasOwnProperty("checked")) {
            checked = column.checked;
        }

        // Create the checkbox element and set its state
        $checkbox = $("<input type='checkbox' id='" + CheckboxSelectionGridO._HEADER_CHECKBOX_ID + "'>")
            .prop('checked', checked)
            .attr("aria-label", this._selectAllLabel);

        this._bind($checkbox, "click", delegate(this, this._onHeaderCheckboxClicked));

        $div.append($checkbox);
        return $div;
    }

    /**
     * Sets row checkbox into the given state.
     * 
     * @param dataIndex The row index.
     * @param newState New state for the row's checkbox.
     */
    public setCheckboxState(dataIndex: number, newState: boolean) {
        Diag.Debug.assert(typeof dataIndex === "number", "Expected to be a number");
        Diag.Debug.assert(typeof newState === "boolean", "Expected to be a number");

        var currentState,
            checkboxId,
            $checkbox;

        // Update row's checkbox state if it is different from the new one
        currentState = this.gridAdapter.getCheckboxState(dataIndex);
        if (currentState !== newState) {

            // Try to find the checkbox element
            checkboxId = this._createCheckboxId(dataIndex, Grid_DataAdapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX);
            $checkbox = $("#" + checkboxId, this._canvas);

            // Update the checkbox if it exists
            if ($checkbox.length > 0) {
                $checkbox.prop('checked', newState);
            }

            // Always update the checkbox data in the row record
            this._setCheckboxStateData(dataIndex, newState);
        }
    }

    /**
     * Updates checkbox related data for grid row with the new state (without touching the actual checkbox element).
     * 
     * @param dataIndex The row index.
     * @param state New state for the row's checkbox.
     */
    public _setCheckboxStateData(dataIndex: number, state: boolean) {

        this.gridAdapter.setCheckboxStateData(dataIndex, state);
    }

    /**
     * Prepares options for the base grid control.
     * 
     * @param options Original options passed into the control.
     * See CheckboxSelectionGrid function for details about options format.
     */
    private _updateOptions(options?: any) {

        // Insert the generated column header definition in the columns array.
        var checkboxColumn = { canSortBy: false, text: "", width: 30, fixed: true };
        options.columns.splice(Grid_DataAdapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX, 0, checkboxColumn);
    }

    /**
     * OVERRIDE: Set the column that follows the checkbox one as the indent one.
     */
    public _determineIndentIndex() {
        this._indentIndex = Grid_DataAdapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX + 1;
    }

    /**
     * OVERRIDE: Creates the element that represents content of a content cell.
     */
    public _drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
        var $cell,
            $checkbox,
            checkboxId,
            checked;

        if (column.index !== Grid_DataAdapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX) {
            return super._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        }

        // Create the cell that will contain the checkbox
        $cell = $(domElem("div", "grid-cell"));
        $cell.width(column.width || 20);

        // Get the current checkbox state
        checked = this.getColumnValue(dataIndex, Grid_DataAdapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX);
        Diag.Debug.assert(typeof checked === "boolean", "Checkbox state must be a numeric value");

        // Create the checkbox element and set its state
        checkboxId = this._createCheckboxId(dataIndex, Grid_DataAdapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX);
        $checkbox = $("<input type='checkbox' tabindex='-1' id='" + checkboxId + "'>")
            .data("checkbox-data-index", dataIndex)
            .prop('checked', checked)
            .attr("aria-label", this.getColumnValue(dataIndex, this._labelColumnIndex));

        this._bind($checkbox, "click", delegate(this, this._onCheckboxClicked));

        $cell.append($checkbox);

        return $cell;
    }

    /**
     * The handler is invoked when the header is checkbox is clicked.
     * 
     * @param e 
     * @return 
     */
    private _onHeaderCheckboxClicked(e?: JQueryEventObject): any {
        var state;

        state = $(e.currentTarget).is(":checked");

        // Save the new state of the header checkbox
        this._setHeaderCheckboxState(state);

        // Don't return anything to allow the default action for the event execute
    }

    /**
     * The handler is invoked when a checkbox on a grid row is clicked.
     * 
     * @param e 
     * @return 
     */
    private _onCheckboxClicked(e?: JQueryEventObject): any {

        var $checkbox = $(e.currentTarget),
            dataIndex,
            checked;

        dataIndex = $checkbox.data("checkbox-data-index");
        checked = $checkbox.is(":checked");

        // Remember the new state of this cell
        this.setCheckboxState(dataIndex, checked);

        // Don't return anything to allow the default action for the event execute
    }

    /**
     * Calculated the checkbox element ID used to locate individual checkboxes on the grid.
     * 
     * @param dataIndex The row index of the grid cell.
     * @param columnIndex The column index of the grid cell.
     * @return Returns string representing a checkbox element ID.
     */
    private _createCheckboxId(dataIndex: number, columnIndex: number) {
        Diag.Debug.assert(typeof dataIndex === "number", "Expected to be a number");
        Diag.Debug.assert(typeof columnIndex === "number", "Expected to be a number");

        return Utils_String.format("checkbox-{0}-{1}", dataIndex, columnIndex);
    }

    /**
     * Sets header checkbox into the given state.
     * 
     * @param checked The state to set for the header checkbox.
     */
    private _setHeaderCheckboxState(checked: boolean) {
        var $checkbox,
            columns = this._options.columns,
            column,
            i, l;

        // Find the checkbox column. Since the columns can be moved around their index(id) can be different from their display order order.
        for (i = 0, l = columns.length; i < l; i += 1) {
            if (columns[i].index === Grid_DataAdapters.ChecklistDataAdapter._CHECKBOX_COLUMN_INDEX) {
                column = columns[i];
                break;
            }
        }
        Diag.Debug.assert(typeof column !== "undefined", "Expected to find the checkbox column");

        $checkbox = $("#" + CheckboxSelectionGridO._HEADER_CHECKBOX_ID, this._headerCanvas);
        Diag.Debug.assert(Boolean($checkbox.length === 1), "Expected to find the header checkbox");

        $checkbox.prop('checked', checked);
        column.checked = checked;
    }

    /**
     * OVERRIDE: Calls the base method and checks for space bar key.
     * 
     * @param e 
     * @return 
     */
    public _onKeyDown(e?: JQueryEventObject): any {

        Diag.Debug.assertParamIsObject(e, "e");

        var result = super._onKeyDown(e);

        // If the key pressed was the space bar, trigger the selection of the row.
        if (e.keyCode === Utils_UI.KeyCode.SPACE) {
            this._onSpaceKey(e);
            result = false;
        }

        return result;
    }

    /**
     * Trigger the selection of the selected row.
     * 
     * @param e 
     * @return 
     */
    private _onSpaceKey(e?: JQueryEventObject): any {

        Diag.Debug.assertParamIsObject(e, "e");

        var dataIndex = this.getSelectedDataIndex();

        // If there is a selected row, trigger the selection.
        if (dataIndex >= 0) {
            this.setCheckboxState(dataIndex, !this.gridAdapter.getCheckboxState(dataIndex));
        }
    }
}

export class CheckboxSelectionGrid extends CheckboxSelectionGridO<ICheckboxSelectionGridOptions> { }

VSS.initClassPrototype(CheckboxSelectionGridO, {
    _labelColumnIndex: CheckboxSelectionGridO._DEFAULT_LABEL_COLUMN,
    _selectAllLabel: null,
    dataProvider: null,
    gridAdapter: null
});

