///<amd-dependency path="jQueryUI/button"/>
///<amd-dependency path="jQueryUI/dialog"/>

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import Notifications = require("VSS/Controls/Notifications");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import * as Utils_Accessibility from "VSS/Utils/Accessibility";

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;
let TelemetryService = TCMTelemetry.TelemetryService;



// Class takes care of the workflow for assigning configurations to suite
export class AssignConfigurationsToSuite {

    constructor(planId: number, suite: TestsOM.ITestSuiteModel) {
        Diag.logTracePoint("[AssignConfigurationsToSuite.contructor]: method called");
        this._planId = planId;
        this._suite = suite;

        if (suite === null) {
            Diag.logWarning("[AssignConfigurationsToSuite.constructor]: suite object is NULL");
            return;
        }

        Diag.logVerbose(Utils_String.format("[AssignConfigurationsToSuite.constructor]: Assigning Configurations to suiteId:{0} suiteTitle:{1} planId:{2}", suite.id, suite.title, planId));
    }

    public AssignConfigurations(dialogClosedCallBack: (assignedConfigurations: number[], changesSaved: boolean) => void, showErrorCallBack: (string) => void): void {
        Diag.logTracePoint("[AssignConfigurationsToSuite.AssignConfigurations]: method called");
        
        this._dialogClosedCallBack = dialogClosedCallBack;
        this._showErrorCallBack = showErrorCallBack;
        this._testCaseAndSuiteList = undefined;
        this._assignToSuite = true;

        this._launchDialog();
    }

    public AssignConfigurationsToTestCases(testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[], showChildSuites: boolean, dialogClosedCallBack: (assignedConfigurations: number[], changesSaved: boolean) => void, showErrorCallBack: (string) => void): void {
        Diag.logTracePoint("[AssignConfigurationsToTestCases.AssignConfigurationsToTestCases]: method called");
        this._dialogClosedCallBack = dialogClosedCallBack;
        this._showErrorCallBack = showErrorCallBack;
        this._testCaseAndSuiteList = testCaseAndSuiteList;
        this._assignToSuite = false;
        this._showChildSuites = showChildSuites;

        this._launchDialog();
    }

    private _launchDialog(): void {
        Diag.logTracePoint("[AssignConfigurationsToSuite.LaunchDialogue]: method called");
        Dialogs.show(AssignConfigurationsToSuiteDialog, $.extend(
            { dialogueClosed: this._dialogClosedCallBack,
              suite: this._suite,
              testCaseAndSuiteList: this._testCaseAndSuiteList,
              assignToSuite: this._assignToSuite,
              showChildSuites: this._showChildSuites,
              width: AssignConfigurationsToSuiteDialog.DIALOG_WIDTH,
              height: AssignConfigurationsToSuiteDialog.DIALOG_HEIGHT,
              minWidth: AssignConfigurationsToSuiteDialog.DIALOG_WIDTH,
              minHeight: AssignConfigurationsToSuiteDialog.DIALOG_HEIGHT,
              maxWidth: 1.5 * AssignConfigurationsToSuiteDialog.DIALOG_WIDTH,
              maxHeight: 2 * AssignConfigurationsToSuiteDialog.DIALOG_HEIGHT,
              tableLabel: Resources.AssignConfigurationsToSuite,
              contentHeader: Resources.AssignConfigurationDialogTitle, //titlebar
              resizable: true,
              attachResize: true,
              cssClass: "assign-configurations-to-suite-dialogue" }));
    }

    private _handleError(error?: any): void {
        Diag.logTracePoint("[AssignConfigurationsToSuite._handleError]: method called");
        if (this._showErrorCallBack && $.isFunction(this._showErrorCallBack)) {
            this._showErrorCallBack(error.message);
        }
    }

    // Private member variables
    private _planId: number;
    private _dialogClosedCallBack: (assignedConfigurations: number[], changesSaved: boolean) => void;
    private _showErrorCallBack: (string) => void;
    private _suite: TestsOM.ITestSuiteModel;
    private _testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[];
    private _assignToSuite: boolean;
    private _showChildSuites: boolean;
}

export interface AssignConfigurationsOptions extends Dialogs.IModalDialogOptions {
    suite: TestsOM.ITestSuiteModel;
    testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[];
    assignToSuite: boolean;
    showChildSuites: boolean;
    dialogueClosed: (assignedConfigurations: number[], changesSaved: boolean) => void;
}

export class AssignConfigurationsToSuiteDialog extends Dialogs.ModalDialogO<AssignConfigurationsOptions> {
    public static DIALOG_WIDTH: number = 700;
    public static DIALOG_HEIGHT: number = 450;

    private static CSS_OK_BUTTON = "dialog-main-ok-button";
    private static CSS_CANCEL_BUTTON = "dialog-main-cancel-button";
    private static CSS_CLOSE_BUTTON = "dialog-main-close-button";
    private static CSS_ASSIGN_CONFIGURATION_DIALOG = "assign-config-dialog";
    private static CSS_SEARCH_CONTAINER = "dialog-search-container";
    private static CSS_MAIN_TABLE = "main-table";

