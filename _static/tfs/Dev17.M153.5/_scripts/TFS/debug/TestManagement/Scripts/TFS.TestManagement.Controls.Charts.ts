/// <reference types="jquery" />





import Charting = require("Charting/Scripts/TFS.Charting");
import Charting_Charts = require("Charting/Scripts/TFS.Charting.Charts");
import Charting_Editors = require("Charting/Scripts/TFS.Charting.Editors");
import Charting_Hosts = require("Charting/Scripts/TFS.Charting.Hosts");
import DataServices = require("Charting/Scripts/TFS.Charting.DataServices");

import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import TestManagementResources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Menus = require("VSS/Controls/Menus");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");

import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

let delegate = Utils_Core.delegate;
let TfsContext = TFS_Host_TfsContext.TfsContext;
let tfsContext = TfsContext.getDefault();
let getErrorMessage = VSS.getErrorMessage;

export class AuthoringChartMetadataProvider extends DataServices.ChartMetadataProvider {
    ///summary>
    /// This is the client side metadata provider for test authoring reports.
    /// Augments the Metadata capabilities of Chart Service with local details from TCM service.
    /// All available "canSortBy" columns are allowed, unless they are explicitly marked as unsupported.
    ///
    /// Note: In general, Feature Charts can directly use the stock DataServices.ChartMetadataProvider
    /// implementation. For TCM authoring reports we need to display user defined fields too.
    ///</summary >
    private m_savedColumns: string[];

    constructor(providerIdentifier: string) {
        super(providerIdentifier);
    }

    public beginGetMetadata(callback, errorCallback?) {
        let wrappedAction = () => {
            TMUtils.TestCaseCategoryUtils.getAllTestCaseCategoryWorkItemFields(
                (witFields: WITOM.FieldDefinition[]) => {
                    this.m_savedColumns = witFields.map((field) => {
                        return field.referenceName;
                    });
                    callback.call(this);
                }, errorCallback);
        };
        super.beginGetMetadata(wrappedAction, errorCallback);
    }

    public getGroupableFields(): DataServices.INameLabelPair[] {
        let fields: DataServices.INameLabelPair[] = DataServices.DataServicesHelpers.FilterFields(super.getGroupableFields(), this.m_savedColumns);
        return $.map(fields, (item: DataServices.INameLabelPair): DataServices.INameLabelPair => {
            let date = "Date";
            if (item.name.substring(item.name.length - date.length) !== date) {
                return item;
            }
        });
    }

    public getAggregatableFields(): DataServices.INameLabelPair[] {
        let fields: DataServices.INameLabelPair[] = DataServices.DataServicesHelpers.FilterFields(super.getAggregatableFields(), this.m_savedColumns);
        return $.map(fields, (item: DataServices.INameLabelPair): DataServices.INameLabelPair => {
            let date = "Date";
            if (item.name.substring(item.name.length - date.length) !== date) {
                return item;
            }
        });
    }
}

export class TestExecutionChartEditorTooltipMap extends Charting_Editors.DefaultTooltipDecorator {
    public getConstraintTooltipText(constraintFieldName: string): string {
        //Only override the tooltips you need to.
        if (constraintFieldName === Charting_Editors.ConfigurationConstraintNames.groupBy) {
            return TestManagementResources.ChartEditor_TestExecution_GroupingTooltip;
        } else {
            return super.getConstraintTooltipText(constraintFieldName);
        }
    }
}

export class TestAuthoringChartEditorTooltipMap extends Charting_Editors.DefaultTooltipDecorator {
    public getConstraintTooltipText(constraintFieldName: string): string {
        //Only override the tooltips you need to.
        if (constraintFieldName === Charting_Editors.ConfigurationConstraintNames.groupBy) {
            return TestManagementResources.ChartEditor_TestAuthoring_GroupingTooltip;
        } else {
            return super.getConstraintTooltipText(constraintFieldName);
        }
    }
} 

export interface ITestManagementChartsView {
    //<summary>Describes a strongly typed contract of specific API's which controls outside the Charts View are expected to interact with.</summary>

    //Common TFS Control operations which don't have a minimal interface
    _bind(string, Delegate);
    _unbind(string, Delegate);
    executeCommand(command: any);
}

