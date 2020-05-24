/// <reference types="jquery" />

import { QueryType } from "TFS/WorkItemTracking/Contracts";
import { LinkQueryMode } from "WorkItemTracking/Scripts/OM/QueryConstants";
import { IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { renderZeroDataCharts, unmountZeroDataComponent, ZeroDataChartType } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/TriageHubZeroDataUtils";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import DataServices = require("Charting/Scripts/TFS.Charting.DataServices");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import Dialogs = require("VSS/Controls/Dialogs");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Menus = require("VSS/Controls/Menus");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Telemetry = require("VSS/Telemetry/Services");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");

import WorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import Charting = require("Charting/Scripts/TFS.Charting");
import Charting_Charts = require("Charting/Scripts/TFS.Charting.Charts");
import Charting_Editors = require("Charting/Scripts/TFS.Charting.Editors");
import Charting_Hosts = require("Charting/Scripts/TFS.Charting.Hosts");

const delegate = Utils_Core.delegate;
const TfsContext = TFS_Host_TfsContext.TfsContext;
const tfsContext = TfsContext.getDefault();

export class WITClientChartMetadataProvider implements DataServices.IChartMetadataProvider {
    /// summary>Augments the Metadata capabilities of Chart Service with local details from WIT Query Results Provider.
    /// All available "canSortBy" columns are allowed, unless they are explicitly marked as unsupported.
    ///
    /// Note: In general, Feature Charts can directly use the stock DataServices.ChartMetadataProvider
    /// implementation. WIT is a special case, due to column filtering being driven by the active query settings.
    /// </summary >
    private _queryResultsProvider: WorkItemsProvider.QueryResultsProvider;
    private _serverMetadataProvider: DataServices.IChartMetadataProvider = null;

    constructor(queryResultsProvider: WorkItemsProvider.QueryResultsProvider) {
        this._queryResultsProvider = queryResultsProvider;
        this._serverMetadataProvider = new DataServices.ChartMetadataProvider(Charting.ChartProviders.witQueries);
    }

    public beginGetMetadata(callback, errorCallback?) {
        // We need to perform the QueryResults action in general.
        const wrappedAction = () => {
            this._queryResultsProvider.beginGetResults(callback, errorCallback);
        };

        this._serverMetadataProvider.beginGetMetadata(wrappedAction, errorCallback);
    }

    public getRangeOptions(): DataServices.INameLabelPair[] {
        return this._serverMetadataProvider.getRangeOptions();
    }

    public getGroupableFields(): DataServices.INameLabelPair[] {
        return this._filterFieldsByQuery(this._serverMetadataProvider.getGroupableFields());
    }

    public getPluralArtifactName(): string {
        return this._serverMetadataProvider.getPluralArtifactName();
    }

    public getAggregatableFields(): DataServices.INameLabelPair[] {
        return this._filterFieldsByQuery(this._serverMetadataProvider.getAggregatableFields());
    }

    public getNumericalAggregationFunctions(): DataServices.INameLabelPair[] {
        return this._serverMetadataProvider.getNumericalAggregationFunctions();
    }

    private _filterFieldsByQuery(serverFields: DataServices.INameLabelPair[]): DataServices.INameLabelPair[] {
        /// <summary>WIT Query Charts only support fields exposed by the relevant Query.
        /// This method filters out any which are not present, out of the master list.</summary>
        this._throwOnUninitializedProvider();
        const localColumns = this._queryResultsProvider.queryResultsModel.columns,
            fieldNamesInQuery: string[] = $.map(localColumns, (item: DataServices.INameLabelPair): string => {
                return item.name;
            });
        return $.map(serverFields, (item: DataServices.INameLabelPair): DataServices.INameLabelPair => {
            if (fieldNamesInQuery.indexOf(item.name) >= 0) {
                return item;
            }
        });
    }
    private _throwOnUninitializedProvider() {
        if (typeof this._queryResultsProvider === "undefined" ||
            typeof this._queryResultsProvider.queryResultsModel === "undefined") {
            throw new Error(PresentationResources.ChartService_ColumnsUnavailable);
        }
    }
}

export class QueryChartEditorTooltipMap extends Charting_Editors.DefaultTooltipDecorator {
    public getConstraintTooltipText(constraintFieldName: string): string {
        // Only override the tooltips you need to.
        if (constraintFieldName == Charting_Editors.ConfigurationConstraintNames.groupBy) {
            return Resources.ChartEditor_Query_GroupingTooltip;
        } else {
            return super.getConstraintTooltipText(constraintFieldName);
        }
    }
}


