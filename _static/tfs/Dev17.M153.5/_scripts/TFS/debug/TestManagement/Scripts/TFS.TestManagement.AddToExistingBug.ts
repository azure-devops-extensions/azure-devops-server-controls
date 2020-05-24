///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/dialog"/>

import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import QueryWorkItemHelper = require("TestManagement/Scripts/TFS.TestManagement.QueryExistingBugWorkItemHelper");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import Navigation = require("VSS/Controls/Navigation");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import SystemInfoCollectionHelper = require("TestManagement/Scripts/TFS.TestManagement.SystemInfoCollectionHelper");

import WitContracts = require("TFS/WorkItemTracking/Contracts");
import WITControls_LAZY_LOAD = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { WorkItemStateCellRenderer } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;
let TelemetryService = TCMTelemetry.TelemetryService;

export interface AddToExistingBugSearchAdapterOptions extends TFS_Host_UI.SearchAdapterOptions {
    defaultSearchtext: string;
    areaPath: string;
    bugCategoryTypeName: string;
    clearSearchBoxDelegate: () => void;
}

export interface AddToExistingBugOptions extends Dialogs.IModalDialogOptions {
    areaPath: string;
    defaultSearchText?: string;
    populateWorkItemDelegate: (workItem: WITOM.WorkItem, workItemData, teamSettingsData: TestsOM.TeamSettingsData) => void;
    getBugDataDelegate: () => {};
    uploadSystemInfo: (systemInfo: any) => void;
    resizeWindowDelegate: (restoreWindowSize: boolean) => void;
    getWorkItemOptions: () => any;
    bugCategoryTypeName: string;
}

export class AddToExistingBugDialog extends Dialogs.ModalDialogO<AddToExistingBugOptions> {
    public static DIALOG_WIDTH: number = 700;
    public static DIALOG_HEIGHT: number = 450;
    public static MAX_DIALOG_WIDTH_RATIO: number = 1.5;
    public static MAX_DIALOG_HEIGHT_RATIO: number = 2;

    private static CSS_SELECT_BUTTON = "addToExistingBug-main-ok-button";
    private static CSS_ADD_EXISTING_DIALOG = "add-existing-dialog";

    private _$data: JQuery;
    private _$wrapper: any;
    private _existingBugs: TestsOM.IBugWITFields[];

    private _selectButton: IDialogButtonSetup;