/**
 * Defines the shortcuts for the charts view
 */
export class TestChartsShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(private view: TestManagementChartsView) {
        super(TestManagementResources.TestShortcutGroupName);
        this.chartsView = view;

        this.registerShortcut(
            "c r",
            {
                description: TestManagementResources.ChartsViewTestResultChartKeyboardShortcutText,
                action: () => this.chartsView.showChart(TestManagementChartsView._newExecutionChartCommand)
            });
        this.registerShortcut(
            "c t",
            {
                description: TestManagementResources.ChartsViewTestCaseChartKeyboardShortcutText,
                action: () => this.chartsView.showChart(TestManagementChartsView._newAuthoringChartCommand)
            });
    }

    private chartsView: TestManagementChartsView;
}

export class TestManagementChartsView extends Controls.BaseControl implements ITestManagementChartsView {
    //<summary>TestManagement Charts View is a view management container control, with affinity to the authoring and exectution charts menu items on the Test Management page under Charts tab.</summary >

    public static statusUpdate: string = "statusUpdate";
    public static commandStatusChanged: string = "commandStatusChanged";
    private static _typeName: string = "tfs.tcm.TestManagementChartsView";

    // Within the store, the group key uniquely describes a group of charts within a given scope
    private static _TestReportConfigurationScope: string = Charting.ChartProviders.testReports;
    private static _AuthoringMetadataConfigurationScope: string = Charting.ChartProviders.testAuthoringMetadata;

    public static _refreshCommand: string = "refresh-charts";
    public static _newChartCommand: string = "new-chart";
    public static _newExecutionChartCommand: string = "new-execution-chart";
    public static _newAuthoringChartCommand: string = "new-authoring-chart";

    // Charts in this view rendered from two sources, Test Results for Execution and Test Case (WIT) for Authoring
    public static _chartDataSourceExecution: string = "execution";
    public static _chartDataSourceAuthoring: string = "authoring";

    public chartsShortcutGroup: TestChartsShortcutGroup;

    private _commandName: string;
    private _chartListToolbar: TestManagementChartsToolbar;
    private _chartsList: Charting_Hosts.ChartHostsList;
    