    private _$data: JQuery;
    private _$wrapper: any;
    private _$dataDiv: any;
    private _assignToSuite: boolean;
    private _configurationRowOptions: any;
    private _configurationTable: JQuery;
    private _allConfigurations: TestsOM.ITestConfiguration[];
    private _assignedConfigurations: number[];
    private _suite: TestsOM.ITestSuiteModel;
    private _testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[];
    private _selectedTestCases: any;
    private _testCaseSelector: TestCaseSelector;
    private _configurationGrid: TestConfigurationSearchGrid;
    private _isInitialized: boolean;
    private _testCaseSelectorHeight: number;
    private _dialogHeight: number;
    private _messagePane: Notifications.MessageAreaControl;
    private _configSearchAdapter: ConfigurationSearchAdapter;
    private _changesSaved: boolean = false;
    private _showChildSuites: boolean;
    protected _requestContext: any;

    protected _cancelButton: IDialogButtonSetup;
    protected _closeButton: IDialogButtonSetup;

    constructor(options?) {
        super(options);
    }
    
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({  
             buttons: {
                "ok": {
                    id: AssignConfigurationsToSuiteDialog.CSS_OK_BUTTON,
                    text: Utils_String.htmlEncode(Resources.SaveText),
                    click: delegate(this, this._onSaveClick)
                },
                "cancel": {
                    id: AssignConfigurationsToSuiteDialog.CSS_CANCEL_BUTTON,
                    text: Utils_String.htmlEncode(Resources.CancelText),
                    click: delegate(this, this._onCancelClick)
                }
            }
        }, options));

        this._suite = options.suite;
        this._testCaseAndSuiteList = options.testCaseAndSuiteList;
        this._assignToSuite = options.assignToSuite;
        this._showChildSuites = options.showChildSuites;

        if (!this._assignToSuite) {
            this._getTestCaseDetails(this._testCaseAndSuiteList);
        }
    }

    public initialize() {
        super.initialize();
        this._isInitialized = false;
        this._constructDialog();
        this._setSaveButtonState(false);
        this._addDialogOptions();
        this._setConfigurationGridHeight();
    }

    public onClose(event?: any) {
        Diag.logTracePoint("[SelectTestersDialog.onClose]: method called");
        super.onClose(event);
        if ($.isFunction(this._options.dialogueClosed)) {            
            this._options.dialogueClosed(this._assignedConfigurations, this._changesSaved);
        }
    }

    private _constructDialog() {
        let dataTableCell,
            dataTable, dataTableRow;

        if (this._assignToSuite && this._suite.parentSuiteId === 0) {
            this.setTitle(Utils_String.format(Resources.AssignConfigurationToPlanDialogTitle, this._suite.title));
        }
        else if (this._assignToSuite && this._suite.parentSuiteId !== 0) {
            this.setTitle(Utils_String.format(Resources.AssignConfigurationDialogTitle, this._suite.title));
        }
        else {
            this.setTitle(Resources.AssignConfigurationToTestCasesDialogTitle);
        }

        // Dialog Body
        this._element.css("height", AssignConfigurationsToSuiteDialog.DIALOG_HEIGHT - 100);
        this._element.parent().css("top", "75px");

        this._$wrapper = $(domElem("div"))
            .append(this._$data)
            .addClass(AssignConfigurationsToSuiteDialog.CSS_ASSIGN_CONFIGURATION_DIALOG)
            .css("height", "100%");

        this._element.html(this._$wrapper);

        //Initialize error pane
        this._messagePane = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._$wrapper);
        this._messagePane._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, (e) => {
            this._setSaveButtonState(true);
            this._setConfigurationGridHeight();
        });

        // Add testCase dropdown
        let that = this;
        if (!this._assignToSuite) {
            this._testCaseSelector = <TestCaseSelector>Controls.Control.createIn(TestCaseSelector, this._$wrapper, {
                testCases: this._selectedTestCases,
                showSuiteDetailsInTestGrid: this._showChildSuites,
                dropdownChanged: () => this._setConfigurationGridHeight(),
                cssClass: "test-case-selector-table"
            });
        }

        //Add Search box
        let $searchBoxContainer = $("<div class='assign-configuration-search-box'></div>");
        this._$wrapper.append($searchBoxContainer);
        this._assignedConfigurations = [];

        // Add Configuration Search Grid
        this._configurationGrid = <TestConfigurationSearchGrid>Controls.BaseControl.createIn(TestConfigurationSearchGrid, this._$wrapper,
            {
                checkboxChangeHandler: (configuration: TestsOM.ITestConfiguration, isAssigned: boolean) => {
                    let index = this._assignedConfigurations.indexOf(configuration.id);

                    if (isAssigned && index === -1) {
                        this._assignedConfigurations.push(configuration.id);
                    }
                    else if (!isAssigned && index > -1) {
                        this._assignedConfigurations.splice(index, 1);
                    }

                    if (this._assignedConfigurations.length === 0) {
                        this._setSaveButtonState(false);
                    }
                    else {
                        this._setSaveButtonState(true);
                    }
                },
                headerCheckboxChangeHandler: (configurations: TestsOM.ITestConfiguration[], isAssigned: boolean) => {
                    for (let i = 0, length = configurations.length; i < length; i++) {
                        let index = this._assignedConfigurations.indexOf(configurations[i].id);

                        if (isAssigned && index === -1) {
                            this._assignedConfigurations.push(configurations[i].id);
                        }
                        else if (index > -1 && !isAssigned) {
                            this._assignedConfigurations.splice(index, 1);
                        }
                    }

                    if (this._assignedConfigurations.length === 0) {
                        this._setSaveButtonState(false);
                    }
                    else {
                        this._setSaveButtonState(true);
                    }
                }
            });               

        // Initialize Configuration Search       
        this._configSearchAdapter = <ConfigurationSearchAdapter>Controls.Enhancement.enhance(ConfigurationSearchAdapter, $searchBoxContainer);
        this._configSearchAdapter.initializeSuiteDetails(this._suite, this._testCaseAndSuiteList, this._assignToSuite);
        this._configSearchAdapter.onSearchCompleted = (configurations: TestsOM.ITestConfiguration[]) => {
            this._getAssignmentInformation(configurations);
            let sortOrder = this._configurationGrid._sortOrder;
            this._configurationGrid.setData(configurations);
            this._configurationGrid._sortOrder = sortOrder;
            this._configurationGrid._sortBy();

            if (configurations.length === 0){
                Utils_Accessibility.announce(Resources.NoConfigurationsFound);
            } else{
                Utils_Accessibility.announce(Utils_String.format(Resources.ConfigurationsReturned, configurations.length));
            }
        };

        this._configSearchAdapter.getAllConfigurations();

        that = this;
        document.getElementsByClassName("assign-configuration-search-box")[0]
            .getElementsByTagName("input")[0].onkeyup = function (e?) {
                let searchText: string = (this as HTMLInputElement).value;
                that._setConfigurationGridData(that._configSearchAdapter, searchText);
            };

        $searchBoxContainer.find("input").focus();
    }

    public onDialogResize(e?: any) {
        /// <summary>OVERRIDE: Called when the dialog has been resized.</summary>
        /// <param name="e" type="object">Event arguments.</param>

        // Ensure the height of the grid is adjusted with the new dialog size.
        super.onDialogResize(e);
        this._setConfigurationGridHeight();
    }

    private _setConfigurationGridHeight() {
        /// <summary>
        ///     Makes sure the grid height is correctly set. The grid does not play nicely with regular DOM layout and needs an
        ///     explicit height to be displayed correctly.
        /// </summary>

        let $gridContainer = this._configurationGrid.getElement(),
            totalHeight = $(".assign-config-dialog").height(), // we use the height to exclude the padding and borders
            siblingsHeight = 0;

        // remove the height of the siblings
        $gridContainer.siblings(":visible").each(function () {
            let $element = $(this);
            siblingsHeight += $element.outerHeight(true);
        });

        $gridContainer.height(totalHeight - siblingsHeight - 3); // A 3 pixel buffer to keep the vertical scroll bar from showing in the parent container.

        let searchText: string = document.getElementsByClassName("assign-configuration-search-box")[0]
            .getElementsByTagName("input")[0].value;
        this._setConfigurationGridData(this._configSearchAdapter, searchText);
    }

    private _setConfigurationGridData(searchAdapter: ConfigurationSearchAdapter, value: string) {
        let searchText: string = value;

        if (searchText.trim() === "") {
            searchAdapter.getAllConfigurations();
        }
        else {
            searchAdapter.performSearch(searchText);
        }
    }

    private _getAssignmentInformation(configurations: TestsOM.ITestConfiguration[]) {
        if (!this._isInitialized) {
            for (let i = 0; i < configurations.length; i++) {
                if (configurations[i].isAssigned) {
                    this._assignedConfigurations.push(configurations[i].id);
                }
            }

            this._configSearchAdapter.setData(configurations);
            if (configurations.length === 0) {
                this._handleError(Resources.NoConfigurationFoundErrorText);
            }

            this._isInitialized = true;
        }
        else {
            for (let i = 0; i < configurations.length; i++) {
                let index = this._assignedConfigurations.indexOf(configurations[i].id);

                if (index > -1) {
                    configurations[i].isAssigned = true;
                }
                else {
                    configurations[i].isAssigned = false;
                }
            }
        }
    }

    private _addDialogOptions() {
        this._element.dialog("option", "beforeClose", (event) => {
            return (!this._requestContext || this._requestContext.isComplete);
        });
    }

    private _onCloseClick(e?: JQueryEventObject): void {
        this.close();
        Diag.logTracePoint("AssignConfigurationsToSuiteDialog.CloseDialog");
    }

    private _onCancelClick(e?: JQueryEventObject): void {
        Diag.logTracePoint("AssignConfigurationsToSuiteDialog.CancelDialog");
        this.close();
    }

    private _onSaveClick(e?: JQueryEventObject): void {
        Diag.logTracePoint("AssignConfigurationsToSuiteDialog.SaveChanges.Click.Start");

        let successCallBack = () => {
            this._changesSaved = true;
            this.close();
        };

        let errorCallBack = (e?: string) => {
            Diag.logError("[AssignConfigurationsToSuiteDialog._onSaveClick]: error Adding Configurations to suite at server");
            this._handleError(VSS.getErrorMessage(e));
        };        

        if (this._assignedConfigurations.length === 0) {
            this._handleError(Resources.NoConfigurationSelectedErrorText);
        }
        else {
            if (!this._assignToSuite) {
                let selectedTestCaseAndSuiteList = this._testCaseSelector.testCasesListView.getSelectedTestCaseAndSuiteList();
                let selectedTestCases = TestsOM.TestCaseAndSuiteId.getTestCases(selectedTestCaseAndSuiteList);

                if (selectedTestCases.length === 0) {
                    this._handleError(Resources.NoTestCaseSelectedErrorText);
                }
                else {
                    TMUtils.getTestPlanManager().assignConfigurationsToTestCases(selectedTestCases, this._assignedConfigurations, successCallBack, errorCallBack);
                }
            }
            else {
                TMUtils.getTestPlanManager().assignConfigurationsToSuite(this._suite.id, this._assignedConfigurations, successCallBack, errorCallBack);
            }
        }
    }

    private _setSaveButtonState(enable: boolean): void {
        if (enable) {
            this._element.siblings(".ui-dialog-buttonpane").find("#" + AssignConfigurationsToSuiteDialog.CSS_OK_BUTTON).button("enable");
        }
        else {
            this._element.siblings(".ui-dialog-buttonpane").find("#" + AssignConfigurationsToSuiteDialog.CSS_OK_BUTTON).button("disable");
        }
    }

    private _handleError(errorCode: string) {
        this._messagePane.setError({
            header: errorCode
        });

        this._setSaveButtonState(false);
        this._setConfigurationGridHeight();
    }

    private _getTestCaseDetails(testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[]) {
        let testCaseFields = [
            WITConstants.CoreFieldRefNames.Id,
            WITConstants.CoreFieldRefNames.Title
        ];

        this._selectedTestCases = [];
        let testCaseIds: number[] = [];
        for (let i = 0, len = testCaseAndSuiteList.length; i < len; i++) {
            testCaseIds.push(testCaseAndSuiteList[i].id);
        }

        TMUtils.TestCaseUtils.beginGetTestCases(testCaseIds, testCaseFields, (testCases: TestsOM.TestCase[]) => {

            let testCaseIdNameMap = {};
            for (let i = 0, len = testCases.length; i < len; i++) {
                testCaseIdNameMap[testCases[i].getId()] = testCases[i].getTitle();
            }

            for (let i = 0, len = testCaseAndSuiteList.length; i < len; i++) {
                this._selectedTestCases.push({
                    id: testCaseAndSuiteList[i].id,
                    name: testCaseIdNameMap[testCaseAndSuiteList[i].id],
                    suiteId: testCaseAndSuiteList[i].suiteId,
                    suiteName: testCaseAndSuiteList[i].suiteName,
                    isSelected: true
                });
            }

            this._testCaseSelector.setData(this._selectedTestCases);
        },
            (e) => this._handleError(VSS.getErrorMessage(e)));
    }
}