export interface IQueryChartsView {
    // <summary>Describes a strongly typed contract of specific API's which controls outside the Charts View are expected to interact with.</summary>

    // Common TFS Control operations which don't have a minimal interface
    _bind(string, Delegate);
    _unbind(string, Delegate);
    executeCommand(command: any);

    viewIsReady(): Boolean;
    canShowCharts(): Boolean;
    canEditCharts(): Boolean;
    canDeleteCharts(): Boolean;
    canCreateNewChart(): Boolean;

    canAddToDashboard(): Boolean;
}

interface AdvertisementDialogOptions extends Dialogs.IModalDialogOptions {
    contentUrl?: string;
}

class AdvertisementDialog extends Dialogs.ModalDialogO<AdvertisementDialogOptions> {

    private _iFrameControl: TFS_Controls_Common.IFrameControl;
    constructor(options?) {

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        Diag.Debug.assertIsNotNull(options);
        Diag.Debug.assertIsNotNull(options.contentUrl);

        super.initializeOptions($.extend({
            resizable: false,
            cssClass: "advertisement-dialog",
            buttons: {
                "ok": {
                    id: "ok",
                    text: VSS_Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this.onCancelClick)
                }
            }
        }, options));
    }

    public initialize() {
        super.initialize();
        this._iFrameControl = <TFS_Controls_Common.IFrameControl>Controls.BaseControl.createIn(TFS_Controls_Common.IFrameControl, this._element, { contentUrl: this._options.contentUrl });
        this.updateOkButton(true);
    }
}

VSS.initClassPrototype(AdvertisementDialog, {
    _iFrameControl: null
});

export class QueryChartsView extends Controls.BaseControl implements IQueryChartsView {
    // <summary>Query Charts View is a view management container control, with affinity to the charts tab on the Work Items page.</summary >

    public static statusUpdate: string = "statusUpdate";
    public static commandStatusChanged: string = "commandStatusChanged";
    public static enhancementTypeName: string = "tfs.wit.queryChartsView";

    public static _refreshCommand: string = "refresh-charts";
    public static _newChartCommand: string = "new-chart";
    public static _advertiseChartAuthoring: string = "advertise-chart-authoring";