    private _defaultChartDataSource = TestManagementChartsView._chartDataSourceExecution;
    private _defaultGroupByOption = "Outcome";

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "testmanagement-charts-view",
        }, options));
    }

    public initialize() {
        Diag.logTracePoint("TestManagementChartsView.initialize.start");

        let $button: JQuery,
            $list: JQuery,
            that: TestManagementChartsView = this,
            chartsListSettings;

        this._chartListToolbar = <TestManagementChartsToolbar>Controls.BaseControl.createIn(TestManagementChartsToolbar, this._element, {
            cssClass: "testmanagement-charts-toolbar",
            tfsContext: this._options.tfsContext
        });

        this._chartListToolbar.bind(this);

        let chartHostListSettings: Charting_Hosts.IChartHostListSettings = {
            viewIsReady: () => {
                return true;
            },
            canAddToDashboard: () => {
                return true;
            },
            canEditCharts: () => {
                return true;
            },
            canDeleteCharts: () => {
                return true;
            },
            canShowCharts: () => {
                return true;
            },
            canCreateNewChart: () => {
                return true;
            },
            getConfigurationGroupKey: () => {
                return this.getGroupKey();
            },
            getConfigurationScope: () => {
                return Charting.ChartProviders.testReports;
            },
            getFilterContext: () => {
                return { projectId: this._options.project.id };
            },
            getEmptyChartMessage: () => {
                switch (TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring)) {
                    case TFS_Server_WebAccess_Constants.FeatureMode.Advertising:
                        return TestManagementResources.NoLicenseHostedEmptyQueryChartList;

                    case TFS_Server_WebAccess_Constants.FeatureMode.Licensed:
                    case TFS_Server_WebAccess_Constants.FeatureMode.Trial:
                        return Utils_String.format(TestManagementResources.EmptyQueryChartList, Utils_String.htmlEncode(this._options.suite.title));

                    case TFS_Server_WebAccess_Constants.FeatureMode.Off:
                        return TestManagementResources.NoLicenseEmptyQueryChartList;
                }
            },
            getChartsSuppressedMessage: () => {
                let message = "",
                    errorType: string = "";

                return message;
            },
            editChart: (configuration, onConfigurationUpdated: Charting_Editors.IChartEditCallback) => {
                this._showChartDialog(configuration, (chartState: Charting_Charts.IChartState): void => {
                    onConfigurationUpdated(chartState);
                });
            }
        };

        let createChartList = () => {
            this._chartsList = <Charting_Hosts.ChartHostsList>Controls.BaseControl.createIn(Charting_Hosts.ChartHostsList, this._element, {
                cssClass: "chart-hosts-list",
                tfsContext: this._options.tfsContext,
                chartHostListSettings: chartHostListSettings
            });
            this.setFilterContext(this._options.plan, this._options.suite);
        };

        createChartList();
        Diag.logTracePoint("TestManagementChartsView.initialize.exit");
    }

    public showChart(chartType: string) {
        let chartDataSource: string;

        if (chartType === TestManagementChartsView._newAuthoringChartCommand) {
            chartDataSource = TestManagementChartsView._chartDataSourceAuthoring;
            Diag.logTracePoint("TestManagementChartsView.executeCommand._newAuthoringChartCommand");
        }
        if (chartType === TestManagementChartsView._newExecutionChartCommand) {
            chartDataSource = TestManagementChartsView._chartDataSourceExecution;
            Diag.logTracePoint("TestManagementChartsView.executeCommand._newExecutionChartCommand");
        }

        if (chartDataSource && chartDataSource !== "") {
            this._showChartDialog(this._createChartConfiguration(chartDataSource), (chartState: Charting_Charts.IChartState) => {
                this._chartsList.addChart(chartState);
            });
        }
    }

    private getGroupKey() {
        if (!this._options ||
            !this._options.suite) {
            // show no charts till delegate refreshes chartshostlist with the right suiteid group
            return 0;
        }
        return this._options.suite.id;
    }

    public setFilterContext(plan: any, suite: any) {
        Diag.logVerbose("[setFilterContext] setFilterContext method called");
        if (this._options && plan && suite) {
            this._options.suite = suite;
            this._options.plan = plan;
            this._options.project = this._options.tfsContext.contextData.project;

            if (this._chartsList) {
                // We will show default charts only for Test Plan node.
                if (this._isTestPlanNode(this._options.suite)) {
                    // Adds chart if no other charts are present
                    // _beginAddDefaultCharts will also begin refresh of the page
                    this._beginAddDefaultCharts();
                }
                else {
                    // No need to default chart, refresh the current chart list 
                    this._chartsList.beginRefresh();
                }
            }
        }
        Diag.logVerbose("[setFilterContext] setFilterContext method exit");
    }

    public getStatusText(): string {
        //Status messaging is not currently integrated - Host has role to play in policy. 
        //Moving that responsability from host-list to view will resolve this.
        return "";
    }
    
    private _updateStatus(error: any) {
        this._fire(TestManagementChartsView.statusUpdate, [error || "", error ? true : false]);
        this._fire(TestManagementChartsView.commandStatusChanged, [error || "", error ? true : false]);
    }

    public executeCommand(command: any) {
        Diag.logTracePoint("TestManagementChartsView.executeCommand.start");
        this._commandName = command.get_commandName();

        // Checking to see if the command we can handle is executed
        switch (this._commandName) {
            case TestManagementChartsView._refreshCommand:
                this._chartsList.beginRefresh();
                Diag.logTracePoint("TestManagementChartsView.executeCommand._refreshCommand");
                return false;
            case TestManagementChartsView._newChartCommand:
                Diag.logTracePoint("TestManagementChartsView.executeCommand._newChartCommand");
                return true;
            case TestManagementChartsView._newExecutionChartCommand:
                this._showChartDialog(this._createChartConfiguration(TestManagementChartsView._chartDataSourceExecution), (chartState: Charting_Charts.IChartState) => {
                        this._chartsList.addChart(chartState);
                });
                Diag.logTracePoint("TestManagementChartsView.executeCommand._newExecutionChartCommand");
                return true;
            case TestManagementChartsView._newAuthoringChartCommand:
                this._showChartDialog(this._createChartConfiguration(TestManagementChartsView._chartDataSourceAuthoring), (chartState: Charting_Charts.IChartState) => {
                    this._chartsList.addChart(chartState);
                });
                Diag.logTracePoint("TestManagementChartsView.executeCommand._newAuthoringChartCommand");
                return true;
        }
        Diag.logTracePoint("TestManagementChartsView.executeCommand.exit");
    }

    private _getTestChartsTransformOptions(chartDataSource: string, groupByString?: string): DataServices.ITransformOptions {
        if (!groupByString) {
            groupByString = "";
    }

        return {
            filter: Utils_String.format("planId={0}&suiteId={1}&chartDataSource={2}", this._options.plan.id, this._options.suite.id, chartDataSource),
            groupBy: groupByString,
            orderBy: {
                direction: DataServices.OrderDirection.descending,
                propertyName: DataServices.OrderProperty.useValue,
            },
            measure: {
                aggregation: DataServices.AggregationFunction.count,
                propertyName: "Tests", //Count Aggregation does not use any property data
            },
            filterContext: { projectId: this._options.project.id }
        };
    }

    private _createChartConfiguration(chartDataSource: string, groupByString?: string): DataServices.IChartConfiguration {
        ///<summary>packs up the minimum configuration state needed so new chart dialog can customize settings for persistence.</summary>
        let transformOptions = this._getTestChartsTransformOptions(chartDataSource, groupByString);

        //Configure a new Configuration using a snap of current settings.
        return {
            scope: TestManagementChartsView._TestReportConfigurationScope,
            groupKey: this.getGroupKey(),
            title: Utils_String.format(PresentationResources.DefaultChartName, this._options.suite.title),
            chartType: Charting_Charts.ChartTypes.pieChart,
            transformOptions: transformOptions
        };
    }

    private _showChartDialog(chartConfiguration: DataServices.IChartConfiguration, onOk: Charting_Editors.IChartEditCallback): void {
        let that: TestManagementChartsView = this;
        Diag.logTracePoint("TestManagementChartsView._showChartDialog.started");
        let _currentMetadataProvider: DataServices.IChartMetadataProvider = null;
        let _chartTemplate: Charting_Editors.ChartTemplateItem[] = null;

        let templateGenerator = new Charting_Editors.ChartTemplateGenerator();

        // Editing existing chart
        if (chartConfiguration.transformOptions.filter.indexOf(TestManagementChartsView._chartDataSourceAuthoring) > -1) {
            _currentMetadataProvider = new AuthoringChartMetadataProvider(TestManagementChartsView._AuthoringMetadataConfigurationScope);
            _chartTemplate = templateGenerator.getAllTemplates(new TestAuthoringChartEditorTooltipMap()); 
        }
        else if (chartConfiguration.transformOptions.filter.indexOf(TestManagementChartsView._chartDataSourceExecution) > -1) {
            _currentMetadataProvider = new DataServices.ChartMetadataProvider(TestManagementChartsView._TestReportConfigurationScope);
            _chartTemplate = templateGenerator.getSnapshotTemplates(new TestExecutionChartEditorTooltipMap());         
        }
        else {
            // New Chart Config Scneario
            switch (this._commandName) {
                case TestManagementChartsView._newExecutionChartCommand:
                    _currentMetadataProvider = new DataServices.ChartMetadataProvider(TestManagementChartsView._TestReportConfigurationScope);
                    _chartTemplate = templateGenerator.getSnapshotTemplates(new TestExecutionChartEditorTooltipMap());
                    break;
                case TestManagementChartsView._newAuthoringChartCommand:
                    _currentMetadataProvider = new AuthoringChartMetadataProvider(TestManagementChartsView._AuthoringMetadataConfigurationScope);
                    _chartTemplate = templateGenerator.getAllTemplates(new TestAuthoringChartEditorTooltipMap());
                    break;
            }
        }

        //Size the dialog in to accomodate provided content
        let dialogHeight = _chartTemplate.length == 6 ? Charting_Editors.ChartConfigurationDialog.MIN_DIALOG_HEIGHT : Charting_Editors.ChartConfigurationDialog.DEFAULT_DIALOG_HEIGHT;
        let dialog = Dialogs.show(Charting_Editors.ChartConfigurationDialog, {
            tfsContext: this._options.tfsContext,
            chartDataProvider: DataServices.ChartQueryEngine,
            chartMetadataProvider: _currentMetadataProvider,
            chartTemplates: _chartTemplate,
            getFilterContext: () => {
                return {
                    projectId: this._options.project.id
                };
            },
            chartConfiguration: chartConfiguration,
            okCallback: (chartState: Charting_Charts.IChartState): void => {
                Diag.logTracePoint("TestManagementChartsView._showChartDialog.Ok");
                onOk(chartState);
            },
            height: dialogHeight
        });
    }

    private _isQueryDirty(): Boolean {
        ///<summary>Indicates if the query is in a dirty state.</summary>
        return false;
    }

    private _beginAddDefaultCharts() {
        Diag.logTracePoint("TestManagementChartsView._beginAddDefaultCharts.started");
        // Check if charts are already present, if yes, then do not add any new chart. If no, then add a default chart.
        this._beginCheckAvailableConfigurations(() => {
            this._beginGetDefaultExecutionSnapshotChartState((chartState: Charting_Charts.IChartState) => {
                if (chartState && this._chartsList) {
                    this._chartsList.addChart(chartState);
                    this._chartsList.beginRefresh();        // Execute refresh so that chart pane reaches a consistent state.
                }
            });
        });
        Diag.logTracePoint("TestManagementChartsView._beginAddDefaultCharts.exit");
    }

    private _beginGetDefaultExecutionSnapshotChartState(resultCallback?: (chartState: Charting_Charts.IChartState) => void, errorCallBack?: IErrorCallback): void {
        this._beginGetDefaultConfiguration((resultConfiguration) => {
            this._beginGetDefaultChartData((result) => {
                resultCallback({
                    configuration: resultConfiguration,
                    results: result
                });
            }, errorCallBack);
        }, errorCallBack);
    }

    private _beginGetDefaultChartData(resultCallback?: (chartData: DataServices.IDataTable) => void, errorCallBack?: IErrorCallback): void {
        let chartDataProvider = DataServices.ChartQueryEngine;
        let transformOptions = this._getTestChartsTransformOptions(this._defaultChartDataSource, this._defaultGroupByOption);

        if (chartDataProvider) {
            chartDataProvider.beginPostDataQuery(
                this._options.tfsContext.contextData.project.id,
                TestManagementChartsView._TestReportConfigurationScope,
                [transformOptions],
                (results: DataServices.IDataTable[]) => {
                    resultCallback(results[0]);
                }, (error) => {
                    errorCallBack(error);
                });
        }
    }

    private _beginGetDefaultConfiguration(resultCallback?: (resultConfiguration: DataServices.IChartConfiguration) => void, errorCallback?: IErrorCallback): void {
        let defaultConfiguration: DataServices.IChartConfiguration;
        defaultConfiguration = this._createChartConfiguration(this._defaultChartDataSource, this._defaultGroupByOption);
        DataServices.ChartConfigStore.beginSaveNewChartConfiguration(this._options.tfsContext.contextData.project.id, defaultConfiguration, resultCallback, errorCallback);
    }

    private _isTestPlanNode(suite: any): boolean {
        if (suite && suite.parentSuiteId === 0) {
            return true;
        }
        else {
            return false;
        }
    }

    private _beginCheckAvailableConfigurations(resultCallback?: IResultCallback, errorCallback?: IErrorCallback): void {
        DataServices.ChartConfigStore.beginGetChartConfigurationsInGroup(
            this._options.tfsContext.contextData.project.id, 
            TestManagementChartsView._TestReportConfigurationScope,
            this.getGroupKey(),
            (chartConfigurations) => {
                if (chartConfigurations.length === 0) {
                    // Since no chart configuration exists for this scope, we will add new configuration for default chart
                    resultCallback();
                }
                else {
                    // get charts view to a consistent state
                    // todo: refactor to call the callback always 
                    this._chartsList.beginRefresh();
                }
            }, errorCallback);
    }

    public deleteChart(planId: number, suiteId: number) {
        let chartHosts: Charting_Hosts.ChartHost[],
            filter: string;

        // Delete all Execution charts
        filter = Utils_String.format("planId={0}&suiteId={1}&chartDataSource={2}", planId, suiteId, TestManagementChartsView._chartDataSourceExecution);
        chartHosts = this._chartsList.getChartHostListByFilter(filter);
        for (let i = 0, len = chartHosts.length; i < len; i++) {
            this._deleteChart(chartHosts[i]);
        }

        // Delete all authoring charts
        filter = Utils_String.format("planId={0}&suiteId={1}&chartDataSource={2}", planId, suiteId, TestManagementChartsView._chartDataSourceAuthoring);
        chartHosts = this._chartsList.getChartHostListByFilter(filter);
        for (let i = 0, len = chartHosts.length; i < len; i++) {
            this._deleteChart(chartHosts[i]);
        }
    }

    private _deleteChart(chartHost: Charting_Hosts.ChartHost) {
        this._chartsList.deleteChart(chartHost);
    }
}