export class ConfigurationSearchAdapter extends TFS_Host_UI.SearchAdapter {
    public onSearchCompleted: (testConfigurations: TestsOM.ITestConfiguration[]) => void;

    public _enhance(element: JQuery): void {
        let searchBox = <TFS_Host_UI.SearchBox>Controls.Enhancement.enhance(TFS_Host_UI.SearchBox, element, { notEnableHotKey: true });
        searchBox.setAdapter(this);

        this._dataInitialized = false;
    }

    public getWatermarkText(): string {
        return Resources.SearchConfigurationsText;
    }

    public hasDropdown(): boolean {
        return false;
    }

    public getDropdownMenuItems(contextInfo: any, callback: IResultCallback, errorCallback: IErrorCallback): void {
        callback([]);
    }

    public performSearch(searchText: string): void {
        this._search(searchText);
    }

    public getAllConfigurations(): void {
        this._search("");
    }

    public initializeSuiteDetails(suite: TestsOM.ITestSuiteModel, testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[], assignToSuite: boolean) {
        this._suite = suite;
        this._testCaseAndSuiteList = testCaseAndSuiteList;
        this._assignToSuite = assignToSuite;
    }

    public setData(configurations: TestsOM.ITestConfiguration[]) {
        if (!this._dataInitialized) {
            this._configurations = configurations;
            this._dataInitialized = true;
        }
    }

