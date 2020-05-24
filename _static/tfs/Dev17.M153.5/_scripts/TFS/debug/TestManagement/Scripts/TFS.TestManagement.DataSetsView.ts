import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import TfsCommon_Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { TeamsDataProviderHelper } from "TestManagement/Scripts/Utils/TFS.TestManagement.TeamsHelper";

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMControls = require("TestManagement/Scripts/TFS.TestManagement.Controls");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import EditableGrid = require("VSS/Controls/EditableGrid");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Service = require("VSS/Service");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Splitter = require("VSS/Controls/Splitter");
import TreeView = require("VSS/Controls/TreeView");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import WITControls = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls");
import WITForm = require("WorkItemTracking/Scripts/Controls/WorkItemForm");
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";

let TfsContext = TFS_Host_TfsContext.TfsContext;
let delegate = Utils_Core.delegate;
let WITUtils = TMUtils.WorkItemUtils;
let TelemetryService = TCMTelemetry.TelemetryService;
let eventService = Service.getLocalService(Events_Services.EventService);

export class DataSetPivots {
    public static VALUES: string = "values";
    public static PROPERTIES: string = "properties";
}

/**
 * Defines the shortcuts for the parameters hub
 */
export class ParametersShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: DatasetsView) {
        super(Resources.ParametersHubKeyboardShortcutGroup);
        this._datasetsView = view;

        this.registerPageNavigationShortcut(
            "1",
            {
                description: Resources.DataSetViewGridKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this._navigateDatasetsViewTab(DataSetPivots.VALUES);
                }),
                allowPropagation: true
            });
        this.registerPageNavigationShortcut(
            "2",
            {
                description: Resources.DataSetViewPropertiesKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this._navigateDatasetsViewTab(DataSetPivots.PROPERTIES);
                }),
                allowPropagation: true
            });

        this.registerShortcut(
            "c s",
            {
                description: Resources.DataSetAddParameterKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this._datasetsView.createNewDataSet();
                }),
                allowPropagation: true
            });
        this.registerShortcut(
            "c t",
            {
                description: Resources.DataSetAddTestCaseKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this._datasetsView.addTestCaseFromReferenceTestCasePane();
                }),
                allowPropagation: true
            });
        this.registerShortcut(
            "v t",
            {
                description: Resources.DataSetShowTestPaneKeyboardShortcutText,
                action: () => this._performAction(() => {
                    this._datasetsView.toggleTestCasePane();
                }),
                allowPropagation: true
            });
    }

    private _navigateDatasetsViewTab(pivot: string) {
        let dataSetId = this._datasetsView.getSelectedDataSetid();
        if (dataSetId && dataSetId !== -1) {
            this.navigateToUrl(TMUtils.UrlHelper.getSharedParametersUrl(dataSetId, false, undefined, pivot));
        }
    }

    private _performAction(action: any) {
        let currentEditRowIndex = this._datasetsView._dataSetDetailsGrid.getCurrentEditRowIndex();
        if (currentEditRowIndex < 0) {
            action();
        }
    }

    public removeGlobalShortcut() {
        this.shortcutManager.removeShortcutGroup(TfsCommon_Resources.KeyboardShortcutGroup_Global);
    }

    private _datasetsView: DatasetsView;
}

export class DatasetsView extends Navigation.NavigationView {

    public _dataSetDetailsGrid: DataSetGrid;

    private _dataSetsList: DataSetsList;
    private _$rightPane: JQuery;
    private _$leftPane: JQuery;
    private _$farRightPane: JQuery;
    private _$listToolbar: JQuery;
    private _$errorDiv: JQuery;
    private _$rightPaneDatasetValuesView: JQuery;
    private _$rightPaneDatasetPropertiesView: JQuery;
    private _dataSetViewModel: DataSetViewModel;
    private _tabs: Navigation.PivotView;
    private _workItemForm: WITForm.WorkItemForm;
    private _isDirty: boolean;
    private _lastAction: string;
    private _currentAction: string;
    private _currentView: string = DataSetPivots.VALUES;
    private _sharedParameterCreationHelper: TMUtils.SharedParameterCreationHelper;
    private _testCasePaneFilterSelector: string = ".test-case-pane-filter";
    private _testCasePaneMode: string;
    private _splitter: Splitter.Splitter;
    private _referencedTestCasesList: ReferencedTestCasesList;
    private _selectedSharedParameter: any;
    private _newTestCaseModified: boolean;
    private static parameterHubRightPaneSelector: string = ".hub-content> .splitter > .rightPane";
    private _parametersShortcutgroup: ParametersShortcutGroup;
    private _testHubCommonShortcutGroup: TMControls.TestHubCommonShortcutGroup;
    private _onSharedParameterDeletionSuccess: Function;
    private _onSharedParameterDeletionFailure: Function;
    private _teamsHelper: TeamsDataProviderHelper;

    constructor(options?) {
        super(options);
        this._sharedParameterCreationHelper = new TMUtils.SharedParameterCreationHelper();
        this._teamsHelper = new TeamsDataProviderHelper();
        this._testCasePaneMode = null;
    }

    public initialize() {
        super.initialize();

        this._newTestCaseModified = false;
        this._$leftPane = this.getElement().find(".datasets-view-explorer");
        this._$rightPane = this.getElement().find(".datasets-view-right-pane");
        this._$farRightPane = this.getElement().find(".referenced-testcases-pane");
        this._$rightPaneDatasetValuesView = this.getElement().find(".datasets-values-view-right-pane");
        this._$rightPaneDatasetPropertiesView = this.getElement().find(".datasets-properties-view-right-pane");
        this._initializeLeftPaneControls();
        this._initializeCenterPaneControls();
        this._createLeftPaneToolbar();
        this._showDatasetValuesView();

        this._bindFocusOut();

        this._testHubCommonShortcutGroup = new TMControls.TestHubCommonShortcutGroup(delegate(this, this._allowKeyboardShortcut));
        this._parametersShortcutgroup = new ParametersShortcutGroup(this);

        let store = WITUtils.getWorkItemStore();
        WitFormModeUtility.ensureWitFormModeLoaded().then(() => {
            this._createWorkItemForm();
            this._initializeFarRightPaneControls();
            this._loadData();
            $(window).bind("beforeunload", delegate(this, this._getMessage));
        });
        this._onSharedParameterDeletionSuccess = () => {
            //on deletion success navigating to base url which will auto select the first SP.
            let historyService = Navigation_Services.getHistoryService();
            if (historyService && window && window.location && window.location.pathname) {
                historyService.replaceState(window.location.pathname);
            }
            this._loadData();
        };
        this._onSharedParameterDeletionFailure = (errorMessage: string) => {
            this.showError(errorMessage);
        };
    }

    private _allowKeyboardShortcut(): boolean {
        let allowShortcut: boolean = true;

        if (this._currentView === DataSetPivots.PROPERTIES) {
            allowShortcut = true;
        } else {
            let currentEditRowIndex = this._dataSetDetailsGrid.getCurrentEditRowIndex();
            if (currentEditRowIndex < 0) {
                allowShortcut = true;
            } else {
                allowShortcut = false;
            }
        }
        return allowShortcut;
    }

    public getSelectedDataSetid(): number {
        let selectedDataSet: TestsOM.ISharedParameterDataSetModel = this._dataSetsList.getSelectedDataSet();
        if (selectedDataSet) {
            return selectedDataSet.id;
        }
        return -1;
    }

    public toggleTestCasePane() {

        let selectedDataSet = this._dataSetsList.getSelectedDataSet();
        let mode: string;
        //if selected dataset is undefined then dont show reference test cases pane
        if (selectedDataSet) {
            if (this._testCasePaneMode && this._testCasePaneMode === "off") {
                mode = "on";
            } else {
                mode = "off";
            }
            this._showReferenceTestCasePane(mode);
            this._setTestCasePaneFilter(mode);
        }
    }

    public addTestCaseFromReferenceTestCasePane() {
        let selectedDataSet = this._dataSetsList.getSelectedDataSet();
        //if selected dataset is undefined then dont add test case
        if (selectedDataSet) {
            if (this._testCasePaneMode && this._testCasePaneMode === "on") {
                this._newTestCaseReferencingSharedParam();
            }
        }
    }