    private _chartListToolbar: QueryChartsToolbar;
    private _chartsList: Charting_Hosts.ChartHostsList;
    private _queryResultsProvider: WorkItemsProvider.QueryResultsProvider;
    private _zeroDataElement: JQuery;
    private _queriesHubContext: IQueriesHubContext;

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "query-charts-view",
        }, options));
    }

    public initialize() {
        let $button: JQuery,
            $list: JQuery,
            that: QueryChartsView = this,
            chartsListSettings;

        this._queryResultsProvider = this._options.workItemsProvider;
        this._queriesHubContext = this._options.queriesHubContext;

        this._zeroDataElement = $("<div>").addClass("query-charts-zero-data-container").appendTo(this._element);
        const chartHostListSettings: Charting_Hosts.IChartHostListSettings = {
            viewIsReady: () => {
                return this.viewIsReady();
            },
            canAddToDashboard: () => {
                return this.canAddToDashboard();
            },
            canEditCharts: () => {
                return this.canEditCharts();
            },
            canDeleteCharts: () => {
                return this.canDeleteCharts();
            },
            canShowCharts: () => {
                return this.canShowCharts();
            },
            canCreateNewChart: () => {
                return this.canCreateNewChart();
            },
            getConfigurationGroupKey: () => {
                return this.getGroupKey();
            },
            getConfigurationScope: () => {
                return Charting.ChartProviders.witQueries;
            },
            getFilterContext: () => {
                return {
                    projectId: this._queryResultsProvider.project.guid
                };
            },
            getEmptyChartMessage: () => {
                switch (TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring)) {
                    case TFS_Server_WebAccess_Constants.FeatureMode.Advertising:
                        return Resources.NoLicenseHostedEmptyQueryChartList;

                    case TFS_Server_WebAccess_Constants.FeatureMode.Licensed:
                    case TFS_Server_WebAccess_Constants.FeatureMode.Trial:
                        return Utils_String.format(Resources.EmptyQueryChartList, this._queryResultsProvider.queryDefinition.name);

                    case TFS_Server_WebAccess_Constants.FeatureMode.Off:
                        return Resources.NoLicenseEmptyQueryChartList;
                }
            },
            getChartsSuppressedMessage: () => {
                const queryMode: number = this._getQueryMode();
                let message = "";
                let errorType: string = "";
                if (!this.viewIsReady()) {
                    if (!this.queryExistsOnServer()) {
                        message = Resources.WorkItemChartsUnsavedQuery;
                        errorType = "UnsavedQuery";
                    } else {
                        message = Resources.WorkItemChartsPageNotReady;
                    }
                } else if (LinkQueryMode.isLinkQuery(queryMode) || LinkQueryMode.isTreeQuery(queryMode)) {
                    message = Resources.WorkItemChartsTreeQueryDisallowedMessage;
                    errorType = "HierarchicalQuery";
                } else if (queryMode !== LinkQueryMode.WorkItems) {
                    message = Resources.WorkItemChartsUnrecognizedQueryMessage;
                    errorType = "UnrecognizedQuery";
                } else if (this._isQueryDirty()) {
                    message = Resources.WorkItemChartsUnsavedQuery;
                    errorType = "UnsavedQuery";
                } else if (this._isUnsupportedAdhocQuery()) {
                    message = Resources.WorkItemChartsDisallowedAdhocQuery;
                    errorType = "AdhocQuery";
                } else {
                    Diag.Debug.fail("Invalid state. There is no known reason to suppress the charts page.");
                    errorType = "InvalidState";
                }

                return message;
            },
            editChart: (configuration, onConfigurationUpdated: Charting_Editors.IChartEditCallback) => {
                this._showChartDialog(configuration, (chartState: Charting_Charts.IChartState): void => {
                    onConfigurationUpdated(chartState);
                });
            },
            onRenderCompleted: (outcome: Charting_Hosts.ChartsRenderOutcome) => {
                if (outcome === Charting_Hosts.ChartsRenderOutcome.Success) {
                    unmountZeroDataComponent(this._zeroDataElement[0]);
                    this._chartsList.showElement();
                } else if (outcome === Charting_Hosts.ChartsRenderOutcome.Empty) {
                    this._renderZeroData(ZeroDataChartType.NewChart, () => {
                        this.newChart();
                    });
                } else {
                    const queryMode: number = this._getQueryMode();
                    if (!this.viewIsReady()) {
                        if (!this.queryExistsOnServer()) {
                            this._renderZeroData(ZeroDataChartType.UnsavedChart);
                        }
                    } else if (queryMode !== LinkQueryMode.WorkItems) {
                        this._renderZeroData(ZeroDataChartType.NotSupportedChart);
                    } else if (this._isQueryDirty() || this._isUnsupportedAdhocQuery()) {
                        this._renderZeroData(ZeroDataChartType.UnsavedChart);
                    } else {
                        Diag.Debug.fail("Invalid state. There is no known reason to suppress the charts page.");
                    }
                }
            }
        };

        const createChartList = () => {
            this._chartsList = <Charting_Hosts.ChartHostsList>Controls.BaseControl.createIn(Charting_Hosts.ChartHostsList, this._element, {
                cssClass: "chart-hosts-list",
                tfsContext: this._options.tfsContext,
                chartHostListSettings: chartHostListSettings
            });

            if (this._queryResultsProvider) {
                this.setProvider(this._queryResultsProvider);
            }
        };

        createChartList();
    }

    private _renderZeroData(zeroDataChartType: ZeroDataChartType, onClick?: Function) {
        renderZeroDataCharts(this._zeroDataElement[0], zeroDataChartType, onClick);
        this._chartsList.hideElement();
    }

    public dispose() {
        if (this._chartListToolbar) {
            this._chartListToolbar.dispose();
        }

        unmountZeroDataComponent(this._zeroDataElement[0]);
        super.dispose();
    }

    private getGroupKey(): string {
        return QueryUtilities.formatGroupKey(this._queryResultsProvider.queryDefinition.id, this._queryResultsProvider.queryDefinition.specialQuery, this._options.tfsContext.currentIdentity.id);
    }

    public setProvider(queryResultsProvider: WorkItemsProvider.QueryResultsProvider) {
        const isProviderChanged = this._queryResultsProvider !== queryResultsProvider;
        this._queryResultsProvider = queryResultsProvider;

        if (!this._chartsList) {
            return;
        }

        if (this.viewIsReady()) {
            this._updateStatus(this._queryResultsProvider.queryResultsModel.error);
            this._chartsList.beginRefresh();
        } else {
            this._queryResultsProvider.beginGetResults((queryResultModel: IQueryResult) => {
                if (!this._queryResultsProvider.queryDefinition.queryType) {
                    // nqe requires the query type to be set which is not populated for oqe.
                    this._queryResultsProvider.queryDefinition.queryType = QueryType[LinkQueryMode.getQueryType(queryResultModel.editInfo.mode)];
                    this._queriesHubContext.triageViewActionCreator.updateProvider(this._queryResultsProvider);
                }

                this._updateStatus(queryResultModel.error);
                this._chartsList.beginRefresh();
            }, (error) => {
                this._queriesHubContext.navigationActionsCreator.navigateToQueriesPage(false, true);
                this._queriesHubContext.actionsCreator.showErrorMessageForQueriesView((error.serverError || error).message);
            });

        }

        // Publish only when the provider changes
        if (isProviderChanged) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                CIConstants.WITCustomerIntelligenceFeature.QUERYCHARTS_NAVIGATE,
                {
                    "QueryId": this._queryResultsProvider.queryDefinition.id,
                    "QueryPath": this._queryResultsProvider.queryDefinition.storedPath,
                    "IsSharedQuery": !this._queryResultsProvider.queryDefinition.personal,
                },
                Date.now()));
        }
    }

    public getProvider(): WorkItemsProvider.QueryResultsProvider {
        return this._queryResultsProvider;
    }

    public getStatusText(): string {
        // Status messaging is not currently integrated - Host has role to play in policy.
        // Moving that responsability from host-list to view will resolve this.
        return "";
    }

    private _updateStatus(error: any) {
        this._fire(QueryChartsView.statusUpdate, [error || "", error ? true : false]);
        this._fire(QueryChartsView.commandStatusChanged, [error || "", error ? true : false]);
    }

    public executeCommand(command: any) {
        command = command.get_commandName();

        // Checking to see if the command we can handle is executed
        switch (command) {
            case QueryChartsView._refreshCommand:
                this.refreshCharts();
                return false;
            case QueryChartsView._newChartCommand:
                this.newChart();
                return true;
            case QueryChartsView._advertiseChartAuthoring:
                Dialogs.show(AdvertisementDialog, {
                    contentUrl: "https://go.microsoft.com/fwlink/?LinkId=322130",
                    title: PresentationResources.ConfigureChartDialogTitle,
                    width: Charting_Editors.ChartConfigurationDialog.DEFAULT_DIALOG_WIDTH,
                    height: Charting_Editors.ChartConfigurationDialog.DEFAULT_DIALOG_HEIGHT
                });
                return true;
        }
    }

    public newChart() {
        if (this.canCreateNewChart()) {
            // Charts Host List does not currently have context on what kind of chart we need to create.
            // The WIT Query view has responsiblity for this.
            this._showChartDialog(this._createChartConfiguration(), (chartState: Charting_Charts.IChartState) => {
                this._chartsList.addChart(chartState);
                Utils_Core.delay(this, 0, () => { this._chartsList.focusOnLastChart(); });
            });
        }
    }

    public refreshCharts() {
        if (this.canShowCharts()) {
            this._chartsList.beginRefresh();
        }
    }

    private _getQueryMode(): number {
        /// <summary>Indicates the LinkQueryMode state of the query Results Model. Charts can only allow flat WorkItems Queries.</summary>
        const queryMode = null;
        if (this._queryResultsProvider && this._queryResultsProvider.queryResultsModel) {
            return this._queryResultsProvider.queryResultsModel.editInfo.mode;
        } else {
            return LinkQueryMode.Unknown;
        }
    }

    private _isUnsupportedAdhocQuery(): Boolean {
        /// <summary>Indicates the QueryID is not indicative of a problematic special/Adhoc query variety which isn't detected elsewhere.</summary>
        const queryMode = null;
        if (this._queryResultsProvider && this._queryResultsProvider.queryDefinition) {
            const query = this._queryResultsProvider.queryDefinition;

            // Note: Assigned to Me Queries are the only special kind which are allowed.
            return QueryDefinition.isSearchResults(query);
        }
        return true;
    }

    public viewIsReady(): Boolean {
        return this.queryExistsOnServer() &&
            Boolean(this._queryResultsProvider.queryResultsModel);
    }

    public queryExistsOnServer(): Boolean {
        return (this._queryResultsProvider &&
            this._queryResultsProvider.queryDefinition &&
            this._queryResultsProvider.queryDefinition.id &&
            !Utils_String.isEmptyGuid(this._queryResultsProvider.queryDefinition.id) &&
            !QueryDefinition.isCustomWiqlQuery(this._queryResultsProvider.queryDefinition));
    }

    public canShowCharts(): Boolean {
        /// <summary>Indicates if charts can be used at all on the page.</summary>
        // If the query Results model is loaded, the user can create charts from a Flat Query
        const licensedToShow = TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartViewing);

        return (licensedToShow &&
            this.viewIsReady() &&
            this._getQueryMode() === LinkQueryMode.WorkItems &&
            !this._isUnsupportedAdhocQuery() &&
            !this._isQueryDirty());
    }

    public canCreateNewChart(): Boolean {
        /// <summary>Indicates if a chart can be created based on current state.</summary>

        return this.canShowCharts() &&
            TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring);
    }

    public canEditCharts(): Boolean {
        /// <summary>Indicates if a chart can be edited</summary>

        return this.canCreateNewChart();
    }

    public canDeleteCharts(): Boolean {
        /// <summary>Indicates if a chart can be deleted</summary>

        return this.canCreateNewChart();
    }

    public canAddToDashboard(): Boolean {
        /// <summary>Indicates if these charts can be pinned to homepage by the user.</summary>
        // disable pinning on personal queries and special queries ("Assigned to me" or "Unsaved work items")
        return !this._queryResultsProvider.queryDefinition.personal && !this._queryResultsProvider.queryDefinition.specialQuery;
    }

    private _createChartConfiguration(): DataServices.IChartConfiguration {
        /// <summary>packs up the minimum configuration state needed so new chart dialog can customize settings for persistence.</summary>
        const queryName = this._queryResultsProvider.getTitle(),
            queryId = this._queryResultsProvider.queryDefinition.id,
            transformOptions = {
                filter: queryId,
                groupBy: "",
                orderBy: {
                    direction: DataServices.OrderDirection.descending,
                    propertyName: DataServices.OrderProperty.useValue,
                },
                measure: {
                    aggregation: DataServices.AggregationFunction.count,
                    propertyName: "", // Count Aggregation does not use any property data
                }
            };
        // Configure a new Configuration using a snap of current settings.
        return {
            scope: Charting.ChartProviders.witQueries,
            groupKey: this.getGroupKey(),
            title: Utils_String.format(PresentationResources.DefaultChartName, queryName),
            chartType: Charting_Charts.ChartTypes.pieChart,
            transformOptions: transformOptions
        };
    }

    private _showChartDialog(chartConfiguration: DataServices.IChartConfiguration, onOk: Charting_Editors.IChartEditCallback): void {
        const that: QueryChartsView = this;
        Diag.logTracePoint("QueryChartsView._showChartDialog.started");
        const dialog = Dialogs.show(Charting_Editors.ChartConfigurationDialog, {
            tfsContext: that._options.tfsContext,
            canSaveEmptyChart: true,
            chartDataProvider: DataServices.ChartQueryEngine,
            chartMetadataProvider: new WITClientChartMetadataProvider(that._queryResultsProvider),

            chartTemplates: that._makeChartTemplates(),
            getFilterContext: () => {
                return {
                    projectId: this._queryResultsProvider.project.guid,
                };
            },
            chartConfiguration: chartConfiguration,
            okCallback: (chartState: Charting_Charts.IChartState): void => {
                Diag.logTracePoint("QueryChartsView._showChartDialog.Ok");
                onOk(chartState);
            }
        });
    }

    private _makeChartTemplates(): Charting_Editors.ChartTemplateItem[] {
        /// <summary>Populates the set of Chart Editing options for use with WIT Charting</summary>
        const templateGenerator: Charting_Editors.ChartTemplateGenerator = new Charting_Editors.ChartTemplateGenerator();
        // TODO: Via the server metadata Protocol, WIT should specify desired charts, or supported data shapes.
        return templateGenerator.getAllTemplates(new QueryChartEditorTooltipMap());
    }

    private _isQueryDirty(): Boolean {
        /// <summary>Indicates if the query is in a dirty state.</summary>

        return this._queryResultsProvider.isDirty();
    }
}