    private _search(searchText: string): void {
        if (!this._dataInitialized) {
            let fetchAllConfigurations = () => {                
                if (this._assignToSuite) {
                    TMUtils.getTestPlanManager().getAvailableConfigurationsForSuite(this._suite.id, (configurations: TestsOM.ITestConfiguration[]) => (getActiveConfigurations(configurations)), this._errorCallBack);
                }
                else {
                    let testCases = TestsOM.TestCaseAndSuiteId.getTestCases(this._testCaseAndSuiteList);

                    TMUtils.getTestPlanManager().getAvailableConfigurationsForTestCases(testCases, (configurations: TestsOM.ITestConfiguration[]) => (getActiveConfigurations(configurations)), this._errorCallBack);
                }
            };

            let getActiveConfigurations = (configurations: TestsOM.ITestConfiguration[]) => {
                this._configurations = configurations.filter(function (obj) {
                    return obj.isActive || obj.isAssigned;
                });

                this.onSearchCompleted(this._configurations);
            };

            fetchAllConfigurations();
        }
        else {
            this._searchInCachedData(searchText);
            this.onSearchCompleted(this._matchedConfigurations);
        }
    }

    private _searchInCachedData(searchText: string) {
        this._matchedConfigurations = [];

            let searchTextLower: string = searchText.toLowerCase();
            for (let i = 0, length = this._configurations.length; i < length; i++) {
                if ((this._configurations[i].name.toLowerCase().indexOf(searchTextLower) > -1) || (this._configurations[i].values.toLowerCase().indexOf(searchText.toLowerCase()) > -1)) {
                    this._matchedConfigurations.push({
                        id: this._configurations[i].id,
                        name: this._configurations[i].name,
                        values: this._configurations[i].values,
                        isActive: this._configurations[i].isActive,
                        isAssigned: this._configurations[i].isAssigned
                    });
            }
        }

        return this._matchedConfigurations;
    }