    public createNewDataSet() {
        let newDataSetName: string = this._dataSetsList.getUniqueNameInCurrentDataSet(Resources.AddSharedParameterTitle, Resources.NewSharedParameterFormat);
        if (!(this._dataSetViewModel.getIsDirty() || this._isDirty) || confirm(this._getMessage())) {
            if (this._dataSetViewModel.getIsDirty()) {
                this._dataSetViewModel.refreshDataSet();
            }
            this._isDirty = false;
            const teamId = TfsContext.getDefault().contextData.team ? TfsContext.getDefault().contextData.team.id : this._teamsHelper.getDefaultTeam().id;
            this._sharedParameterCreationHelper.createSharedParameter(
                newDataSetName,
                [],
                [],
                null,
                teamId,
                (workItem: WITOM.WorkItem) => {
                    this._loadData(workItem.id, true);
                },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        }
    }

    public parseStateInfo(state: any) {
        let sharedParamId: number,
            isLastSelectedSharedParam: boolean = false,
            sharedParamIdSetting: string;

        if (state) {
            sharedParamId = parseInt(state.sharedParameterId, 10);
        }

        if (!sharedParamId) {
            // Get the last shared parameter id selected by the user.
            sharedParamIdSetting = Utils_Core.parseJsonIsland($(document), ".selected-shared-parameter-id");
            sharedParamId = parseInt(sharedParamIdSetting, 10);
            isLastSelectedSharedParam = true;
            if (!sharedParamId) {
                // Select the default shared param id, if the user has opened this page for the first time
                sharedParamId = this._dataSetsList.getDefaultNodeDataSetId();
                isLastSelectedSharedParam = false;
            }
        }
        // Add a history point if sharedParamId is valid and it is not currently selected.
        if (this._shouldSelectSharedParam(sharedParamId)) {
            Navigation_Services.getHistoryService().addHistoryPoint(null, { sharedParameterId: sharedParamId });
        }

        if (sharedParamId && (!this._dataSetsList.getSelectedDataSet() || sharedParamId !== this._dataSetsList.getSelectedDataSet().id)) {
            this._dataSetsList.setSelectedDataSet(sharedParamId, isLastSelectedSharedParam);
        }
    }

    private _shouldSelectSharedParam(sharedParamId: number): boolean {
        return sharedParamId && sharedParamId !== 0 && this._dataSetViewModel && this._dataSetViewModel.getParameterWorkItem() && sharedParamId !== this._dataSetViewModel.getParameterWorkItem().id;
    }

    public navigate(action: string, state?: any): void {
        let sharedParameterId: any = (state && state.sharedParameterId),
            actionParameters: any,
            view: any;
        if (action) {
            action = action.toLowerCase();
        }
        else {
            action = DataSetPivots.VALUES;
        }

        let historySvc = Navigation_Services.getHistoryService();

        this._lastAction = this._currentAction;
        this._currentAction = historySvc.getCurrentFragment();
        
        if (this._tabs && (this._currentAction !== this._lastAction)) {
            if (action === DataSetPivots.VALUES) {
                TelemetryService.publishEvents(TelemetryService.featureViewParameterSetGrid, {});
            }
            else {
                TelemetryService.publishEvents(TelemetryService.featureViewParameterWITForm, {});
            }
            this._clearError();
            actionParameters = { sharedParameterId: sharedParameterId };
            view = this._tabs.getView("dataset-values");
            view.link = historySvc.getFragmentActionLink(DataSetPivots.VALUES, actionParameters);
            view.selected = Utils_String.ignoreCaseComparer(action, DataSetPivots.VALUES) === 0;

            view = this._tabs.getView("dataset-properties");
            view.link = historySvc.getFragmentActionLink(DataSetPivots.PROPERTIES, actionParameters);
            view.selected = Utils_String.ignoreCaseComparer(action, DataSetPivots.PROPERTIES) === 0;

            if (!this._checkAndNotifyUserAboutDirtyWorkItem() && !this._checkAndNotifyUserAboutDirtyDataSet()) {
                this.parseStateInfo(state);
                this._tabs.updateItems();
                if (Utils_String.ignoreCaseComparer(action, DataSetPivots.VALUES) === 0) {
                    let selectedNode = <any>this._dataSetsList.getSelectedNode();
                    if (selectedNode && selectedNode.dataSet) {
                        this._dataSetViewModel.initialize(selectedNode.dataSet.id);
                    }
                    this._showDatasetValuesView();
                }
                else if (Utils_String.ignoreCaseComparer(action, DataSetPivots.PROPERTIES) === 0) {
                    this._showDatasetPropertiesView();
                    this._showWorkItemPane();
                }
            }
            else {
                this._currentAction = this._lastAction;
                window.location.hash = this._lastAction;
            }
        }

    }

    public showError(message: string) {
        /// <summary>shows an error mesage</summary>
        /// <param name="message" type="String">the message to be displayed</param>
        if (!this._$errorDiv) {
            this._$errorDiv = $("<div class='inline-error' />").text(message).insertBefore(this._element.find(".hub-title")[0]);
            this._element.find(".hub-title, .right-hub-content").hide();
        }
    }

    private _bindFocusOut() {
        //Remove/Add keyboard shortcut when focus changes from grid
        let $element = this._$rightPane.find(".datasets-view-grid");
        $element.bind("focusout", delegate(this, this._enableGlobalShortcuts));
        $element.bind("focusin", delegate(this, this._disableGlobalShortcuts));
    }

    private _enableGlobalShortcuts() {
        //Remove the existing shortcuts and re-register so that they come in proper order
        this._parametersShortcutgroup.removeShortcutGroup();
        this._testHubCommonShortcutGroup.removeShortcutGroup();
        new TfsCommon_Shortcuts.GlobalShortcutGroup();
        this._testHubCommonShortcutGroup = new TMControls.TestHubCommonShortcutGroup(delegate(this, this._allowKeyboardShortcut));
        this._parametersShortcutgroup = new ParametersShortcutGroup(this);
    }

    private _disableGlobalShortcuts() {
        this._parametersShortcutgroup.removeShortcutGroup();
        this._testHubCommonShortcutGroup.removeShortcutGroup();
        this._parametersShortcutgroup.removeGlobalShortcut();
    }

    private _clearError() {
        /// <summary>clears the error mesage</summary>
        let $errorDiv = this._$errorDiv || this._element.find(".inline-error");
        if ($errorDiv) {
            $errorDiv.remove();
            this._$errorDiv = null;
        }
        this._element.find(".hub-title, .right-hub-content").show();
    }

    private _showDatasetValuesView() {
        eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._onSharedParameterDeletionSuccess);
        eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._onSharedParameterDeletionFailure);
        this._$rightPaneDatasetPropertiesView.hide();
        this._$rightPaneDatasetValuesView.show();
        this._currentView = DataSetPivots.VALUES;
    }

    private _showDatasetPropertiesView() {
        this._$rightPaneDatasetValuesView.hide();
        this._$rightPaneDatasetPropertiesView.show();
        this._currentView = DataSetPivots.PROPERTIES;
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._onSharedParameterDeletionSuccess);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._onSharedParameterDeletionFailure);
    }

    private _initializeNavigationControls() {
        let currentState;
        this._tabs = <Navigation.PivotView>Controls.Enhancement.ensureEnhancement(Navigation.PivotView, this._element.find(".dataset-items-tabs"));
        let historySvc = Navigation_Services.getHistoryService();
        historySvc.attachNavigate((sender, state) => {
            if (!historySvc.getCurrentFragment()) {
                this.navigate(DataSetPivots.VALUES, state);
            }
        });

        historySvc.attachNavigate(DataSetPivots.VALUES, (sender, state) => {
            this.navigate(DataSetPivots.VALUES, state);
        }, true);

        historySvc.attachNavigate(DataSetPivots.PROPERTIES, (sender, state) => {
            this.navigate(DataSetPivots.PROPERTIES, state);
        }, true);
        currentState = historySvc.getCurrentState();
        if (!currentState.action || !currentState.sharedParameterId) {
            this.navigate(currentState.action, currentState);
        }
    }

    private _initializeLeftPaneControls() {
        let $element: JQuery;
        this._dataSetsList = <DataSetsList>Controls.Enhancement.enhance(DataSetsList, this._$leftPane.find(".datasets-list-container"));
        $element = this._dataSetsList.getElement();
        $element.bind("selectionchanged", delegate(this, this._onSelectedDataSetChanged));
        $element.bind("selectedDataSetChanging", delegate(this, this._onSelectedDataSetChanging));
        this._dataSetsList.renameSharedParamDataSetDelegate = (dataSetId: number, title: string, errorCallback?: IErrorCallback) => {
            this._renameSharedParamDataSet(dataSetId, title, errorCallback);
            TelemetryService.publishEvents(TelemetryService.featureRenameParameterSet, {});
        };
        this._dataSetsList.writeSelectedSharedParamSetting = (dataSetId: number) => {
            this._writeSelectedSharedParamSetting(dataSetId);
        };
        this._dataSetsList.showError = (message: string) => {
            this.showError(message);
        };
    }

    private _writeSelectedSharedParamSetting(dataSetId: number) {
        TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService).beginWriteSetting("/SelectedSharedParameterId", dataSetId.toString());
    }

    private _renameSharedParamDataSet(dataSetId: number, title: string, errorCallback?: IErrorCallback) {
        this._dataSetViewModel.renameDataSetWorkItem(dataSetId, title, () => {
           this._loadData(dataSetId);
        }, errorCallback);
    }

    private _onSelectedDataSetChanged(e?: any, eventArgs?: any) {
        if (eventArgs && eventArgs.selectedNode) {
            let historySvc = Navigation_Services.getHistoryService();
            let currentState = historySvc.getCurrentState(),
                selectedDataSetId = eventArgs.selectedNode.dataSet.id,
                action: any;

            if (!(currentState && currentState.sharedParameterId === selectedDataSetId.toString())) {
                this._writeSelectedSharedParamSetting(selectedDataSetId);
                action = currentState && currentState.action;
                if (!action) {
                    action = DataSetPivots.VALUES;
                }
                historySvc.addHistoryPoint(null, { _a: action, sharedParameterId: selectedDataSetId });
            }
        }
    }

    private _onSelectedDataSetChanging(e?: any, eventArgs?: any) {
        let node: any = this._dataSetsList._selectedNode;

        if (eventArgs && eventArgs.dataSet) {
            if (node && node.dataSet &&
                eventArgs.dataSet.id !== node.dataSet.id) {
                eventArgs.canceled = this._checkAndNotifyUserAboutDirtyDataSet() || this._checkAndNotifyUserAboutDirtyWorkItem();
            }
        }
    }

    private _getMessage(): string {
        let message: string;
        if (this._isDirty || this._dataSetViewModel.getIsDirty()) {
            message = this._dataSetViewModel.getDirtyMessage();
        }
        return message;
    }

    private _checkAndNotifyUserAboutDirtyDataSet(): boolean {
        let message = this._getMessage();
        if (this._dataSetViewModel.getIsDirty()) {
            if (!confirm(message)) {
                return true;
            }
            else {
                this._dataSetViewModel.refreshDataSet();
                return false;
            }
        }
        return false;
    }

    private _checkAndNotifyUserAboutDirtyWorkItem(): boolean {
        let message = this._getMessage();
        if (this._isDirty) {
            if (!confirm(message)) {
                return true;
            }
            else {
                this._dataSetViewModel.resetDataSetWorkItem();
                this._isDirty = false;
                this._dataSetViewModel.displaytitleUpdated(this._dataSetViewModel.getDisplayTitle(false));
                return false;
            }
        }
        return false;
    }

    private _loadData(dataSetIdToSelect?: number, makeSelectedDataSetEditable?: boolean) {
        this._dataSetViewModel.beginGetAllParameterSet((data: TestsOM.ISharedParameterDataSetModel[], pagedDataIncoming: boolean) => {
            if (data) {
                this._dataSetsList.populate(data, pagedDataIncoming, dataSetIdToSelect);
                if (data.length > 0) {
                    $(this._element.find(DatasetsView.parameterHubRightPaneSelector)).show();

                    // If there is paged data incoming for this page we hold off on selecting the item whose
                    // id might be specified in the URL because it might not be present in the intial dataset.
                    if (!pagedDataIncoming || makeSelectedDataSetEditable) {
                        this._initializeNavigationControls();
                    }
                    
                    if (makeSelectedDataSetEditable) {
                        this._dataSetsList.makeSelectedSharedParameterDataSetEditable();
                    }
                }
                else {
                    $(this._element.find(DatasetsView.parameterHubRightPaneSelector)).hide();
                }
            }
        }, 
        
        (data: TestsOM.ISharedParameterDataSetModel[], isLastPage: boolean) => {
            this._dataSetsList.populatePagedDatasets(data, makeSelectedDataSetEditable, dataSetIdToSelect);
            if (isLastPage && !makeSelectedDataSetEditable) {
                this._initializeNavigationControls();
            }
        });
    }

    private _initializeCenterPaneControls() {
        this._dataSetViewModel = new DataSetViewModel();
        this._dataSetViewModel.displaytitleUpdated = (title: string) => {
            this.setViewTitle(title);
        };
        this._dataSetDetailsGrid = <DataSetGrid>Controls.BaseControl.createIn(DataSetGrid, this._$rightPane.find(".datasets-view-grid"), {
            datasetViewModel: this._dataSetViewModel,
            parent: this._$rightPaneDatasetValuesView
        });
        this._dataSetDetailsGrid.getReferencedTestCasesCount = () => { return this._referencedTestCasesList.getItemsCount(); };
        this._initializeRightSplitter();
        this._initializeReferencedTestCasesPaneFilter();
    }

    private _initializeReferencedTestCasesPaneFilter() {
        Diag.logVerbose("Initializing the filter for Referenced Testcase Pane");
        let testCasePaneFilter: Navigation.PivotFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(this._testCasePaneFilterSelector));
        this._bind(this._element.find(this._testCasePaneFilterSelector), "changed", (sender, item) => {
            this._filterValueChanged(item.value);
        });
        this._filterValueChanged(testCasePaneFilter.getSelectedItem().value);
    }

    private _setTestCasePaneFilter(mode) {
        let testCasePaneFilter: Navigation.PivotFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(this._testCasePaneFilterSelector));
        testCasePaneFilter.setSelectedItem(mode);

    }

    private _initializeRightSplitter() {
        this._splitter = <Splitter.Splitter>Controls.Enhancement.ensureEnhancement(Splitter.Splitter, $(".right-hub-splitter"));
    }

    private _filterValueChanged(value: string) {
        /// <summary> Handle any change in the filter</summary>
        Diag.logTracePoint("DataSetsView.Filter.Start");
        this._showReferenceTestCasePane(value);
        Diag.logTracePoint("DataSetsView.Filter.Complete");
    }

    private _showReferenceTestCasePane(mode) {
        if (this._testCasePaneMode !== mode) {
            this._testCasePaneMode = mode;
            TFS_OM_Common.Application.getConnection(this._options.tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService).beginWriteSetting("/SharedParameterReferencedTestCasesPane", mode);

            if (mode === "off") {
                Diag.logVerbose("Hiding the Referenced Test Cases Pane");
                this._splitter.noSplit();
            }
            else if (mode === "on") {
                Diag.logVerbose("Displaying the Referenced Test Cases Pane");
                this._splitter.split();
                TelemetryService.publishEvents(TelemetryService.featureViewReferenceTestPane, {});
            }
        }
    }

    private _initializeFarRightPaneControls() {
        Diag.logVerbose("Initializing the Referenced Test Cases Pane");
        this._createFarRightPaneToolbar();
        this._referencedTestCasesList = <ReferencedTestCasesList>Controls.Enhancement.enhance(ReferencedTestCasesList, this._$farRightPane.find(".referenced-testcases-list-container"), { datasetViewModel: this._dataSetViewModel });
        this._referencedTestCasesList.showError = (message: string) => {
            this.showError(message);
        };
    }

    private _createFarRightPaneToolbar() {
        /// <summary>Create the new dataset toolbar.</summary>
        let toolbarElement = this._$farRightPane.find(".referenced-testcases-toolbar");
        <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, toolbarElement, {
            items: this._createFarRightPaneMenubarItems(),
            executeAction: delegate(this, this._onFarRightPaneToolbarItemClick),
        });
    }

    private _createFarRightPaneMenubarItems(): any[] {

        let items: any[] = [];
        items.push({
            id: ParameterSetFarRightPaneToolbarCommands.newTestCase,
            text: Resources.NewReferencedTestCaseCommandText,
            title: Resources.NewReferencedTestCaseCommandTitle,
            showText: false,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small"
        });
        items.push({
            id: ParameterSetFarRightPaneToolbarCommands.refreshReferencedTestCases,
            title: Resources.RefreshToolTip,
            showText: false,
            icon: "bowtie-icon bowtie-navigate-refresh"
        });
        return items;
    }

    private _onFarRightPaneToolbarItemClick(e?: any) {
        let command = e.get_commandName();
        if (command === ParameterSetFarRightPaneToolbarCommands.newTestCase) {
            this._newTestCaseReferencingSharedParam();
        }
        else if (command === ParameterSetFarRightPaneToolbarCommands.refreshReferencedTestCases) {
            this._referencedTestCasesList.refreshList();
            TelemetryService.publishEvents(TelemetryService.featureRefreshFromReferenceTestPane, {});
        }
    }

    private _newTestCaseReferencingSharedParam() {
        let witStore = WITUtils.getWorkItemStore(),
            testCaseCategoryUtils = TMUtils.TestCaseCategoryUtils;

        testCaseCategoryUtils.getDefaultWorkItemTypeInfoForTestCaseCategory((wit: WITOM.WorkItemType) => {

            let workItem = WorkItemManager.get(witStore).createWorkItem(wit),
                sharedParamWorkitem = this._dataSetViewModel.getParameterWorkItem();

            Diag.Debug.assertIsNotNull(workItem);

            WITUtils.setAreaAndIterationPaths(workItem, sharedParamWorkitem.getFieldValue(WITConstants.CoreFieldRefNames.AreaPath),
                sharedParamWorkitem.getFieldValue(WITConstants.CoreFieldRefNames.IterationPath));

            this._addSharedParamReferenceInTestCase(workItem, sharedParamWorkitem.id);
            let options = {
                save: (workItem) => {
                    this._newTestCaseModified = true;
                },

                close: (workItem) => {
                    if (this._newTestCaseModified) {
                        this._referencedTestCasesList.refreshList();
                    }
                    this._newTestCaseModified = false;
                    this._referencedTestCasesList.focus();
                }
            };

            TelemetryService.publishEvents(TelemetryService.featureAddTestCaseFromReferenceTestPane, {});
            WITControls.WorkItemFormDialog.showWorkItem(workItem, options);
        });
    }

    private _addSharedParamReferenceInTestCase(workItem: WITOM.WorkItem, sharedParamId: number) {
        let parameterDataInfo: TestsOM.TestCaseParameterDataInfo = new TestsOM.TestCaseParameterDataInfo([], [sharedParamId], TestsOM.SharedParameterRowsMappingType.MapAllRows);

        workItem.setFieldValue(TCMConstants.WorkItemFieldNames.DataField, parameterDataInfo.getJSON());
        TestsOM.WitLinkingHelper.linkTestCaseToSharedParameterDataSet(workItem, sharedParamId);        
    }

    private _handleWorkItemChange(args: any) {
        if (Utils_String.ignoreCaseComparer(args.change, "field-change") === 0) {
            this._isDirty = args.workItem.isDirty();
            this._dataSetViewModel.displaytitleUpdated(this._dataSetViewModel.getDisplayTitle(this._isDirty));
        }
        if (Utils_String.ignoreCaseComparer(args.change, "pre-save") === 0) {
            this._dataSetsList.updateTitleForSelectedNode(args.workItem.getTitle());
        }
    }

    private _createWorkItemForm() {
        this._workItemForm = <WITForm.WorkItemForm>Controls.BaseControl.createIn(WITForm.WorkItemForm, this._$rightPane.find(".datasets-view-properties"), {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            toolbar: {
                inline: true,
                saveErrorCallback: (error) => {
                    alert(VSS.getErrorMessage(error));
                },
            },            
            workItemChanged: (args) => {
                this._handleWorkItemChange(args);
            },
            close: (): boolean => {
                return false;
            }
        });
    }

    private _showWorkItemPane() {
        let selectedDataSet: TestsOM.ISharedParameterDataSetModel = this._dataSetsList.getSelectedDataSet(),
            dataSetId: number = selectedDataSet.id,
            witStore: WITOM.WorkItemStore = WITUtils.getWorkItemStore(),
            dataSetVMWorkitem: WITOM.WorkItem = this._dataSetViewModel.getParameterWorkItem();

        if (dataSetVMWorkitem && dataSetId === dataSetVMWorkitem.id) {
            this._workItemForm.showWorkItem(dataSetVMWorkitem);
            this._hideParametersTabInPropertiesPane();
        }
        else if (dataSetId) {
            this._dataSetViewModel.initialize(dataSetId, () => {
                this._workItemForm.showWorkItem(this._dataSetViewModel.getParameterWorkItem());
                this._hideParametersTabInPropertiesPane();
            },
                (error) => {
                    alert(VSS.getErrorMessage(error));
                });
        }
    }

    //As we have not implemented the parameterSetControl, we are hiding that in the Testmanagement hub
    private _hideParametersTabInPropertiesPane() {
        let anchor: JQuery = $(this._element.find(".datasets-properties-view-right-pane .work-item-view .witform-layout a[rawtitle=Parameters]"));
        anchor.parent().hide();
    }

    private _getViewTitleFromWorkitem(workitem: WITOM.WorkItem) {
        let title = Utils_String.format(Resources.SharedParameterTitle, workitem.workItemType.name, workitem.id, workitem.getTitle());
        return title;
    }

    private _createLeftPaneToolbar() {
        /// <summary>Create the new dataset toolbar.</summary>
        let toolbarElement = this._element.find(".left-toolbar");
        <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, toolbarElement, {
            items: this._createLeftPaneMenubarItems(),
            executeAction: delegate(this, this._onLeftPaneToolbarItemClick),
        });
    }

    private _createLeftPaneMenubarItems(): any[] {

        let items: any[] = [];
        items.push({
            id: ParameterSetLeftPaneToolbarCommands.newParameterSet,
            title: Resources.NewSharedParameter,
            showText: false,
            icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small"
        });
        return items;
    }

    private _onLeftPaneToolbarItemClick(e?: any) {

        let command = e.get_commandName();
        if (command === ParameterSetLeftPaneToolbarCommands.newParameterSet) {
            this.createNewDataSet();
        }
    }

}