VSS.initClassPrototype(TestManagementChartsView, {
    _gridInfoBar: null,
    _chartListToolbar: null,
    _splitter: null,
    _chartsList: null
});

Controls.Enhancement.registerEnhancement(TestManagementChartsView, ".testmanagement-charts-view");

export class TestManagementChartsInfoBar extends Controls.BaseControl {
    ///<summary>Presents the Chart Title and renders loadingstatus</summarY>

    private static _typeName: string = "tfs.tcm.testManagementChartsInfoBar";

    private _view: any;
    private _$elementsContainer: any;
    private _statusIndicator: any;
    private _$titleElement: any;
    private _updateDelegate: any;

    constructor(options?) {
        super(options);

        this._updateDelegate = delegate(this, this._update);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "testManagement-charts-info-bar",
        }, options));
    }

    public initialize() {
        super.initialize();
    }

    public dispose() {
        this.unbind();

        super.dispose();
    }

    public bind(view: ITestManagementChartsView) {
        let $parentContainer, $statusAndTitleCell;

        this._view = view;
        this._view._bind(TestManagementChartsView.statusUpdate, this._updateDelegate);

        $parentContainer = $("<table />").attr("cellpadding", "0").appendTo(this._element);
        this._$elementsContainer = $("<tr />").appendTo($parentContainer);

        $statusAndTitleCell = $("<td />").addClass("charts-title").appendTo(this._$elementsContainer);
        this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $statusAndTitleCell, {
            eventTarget: view
        });
        this._$titleElement = $("<span />").appendTo($statusAndTitleCell);

        this._update(this._view, this._view.getStatusText());
    }

    public unbind() {
        if (this._view) {
            this._view._unbind(TestManagementChartsView.statusUpdate, this._updateDelegate);
            this._view = null;
        }

        this._$titleElement.text("");
        this.getElement().toggleClass("invalid", false);
    }

    private _update(sender: any, status: any, statusIsError?: boolean) {
        /// <param name="sender" type="any" />
        /// <param name="status" type="any" />
        /// <param name="statusIsError" type="boolean" optional="true" />

        let name = null;

        this.getElement().toggleClass("invalid", statusIsError === true);

            this._$titleElement.empty();
        }
    }