    private _suite: TestsOM.ITestSuiteModel;
    private _testCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[];
    private _errorCallBack: () => void;
    private _dataInitialized: boolean;
    private _configurations: TestsOM.ITestConfiguration[];
    private _matchedConfigurations: TestsOM.ITestConfiguration[];
    private _assignToSuite: boolean;
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

export class TestConfigurationSearchGrid extends Grids.GridO<any> {
    public onCheckboxChangeHandler: (configuration: TestsOM.ITestConfiguration, isAssigned: boolean) => void;
    public onHeaderCheckboxChangeHandler: (configurations: TestsOM.ITestConfiguration[], isAssigned: boolean) => void;

    public initializeOptions(options?) {
        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: false,
            keepSelection: false,
            lastCellFillsRemainingContent: true,
            toggle: false,
            cssClass: "test-configuration-search-grid",
            columns: this._getColumns(),
            sortOrder: [{ index: "isAssigned", order: "desc" }, { index: "name", order: "asc" }]
        }, options));

        this.onCheckboxChangeHandler = options.checkboxChangeHandler;
        this.onHeaderCheckboxChangeHandler = options.headerCheckboxChangeHandler;
    }

    public setData(data: any[]) {
        let options = this._options;
        this._rowCheckboxes = [];
        this._configurations = <TestsOM.ITestConfiguration[]>data;

        options.source = data;
        options.columns = this._columns;

        // Feeding the grid with the new source
        this.initializeDataSource();
        this._getHeaderCheckboxInitialState();
    }

    public getConfigurations() {
        return this._configurations;
    }

    private _getColumns(): Grids.IGridColumn[] {
        return [
            {
                index: "isAssigned",
                text: "",
                width: 35,
                getCellContents: Utils_Core.delegate(this, this._getIsAssignedCheckbox),
                canSortBy: false,
                getHeaderCellContents: function (column: Grids.IGridColumn): JQuery {
                    let cell = $("<div />");
                    cell.addClass("grid-header-cell");

                    this._headerCheckbox = <HTMLInputElement>document.createElement("input");
                    this._headerCheckbox.type = "checkbox";
                    this._headerCheckbox.id = "chk_isAssignedAll";
                    this._headerCheckbox.checked = this._isHeaderCheckboxChecked;
                    $(this._headerCheckbox).attr("aria-label", Resources.SelectAll);

                    cell.append(this._headerCheckbox).outerWidth(column.width);

                    this._registerHeaderEvent(this._headerCheckbox);
                    return cell;
                }
            },
            {
                index: "name",
                text: Resources.ConfigurationGridNameColumn,
                width: 215,
                canSortBy: true
            },
            {
                index: "values",
                text: Resources.ConfigurationGridValuesColumn,
                width: 404,
                canSortBy: true
            }
        ];
    }

    private _getIsAssignedCheckbox(rowInfo: any,
        dataIndex: number,
        expandedState: number,
        level: number,
        column: any,
        indentIndex: number,
        columnOrder: number) {

        let cell = $("<div />");
        cell.addClass("grid-cell");
        cell.attr("role", "gridcell");

        this._rowCheckboxes[dataIndex] = <HTMLInputElement>document.createElement("input");
        this._rowCheckboxes[dataIndex].type = "checkbox";
        this._rowCheckboxes[dataIndex].checked = this._configurations[dataIndex].isAssigned;
        this._rowCheckboxes[dataIndex].id = "chk_" + this._configurations[dataIndex].id;
        $(this._rowCheckboxes[dataIndex]).attr("aria-label", Resources.SelectConfiguration);

        cell.append(this._rowCheckboxes[dataIndex]).outerWidth(column.width);

        this._registerEvent(this._rowCheckboxes[dataIndex], this._configurations[dataIndex]);
        return cell;
    }

    private _registerEvent(checkbox: HTMLInputElement, configuration: TestsOM.ITestConfiguration) {
        let that = this;
        checkbox.onchange = function () {
            configuration.isAssigned = checkbox.checked;
            that.onCheckboxChangeHandler(configuration, checkbox.checked);
            that._updateHeaderCheckbox(that, checkbox.checked);
        };
    }

    private _registerHeaderEvent(checkbox: HTMLInputElement) {
        let that = this;

        checkbox.onchange = function () {
            if (that.onHeaderCheckboxChangeHandler) {
                that._isHeaderCheckboxChecked = checkbox.checked;
                that.onHeaderCheckboxChangeHandler(that._configurations, checkbox.checked);

                that._updateAllGridCheckboxes(that, checkbox.checked);
            }
        };
    }

    private _updateAllGridCheckboxes(that: any, isChecked: boolean) {
        for (let i = 0, length = that._rowCheckboxes.length; i < length; i++) {
            that._rowCheckboxes[i].checked = isChecked;
        }

        for (let i = 0, length = that._configurations.length; i < length; i++) {
            that._configurations[i].isAssigned = isChecked;
        }
    }

    private _updateHeaderCheckbox(that: any, isChecked: boolean) {
        if (isChecked) {
            let allChecked = true;

            for (let i = 0, length = that._rowCheckboxes.length; i < length; i++) {
                if (!that._rowCheckboxes[i].checked) {
                    allChecked = false;
                    break;
                }
            }

            if (allChecked) {
                that._headerCheckbox.checked = true;
            }
        }
        else {
            that._headerCheckbox.checked = false;
        }
    }

    private _getHeaderCheckboxInitialState() {
        if (this._configurations) {
            let allChecked: boolean = true;
            for (let i = 0, length = this._configurations.length; i < length; i++) {
                if (!this._configurations[i].isAssigned) {
                    allChecked = false;
                    break;
                }
            }

            this._isHeaderCheckboxChecked = allChecked;
        }
    }

    private _configurations: TestsOM.ITestConfiguration[];
    private _headerCheckbox: HTMLInputElement;
    private _rowCheckboxes: HTMLInputElement[];
    private _isHeaderCheckboxChecked: boolean = false;
}