export class DataSetsList extends TreeView.TreeView {
    private $renameInputElem: JQuery;
    private _editInProgress: boolean;
    private _editingNodeAnchorData = "nodeAnchor";
    private _editingNodeContextMenuData = "nodeContextMenu";
    private _editingDataSetOldNameData = "oldName";
    public renameSharedParamDataSetDelegate: (dataSetId: number, title: string, errorCallback?: IErrorCallback) => void;
    public writeSelectedSharedParamSetting: (dataSetId: number) => void;
    public showError: (message: string) => void;
    public static DataSetsListCommands = {
        CMD_RENAME: "rename-datasets"
    };

    constructor(options?) {
        super(options);
        this._editInProgress = false;
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        let contextMenu: any;
        contextMenu = {
            "arguments": (contextInfo) => {
                return {
                    item: contextInfo.item
                };
            },
            executeAction: delegate(this, this._onContextMenuItemClick),
            updateCommandStates: delegate(this, this._updateContextMenuCommandStates)
        };

		// TODO:BUG 937329: Need to remove this once framework team set this property by default.
        if (options) {
            options.useArrowKeysForNavigation = true;
        }

        super.initializeOptions($.extend({
            cssClass: "shared-param-dataset-tree",
            contextMenu: contextMenu,
            showIcons: true
        }, options));
    }

    public initialize() {
        super.initialize();
        let $renameElementParent: JQuery = $(this._element).parents(".test-hub-datasets-view");
        this._bind("dblclick", delegate(this, this._beginEdit));
        this._bind(this.getElement(), "scroll", delegate(this, this._onScroll));
        this.$renameInputElem = $("<input type='text' class='shared-param-dataset-rename'/>").prependTo($renameElementParent);
        this.$renameInputElem.hide();
    }

    public populate(datasets: TestsOM.ISharedParameterDataSetModel[], pagedDataIncoming: boolean, dataSetIdToSelect?: number): void {
        let i: number,
            rootNode: TreeView.TreeNode = this.rootNode,
            allNode: TreeView.TreeNode,
            dataSetCount: number = datasets.length;

        // Creating all datasets container node
        allNode = TreeView.TreeNode.create(Resources.AllParameterSets);
        allNode.folder = true;
        allNode.type = "all";
        allNode.noContextMenu = true;
        allNode.config = { css: "datasets-all-container-node" + " folder", unselectable: true };

        allNode.expanded = true;
        rootNode.clear();
        rootNode.add(allNode);
        this.setSelectedNode(null);
        for (i = 0; i < dataSetCount; i++) {
            allNode.add(this._createDataSetNode(datasets[i]));
        }
        this._draw();
        if (dataSetIdToSelect && !pagedDataIncoming) {
            this.setSelectedDataSet(dataSetIdToSelect);
            this.focus();
        }
    }

    public populatePagedDatasets(datasets: TestsOM.ISharedParameterDataSetModel[], editingNewDataset: boolean, dataSetIdToSelect?: number): void {
        let allNode = this.rootNode && this.rootNode.children && this.rootNode.children[0];

        for (var i = 0; i < datasets.length; i++) {
            allNode.add(this._createDataSetNode(datasets[i]));
        }

        if (!editingNewDataset) {
            this._draw();
        }

        if (dataSetIdToSelect) {
            this.setSelectedDataSet(dataSetIdToSelect);
            this.focus();
        }
    }

    public getDefaultNodeDataSetId(): number {
        let allNode = this.rootNode && this.rootNode.children && this.rootNode.children[0],
            defaultNode,
            dataSetId: number = 0;
        if (allNode) {
            defaultNode = allNode.children && allNode.children[0];
            if (defaultNode) {
                dataSetId = defaultNode.dataSet.id;
            }
        }
        return dataSetId;
    }

    private _onContextMenuItemClick(e?: any) {
        /// <summary>executes upon executing a right click command from the context menu</summary>
        /// <param name="e" type="Object">event related info</param>
        let command = e.get_commandName(),
            commandArgs = e.get_commandArgument(),
            node: any = commandArgs.item;
        if (command === DataSetsList.DataSetsListCommands.CMD_RENAME) {
            this._makeEditable(node);
        }
    }

    private _getPopupMenuContextInfo(menu: any) {
        let popupMenu = menu;
        while (popupMenu && !popupMenu._options.contextInfo) {
            popupMenu = popupMenu._parent;
        }
        return popupMenu._options.contextInfo;
    }

    private _updateContextMenuCommandStates(menu: any) {
        menu.updateCommandStates(
            [
                {
                    id: DataSetsList.DataSetsListCommands.CMD_RENAME,
                    disabled: false
                }]);
    }

    private _onScroll(e?) {
        if (!this._editInProgress) {
            this._endEdit();
        }
    }

    public onShowPopupMenu(node, options?) {
        if (node.parent && node.parent.id !== 0) {
            options = $.extend({}, options, { items: this._getContextMenuItems(node) });
            super.onShowPopupMenu(node, options);
        }
    }

    private _getContextMenuItems(node: TreeView.TreeNode): any[] {
        let menuItems: any[] = [];
        menuItems = <any[]>[
            {
                rank: 5, id: DataSetsList.DataSetsListCommands.CMD_RENAME, text: Resources.RenameSharedParamDataSet, icon: "bowtie-icon bowtie-edit-rename", showIcon: true, showText: true
            }];

        return menuItems;
    }

    public getSelectedDataSet(): any {
        /// <summary>Gets the currently selected suite node</summary>
        /// <returns type="Object" > the suite data object currently selected </returns>
        let node = <any>this.getSelectedNode();
        return node && node.dataSet;
    }

    public setSelectedNode(node: any, suppressChangeEvent?: boolean): void {
        /// <summary>Sets the currently selected suite node</summary>
        /// <param name="node" type="Object">Contains the node to be selected </param>
        /// <param name="suppressChangeEvent" type="boolean" optional="true" />
        let eventArgs = {
            dataSet: node && node.dataSet,
            canceled: false
        };

        this._fire("selectedDataSetChanging", eventArgs);
        if (!eventArgs.canceled) {
            super.setSelectedNode(node);
        }
    }

    public updateTitleForSelectedNode(newTitle: string) {
        let node: TreeView.TreeNode = this.getSelectedNode();
        if (node.title !== newTitle) {
            node.title = newTitle;
            node.text = newTitle;
            this.updateNode(node);
        }
    }

    public setSelectedDataSet(dataSetId: number, isLastSelectedDataSet?: boolean): void {
        /// <summary>Sets the currently selected dataset node based on dataSetId</summary>

        let currentSelection, node = null;

        if (dataSetId) {

            currentSelection = this.getSelectedDataSet();
            if (currentSelection && currentSelection.id === dataSetId) {
                return;
            }

            Utils_UI.walkTree.call(this.rootNode, function (treeNode) {
                if (treeNode.dataSet && treeNode.dataSet.id === dataSetId) {
                    node = treeNode;
                }
            });
            if (node) {
                if (this.writeSelectedSharedParamSetting) {
                    this.writeSelectedSharedParamSetting(dataSetId);
                }
                this.setSelectedNode(node);
            }
            else {
                if (isLastSelectedDataSet) {
                    // Try selecting default node as the selected param in last session might not exist.
                    this.setSelectedDataSet(this.getDefaultNodeDataSetId());
                }
                else {
                    //Give error that the dataset does not exist
                    if (this.showError) {
                        this.showError(Utils_String.format(Resources.NoSharedParameterWithIdExists, dataSetId));
                    }
                }
            }
        }
    }

    private _createDataSetNode(dataset: TestsOM.ISharedParameterDataSetModel): TreeView.TreeNode {
        let node: any = TreeView.TreeNode.create(dataset.title);
        node.noTreeIcon = true;
        node.config = { css: "dataset-node" };
        node.title = this._getNodeTitle(dataset);
        node.dataSet = dataset;
        return node;
    }