    private bugData: any;
    private _areaPath: string;
    private _defaultSearchText: string;
    private _populateWorkItemDelegate: (workItem: WITOM.WorkItem, workItemData, teamSettingsData: TestsOM.TeamSettingsData, isUpdate?: boolean) => void;
    private _getBugDataDelegate: () => {};
    private _uploadSystemInfo: (systemInfo: any) => void;
    private _resizeWindowDelegate: (restoreWindowSize: boolean) => void;
    private _bugsGrid: ExistingBugsGrid;
    private _addToExistingBugAdapter: AddToExistingBugAdapter;
    private _getWorkItemOptions: any;
    private _bugCategoryTypeName: string;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: AddToExistingBugOptions) {
         this._selectButton = {
            id: AddToExistingBugDialog.CSS_SELECT_BUTTON,
            text: Utils_String.htmlEncode(Resources.AddToBugButton),
            click: () => { this._onSelectButton(); }
        };

        super.initializeOptions($.extend({
        buttons: {
                "ok": this._selectButton
            },
        defaultButton: Utils_String.empty           //This is required because default button in dialog is 'ok'. SO when searching in text box and enter pressed then default button is invoked when it is enabled.
        }, options));

        this._areaPath = options.areaPath;
        this._defaultSearchText = options.defaultSearchText;
        this._populateWorkItemDelegate = options.populateWorkItemDelegate;
        this._getBugDataDelegate = options.getBugDataDelegate;
        this._uploadSystemInfo = options.uploadSystemInfo;
        this._resizeWindowDelegate = options.resizeWindowDelegate;
        this._getWorkItemOptions = options.getWorkItemOptions;
        this._bugCategoryTypeName = options.bugCategoryTypeName;
    }

    public initialize() {
        super.initialize();
        this._constructDialog();
    }

    public _clearSearchBox(e?: JQueryEventObject) {
        this._bugsGrid.setData([]);
        this._setSaveButtonState(false);
        this._setMessage(1);
    }

    /**
     * When the select button is pressed this event gets called.
     */
    public _onSelectButton(e?: JQueryEventObject): void {
        let selectedBugId = this._bugsGrid.getSelectedBugId();
        this.close();

        if (this._resizeWindowDelegate) {
            this._resizeWindowDelegate(false);
        }

        this.bugData = this._getBugDataDelegate ? this._getBugDataDelegate() : null;

        if (this._uploadSystemInfo && TMUtils.isDataCollectionEnabled()) {
            //Currently reusing the feature flag. Will discuss and change the name if required.
            this._updateAndShowBugWithSystemInfo(selectedBugId);
        }
        else {
            this._updateAndShowBug(selectedBugId);
        }

        TelemetryService.publishEvents(TelemetryService.featureAddToExisingBug_BugSelected, {});
    }

    /**
     * When the dialog box is closed this event is called.
     */
    public onClose(event?: any) {
        super.onClose(event);

        if (this._resizeWindowDelegate) {
            this._resizeWindowDelegate(true);
        }
    }

    /**
     * Returns the bug list.
     */
    public getBugData() {
        return this._bugsGrid.getExistingBugs();
    }

    private _updateAndShowBugWithSystemInfo(selectedBugId: number) {
        SystemInfoCollectionHelper.SystemInformationDataCollection.getSystemInfo((systemInfo: any) => {
            if (systemInfo) {
                let localizedSystemInfo = SystemInfoCollectionHelper.SystemInfoHelper.getLocalisedSystemInfo(systemInfo);
                this.bugData[TestsOM.BugWITFields.SystemInfo] = SystemInfoCollectionHelper.SystemInfoHelper.getSysInfoHtml(localizedSystemInfo);
                this._uploadSystemInfo(localizedSystemInfo);
            }
            
            this._updateAndShowBug(selectedBugId);
        }, (error) => {
            //TODO: Add trace that SystemInfo capture failed this may be due to extension is not installed
            this._updateAndShowBug(selectedBugId);
        });
    }

    private _updateAndShowBug(selectedBugId: number) {
        let that = this;
        let witStore = TMUtils.WorkItemUtils.getWorkItemStore();

        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"], (WITControls: typeof WITControls_LAZY_LOAD) => {
            WorkItemManager.get(witStore).beginGetWorkItem(selectedBugId, (workItem) => {
                witStore.beginGetLinkTypes(function () {

                    TMUtils.WorkItemUtils.GetTeamSettingsData().then((teamSettingsData: TestsOM.TeamSettingsData) => {

                        // Populate work item.
                        that._populateWorkItemDelegate(workItem, that.bugData, teamSettingsData, true);

                        // Show the work item.
                        WITControls.WorkItemFormDialog.showWorkItem(workItem, that._getWorkItemOptions());
                    });
                });

            });
        });
    }

    private _constructDialog() {
        let dataTableCell,
            dataTable, dataTableRow;

        let dialogElement = this.getElement();

        this._setSaveButtonState(false);
        this.setTitle(Resources.ExistingBugDialogText);

        // Dialog Body
        dialogElement.css("height", AddToExistingBugDialog.DIALOG_HEIGHT - 100);
        dialogElement.parent().css("top", "75px");

        this._$wrapper = $(domElem("div"))
            .append(this._$data)
            .addClass(AddToExistingBugDialog.CSS_ADD_EXISTING_DIALOG)
            .css("height", "95%");

        dialogElement.html(this._$wrapper);

        let $messageDiv = $("<div class='add-existing-bug-message-area message-area-control bowtie closeable error-message visible'></div>");
        let headerElement = $("<div class='add-existing-bug-message-area-header'></div>");
        let closeElement = $("<div class='add-existing-bug-message-area-close close-action bowtie-icon bowtie-navigate-close propagate-keydown-event' tabindex = '0'></div>");

        closeElement.click((event: JQueryEventObject) => {
            $messageDiv.hide();
        });
        this._bind(closeElement, "keypress", (e: JQueryEventObject) => {
            return TMUtils.handleEnterKey(e, delegate(this, () => { $messageDiv.hide(); }));
        });
        
        $messageDiv.append(headerElement);
        $messageDiv.append(closeElement);
        $messageDiv.hide();
        this._$wrapper.append($messageDiv);

        //Add Search box
        let $searchBoxContainer = $("<div class='add-existing-bug-search-box'></div>");
        this._$wrapper.append($searchBoxContainer);
        this._existingBugs = [];

        // Add existing bugs search grid
        this._bugsGrid = <ExistingBugsGrid>Controls.BaseControl.createIn(ExistingBugsGrid, this._$wrapper, {
            _bugCategoryTypeName: this._bugCategoryTypeName,
            _selectButton: this._selectButton
        });

        // Initialize existing bugs Search       
        this._addToExistingBugAdapter = <AddToExistingBugAdapter>Controls.Enhancement.enhance(AddToExistingBugAdapter, $searchBoxContainer, 
        { 
            defaultSearchtext: this._defaultSearchText,
            areaPath: this._areaPath,
            bugCategoryTypeName: this._bugCategoryTypeName,
            clearSearchBoxDelegate: delegate(this, this._clearSearchBox)
        } as AddToExistingBugSearchAdapterOptions);

        this._addToExistingBugAdapter.onSearchCompleted = (bugs: TestsOM.IBugWITFields[]) => {
            if (!bugs || bugs.length <= 0) {
                this._setMessage(0);
                this._setSaveButtonState(false);
            } else {
                this._setMessage(bugs.length);
                this._setSaveButtonState(true);
            }
            this._bugsGrid.setData(bugs);

            $searchBoxContainer.find("input").focus();
        };

        $searchBoxContainer.find("input").focus();
    }

    private _setMessage(numberOfBugsFound: number) {
        let parentElement = this.getElement();
        let element: JQuery = parentElement.find(".add-existing-bug-message-area");
        let headerElement = parentElement.find(".add-existing-bug-message-area-header");
        headerElement.empty();

        if (numberOfBugsFound > 0 && numberOfBugsFound < 25) {
            element.hide();
            return;
        }
        if (numberOfBugsFound == 0) {
            headerElement.append(Resources.NoBugFound);
            element.css("background-color", "rgba(172, 0, 0, 0.1)");
            headerElement.css("color", "black");
        } else if (numberOfBugsFound >= 25) {
            headerElement.append(Resources.ShowingTopSearchResults);
            element.css("background-color", "rgb(0, 122, 204)");
            headerElement.css("color", "white");
        }
        
        element.show();
    }

    private _setSaveButtonState(enable: boolean): void {
        let parentElement = this.getElement();
        if (enable) {
            parentElement.siblings(".ui-dialog-buttonpane").find("#" + this._selectButton.id).button("enable");
            parentElement.siblings(".ui-dialog-buttonpane").find("#" + this._selectButton.id).css({ "background": "#007acc", "color": "white", "border": "2px solid #007acc" });
        }
        else {
            parentElement.siblings(".ui-dialog-buttonpane").find("#" + this._selectButton.id).button("disable");
            parentElement.siblings(".ui-dialog-buttonpane").find("#" + this._selectButton.id).css({ "background": "#ccc", "color": "#9c9c9c", "border": "#9c9c9c" });
            
        }
    }

}