VSS.initClassPrototype(TestManagementChartsInfoBar, {
    _view: null,
    _$elementsContainer: null,
    _statusIndicator: null,
    _$titleElement: null,
    _updateDelegate: null
});

export class TestManagementChartsToolbar extends Controls.BaseControl {

    private static _typeName: string = "tfs.tcm.TestManagementChartsToolbar";

    private _view: ITestManagementChartsView;
    private _menuBar: Menus.MenuBar;
    private _updateDelegate: any;

    constructor(options?) {
        super(options);

        this._updateDelegate = delegate(this, this._update);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "toolbar testmanagement-charts-toolbar"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._menuBar = this._createMenuBar(this._element);
    }

    public dispose() {
        this.unbind();

        super.dispose();
    }

    public bind(view: ITestManagementChartsView) {
        this._view = view;
        this._view._bind(TestManagementChartsView.commandStatusChanged, this._updateDelegate);

        this._updateMenuItems();
    }

    public unbind() {
        if (this._view) {
            this._view._unbind(TestManagementChartsView.commandStatusChanged, this._updateDelegate);
            this._view = null;
        }
    }

    private _updateMenuItems() {
        this.delayExecute("updateMenuItems", 250, false, delegate(this, this._updateMenuItemsNow));
    }

    public _updateMenuItemsNow() {
        let menuItemStates = [];

        if (this._view) {
            menuItemStates = this.getCommandStates();
        }

        this._menuBar.updateCommandStates(menuItemStates);
    }