    private _getNodeTitle(dataset: TestsOM.ISharedParameterDataSetModel): string {
        let datasetTitle = dataset.title,
            datasetId = dataset.id;

        return Utils_String.format(Resources.SharedParamDataSetListItemTooltip, datasetId, datasetTitle);
    }

    public _onInputKeyDown(e?: JQueryEventObject): any {
        if (e.keyCode === 113) {//F2
            this._beginEdit(e);
            return;
        }

        if (e.keyCode == Utils_UI.KeyCode.UP || e.keyCode == Utils_UI.KeyCode.DOWN) {
            e.preventDefault();
        }

        super._onInputKeyDown(e);
    }

    public makeSelectedSharedParameterDataSetEditable() {
        this.delayExecute("makeSharedParameterDataSetEditable", 100, true, function () {
            this._makeEditable(this.getSelectedNode());
        });
    }

    public getUniqueNameInCurrentDataSet(defaultName: string, nameFormat: string): string {
        let counter: number = 0,
            allNode: any,
            dataSetName: string = "";

        if (this.rootNode && this.rootNode.children && this.rootNode.children.length > 0) {
            do {
                counter++;
                if (counter === 1) {
                    dataSetName = defaultName;
                }
                else {
                    dataSetName = Utils_String.format(nameFormat, defaultName, counter.toString());
                }
                allNode = this.rootNode.children[0];
                if (!allNode.findNode(dataSetName)) {
                    break;
                }
            } while (true);
        }
        return dataSetName;
    }

    private _makeEditable(node) {
        try {
            this._editInProgress = true;
            let $nodeElement: JQuery = this._getNodeElement(node),
                $nodeDiv: JQuery = $nodeElement.find(".node-content").first(),
                left: number = $nodeDiv.offset().left,
                $inputElem: JQuery = this.$renameInputElem,
                pos = $nodeElement.offset(),
                $nodeAnchor: JQuery = $nodeElement.find("a").first(),
                $nodeContextMenu = $nodeElement.find(".node-context-menu.icon").first();

            pos.left = left + 16; //16px for padding

            $inputElem.val(node.text);

            //store data that we would need later in case esc is pressed.
            $inputElem.data(this._editingDataSetOldNameData, node.text);
            $inputElem.data(this._editingNodeAnchorData, $nodeAnchor);
            $inputElem.data(this._editingNodeContextMenuData, $nodeContextMenu);

            //hide tree element
            $nodeAnchor.css("visibility", "hidden");
            $nodeContextMenu.css("visibility", "hidden");

            //show and position our input element
            $inputElem.show();
            $inputElem.offset(pos);
            this._bind($inputElem, "blur", delegate(this, this._endEdit));
            this._bind($inputElem, "keydown", (e: JQueryEventObject) => {
                if (e.which === Utils_UI.KeyCode.ENTER || e.which === Utils_UI.KeyCode.ESCAPE) {
                    this._endEdit(e, e.which === Utils_UI.KeyCode.ESCAPE);
                    return false;
                }
            });
            this.delayExecute("makeSharedParamDataSetNodeEditable", 10, true, () => {
                $inputElem.focus();
                TMUtils.setTextSelection($inputElem[0], 0, (node.text.length));
                this._editInProgress = false;
            });

        }
        catch (e) {
            this._editInProgress = false;
        }
    }

    public focus() {
        if (this._selectedNode) {
            //overriding default behaviour, sinc jquery focus does not seem working in version 1.7.2
            try {
                this._getNodeElement(this._selectedNode).children(".node-link").get(0).focus();
            }
            catch (e) {
            }
        }
    }

    public _onBlur(e?: JQueryEventObject): any {
        super._clearFocusOnElement();
    }

    private _beginEdit(e?: JQueryEventObject) {

        this._endEdit();

        let li: JQuery = $(e.target).closest("li.node"), node;
        node = this._getNode(li);
        if (node && node.selected) {
            this._makeEditable(node);
        }
    }

    private _endEdit(e?: JQueryEventObject, cancelRename?: boolean) {
        //cancelRename is true when user presses Escape key
        // We update the name locally and then make the server call and revert if any error is thrown
        let li: JQuery,
            node,
            $input = this.$renameInputElem,
            oldName: string = $input.data(this._editingDataSetOldNameData),
            dataSetName: string = $input.val(),
            applyPreviewState = (node: any, title: string) => {
                node.dataSet.title = title;
                node.text = title;
                node.title = this._getNodeTitle(node.dataSet);
                this.updateNode(node);
            },
            $nodeAnchor = $input.data(this._editingNodeAnchorData),
            $nodeContextMenu = $input.data(this._editingNodeContextMenuData);

        if ($nodeAnchor && $nodeContextMenu) {
            //hide the input element
            $input.hide();

            //Searching the node after $input.hide as later was raising blur event on edge browser 
            li = $nodeAnchor.closest("li.node");
            node = this._getNode(li);
            //make treenode visible
            $nodeAnchor.css("visibility", "visible");
            $nodeContextMenu.css("visibility", "visible");
            //clear data related to this edit
            $input.data(this._editingNodeAnchorData, null);
            $input.data(this._editingNodeContextMenuData, null);

            if (!cancelRename && $.isFunction(this.renameSharedParamDataSetDelegate) && oldName !== dataSetName) {
                if (!$.trim(dataSetName)) {
                    alert(Resources.SharedParamDataSetNameCannotBeEmpty);
                }
                else {
                   applyPreviewState(node, dataSetName);
                    this.renameSharedParamDataSetDelegate(node.dataSet.id, dataSetName, (error) => {
                        //error callback, revert to old title
                        if (node) {
                            node.text = oldName;
                            node.title = oldName;
                            node.dataSet.title = oldName;
                            node.title = this._getNodeTitle(node.dataSet);
                            this.updateNode(node);
                        }
                        this.showError(error.message);
                    });
                }
            }
            else if (e && e.type !== "blur") {
            TMUtils.removeAllSelections();
            Utils_UI.tryFocus($nodeAnchor, 10);
            }
        }
    }
}

// Represents a row in the DataSet grid. 
export class RowViewModel {

    constructor(id?: number, paramValues?: string[]) {
        this.paramValues = paramValues || [];
        this.id = id;
    }

    public isEmptyRow(): boolean {
        return !this.id;
    }

    public isBlankRow(): boolean {
        let i: number,
            paramValuesCount: number;

        paramValuesCount = this.paramValues.length;
        for (i = 0; i < paramValuesCount; i++) {
            if (this.paramValues[i]) {
                return false;
            }
        }
        return true;
    }

    public getValue(columnIndex: number): string {
        let paramValuesCount: number;
        paramValuesCount = this.paramValues.length;
        if (this.paramValues && columnIndex >= 0 && columnIndex < paramValuesCount) {
            return this.paramValues[columnIndex];
        }
        return "";
    }

    public id: number;
    public paramValues: string[];
}

export class DataSetViewModel {
    private static allParameterSetQuery = Utils_String.format("Select [{0}], [{1}] FROM WorkItems where [System.TeamProject] = @project AND {2} in GROUP '{3}' ORDER BY [{1}]",
        WITConstants.CoreFieldRefNames.Id,
        WITConstants.CoreFieldRefNames.Title,
        WITConstants.CoreFieldRefNames.WorkItemType,
        TestsOM.WorkItemCategories.ParameterSet);
    private static workItemQueryLimit: number = 200;

    constructor() {
        this._dataSet = null;
        this._records = null;
        this._columns = null;
        this._isDirty = false;
        this._parameterSetWorkitem = null;
    }

    public initialize(dataSetWorkitemId: number, callback?: () => void, errorCallback?: IErrorCallback) {
        if (this._parameterSetWorkitem && this._parameterSetWorkitem.id === dataSetWorkitemId) {
            return;
        }
        this._initializeDataSetAndViewModel(dataSetWorkitemId, callback, errorCallback);
    }

    private _getDataSetFromWorkitem(workitem: WITOM.WorkItem): TestsOM.SharedParameterDataSet {
        let parameterXmlField: string,
            $paramXml: JQuery;

        parameterXmlField = workitem.getField(TCMConstants.WorkItemFieldNames.Parameters).getValue();
        $paramXml = $($.parseXML(parameterXmlField)).find(TestsOM.SharedParameterDataSet._paramSetElement);
        return TMUtils.ParametersHelper.parseSharedParameterDataSet($paramXml);
    }

    public beginGetAllParameterSet(callback: IResultCallback, pagedDataSetCallback: IResultCallback, errorCallback?: IErrorCallback) {
        let parameterSets: TestsOM.ISharedParameterDataSetModel[];
        TMUtils.WorkItemUtils.beginQuery(DataSetViewModel.allParameterSetQuery, (data) => {
            parameterSets = TMUtils.ParametersHelper.parseSharedParameterPayload(data.payload);
            var pagedDataNeeded = data.payload.rows.length < data.targetIds.length;

            callback(parameterSets, pagedDataNeeded);

            if (pagedDataNeeded) {
                //Remove already fetched parameter set ids
                data.targetIds.splice(0, DataSetViewModel.workItemQueryLimit);

                this.fetchPagedParameterSets(data, pagedDataSetCallback);
            }
        });
    }

    private fetchPagedParameterSets(data: IQueryResult, pagedDataSetCallback: IResultCallback) {
        var idsToFetch = data.targetIds.splice(0, DataSetViewModel.workItemQueryLimit);
        var isLastPage = data.targetIds.length === 0;

        TMUtils.WorkItemUtils.getWorkItemStore().beginPageWorkItems(idsToFetch, data.pageColumns, (payload) => {
            var pagedParameterSets = TMUtils.ParametersHelper.parseSharedParameterPayload(payload);
            pagedDataSetCallback(pagedParameterSets, isLastPage);

            if (!isLastPage) {
                this.fetchPagedParameterSets(data, pagedDataSetCallback);
            }
        });
    }

    public getDataSource(): RowViewModel[] {
        return this._records;
    }

    public getColumnNames(): string[] {
        return this._columns;
    }

    public renameColumn(index: number, newColumnName: string, rowIndicesToSelect: number[]) {

        Diag.logVerbose("[DataSetView/renameColumn] renaming column " + index + " column to " + newColumnName);
        if (index >= 0 && index < this._columns.length) {
            if (Utils_String.localeIgnoreCaseComparer(this._columns[index], newColumnName) !== 0) {
                this._dataSet.getCommandQueue().insert(new TestsOM.RenameSharedParameterCommand(this._columns[index], newColumnName));
                this._columns[index] = newColumnName;
                this.setIsDirty(true);
                this.updated(EditableGrid.EditableGrid.Commands.CMD_RENAME_COLUMN, rowIndicesToSelect);
            }
        }
    }

    public deleteColumn(index: number, rowIndicesToSelect?: number[]) {

        Diag.logVerbose("[DataSetView/deleteColumn] Deleting column " + index + " column.");
        let rowCount: number = this._records.length,
            i: number;

        if (index >= 0 && index < this._columns.length) {
            this._dataSet.getCommandQueue().insert(new TestsOM.DeleteSharedParameterCommand(this._columns[index]));
            this._columns.splice(index, 1);
            for (i = 0; i < rowCount; i++) {
                this._records[i].paramValues.splice(index, 1);
            }
            this.setIsDirty(true);
            if (rowIndicesToSelect) {
                this.updated(EditableGrid.EditableGrid.Commands.CMD_DELETE_COLUMNS, rowIndicesToSelect);
            }
        }
    }

    public isEmptyColumn(columnIndex: number): boolean {
        let columnCount = this._columns.length,
            rowCount = this._records.length,
            i: number;

        if (columnIndex >= 0 && columnIndex < columnCount) {
            for (i = 0; i < rowCount; i++) {
                if (this._records[i].paramValues[columnIndex]) {
                    return false;
                }
            }
        }
        return true;
    }

    public isEmptyRow(rowIndex: number): boolean {
        let i: number,
            columnCount: number = this._columns.length,
            record: RowViewModel = this._records[rowIndex];

        for (i = 0; i < columnCount; i++) {
            if (record.paramValues[i]) {
                return false;
            }
        }
        return true;
    }

    public getValue(dataIndex: number, columnIndex: number): string {
        let source = this.getDataSource();

        if (dataIndex >= 0 &&
            dataIndex < source.length &&
            columnIndex >= 0 &&
            columnIndex < this._columns.length) {
            return source[dataIndex].getValue(columnIndex);
        }
        return "";
    }

    // Appends "rowCount" rows at the end of the grid.
    public appendRows(rowCount: number): void {
        let i = 0;
        Diag.logVerbose("[DataSetView/_appendRows] Appending " + rowCount + " rows.");
        for (i = 0; i < rowCount; i++) {
            this._records.push(new RowViewModel());
        }
        if (this.updated) {
            this.updated(EditableGrid.EditableGrid.Commands.CMD_APPEND);
        }
    }