VSS.initClassPrototype(QueryChartsView, {
    _gridInfoBar: null,
    _chartListToolbar: null,
    _splitter: null,
    _chartsList: null,
    _queryResultsProvider: null
});

Controls.Enhancement.registerEnhancement(QueryChartsView, ".query-charts-view");

export class QueryChartsToolbar extends Controls.BaseControl {

    public static enhancementTypeName: string = "tfs.wit.queryChartsToolbar";

    private _view: IQueryChartsView;
    private _toolbar: Menus.Toolbar;
    private _updateDelegate: any;

    constructor(options?) {
        super(options);

        this._updateDelegate = delegate(this, this._update);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "toolbar query-charts-toolbar"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._toolbar = this._createToolbar(this._element);
    }

    public dispose() {
        this.unbind();

        super.dispose();
    }

    public bind(view: IQueryChartsView) {
        this._view = view;
        this._view._bind(QueryChartsView.commandStatusChanged, this._updateDelegate);

        this._updateToolbarItems();
    }

    public unbind() {
        if (this._view) {
            this._view._unbind(QueryChartsView.commandStatusChanged, this._updateDelegate);
            this._view = null;
        }
    }

    private _updateToolbarItems() {
        this.delayExecute("updateToolbarItems", 250, false, delegate(this, this._updateToolbarItemsNow));
    }