export class TestCaseSelector extends Controls.Control<any> {
    private _dropdownChanged: () => void;
    private _dropDownControl: JQuery;
    private _dropdownVisible: boolean;
    private _selectionName: JQuery;
	private _dropButton: JQuery;
	private _selectionNameId: string = "select-name-id";
    private _showSuiteDetailsInTestGrid: boolean;
    public testCasesListView: TestCaseSelectionGrid;
    public label: JQuery;

    constructor(options?: any) {
        /// <summary>Create a new TestPlanSelector Combobox</summary>
        /// <param name="options" type="Object">the options for this control</param>
        super(options);
        this._dropdownChanged = options.dropdownChanged;
        this._showSuiteDetailsInTestGrid = options.showSuiteDetailsInTestGrid;
    }

    public initialize() {
        /// <summary>creates a drop down control and initiates fetching of test plan</summary>
        super.initialize();
        let dataTable = $(domElem("table"));

        // Add row to table
        let labelRow = $(domElem("tr")).addClass("test-case-selector").appendTo(dataTable);
		let labelForRow = $(domElem("label")).attr("for", this._selectionNameId).text(Resources.TestCasesLabel);
        this.label = $(domElem("td")).append(labelForRow).addClass("label");
		labelRow.append(this.label);

        // Add row to table
        let selectorRow = $(domElem("tr")).addClass("test-case-selector").appendTo(dataTable);
        let selector = $(domElem("td")).appendTo(selectorRow).addClass("selector");
        this._selectionName = $(domElem("div")).attr("tabIndex", "0").addClass("selection-name").attr("role", "combobox").attr("id", this._selectionNameId).attr("aria-expanded", "false").appendTo(selector);
        this._dropButton = $(domElem("div", "drop")).attr("tabIndex", "0").attr("aria-label", Resources.Expand).attr("aria-pressed", "false").attr("role", "button").addClass("drop-icon bowtie-icon bowtie-chevron-down-light").appendTo(selector);

        this._bind(this._selectionName, "click", delegate(this, this._onDropClick));
        this._bind(this._dropButton, "click", delegate(this, this._onDropClick));
        this._bind(this._selectionName, "keydown", delegate(this, this._onDropEnterOrDownArrow));
        this._bind(this._dropButton, "keydown", delegate(this, this._onDropEnter));

        this._dropButton.on("mousedown", function (event) {
            event.preventDefault();
        });

        let testCaseGridRow = $(domElem("tr")).addClass("test-case-selector").appendTo(dataTable);
        this._dropDownControl = $(domElem("td")).addClass("test-case-selection-grid-parent").appendTo(testCaseGridRow);

        dataTable.appendTo(this._element);
    }