    public insertRow(index: number, numRowsToInsert?: number, rowToInsert?: RowViewModel, doNotUpdateGrid?: boolean): void {
        let insertedRow: RowViewModel,
            i: number = 0;
        if (!doNotUpdateGrid) {
            doNotUpdateGrid = false;
        }

        if (!numRowsToInsert) {
            numRowsToInsert = 1;
        }
        Diag.logVerbose("[DataSetView/insertRow] Inserting row at index " + index);
        if (index >= 0 && index < this._records.length) {
            if (rowToInsert) {
                this._records.splice(index, 0, rowToInsert);
            }
            else {
                for (i = 0; i < numRowsToInsert; i++) {
                    this._records.splice(index, 0, new RowViewModel());
                }
            }
            this.setIsDirty(true);
            if (this.updated && !doNotUpdateGrid) {
                this.updated(EditableGrid.EditableGrid.Commands.CMD_INSERT_ROW);
            }
        }
    }

    public insertColumn(index: number, dataIndicesToSelect): void {
        Diag.logVerbose("[DataSetView/insertColumn] Inserting column at index " + index);
        let dataSetCount: number = this._records.length,
            i: number;

        this._columns.splice(index + 1, 0, "");
        for (i = 0; i < dataSetCount; i++) {
            this._records[i].paramValues.splice(index + 1, 0, "");
        }
        this.setIsDirty(true);

        if (this.updated) {
            this.updated(EditableGrid.EditableGrid.Commands.CMD_INSERT_COLUMNS, dataIndicesToSelect);
        }
    }

    public deleteRows(indices: number[]): void {
        Diag.logVerbose("[DataSetView/deleteRows] Inserting rows with indices " + indices);
        let i: number,
            length: number,
            indicesToSelect: number[] = [];

        length = indices.length;
        for (i = length - 1; i >= 0; i--) {
            this._records.splice(indices[i], 1);
        }
        this.setIsDirty(true);

        indicesToSelect.push(indices[0] - length + 1);
        this._appendEmptyRowsIfNeeded();

        if (this.updated) {
            this.updated(EditableGrid.EditableGrid.Commands.CMD_DELETE_ROWS, indicesToSelect);
        }
    }

    public clearRows(indices: number[]): void {
        Diag.logVerbose("[DataSetView/clearRows] Clearing rows with indices " + indices);
        let i: number;
        for (i = 0; i < indices.length; i++) {
            this._records[indices[i]].paramValues = [];
        }
        this.setIsDirty(true);

        if (this.updated) {
            this.updated(EditableGrid.EditableGrid.Commands.CMD_CLEAR_ROWS);
        }
    }

    public hasErrors(): boolean {
        let i: number,
            paramName: string,
            columnCount: number = this._columns.length;

        for (i = 0; i < columnCount; i++) {
            paramName = this._columns[i];
            if (!this.isValidParameterNameForIndex(paramName, i)) {
                return true;
            }
        }
        return false;
    }

    public isValidParameterNameForIndex(paramName: string, index: number): boolean {
        if ((paramName === "" && this.isEmptyColumn(index)) ||
            (TestsOM.ParameterCommonUtils.isValidParameterString(paramName) && !this.doesParamNameExistAtAnotherIndex(paramName, index))) {
            return true;
        }
        return false;
    }

    private _appendEmptyRowsIfNeeded(): void {
        let i = this._records.length;
        if (i < this._minRowCount) {
            Diag.logVerbose("[DataSetView/_appendEmptyRowsIfNeeded]There are fewer than " + this._minRowCount + ". Appending the extra rows.");
            for (; i < this._minRowCount; i++) {
                this._records.push(new RowViewModel());
            }
        }
    }

    private _appendEmptyColumnsIfNeeded(): void {
        let i: number = this._columns.length;
        if (i === 0) { // Append empty columns only when the number of columns are zero. If the user has entered some columns then dont append empty columns.
            Diag.logVerbose("[DataSetView/_appendEmptyColumnsIfNeeded]There were 0 columns. Appending the extra columns.");
            for (; i < this._minColumnCount; i++) {
                this._appendEmptyColumn();
            }
        }
    }

    private _appendEmptyColumn(): void {
        let dataSetCount: number = this._records.length,
            i: number;

        this._columns.push("");
        for (i = 0; i < dataSetCount; i++) {
            this._records[i].paramValues.push("");
        }
    }

    public canAppendRows(rowCount: number): boolean {
        // TODO: Append more empty rows on enter only if there are no more rows to page.     
        return true;
    }

    public canAppendColumns(columnCount: number): boolean {
        // TODO apply a limit for no. of columns
        return true;
    }

    public refreshDataSet(): void {
        this._isDirty = false;
        this._initializeDataSetAndViewModel(this._parameterSetWorkitem.id);
    }

    private _initializeDataSetAndViewModel(dataSetWorkitemId: number, callback?: () => void, errorCallback?: IErrorCallback) {
        let witStore: WITOM.WorkItemStore = WITUtils.getWorkItemStore();

        witStore.beginGetWorkItem(dataSetWorkitemId, (workitem: WITOM.WorkItem) => {
            this._dataSet = this._getDataSetFromWorkitem(workitem);
            this._parameterSetWorkitem = workitem;
            this._records = this._createRowViewModelsForDataSet(this._dataSet);
            this._isDirty = false;
            this.displaytitleUpdated(this.getDisplayTitle(false));
            this._appendEmptyRowsIfNeeded();
            this._appendEmptyColumnsIfNeeded();
            this.updated();
            this.selectedDataSetChanged(dataSetWorkitemId);
            if (callback) {
                callback();
            }
        }, errorCallback);
    }

    public resetDataSetWorkItem(): void {
        this._parameterSetWorkitem.reset();
        this.setIsDirty(false);
        this.updated();
    }

    public renameDataSetWorkItem(dataSetId: number, title: string, callback?: () => void, errorCallback?: IErrorCallback) {
        this._parameterSetWorkitem.setFieldValue(WITConstants.CoreFieldRefNames.Title, title);
        this._parameterSetWorkitem.beginSave((workItems: any) => {
            this.displaytitleUpdated(this.getDisplayTitle(this._isDirty));
            if (callback) {
                callback();
            }
        }, errorCallback);
    }

    public getDirtyMessage(): string {
        let message: string = Resources.UnsavedChanges + "\r\n" + this.getDisplayTitle(false) + "\r\n\r\n" + Resources.ContinueAndLoseChanges;

        return message;
    }

    private _createRowViewModelsForDataSet(dataSet: TestsOM.SharedParameterDataSet): RowViewModel[] {
        let dataSetCount: number = dataSet.getParamDataRowCount(),
            i: number,
            records: RowViewModel[] = [];

        this._columns = Utils_Array.clone(dataSet.getParameters());
        for (i = 0; i < dataSetCount; i++) {
            records.push(new RowViewModel(dataSet.getParamData().getRowIds()[i], this._getParamValuesForRowFromDataSet(dataSet, i)));
        }
        return records;
    }

    private _updateDataSetFromRowViewModels() {
        let dataSetCount: number,
            i: number,
            rowId: number,
            sharedParameterData: TestsOM.SharedParameterData = this._dataSet.getParamData();

        this._removeTrailingEmptyRows(); // Before converting the viewModel to dataSet, remove the trailing rows as they dont need to be converted.
        dataSetCount = this._records.length;
        sharedParameterData.deleteAllParameterRows();
        for (i = 0; i < dataSetCount; i++) {
            rowId = this._records[i].id;
            if (rowId) { // This row already existed.
                sharedParameterData.addParameterRowWithRowId(this._columns, this._records[i].paramValues, i, rowId);
            }
            else { // These is a new row which was added by the user, so the rowid for this needs to be generated by the data model.
                rowId = sharedParameterData.addParameterRow(this._columns, this._records[i].paramValues, i);
                this._records[i].id = rowId;
            }
        }
        this._dataSet.setSharedParameterDataSetAndData(this._columns, sharedParameterData);
    }

    private _removeTrailingEmptyRows() {
        let dataSetCount: number = this._records.length,
            i: number;

        for (i = dataSetCount - 1; i >= 0; i--) {
            if (this.isEmptyRow(i)) {
                this._records.splice(i, 1);
            }
            else {
                break;
            }
        }
    }

    private _getParamValuesForRowFromDataSet(dataSet: TestsOM.SharedParameterDataSet, rowIndex: number): string[] {
        let dataRow: string[] = [],
            columns: string[] = dataSet.getParameters(),
            columnCount: number = columns.length,
            i: number;

        for (i = 0; i < columnCount; i++) {
            dataRow.push(dataSet.getParamData().getParameterValueForRow(rowIndex, columns[i]));
        }

        return dataRow;
    }

    public setValue(dataIndex: number, columnIndexString: string, newValue: string) {
        let record = this._records[dataIndex],
            oldValue: string,
            valueChanged: boolean,
            columnIndex: number = parseInt(columnIndexString, 10);

        oldValue = record.paramValues[columnIndex];
        if (oldValue === undefined) {
            oldValue = "";
        }
        if (oldValue !== newValue) {
            this.setIsDirty(true);
            record.paramValues[columnIndex] = newValue;
        }
    }

    public setIsDirty(isDirty: boolean) {
        if (isDirty !== this._isDirty) {
            this._isDirty = isDirty;
            if (this.displaytitleUpdated) {
                this.displaytitleUpdated(this.getDisplayTitle(this._isDirty));
            }
        }
    }

    public getDisplayTitle(isDirty: boolean): string {
        let title: string,
            Id: string = this._parameterSetWorkitem.id + (isDirty ? "*" : "");

        title = Utils_String.format(Resources.SharedParameterTitle, this._parameterSetWorkitem.workItemType.name, Id, this._parameterSetWorkitem.getTitle());

        return title;
    }

    public canSaveDataSet(): boolean {
        return this._isDirty;
    }

    public canRefreshDataSet(): boolean {
        return true;
    }

    public beginSave(callback?: IResultCallback, errorCallback?: IErrorCallback): void {

        this._updateParameterFieldInWorkitem();
        this._parameterSetWorkitem.beginSave(callback, errorCallback);
    }

    private _updateParameterFieldInWorkitem() {
        let centralParamaterXml: string;

        this._updateDataSetFromRowViewModels();
        centralParamaterXml = this._dataSet.getXML();
        this._parameterSetWorkitem.setFieldValue(TCMConstants.WorkItemFieldNames.Parameters, centralParamaterXml);
    }

    public doesParamNameExistAtAnotherIndex(paramName: string, index: number): boolean {
        let length = this._columns.length;
        if (!paramName) {
            return false;
        }
        for (let i = 0; i < length; ++i) {
            if (i !== index && Utils_String.localeIgnoreCaseComparer(paramName, this._columns[i]) === 0) {
                return true;
            }
        }
        return false;
    }

    public getIsDirty(): boolean {
        return this._isDirty;
    }

    public updateLinkedTestCases() {
        try {
            TMUtils.ParametersHelper.beginUpdateSharedParamMappingsInLinkedTestCases(this._dataSet, this._parameterSetWorkitem.id, delegate(this, this._onLinkedTestCasesUpdated));
        }
        catch (ex) {
            this._dataSet.clearCommandQueue();
        }
    }

    private _onLinkedTestCasesUpdated() {
        this._dataSet.clearCommandQueue();
        Diag.logTracePoint("DataSetGrid.LinkedTestCases.Updated");
    }

    public getParameterWorkItem(): WITOM.WorkItem {
        return this._parameterSetWorkitem;
    }

    public updated: (command?: any, indicesToSelect?: number[]) => void;
    public selectedDataSetChanged: (sharedParamDataSetId: number) => void;
    public displaytitleUpdated: (newTitle: string) => void;
    private _isDirty: boolean;

    private _dataSet: TestsOM.SharedParameterDataSet;
    private _records: RowViewModel[];
    private _columns: string[];
    private _parameterSetWorkitem: WITOM.WorkItem;
    private _minRowCount: number = 30;
    private _minColumnCount: number = 10;
}

class ParameterSetLeftPaneToolbarCommands {
    public static newParameterSet: string = "create-new-parameter-set";
}

class ParameterSetFarRightPaneToolbarCommands {
    public static newTestCase: string = "add-new-testcase";
    public static refreshReferencedTestCases: string = "refresh-referenced-testcases";
}

class DataSetGridCommands {
    public static saveDataSet: string = "save-dataset";
    public static refreshDataSet: string = "refresh-dataset";
    public static insertColumn: string = "insert-column";
}

export class ReferencedTestCasesList extends TreeView.TreeView {
    private _datasetViewModel: DataSetViewModel;
    private _referencedTestCasesDataToPage: string[];
    private _sharedParamDataSetId: number;
    private _testCaseModified: boolean;
    public showError: (message: string) => void;

    constructor(options?) {
        super(options);
        this._datasetViewModel = options.datasetViewModel;
        this._datasetViewModel.selectedDataSetChanged = (sharedParamDataSetId: number) => {
            this.onSelectedDataSetInLeftPaneChanged(sharedParamDataSetId);
        };
    }