    public _updateToolbarItemsNow() {
        let toolBarItemStates = [];

        if (this._view) {
            toolBarItemStates = this.getCommandStates();
        }

        this._toolbar.updateCommandStates(toolBarItemStates);
    }

    private _createToolbar($containerElement: JQuery): Menus.Toolbar {
        let toolBar: Menus.Toolbar;

        toolBar = <Menus.Toolbar>Controls.BaseControl.createIn(Menus.Toolbar, $containerElement, {
            items: this._createToolbarItems(),
            executeAction: Utils_Core.delegate(this, this._onToolbarItemClick)
        });

        // adding this tracepoint for E2E tests to avoid having to wait for the entire page load which is expensive on chart config dialog tests
        Diag.logTracePoint("QueryChartsToolbar._createToolBar.complete");

        return toolBar;
    }

    private _getNewChartText(): string {
        if (TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring) < TFS_Server_WebAccess_Constants.FeatureMode.Licensed) {
            return Utils_String.format("{0}{1}", Resources.NewChartText, VSS_Resources_Common.Asterix);
        } else {
            return Resources.NewChartText;
        }
    }

    private _createToolbarItems(): any[] {
        const items = [];
        const chartAuthoringFeatureMode = TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(tfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring);

        if (chartAuthoringFeatureMode === TFS_Server_WebAccess_Constants.FeatureMode.Advertising) {
            items.push({ id: QueryChartsView._advertiseChartAuthoring, text: this._getNewChartText(), title: "", showText: true, icon: "bowtie-icon bowtie-math-plus" });
        } else if (chartAuthoringFeatureMode >= TFS_Server_WebAccess_Constants.FeatureMode.Trial) {
            items.push({ id: QueryChartsView._newChartCommand, ariaLabel: this._getNewChartText(), text: this._getNewChartText(), title: "", showText: true, icon: "bowtie-icon bowtie-math-plus" });
        }
        items.push({ id: QueryChartsView._refreshCommand, text: Resources.Refresh, title: Resources.RefreshTooltip, showText: false, icon: "bowtie-icon bowtie-navigate-refresh" });

        return items;
    }

    public _onToolbarItemClick(command) {
        if (this._view) {
            return this._view.executeCommand(command);
        }
    }

    public getCommandStates(): Menus.ICommand[] {
        return [
            {
                id: QueryChartsView._newChartCommand,
                disabled: !this._view || !this._view.canCreateNewChart()
            },
            {
                id: QueryChartsView._advertiseChartAuthoring,
                disabled: false
            },
            {
                id: QueryChartsView._refreshCommand,
                disabled: !this._view || !this._view.canShowCharts()
            }];
    }

    private _update(sender: any, status: any, statusIsError?: boolean) {
        /// <param name="sender" type="any" />
        /// <param name="status" type="any" />
        /// <param name="statusIsError" type="boolean" optional="true" />

        this._updateToolbarItemsNow();
    }
}

VSS.initClassPrototype(QueryChartsToolbar, {
    _view: null,
    _toolbar: null,
    _updateDelegate: null
});

VSS.classExtend(QueryChartsToolbar, TfsContext.ControlExtensions);

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.WorkItemTracking.Controls.Charts", exports);