export class ExistingBugsGrid extends Grids.GridO<any> {

    public initialize() {
        // Ensure projectName is initialized
        if (!this._projectName) {
            let webContext = TFS_Host_TfsContext.TfsContext.getDefault().contextData;
            this._projectName = webContext.project.name;
        }
        this.initializeDataModel(this._options);
        this._initializeWorkItemColor();
        super.initialize();
    }

    public initializeOptions(options?) {
        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: false,
            keepSelection: false,
            lastCellFillsRemainingContent: true,
            toggle: false,
            cssClass: "add-existing-bug-search-grid",
            columns: this._getColumns(),
            sortOrder: [{ index: "id", order: "desc" } ]
        }, options));

        this._displayColumns = [];
        this._displayColumnsMap = {};
    }

    /**
     * Intializes the cell render for each cell. 
     */
    public initializeDataModel(queryResultsModel) {
        let i, l, column, sortColumn, sortOrder = [], tagCellRenderer, typeColorCellRenderer, identityCellRenderer, stateColorCellrenderer, idRenderer;

        if (queryResultsModel.columns) {
            for (i = 0, l = queryResultsModel.columns.length; i < l; i++) {
                // Clone the column for grid, so that modifications do not affect
                // queryResultsModel. This is important for column move.
                column = $.extend({}, queryResultsModel.columns[i]);
                column.index = i;

                
                if (column.text === Resources.WorkItemGridTitleColumnHeader) {
                    column.getCellContents = this._typeColorCellRenderer;
                }
                else if (column.isIdentity) {
                    column.getCellContents = this._identityCellRenderer;
                }
                else if (column.text === Resources.IdColumnTitle) {
                    column.getCellContents = this._idRenderer;
                }
                else if (column.text === Resources.QueryColumnNameState) {
                    column.getCellContents = this._stateColorCellrenderer;
                }

                this._displayColumns[i] = column;
                this._displayColumnsMap[i] = column.text;
                column.comparer = this.comparer;
            }
        }

        this._options.columns = this._displayColumns;
    }

    private _stateColorCellrenderer(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
        let $gridCell = $("<div/>").addClass("grid-cell").attr("role", "gridcell").width(column.width || 20);
        let stateValue = this.getColumnText(dataIndex, column, columnOrder);

        if (stateValue) {
            $gridCell.append(this._getWorkItemStateColorCell(dataIndex, stateValue));
        }
        return $gridCell;
    }

    private _typeColorCellRenderer(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {

        // Have the grid generate the cell as normal.
        let $gridCell = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

        let color = this._getTypeCellColor();

        if (color) {

            let $colorCell = this.getColorCell(dataIndex, color);
            $colorCell.html("&nbsp;"); // for some reason html doesn't like empty divs when doing alignment, so we are adding a non breaking space.

            $colorCell.prependTo($gridCell);
        }
        return $gridCell;
    }

    private _identityCellRenderer(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
        return TFS_UI_Controls_Identities.IdentityViewControl.renderIdentityCellContents(this, rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
    }

    private _idRenderer(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder) {
        let $gridCell = this._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

        if ($gridCell) {
            let value = this.getColumnText(dataIndex, column, columnOrder);
            let _tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

            // Full screen link
            let url: string = _tfsContext.getPublicActionUrl("", "workitems")
                + "#_a=edit&id="
                + value
                + "&"
                + Navigation.FullScreenHelper.FULLSCREEN_HASH_PARAMETER
                + "=true";

            $gridCell.empty();
            $gridCell.append($("<a/>").attr("href", url).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer").text(value));
        }
        return $gridCell;
    }

    /**
     * Returns the value of the cell for a given row and column index.
     */
    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number): string {
        let columnName = this._displayColumnsMap[columnIndex];
        let row = this._dataSource[dataIndex];

        return this.getRowValue(row, columnName);
    }


    /**
     * Compares the two rows with the given column sort order.
     * @param column
     * @param order
     * @param rowA
     * @param rowB
     */
    public comparer(column, order, rowA, rowB) {
        let columnName = this._displayColumnsMap[column.index];
        let v1 = this.getRowValue(rowA, columnName);
        let v2 = this.getRowValue(rowB, columnName);
        let typeOfV1 = typeof v1;
        let typeOfV2 = typeof v2;
        if (typeOfV1 === "undefined" || v1 === null) {
            if (typeOfV2 === "undefined" || v2 === null) {
                return 0;
            }
            else {
                return -1;
            }
        }
        // Check both number or not
        if (typeOfV1 === "number" && typeOfV2 === "number") {
            return v1 - v2;
        }
        // Check both Date or not
        if (v1 instanceof Date && v2 instanceof Date) {
            return v1.getTime() - v2.getTime();
        }
        // Fallback to string comparison
        return Utils_String.localeIgnoreCaseComparer(v1, v2);
    }

    private getRowValue(row: any, columnName: string) {
        if (columnName === Resources.WorkItemGridTitleColumnHeader) {
            return row.title;
        } else if (columnName === Resources.AssignedTo) {
            return row.assignedTo;
        } else if (columnName === Resources.IdColumnTitle) {
            return row.id;
        } else if (columnName === Resources.QueryColumnNameState) {
            return row.state;
        }

        return "";
    }

    private _getWorkItemStateColorCell(dataIndex: number, stateValue: string): JQuery {

        return WorkItemStateCellRenderer.getAutoUpdatingColorCell(this._projectName, this._options._bugCategoryTypeName, stateValue);
    }

    private _initializeWorkItemColor() {

        const colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
        colorsProvider.ensureColorAndIconsArePopulated([this._projectName]).then(
            () => {
                this._color = colorsProvider.getColor(this._projectName, this._options._bugCategoryTypeName);
            }
        );
    }

    private _getTypeCellColor(): string {
        if (this._color) {
            return this._color;
        }

        const colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
        return colorsProvider.getColor(this._projectName, this._options._bugCategoryTypeName);
    }

    
    private getColorCell(dataIndex: number, color: string): JQuery {
        return $("<div/>").addClass("work-item-type-icon-control").css("background-color", color);
    }

    /**
     * Returns the id of the currently selected row.
     */
    public getSelectedBugId() {
        let index = this.getSelectedRowIndex();
        return this._dataSource[index].id;
    }

    /**
     * Sets the existing bugs grid with the given data.
     */
    public setData(data: TestsOM.IBugWITFields[]) {
        let options = this._options;
        this._bugs = data;

        options.source = data;
        options.columns = this._columns;

        // Feeding the grid with the new source
        this.initializeDataSource();
    }

    public getExistingBugs() {
        return this._bugs;
    }

    private _getColumns(): Grids.IGridColumn[] {
        return [
            {
                index: "id",
                text: Resources.IdColumnTitle,
                width: 100,
                canSortBy: true,
                hrefIndex: 1,
                rowCss: "idGridCell"
            },
            {
                index: "title",
                text: Resources.WorkItemGridTitleColumnHeader,
                width: 250,
                canSortBy: true
            },
            {
                index: "state",
                text: Resources.QueryColumnNameState,
                width: 100,
                canSortBy: true
            },
            {
                index: "assignedTo",
                text: Resources.AssignedTo,
                width: 150,
                canSortBy: true,
                isIdentity: true
            } as Grids.IGridColumn
        ];
    }

    /**
     * Selectes the current row on double click.
     * returns false to stop event propagation
     */
    public onOpenRowDetail(): boolean {
        this._options._selectButton.click();
        return false;
    }

    private _bugs: TestsOM.IBugWITFields[];
    private _color: string;
    private _displayColumns: any[];
    private _projectName: string;
    private _displayColumnsMap: { [columnFieldName: number]: string };
}

export class AddToExistingBugAdapter extends TFS_Host_UI.SearchAdapter {
    public onSearchCompleted: (bugs: any[]) => void;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: AddToExistingBugSearchAdapterOptions) {
        if (options){
            this._defaultSearchText = options.defaultSearchtext;
            this._areaPath = options.areaPath;
            this._bugCategoryType = options.bugCategoryTypeName;
            this._clearSearchBoxDelegate = options.clearSearchBoxDelegate;
        }
    }

    public _enhance(element: JQuery): void {
        this._searchBox = <TFS_Host_UI.SearchBox>Controls.Enhancement.enhance(TFS_Host_UI.SearchBox, element, { notEnableHotKey: true });
        this._searchBox.setAdapter(this);
        this._searchBox._bind($(".bowtie-edit-remove"), "click", delegate(this, this._clearSearchBox));        

        //Populating default text for Search
        let inputSearchBox = this._searchBox.getElement().find("#searchbox");
        if (inputSearchBox && this._defaultSearchText){
            inputSearchBox.val(this._defaultSearchText);
        }
        this._dataInitialized = false;
    }

    private _clearSearchBox(e?): void {
        this._clearSearchBoxDelegate();
    }

    /**
     * Returns the text to be set as watermark.
     */
    public getWatermarkText(): string {
        return Resources.AddToExistingBugWatermarkText;
    }

    public hasDropdown(): boolean {
        return false;
    }

    public getDropdownMenuItems(contextInfo: any, callback: IResultCallback, errorCallback: IErrorCallback): void {
        callback([]);
    }

    public getSearchBoxControl(): TFS_Host_UI.SearchBox{
        return this._searchBox;
    }

    /**
     * Performs the search operation for the text specified in the search box.
     */
    public performSearch(searchText: string): void {
        this._search(searchText);
    }

    public setData(existingBugs: TestsOM.IBugWITFields[]) {
        if (!this._dataInitialized) {
            this._existingBugs = existingBugs;
            this._dataInitialized = true;
        }
    }

    private _search(searchText: string): void {
        let that: any = this;

        if (!searchText || searchText === "") {
            this.onSearchCompleted([]);
        }
        QueryWorkItemHelper.QueryExistingBugWorkItemHelper.getWorkItemsByTitle(searchText, this._areaPath, this._bugCategoryType, delegate(this, this.setGridData), () => {
            that.onSearchCompleted([]);
        });
    }

    private setGridData(response: any) {
        this.setData(response);
        let workItemResponse = this.parseSearchResult(response);
        this.onSearchCompleted(workItemResponse);
    }

    private parseSearchResult(response: WitContracts.WorkItem[]): TestsOM.IBugWITFields[] {
        let existingBugs: TestsOM.IBugWITFields[] = [];

        if (!response || response.length === 0) {
            return [];
        }

        for (let i = 0; i < response.length; i++) {
            let bug: TestsOM.IBugWITFields = {
                id: response[i].id,
                url: response[i].url,
                title: response[i].fields["System.Title"],
                assignedTo: response[i].fields["System.AssignedTo"],
                state: response[i].fields["System.State"]
            };
            existingBugs.push(bug);
        }

        return existingBugs;
    }

    private _suite: TestsOM.ITestSuiteModel;
    private _testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[];
    private _errorCallBack: () => void;
    private _dataInitialized: boolean;
    private _searchBox: TFS_Host_UI.SearchBox;

    private _areaPath: string;
    private _defaultSearchText: string;
    private _bugCategoryType: string;
    private _existingBugs: TestsOM.IBugWITFields[];
    private _clearSearchBoxDelegate: () => void;
}

export interface IDialogButtonSetup {
    id: string;
    text: string;
    click: (e?: any) => void;
}

function setDialogButtons(element: JQuery, buttons: IDialogButtonSetup[]): void {
    Dialogs.preventClickingDisabledButtons(element, buttons);
    element.dialog("option", "buttons", buttons);
}


VSS.initClassPrototype(AddToExistingBugDialog, {
    _$data: null,
    _$wrapper: null,
    _$contentDescriptionElement: null,
    _saveButton: null,
    _$dataDiv: null,
    _cancelButton: null,
    _closeButton: null,
    _requestContext: null,
});

VSS.classExtend(AddToExistingBugDialog, TfsContext.ControlExtensions);