    public initialize() {
        super.initialize();
        this._referencedTestCasesDataToPage = [
            WITConstants.CoreFieldRefNames.Id,
            WITConstants.CoreFieldRefNames.Title
        ];
    }

    public initializeOptions(options?: any) {
        // TODO:BUG 937329: Need to remove this once framework team set this property by default.
        if (options) {
            options.useArrowKeysForNavigation = true;
        }

        super.initializeOptions(options);
    }

    public onSelectedDataSetInLeftPaneChanged(sharedParamDataSetId: number) {
        if (sharedParamDataSetId !== this._sharedParamDataSetId) {
            this._sharedParamDataSetId = sharedParamDataSetId;
            this.refreshList();
        }
    }

    public getItemsCount(): number {
        if (this.rootNode && this.rootNode.children) {
            return this.rootNode.children.length;
        }
    }

    public refreshList() {
        TMUtils.SharedParameterHelper.beginGetReferencedTestCases(this._sharedParamDataSetId, this._referencedTestCasesDataToPage, (testCases: TestsOM.ReferencedTestCaseModel[]) => {
            this.populate(testCases);
        },
            (error) => {
                alert(VSS.getErrorMessage(error));
            });
    }

    public populate(testCases: TestsOM.ReferencedTestCaseModel[]): void {
        let i, l, length: number,
            rootNode = this.rootNode, defaultNode;
        this.setSelectedNode(null);
        rootNode.clear();

        if (testCases) {
            length = testCases.length;
        }

        for (i = 0, l = length; i < l; i++) {
            rootNode.add(this._createTestCaseNode(testCases[i]));
        }
        defaultNode = rootNode.children[0];
        this._draw();
        this.setSelectedNode(defaultNode);
    }

    public getSelectedTestCase(): TestsOM.ReferencedTestCaseModel {
        /// <summary>Gets the currently selected suite node</summary>
        /// <returns type="Object" > the suite data object currently selected </returns>
        let node = <any>this.getSelectedNode();
        return node && node.testCase;
    }

    public setSelectedNode(node: any, suppressChangeEvent?: boolean): void {
        /// <summary>Sets the currently selected suite node</summary>
        /// <param name="node" type="Object">Contains the node to be selected </param>
        /// <param name="suppressChangeEvent" type="boolean" optional="true" />
        let eventArgs = {
            dataSet: node && node.testCase,
            canceled: false
        };

        this._fire("selectedDataSetChanging", eventArgs);
        if (!eventArgs.canceled) {
            super.setSelectedNode(node);
        }
    }

    public focus() {
        this._element.focus(10);
    }

    private _createTestCaseNode(testCase: TestsOM.ReferencedTestCaseModel): TreeView.TreeNode {
        let node: any = TreeView.TreeNode.create(Utils_String.format(Resources.ReferencedTestCase, testCase.id, testCase.title));
        node.noTreeIcon = true;
        node.config = { css: "testCase-node" };
        node.noContextMenu = true;
        node.testCase = testCase;
        return node;
    }

    public onItemClick(node, nodeElement, e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" optional="true"/>
        /// <returns type="any" />
        let testCase: TestsOM.ReferencedTestCaseModel;
        super.onItemClick(node, nodeElement, e);
        testCase = this.getSelectedTestCase();
        this._openTestCase(testCase.id);
    }

    private _openTestCase(testCaseId: number) {
        /// <summary>opens the selected test case</summary>
        let onSuccess = () => {
            this._testCaseModified = true;
        };

        let onFailure = (errorMessage: string) => {
            this.showError(errorMessage);
        };

        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, onSuccess);
        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, onFailure);

        if (testCaseId) {
            Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("open-work-item", {
                id: testCaseId,
                tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
                options: {
                    save: (workItem) => {
                        this._testCaseModified = true;
                    },

                    close: (workItem) => {
                        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, onSuccess);
                        eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, onFailure);

                        if (this._testCaseModified) {
                            this.refreshList();
                        }
                        //after form closes we want the focus back on the testcase pane
                        this._element.focus(10);
                        this._testCaseModified = false;
                    }
                }

            }, null));
        }
    }
}

export class DataSetGrid extends EditableGrid.EditableGrid {

    private _datasetViewModel: DataSetViewModel;
    private _lastFocusedHeaderElement: HTMLElement = null;
    private _parentElement: JQuery;
    private _menuBar: Menus.MenuBar;
    private _hasErrors: boolean;
    private _headerInEditMode: boolean = false;
    public getReferencedTestCasesCount: () => number;
    private _headerColumnIndexToSelect: number = -1;
    private _firstColumnHeaderContainsWatermark: boolean = false;
    private _clipboardDataModel: ClipboardDataInfo;
    private _copyAction: CopyAction;
    private _cutAction: CutAction;
    private _pasteAction: PasteAction;
    private _pasteActionProgressId: number;
    private _headerColumnHeaderClass = ".grid-header-column div.title";
    private _titleDivClassName = "div.title";

    constructor(options) {
        super(options);
        this._datasetViewModel.updated = (command?: any, indicesToSelect?: number[]) => {
            if (command === EditableGrid.EditableGrid.Commands.CMD_CLEAR_ROWS) {
                this.updateRows();
            }
            else {
                this._refreshGrid(command, indicesToSelect);
            }
            this._headerInEditMode = false;
            this._updateToolbarCommandStates();
        };
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        this._datasetViewModel = options.datasetViewModel;
        this._parentElement = options.parent;
        this._hasErrors = false;

        super.initializeOptions($.extend({
            sharedMeasurements: false,
            cssClass: "datasets-grid",
            allowMoveColumns: false,
            allowMultiSelect: true,
            keepSelection: true,
        }, options));

        this._createMenuBar();
        this._clipboardDataModel = new ClipboardDataInfo(this._columns);
        this._copyAction = new CopyAction(this._datasetViewModel, this._clipboardDataModel);
        this._cutAction = new CutAction(this._datasetViewModel, this._clipboardDataModel);
        this._pasteAction = new PasteAction(this._datasetViewModel, this._clipboardDataModel);
    }

    public whenLayoutComplete(command: any, indicesToSelect?: number[]) {
        this.ensureRowSelectionWhenLayoutComplete(command, indicesToSelect);
        // whenever operation complete on grid, focus will remain there only
        this.focus(10);
    }

    public _attachEvents() {
        let userAgent = window.navigator.userAgent.toLowerCase();
        super._attachEvents();
        if (userAgent.indexOf("chrome") !== -1) {
            /* TODO: BUG: 1017278 attach to the grid control instead
               Clipboard events are not getting fired when attached to grid control, 
               Keeping the same behavior as before with binding to document
            */
            this._bind(document, "copy", delegate(this, this._copyToClipboard));
            this._bind(document, "cut", delegate(this, this._cutToClipboard));
            this._bind(document, "paste", delegate(this, this._pasteFromClipboard));
        }
    }

    private _createMenuBar() {
        /// <summary>Creates the MenuBar</summary>
        let $toolbar = this._parentElement.find(".hub-pivot-toolbar");
        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbar, {
            items: this._createMenubarItems(),
            executeAction: delegate(this, this._onMenubarItemClick),
            cssClass: "parameter-sets-toolbar"
        });