    public setData(data: any) {
        if (data) {
            this.testCasesListView = <TestCaseSelectionGrid>Controls.Control.createIn(TestCaseSelectionGrid, this._dropDownControl, {
                showSuiteDetailsInTestGrid: this._showSuiteDetailsInTestGrid
            });
            this.testCasesListView.setData(data);
            this._selectionName.text(this.testCasesListView.getTestCaseSelectionName());
            this._hideDropDown();
        }
    }

    private _onDropEnterOrDownArrow(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onDropClick(e);
        } else if (e.keyCode === Utils_UI.KeyCode.DOWN && !this._dropdownVisible){
            this._onDropClick(e);
        }
    }

    private _onDropEnter(e?: JQueryEventObject) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onDropClick(e);
        }
    }

    private _onDropClick(e?: JQueryEventObject) {
        if (this._dropdownVisible) {
            this._hideDropDown();
            this._selectionName.text(this.testCasesListView.getTestCaseSelectionName());
        }
        else {
            this._showDropDown();
        }

        if (this._dropdownChanged) {
            this._dropdownChanged();
        }
    }

    private _hideDropDown() {
        this._dropdownVisible = false;
        this.testCasesListView.hideElement();

        this.setAriaAttributes("false");
    }

    private _showDropDown() {
        this._dropdownVisible = true;
        this.testCasesListView.showElement();
        this.testCasesListView.focus();

        this.setAriaAttributes("true");
    }

    private setAriaAttributes(isExpanded: string){
         this._dropButton.attr("aria-pressed", isExpanded);
         this._selectionName.attr("aria-expanded", isExpanded);
    }
}