    private _createMenuBar($containerElement): Menus.MenuBar {
        let menuBar: Menus.MenuBar;

        menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $containerElement, {
            items: this._createMenubarItems(),
            executeAction: Utils_Core.delegate(this, this._onMenubarItemClick)
        });
        return menuBar;
    }

    private _createNewReportingSubMenuItems(): any[] {
        let items: any[] = [];

        items.push({ id: TestManagementChartsView._newAuthoringChartCommand, text: this._getNewAuthoringChartText(), showText: true, icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small" });
        items.push({ id: TestManagementChartsView._newExecutionChartCommand, text: this._getNewExecutionChartText(), showText: true, icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small" });
        return items;
    }

    private _getNewText(): string {
        if (TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring) < TFS_Server_WebAccess_Constants.FeatureMode.Licensed) {
            return Utils_String.format("{0}{1}", TestManagementResources.NewText, VSS_Resources_Common.Asterix);
        } else {
            return TestManagementResources.NewText;
        }
    }

    private _getNewExecutionChartText(): string {
        if (TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring) < TFS_Server_WebAccess_Constants.FeatureMode.Licensed) {
            return Utils_String.format("{0}{1}", TestManagementResources.NewChartDropdownExecution, VSS_Resources_Common.Asterix);
        } else {
            return TestManagementResources.NewChartDropdownExecution;
        }
    }

    private _getNewAuthoringChartText(): string {
        if (TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring) < TFS_Server_WebAccess_Constants.FeatureMode.Licensed) {
            return Utils_String.format("{0}{1}", TestManagementResources.NewChartDropdownAuthoring, VSS_Resources_Common.Asterix);
        } else {
            return TestManagementResources.NewChartDropdownAuthoring;
        }
    }

    private _createMenubarItems(): any[] {
        let items = [];
        let chartAuthoringFeatureMode = TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring);

        if (chartAuthoringFeatureMode >= TFS_Server_WebAccess_Constants.FeatureMode.Trial) {
            items.push({
                id: TestManagementChartsView._newChartCommand,
                text: this._getNewText(),
                showText: true,
                icon: "bowtie-icon bowtie-math-plus-heavy bowtie-icon-small",
                childItems: this._createNewReportingSubMenuItems()
            });
        }
        items.push({ id: TestManagementChartsView._refreshCommand, title: Resources.RefreshTooltip, showText: false, icon: "bowtie-icon bowtie-navigate-refresh" });

        return items;
    }

    public _onMenubarItemClick(command) {
        if (this._view) {
            return this._view.executeCommand(command);
        }
    }

    public getCommandStates(): Menus.ICommand[] {
        return [
            {
                id: TestManagementChartsView._newChartCommand,
                disabled: false
            },
            {
                id: TestManagementChartsView._newExecutionChartCommand,
                disabled: false
            },
            {
                id: TestManagementChartsView._newAuthoringChartCommand,
                disabled: false
            },
            {
                id: TestManagementChartsView._refreshCommand,
                disabled: false
            }];
    }

    private _update(sender: any, status: any, statusIsError?: boolean) {
        /// <param name="sender" type="any" />
        /// <param name="status" type="any" />
        /// <param name="statusIsError" type="boolean" optional="true" />

        this._updateMenuItemsNow();
    }
}

VSS.initClassPrototype(TestManagementChartsToolbar, {
    _view: null,
    _menuBar: null,
    _updateDelegate: null
});

VSS.classExtend(TestManagementChartsToolbar, TfsContext.ControlExtensions);

// TFS plugin model requires this call for each tfs module. 
VSS.tfsModuleLoaded("TFS.TestManagement.Controls.Charts", exports);