        this._updateToolbarCommandStates();
    }

    private _updateToolbarCommandStates() {
        /// <summary>Updates the states of toolbar buttons - refresh and open-test-case based on test case count and selection</summary>
        this._menuBar.updateCommandStates(
            [
                {
                    id: DataSetGridCommands.refreshDataSet,
                    disabled: !this._datasetViewModel.canRefreshDataSet()
                },
                {
                    id: DataSetGridCommands.saveDataSet,
                    disabled: !this._datasetViewModel.canSaveDataSet()
                },
                {
                    id: DataSetGridCommands.insertColumn,
                    disabled: !this._canInsertColumn()
                }
            ]);
    }

    private _createMenubarItems(): any[] {
        /// <summary>Creates the items list for the toolbar</summary>
        /// <returns type="Object">Items list for the toolbar</returns>
        let items = [];
        items.push({ id: DataSetGridCommands.insertColumn, title: Resources.InsertColumn, showText: false, icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small" });
        items.push({ id: DataSetGridCommands.saveDataSet, title: Resources.SaveDataSetText, showText: false, icon: "bowtie-icon bowtie-save-all" });
        items.push({ id: DataSetGridCommands.refreshDataSet, title: Resources.RefreshToolTip, showText: false, icon: "bowtie-icon bowtie-navigate-refresh" });
        return items;
    }

    private _onMenubarItemClick(e?: any) {
        /// <summary>Handles the execution of the toolbar items</summary>
        /// <param name="e" type="Object">The execution event</param>
        Diag.logTracePoint("DataSetGrid.ToolBarMenuItem.Click");
        let command = e.get_commandName();

        // Firefox does not fire 'blur' when toolbar is clicked. So end edit has to be triggered explicitly.
        if (Utils_UI.BrowserCheckUtils.isFirefox()) {
            this._fireEndEdit();
        }

        if (command === DataSetGridCommands.saveDataSet) {
            Diag.logTracePoint("DataSetGrid.Save.Start");
            this._saveDataSet();
        }
        else if (command === DataSetGridCommands.refreshDataSet) {
            if (!this._datasetViewModel.getIsDirty() || confirm(Resources.UnsavedChangesRefreshWarning)) {
                this.showBusyOverlay();
                try {
                    this._refreshGridData();
                }
                finally {
                    this.hideBusyOverlay();
                }
            }
        }
        else if (command === DataSetGridCommands.insertColumn) {
            this._onInsertColumn(this._getSelectedCellInfo().columnOrder, this.getSelectedDataIndices());
        }
    }

    private _canInsertColumn(): boolean {
        return !this._headerInEditMode;
    }

    private _saveDataSet() {

        if (this._hasErrors || this._datasetViewModel.hasErrors()) {
            alert(Resources.InvalidParameterSetErrorString);
            return;
        }

        this._datasetViewModel.beginSave((result: boolean) => {
            if (result) {
                this._datasetViewModel.updateLinkedTestCases();
                this._refreshGridData();
            }
            this._updateToolbarCommandStates();
            Diag.logTracePoint("DataSetGrid.Save.Complete");
        },
            (error) => {
                alert(VSS.getErrorMessage(error));
            });

        TelemetryService.publishEvents(TelemetryService.featureSaveParameterSetGrid, { "RowCount": this._datasetViewModel.getDataSource().length});
    }

    private _refreshGridData() {
        this._datasetViewModel.refreshDataSet();
    }

    public _updateViewport(includeNonDirtyRows?: boolean) {
        /// <param name="includeNonDirtyRows" type="boolean" optional="true" />

        //overriding UI virtualization since test steps and parameters wouldn't be in huge numbers 
        let resultCount = this._count - 1, i, visible = [];
        for (i = 0; i <= resultCount; i++) {
            visible[visible.length] = [i, i];
        }
        if (visible.length > 0) {
            this._drawRows(visible, includeNonDirtyRows);
            this._fire("updateViewPortCompleted", {});
        }

        this.postUpdateViewPort();
    }

    public _getVisibleRowIndices() {
        let top = this._scrollTop,
            bottom = top + this._canvasHeight,
            count = this._expandedCount - 1,
            rh = this._rowHeight;

        return {
            first: Math.min(count, Math.max(0, Math.ceil(top / rh))),
            last: Math.min(count, Math.floor(bottom / rh) - 1)
        };
    }

    public layout() {
        // After layout is complete, create a delete button for each column header which will appear only on hover.
        let i: number,
            $headers: JQuery,
            length: number,
            paramName: string,
            $gridHeader: JQuery,
            $paramNameHeaderDiv: JQuery;

        if (this._lastFocusedHeaderElement) {
            this._onEditableHeaderBlur({ "target": this._lastFocusedHeaderElement });
        }
        super.layout();

        this._firstColumnHeaderContainsWatermark = false;
        $gridHeader = this._element.find(".grid-header");
        $gridHeader.css("-moz-user-focus", "inherit");
        $headers = this._element.find(".grid-header-column");
        length = $headers.length;
        for (i = 0; i < length; i++) {
            $paramNameHeaderDiv = $($headers[i]).find(".title");
            $($headers[i]).addClass("editable");
            paramName = $paramNameHeaderDiv.text();
            if (!paramName) {
                //If the param header is empty
                RichContentTooltip.add(Resources.EnterParamName, $($headers[i]), { setAriaDescribedBy: true });
                if (i === 0) {
                    this._addWaterMarkText($paramNameHeaderDiv);
                }
            }
            this._appendDeleteButtonToHeader(i);
            this._updateParameterHeaderErrorState(i);
            if (this._updateParameterHeaderErrorState(i) && paramName) {
                //In case of the param name has error and the param name is not empty.
                RichContentTooltip.add(Resources.InvalidParamName, $($headers[i]), { setAriaDescribedBy: true });
            }
        }
    }

    private _addWaterMarkText($paramNameHeaderDiv: JQuery) {

        $paramNameHeaderDiv.text(Resources.EnterParamName);
        this._firstColumnHeaderContainsWatermark = true;
    }

    public _onKeyDown(e?: JQueryEventObject): any {
        let keyCode = Utils_UI.KeyCode,
            handled: boolean = false;

        if (!(e.keyCode === 67 && e.ctrlKey)) { //Handle Ctrl+C ourselves
            super._onKeyDown(e);
        }

        switch (e.keyCode) {
            case 83: // S
                if (Utils_UI.KeyUtils.isExclusivelyCtrl(e)) {
                    this._saveDataSet();
                    handled = true;
                }
                else {
                    return;
                }
                break;

            case 67: // C
                if ((<any>window).clipboardData) {
                    if (e.ctrlKey) {
                        this._copyToClipboard();
                    }
                    else {
                        return;
                    }
                }
                break;
            case 86: // V
                if ((<any>window).clipboardData) {
                    if (e.ctrlKey) {
                        this._pasteFromClipboard();
                        handled = true;
                    }
                    else {
                        return;
                    }
                }
                break;
            case 88: //X
                if ((<any>window).clipboardData) {
                    if (e.ctrlKey) {
                        this._cutToClipboard();
                    }
                    else {
                        return;
                    }
                }
                break;
            case 80: //P
                if (e.altKey) { // Alt + P (Insert Row shortcut)
                    this._onInsertRow(this.getSelectedDataIndices(), this.getSelectedRowIndices());
                }
                break;
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    private _getHeaderDiv(columnIndex: number): JQuery {
        let $gridHeader = this._element.find(".grid-header"),
            $headers = this._element.find(".grid-header-column");

        if (columnIndex >= 0 && columnIndex < $headers.length) {
            return $($headers[columnIndex]).find(".title");
        }
        return null;
    }

    private _appendDeleteButtonToHeader(columnIndex: number): void {
        // Appends a delete button to a column header. The delete button will be visible on hover over the header.
        let paramName: string,
            $headerDiv = this._getHeaderDiv(columnIndex),
            $paramDeleteIcon: JQuery,
            deleteParamArgs: any = {};

        paramName = $headerDiv.text();
        deleteParamArgs = { columnIndex: columnIndex };
        $paramDeleteIcon = $("<span class = \"bowtie-icon bowtie-edit-delete parameter-delete-icon\" title =" + Resources.DeleteParameter + "></span>");
        $paramDeleteIcon.bind("click", delegate(this, this._onParameterDeleteClick, deleteParamArgs));
        $headerDiv.append($paramDeleteIcon);
    }

    private _updateParameterHeaderErrorState(columnIndex: number): boolean {
        // Update the error state of the parameterDiv
        let paramName: string,
            $paramNameHeaderDiv = this._getHeaderDiv(columnIndex);

        paramName = $paramNameHeaderDiv.text();
        //In case the header is empty and the columndata is also empty it will not be treated as error.
        // If the column contains some data, then empty header is not allowed.
        if (this._datasetViewModel.isValidParameterNameForIndex(paramName, columnIndex)
            || (this._columnHeaderHasWatermark(columnIndex) && this._datasetViewModel.isEmptyColumn(columnIndex))) {
            $paramNameHeaderDiv.removeClass("parameter-name-invalid");
            this._hasErrors = false;
            return false;
        }
        else {
            $paramNameHeaderDiv.addClass("parameter-name-invalid");
            this._hasErrors = true;
            return true;
        }
    }

    private _columnHeaderHasWatermark(columnIndex: number) {
        if (columnIndex === 0 && this._firstColumnHeaderContainsWatermark) {
            return true;
        }
        return false;
    }

    protected _onDeleteHeader(e: JQueryEventObject) {
        let columnIndex = this._getColumnIndexForColumnHeaderClicked(e);
        let args = { columnIndex: columnIndex };

        this._onParameterDeleteClick(e, args);
    }

    private _onParameterDeleteClick(e: JQueryEventObject, args: any) {
        let columnIndex: number = args.columnIndex,
            showWarning: boolean = true,
            paramName = this._datasetViewModel.getColumnNames()[columnIndex];

        if (this._getSelectedCellInfo().columnOrder === this._columns.length - 1) {
            // If the cell selection is in last column, then on column deletion, that cell wont exist. 
            // So moving to previous cell so that after column deletion, correct cell is selected.
            this._selectNextOrPrevCell(false);
        }
        if (this.getReferencedTestCasesCount && this.getReferencedTestCasesCount() < 1) {
            showWarning = false;
        }
        if (paramName === "" || !showWarning || confirm(Resources.DeleteSharedParamColumnWarning)) {
            this._datasetViewModel.deleteColumn(columnIndex, this.getSelectedDataIndices());
        }
        e.stopPropagation();
    }

    private _copyToClipboard(e?): void {
        if (this._inEditMode || this._headerInEditMode) {
            return;
        }
        Diag.logVerbose("[DataSetGrid._copyToClipboard] Selected data indices : " + this.getSelectedDataIndices());
        this._copyAction.copy(this.getSelectedDataIndices(), e);
    }

    private _pasteFromClipboard(e?, clipboardText?: string): void {
        if (this._inEditMode || this._headerInEditMode) {
            return;
        }
        let selectedDataIndices = this.getSelectedDataIndices();
        Diag.logVerbose("[DataSetGrid._pasteFromClipboard] Selected data indices : " + selectedDataIndices);
        $.extend(e, { clipboardDataText: clipboardText });
        if (!this._pasteActionProgressId || this._pasteActionProgressId < 0) {
            this._pasteActionProgressId = VSS.globalProgressIndicator.actionStarted("pasteFromClipboard", true);
            Diag.logVerbose("[DataSetGrid._pasteFromClipboard]Start progressIndicator id : " + this._pasteActionProgressId);
            if (!this._pasteAction.paste(this.getSelectedDataIndices(), e)) {
                VSS.globalProgressIndicator.actionCompleted(this._pasteActionProgressId);
                Diag.logVerbose("[DataSetGrid._pasteFromClipboard]Finish progressIndicator id : " + this._pasteActionProgressId);
                this._pasteActionProgressId = -1;
            }
            else {
                VSS.globalProgressIndicator.actionCompleted(this._pasteActionProgressId);
                this._pasteActionProgressId = -1;
            }
        }
    }

    private _cutToClipboard(e?): void {
        if (this._inEditMode || this._headerInEditMode) {
            return;
        }
        Diag.logVerbose("[DataSetGrid._cutToClipboard] Selected data indices : " + this.getSelectedDataIndices());
        this._cutAction.cut(this.getSelectedDataIndices(), e);
    }

    public getColumnValue(dataIndex: number, columnIndex: number, columnOrder?: number): string {
        return this._datasetViewModel.getValue(dataIndex, columnIndex);
    }

    public _onHeaderDblClick(e?: JQueryEventObject): void {
        if (e) {
            let target = $(e.target);
            if (! target.is(this._headerColumnHeaderClass)){
                target = target.find(this._titleDivClassName);
            }

            this._makeHeaderElementEditable(target, this._getColumnIndexForColumnHeaderClicked(e));
        }
    }

    public _makeHeaderElementEditable($headerElement: JQuery, columnIndex: number): void {

        // On double clicking the header, show a text area where the parameter name can be renamed.
        let $headerTitleDiv: JQuery = $headerElement.closest(this._headerColumnHeaderClass),
            text: string = $headerTitleDiv.text(),
            $editableSection: JQuery = $headerElement.parent().find(".editable-param-name");

        if (!this._headerInEditMode) {
            if (columnIndex === 0 && this._firstColumnHeaderContainsWatermark) {
                text = "";
            }

            this.delayExecute("makeSharedParamColumnHeaderEditable", 100, true, () => {
                // Hide the div showing the param name.
                $headerTitleDiv.hide();

                // Lazy creation for the editable box for the param name editing
                if ($editableSection.length <= 0) {
                    $headerTitleDiv.before("<input type='text' class='editable-param-name title'>");
                }

                $editableSection = $headerElement.parent().find(".editable-param-name");
                if ($editableSection.length > 0) {
                    this._headerInEditMode = true;
                    this._updateToolbarCommandStates();

                    this._lastFocusedHeaderElement = $editableSection[0];
                    $editableSection.prop("value", text)
                        .show()
                        .removeClass("parameter-name-invalid")
                        .bind("keypress focus", (e) => { e.stopPropagation(); })
                        .bind("blur", (e) => { this._onEditableHeaderBlur(e); })
                        .bind("keyup", (e) => { this._onEditableHeaderKeyUp(e); })
                        .bind("keydown", (e) => { this._onEditableHeaderKeyDown(e); })
                        .focus();
                }
                if ($editableSection.length > 0) {
                    TMUtils.setTextSelection($editableSection[0], 0, text.length);
                }
            });
        }

        if ($editableSection.length > 0) {
            TMUtils.setTextSelection($editableSection[0], 0, text.length);
        }
    }

    private _onEditableHeaderBlur(e): void {
        //On the focus out of the editable header column, make the header non-editable and commit the change to the parameter name.
        let $headerColumn = $(e.target).closest(".grid-header-column"),
            $editableSection = $headerColumn.find(".editable-param-name"),
            $paramNameHeaderDiv = $headerColumn.find(this._titleDivClassName),
            newParamName = $editableSection.prop("value"),
            oldParamName = $paramNameHeaderDiv.text(),
            deleteParamArgs: any = {},
            columnIndex = this._getColumnIndexForColumnHeaderClicked(e),
            $paramDeleteIcon: JQuery;

        Diag.logVerbose("[DataSetGrid/_onEditableHeaderBlur] Focus out for " + e.target);

        this._headerInEditMode = false;
        $editableSection.unbind("blur");
        $editableSection.hide();
        $paramNameHeaderDiv.show();
        this._lastFocusedHeaderElement = null;

        if ((Utils_String.localeIgnoreCaseComparer(oldParamName, newParamName) !== 0) &&
            TestsOM.ParameterCommonUtils.isValidParameterString(newParamName) && !this._datasetViewModel.doesParamNameExistAtAnotherIndex(newParamName, columnIndex)) {
            // In case the column is renamed, the datasetViewModel.renameColumn refreshes the grid , so header error states get updated
            this._datasetViewModel.renameColumn(columnIndex, newParamName, this.getSelectedDataIndices());
        }
        else { //Incase the column was not renamed header error state needs to be updated explicitly.
            this._updateParameterHeaderErrorState(columnIndex);
        }
        this._updateToolbarCommandStates();
        if (e.stopPropagation){
            e.stopPropagation();
        }
    }

    private _onEditableHeaderKeyUp(e): void {
        let $editableSection = $(e.target).parent().find(".editable-param-name"),
            $paramNameHeaderDiv = $(e.target).parent().find("div.title"),
            newParamName = $editableSection.prop("value"),
            oldParamName = $paramNameHeaderDiv.text(),
            columnIndex = this._getColumnIndexForColumnHeaderClicked(e);

        Diag.logVerbose("[DataSetGrid/_onEditableHeaderKeyUp] Keyup for " + e.target);

        if (e.which && e.which === Utils_UI.KeyCode.ENTER) {
            this._onEditableHeaderBlur(e);
            this._addSelection(this._selectedIndex);
            this.getSelectedRowIntoView();
            this.focus(10);
        }
        else {
            if (this._datasetViewModel.isValidParameterNameForIndex(newParamName, columnIndex)) {
                $editableSection.removeClass("parameter-name-invalid");
                $paramNameHeaderDiv.removeClass("parameter-name-invalid");
                this._hasErrors = false;
            }
            else {
                $editableSection.addClass("parameter-name-invalid");
                $paramNameHeaderDiv.addClass("parameter-name-invalid");
                this._hasErrors = true;
            }
        }
        e.stopPropagation();
    }

    private _onEditableHeaderKeyDown(e): void {
        Diag.logVerbose("[DataSetGrid/_onEditableHeaderKeyDown] KeyDown for " + e.target);

        if (e.which && e.which === Utils_UI.KeyCode.ENTER) {
            //In case the testcase is shown in dialog we need to stop propagation of the enter keydown from input elements as it is used by the dialog to trigger save
            e.preventDefault();
        }
        if (Utils_UI.KeyUtils.isExclusivelyCtrl(e) && (String.fromCharCode(e.keyCode).toLowerCase() === "s")) { // Ctrl +S, Focus out the current cell
            if (this._lastFocusedHeaderElement) {
                this._onEditableHeaderBlur({ "target": this._lastFocusedHeaderElement });
            }
            this._saveDataSet();
            e.preventDefault();
        }
        e.stopPropagation();
    }

    public _onContainerMouseDown(e?) {
        if (!this._inEditMode && !this._headerInEditMode) {
            super._onContainerMouseDown(e);
        }
    }

    private _getColumnIndexForColumnHeaderClicked(e?: JQueryEventObject): number {
        let columnIndex, column, headerColumn;
        headerColumn = $(e.target).closest(".grid-header-column");

        if (headerColumn.length > 0) {
            columnIndex = headerColumn[0]._data.columnIndex;
            return columnIndex;
        }
        return -1;
    }

    private _getHeaderElementForColumnIndex(columnIndex: number): HTMLElement {
        let $gridHeaders: JQuery = this._element.find(".grid-header-column"),
            $columnHeader: JQuery;

        if ($gridHeaders.length > columnIndex) {
            $columnHeader = $($gridHeaders[columnIndex]);
            return $columnHeader.find("div.title")[0];
        }
    }

    public _appendRow(): boolean {
        if (this._datasetViewModel.canAppendRows(10)) {
            this._datasetViewModel.appendRows(10);
            return true;
        }
        return false;
    }

    private _updateValueInModel(dataIndex: number, columnIndex: string, newValue: string, ignoreValueChange?: boolean) {
        if (!ignoreValueChange) {
            this._datasetViewModel.setValue(dataIndex, columnIndex, newValue);
            this._updateToolbarCommandStates();
        }
        super.onEndCellEdit(dataIndex, columnIndex, newValue, ignoreValueChange);

    }

    public onEndCellEdit(dataIndex: number, columnIndexString: string, newValue: string, ignoreValueChange?: boolean) {
        Diag.logVerbose("[DataSetGrid.onEndCellEdit]End cell edit triggered with value " + newValue);

        let columnIndex = parseInt(columnIndexString, 10);
        this._updateValueInModel(dataIndex, columnIndexString, newValue, ignoreValueChange);

        //If the header of the column is empty then its error state needs to be updated on cellEndedit
        if (!this._datasetViewModel.getColumnNames()[columnIndex]) {
            this._updateParameterHeaderErrorState(columnIndex);
        }
    }

    private _onInsertColumn(selectedColumnIndex: number, dataIndicesToSelect: number[]) {
        this._datasetViewModel.insertColumn(selectedColumnIndex, dataIndicesToSelect);
        this._headerColumnIndexToSelect = selectedColumnIndex + 1;
    }

    public handleHeaderSelectionAfterViewPortUpdate() {
        if (this._headerColumnIndexToSelect >= 0) {

            let headerElementToSelect: HTMLElement = this._getHeaderElementForColumnIndex(this._headerColumnIndexToSelect);

            this._makeHeaderElementEditable($(headerElementToSelect), this._headerColumnIndexToSelect);
            this._headerColumnIndexToSelect = -1;
        }
    }

    public _onInsertRow(selectedDataIndices: number[], selectedRowIndices: number[]) {
        this._datasetViewModel.insertRow(selectedDataIndices[0]);
    }

    public _onDeleteRows(selectedDataIndices: number[], selectedRowIndices: number[]) {
        this._datasetViewModel.deleteRows(selectedDataIndices);
    }

    public _onClearRows(selectedDataIndices: number[], selectedRowIndices: number[]) {
        this._datasetViewModel.clearRows(selectedDataIndices);
    }

    private _refreshGrid(command?: any, indicesToSelect?: number[]): void {
        Diag.logVerbose("[DataSetGrid/_refreshGrid] After the operation " + command + " happened and select " + indicesToSelect + " indexes");

        let columnNames: string[];
        this.onLayoutComplete(command, indicesToSelect);
        this._options.source = this._datasetViewModel.getDataSource();

        Diag.logVerbose("[DataSetView/getCoulmns] Creating columns for DataSetGrid");
        columnNames = this._datasetViewModel.getColumnNames();
        this._options.columns = this._createColumnsFromNames(columnNames);
        this.setDataSource(this._options.source, this._options.expandStates, this._options.columns, this._options.sortOrder);
    }

    private _createColumnsFromNames(columnNames: string[]) {
        let i, l, cols = [], column;

        for (i = 0, l = columnNames.length; i < l; i++) {
            column = {
                index: i,
                text: columnNames[i],
                canSortBy: false,
                width: 150,
                canEdit: true,
                isRichText: false,
                editOnSelect: false
            };
            cols.push(column);
        }
        return cols;
    }
}

export class ClipboardAction {

    constructor(dataSetViewModel: DataSetViewModel, clipboardData: ClipboardDataInfo) {
        this._datasetviewmodel = dataSetViewModel;
        this._clipboardData = clipboardData;
    }

    public _canPerform(dataIndices: number[]): boolean {
        return true;
    }

    public _copyToClipboard(e?) {
        Diag.logVerbose("[DataSetGrid.ClipboardAction._copyToClipboard] Started copying data to clipboard");
        let progressId = VSS.globalProgressIndicator.actionStarted("copyToClipboard");
        if ((<any>window).clipboardData) {
            (<any>window).clipboardData.setData("Text", this._clipboardData.toPlainText(this._clipboardData.getData()));
        }
        else if (e) {
            e.originalEvent.clipboardData.setData("Text", this._clipboardData.toPlainText(this._clipboardData.getData()));
        } else {
            Diag.logWarning("[DataSetGrid.ClipboardAction._copyToClipboard] - Event e is null, copy didn't happen");
        }
        VSS.globalProgressIndicator.actionCompleted(progressId);
        Diag.logVerbose("[DataSetGrid.ClipboardAction._copyToClipboard] Done with copying data to clipboard");
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    public _datasetviewmodel;
    public _clipboardData;
}

class CopyAction extends ClipboardAction {

    constructor(dataSetViewModel: DataSetViewModel, clipboardData: ClipboardDataInfo) {
        super(dataSetViewModel, clipboardData);
    }

    public copy(dataIndices: number[], e?) {
        let indicesCount: number = dataIndices.length,
            i: number,
            dataSource: RowViewModel[] = this._datasetviewmodel.getDataSource(),
            rowViewModels: RowViewModel[] = [];

        for (i = 0; i < indicesCount; i++) {
            rowViewModels.push(dataSource[dataIndices[i]]);
        }
        this._clipboardData.setData(rowViewModels);
        this._copyToClipboard(e);
    }
}

class CutAction extends ClipboardAction {

    constructor(datasetViewModel: DataSetViewModel, clipboardData: ClipboardDataInfo) {
        super(datasetViewModel, clipboardData);
    }

    public cut(dataIndices: number[], e?: any) {
        if (this._canPerform(dataIndices)) {
            let indicesCount: number = dataIndices.length,
                i: number,
                dataSource: RowViewModel[] = this._datasetviewmodel.getDataSource(),
                rowViewModels: RowViewModel[] = [];

            for (i = 0; i < indicesCount; i++) {
                rowViewModels.push(dataSource[dataIndices[i]]);
            }
            this._clipboardData.setData(rowViewModels);
            this._datasetviewmodel.deleteRows(dataIndices);
            this._copyToClipboard(e);
        }
    }
}

class PasteAction extends ClipboardAction {
    constructor(datasetViewModel: DataSetViewModel, clipboardData: ClipboardDataInfo) {
        super(datasetViewModel, clipboardData);
    }

    public _canPerform(dataIndices: number[]) {
        let canPerform = false, showError = false;
        if (this._clipboardData.hasData()) {
            canPerform = true;
        }
        if (!canPerform && showError) {
            alert(Resources.BulkEditPasteError);
        }
        return canPerform;
    }

    public paste(dataIndices: number[], e?: any) {
        let errorOccured: boolean = false,
            rowViewModelCount: number,
            onPasteComplete: (command: string, affectedRowIndices: number[]) => void,
            dataSource: RowViewModel = this._datasetviewmodel.getDataSource(),
            selectedRowViewModel: RowViewModel = dataSource[dataIndices[0]],
            affectedRowIndices: number[] = [],
            pasteRowIndex: number,
            rowViewModels: RowViewModel[],
            columnCount: number,
            diff: number,
            i: number;

        errorOccured = this._setClipboardDataIfChanged(e);
        if (errorOccured) {
            return false;
        }
        if (this._canPerform(dataIndices)) {
            Diag.logVerbose("[DataSetGrid.ClipboardAction._copyToClipboard] Started pasting data from clipboard");
            rowViewModels = this._clipboardData.getData();
            rowViewModelCount = rowViewModels.length;
            columnCount = this._datasetviewmodel.getColumnNames().length;

            onPasteComplete = (command: string, affectedRowIndices: number[]) => {
                Diag.logVerbose("[DataSetGrid.ClipboardAction._copyToClipboard] Completed pasting data from clipboard");
                if (this._datasetviewmodel.updated) {
                    this._datasetviewmodel.updated(command, affectedRowIndices);
                }
            };

            if (selectedRowViewModel.isBlankRow()) {
                pasteRowIndex = dataIndices[0] - 1;
            } else {
                pasteRowIndex = dataIndices[0];
            }

            for (i = 0; i < rowViewModelCount; i++) {
                affectedRowIndices.push(pasteRowIndex + i + 1);
                while (columnCount < rowViewModels[i].paramValues.length) {
                    this._datasetviewmodel._appendEmptyColumn();
                    columnCount++;
                }
                this._datasetviewmodel.insertRow(pasteRowIndex + i + 1, 1, rowViewModels[i], true);
            }

            onPasteComplete(EditableGrid.EditableGrid.Commands.CMD_INSERT_ROW, affectedRowIndices);
            this._datasetviewmodel.setIsDirty(true);
            return true;
        }
        return false;
    }

    private _setClipboardDataIfChanged(e?: any): boolean {
        let clipboardData, currentClipboardDataText, newClipboardDataText;

        if (e && e.clipboardDataText) {
            newClipboardDataText = e.clipboardDataText;
        } else if ((<any>window).clipboardData) {
            newClipboardDataText = (<any>window).clipboardData.getData("Text");
        } else if (e) {
            newClipboardDataText = e.originalEvent.clipboardData.getData("Text");
        }
        clipboardData = this._clipboardData.getClipboardDataFromPlainText(newClipboardDataText);
        if (clipboardData === null) {
            return true;
        }
        this._clipboardData.setData(clipboardData.getData());
        return false;
    }
}

export class ClipboardDataInfo {
    constructor(gridColumns: any[]) {
        this._gridColumns = gridColumns;
    }

    public getData() {
        return this._clipboardData.slice(0);
    }

    public setData(data: RowViewModel[]) {
        this._clipboardData = data;
    }

    public hasData(): boolean {
        return this._clipboardData && this._clipboardData.length > 0;
    }

    public toPlainText(rowViewModels: RowViewModel[]): string {
        let a: string[] = [];
        rowViewModels.forEach(function (r) {
            a.push(r.paramValues.join("\t"));
        });
        return a.join("\r\n");
    }

    public getClipboardDataFromPlainText(clipboardData: any) {
        let rowViewModels: RowViewModel[] = [],
            rowViewModel: RowViewModel,
            hasIdColumn: boolean = false,
            length: number,
            i: number,
            clipboardDataInfo: ClipboardDataInfo,
            clipboardDataRows: string[],
            clipboardDataRow: string;

        Diag.logVerbose("[ClipboardDataInfo.getClipboardDataFromPlainText] clipboardText = " + clipboardData);
        if (clipboardData) {
            clipboardDataRows = clipboardData.split("\r\n");
            length = clipboardDataRows.length;
            if (length > 201) {
                alert(Resources.ClipboardDataPasteInChunks);
                return null;
            }

            for (i = 0; i < length; i++) {
                if (clipboardDataRows[i] !== "") {
                    rowViewModel = this._createRowViewModelFromClipboardText(clipboardDataRows[i]);
                    if (!rowViewModel) {
                        alert(Resources.ClipboardDataInvalidFormat);
                        return null;
                    }
                    else {
                        rowViewModels.push(rowViewModel);
                    }
                }
            }
            clipboardDataInfo = new ClipboardDataInfo(this._gridColumns);
            clipboardDataInfo.setData(rowViewModels);
            return clipboardDataInfo;
        }
        else {
            return null;
        }
    }

    private _createRowViewModelFromClipboardText(clipboardRowText: string): RowViewModel {
        let clipboardRowColumns: string[],
            rowViewModel: RowViewModel = new RowViewModel(),
            columnName: string,
            i: number,
            j: number,
            columnCount: number,
            rowCount: number;
        clipboardRowColumns = clipboardRowText.split("\t");
        rowCount = clipboardRowColumns.length;
        if (clipboardRowColumns) {
            for (i = 0; i < rowCount; i++) {
                if (clipboardRowColumns[i].search("\n") > 0) {
                    clipboardRowColumns[i] = clipboardRowColumns[i].replace(/\n/g, " ").substr(1, clipboardRowColumns[i].length - 2);
                }
            }
            rowViewModel.paramValues = clipboardRowColumns;
            return rowViewModel;
        } else {
            return null;
        }
    }
    private _clipboardData: RowViewModel[];
    private _gridColumns: any[];
}

VSS.classExtend(DatasetsView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(DatasetsView, ".test-hub-datasets-view");