export class TestCaseSelectionGrid extends Grids.GridO<any> {
    public initializeOptions(options?) {
        this._showSuiteDetailsInTestGrid = options.showSuiteDetailsInTestGrid;

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            allowMoveColumns: false,
            allowMultiSelect: false,
            keepSelection: false,
            lastCellFillsRemainingContent: true,
            toggle: false,
            cssClass: "test-case-selection-grid",
            columns: this._getColumns(),
            sortOrder: [{ index: "id", order: "asc" }]
        }, options));
    }

    public setData(data: any[]) {
        let options = this._options;
        this._rowCheckboxes = [];
        this._testCases = <TestCaseIdAndName[]>data;
        options.source = data;
        options.columns = this._columns;

        // Feeding the grid with the new source
        this.initializeDataSource();
        this._getHeaderCheckboxInitialState();
    }

    public onContainerResize(e?: JQueryEventObject): any {
        super._onContainerResize(e);
    }

    public _onColumnResize(column) {
        super._onColumnResize(column);
    }

    private _getColumns(): Grids.IGridColumn[] {
        if (this._showSuiteDetailsInTestGrid) {
            return [
                {
                    index: "isSelected",
                    text: "",
                    width: 35,
                    getCellContents: Utils_Core.delegate(this, this._getIsSelectedCheckbox),
                    canSortBy: false,
                    getHeaderCellContents: Utils_Core.delegate(this, this._getHeaderCheckbox)
                },
                {
                    index: "id",
                    text: "Id",
                    width: 50,
                    canSortBy: true
                },
                {
                    index: "name",
                    text: "Title",
                    width: 400,
                    canSortBy: true
                },
                {
                    index: "suiteName",
                    text: "Suite name",
                    width: 180,
                    canSortBy: true
                }
            ];
        }
        else {            
            return [
                {
                    index: "isSelected",
                    text: "",
                    width: 35,
                    getCellContents: Utils_Core.delegate(this, this._getIsSelectedCheckbox),
                    canSortBy: false,
                    getHeaderCellContents: Utils_Core.delegate(this, this._getHeaderCheckbox)
                },
                {
                    index: "id",
                    text: "Id",
                    width: 50,
                    canSortBy: true
                },
                {
                    index: "name",
                    text: "Title",
                    width: 580,
                    canSortBy: true
                }
            ];
        }
    }

    private _getIsSelectedCheckbox(rowInfo: any,
        dataIndex: number,
        expandedState: number,
        level: number,
        column: any,
        indentIndex: number,
        columnOrder: number) {

        let cell = $("<div />");
        cell.addClass("grid-cell");
        cell.attr("role", "gridcell");

        this._rowCheckboxes[dataIndex] = <HTMLInputElement>document.createElement("input");
        this._rowCheckboxes[dataIndex].type = "checkbox";
        this._rowCheckboxes[dataIndex].checked = this._testCases[dataIndex].isSelected;
        this._rowCheckboxes[dataIndex].id = "chk_" + this._testCases[dataIndex].id;
        $(this._rowCheckboxes[dataIndex]).attr("aria-label", Resources.SelectTestCase);

        cell.append(this._rowCheckboxes[dataIndex]).outerWidth(column.width);

        this._registerEvent(this._rowCheckboxes[dataIndex], dataIndex);
        return cell;
    }

    private _getHeaderCheckbox(column: Grids.IGridColumn) {
        let cell = $("<div />");
        cell.addClass("grid-header-cell");

        this._headerCheckbox = <HTMLInputElement>document.createElement("input");
        this._headerCheckbox.type = "checkbox";
        this._headerCheckbox.id = "chk_isSelectedAll";
        this._headerCheckbox.checked = this._isHeaderCheckboxChecked;
        $(this._headerCheckbox).attr("aria-label", Resources.SelectAll);

        cell.append(this._headerCheckbox).outerWidth(column.width);

        this._registerHeaderEvent(this._headerCheckbox);
        return cell;
    }

    private _registerEvent(checkbox: HTMLInputElement, index: number) {
        let that = this;
        checkbox.onchange = function () {
            that._testCases[index].isSelected = checkbox.checked;
            that._updateHeaderCheckbox(that, checkbox.checked);
        };
    }

    private _registerHeaderEvent(checkbox: HTMLInputElement) {
        let that = this;

        checkbox.onchange = function () {            
            that._isHeaderCheckboxChecked = checkbox.checked;
            that._updateAllGridCheckboxes(that, checkbox.checked);
        };
    }

    private _updateAllGridCheckboxes(that: any, isChecked: boolean) {
        for (let i = 0, length = that._rowCheckboxes.length; i < length; i++) {
            that._rowCheckboxes[i].checked = isChecked;
        }

        for (let i = 0, length = that._testCases.length; i < length; i++) {
            that._testCases[i].isSelected = isChecked;
        }
    }

    public hideElement() {
        this._element.hide();
        this._element.height(TestCaseSelectionGrid.MIN_HEIGHT);
        this._element.parent().hide();
    }

    public showElement() {
        let height: number = 32 + this._testCases.length * 26;

        if (height > TestCaseSelectionGrid.MAX_HEIGHT) {
            height = TestCaseSelectionGrid.MAX_HEIGHT;
        }
        this._element.height(height);
        this._element.show();
        this._element.parent().show();
        this.setData(this._testCases);
    }

    public getSelectedTestCases() {
        let selectedTestCaseIds: number[] = [];

        for (let i = 0, length = this._testCases.length; i < length; i++) {
            if (this._testCases[i].isSelected) {
                selectedTestCaseIds.push(this._testCases[i].id);
            }
        }

        return selectedTestCaseIds;
    }

    public getSelectedTestCaseAndSuiteList() {
        let selectedTestCaseAndSuiteList: TestsOM.ITestCaseWithParentSuite[] = [];

        for (let i = 0, length = this._testCases.length; i < length; i++) {
            if (this._testCases[i].isSelected) {
                selectedTestCaseAndSuiteList.push(
                    {
                        id: this._testCases[i].id,
                        suiteId: this._testCases[i].suiteId,
                        suiteName: this._testCases[i].suiteName
                    });
            }
        }

        return selectedTestCaseAndSuiteList;
    }

    public getTestCaseSelectionName() {
        let selectionName: string;
        let testCaseIds: number[] = this.getSelectedTestCases();

        if (testCaseIds.length === 0) {
            selectionName = Resources.NoTestCaseSelectedText;
        }
        else if (testCaseIds.length === 1) {
            for (let i = 0, length = this._testCases.length; i < length; i++) {
                if (this._testCases[i].isSelected) {
                    selectionName = this._testCases[i].name;
                }
            }
        }
        else {
            selectionName = Resources.MultipleTestCaseSelectedText;
        }

        return selectionName;
    }

    private _updateHeaderCheckbox(that: any, isChecked: boolean) {
        if (isChecked) {
            let allChecked = true;

            for (let i = 0, length = that.getLastRowDataIndex(); i < length; i++) {
                if (!that._rowCheckboxes[i].checked) {
                    allChecked = false;
                    break;
                }
            }

            if (allChecked) {
                that._headerCheckbox.checked = true;
            }
        }
        else {
            that._headerCheckbox.checked = false;
        }
    }

    private _getHeaderCheckboxInitialState() {
        if (this._testCases) {
            let allChecked: boolean = true;
            for (let i = 0, length = this._testCases.length; i < length; i++) {
                if (!this._testCases[i].isSelected) {
                    allChecked = false;
                    break;
                }
            }

            this._isHeaderCheckboxChecked = allChecked;
        }
    }

    private _testCases: TestCaseIdAndName[];
    private _headerCheckbox: HTMLInputElement;
    private _rowCheckboxes: HTMLInputElement[];
    private _isHeaderCheckboxChecked: boolean = true;
    private _showSuiteDetailsInTestGrid: boolean;
    private static MIN_HEIGHT = 0;
    private static MAX_HEIGHT = 136;
}

export class TestCaseIdAndName {
    public id: number;
    public name: string;
    public isSelected: boolean;
    public suiteId: number;
    public suiteName: string;
}

VSS.initClassPrototype(AssignConfigurationsToSuiteDialog, {
    _$data: null,
    _$wrapper: null,
    _$contentDescriptionElement: null,
    _$dataDiv: null,
    _cancelButton: null,
    _closeButton: null,
    _requestContext: null,
});

VSS.classExtend(AssignConfigurationsToSuiteDialog, TfsContext.ControlExtensions);

