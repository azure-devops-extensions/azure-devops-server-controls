///<summary>Charting.Hosts manage containment of charts operating against supported Server side contracts.
/// Surface area of contracts here should focus on describing chart data + metadata provider information.
///</summary >
/// <reference types="jquery" />

import * as VSS from "VSS/VSS";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import * as Utils_Html from "VSS/Utils/Html";
import * as DataServices from "Charting/Scripts/TFS.Charting.DataServices";
import * as Controls from "VSS/Controls";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as VSS_Resources_Common from "VSS/Resources/VSS.Resources.Common";
import * as StatusIndicator from "VSS/Controls/StatusIndicator";
import * as Menus from "VSS/Controls/Menus";
import * as TFS_Server_WebAccess_Constants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as TFS_FeatureLicenseService from "Presentation/Scripts/TFS/TFS.FeatureLicenseService";
import * as TFS_EllipsisMenuBar from "Presentation/Scripts/TFS/FeatureRef/EllipsisMenuBar";
import * as TFS_Dashboards_PushToDashboard from "Dashboards/Scripts/Pinning.PushToDashboard";
import * as TFS_Dashboards_WidgetDataForPinning from "Dashboards/Scripts/Pinning.WidgetDataForPinning";
import * as TFS_Dashboards_PushToDashboardInternal from "Dashboards/Scripts/Pinning.PushToDashboardInternal";
import * as TFS_Dashboards_PushToDashboardConstants from "Dashboards/Scripts/Pinning.PushToDashboardConstants";
import * as FeatureAvailability_Services from "VSS/FeatureAvailability/Services";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import * as Charting from "Charting/Scripts/TFS.Charting";
import * as Charting_Color from "Charting/Scripts/TFS.Charting.Color";
import * as Charting_Charts from "Charting/Scripts/TFS.Charting.Charts";
import * as Charting_Editors from "Charting/Scripts/TFS.Charting.Editors";
import * as TFS_Dashboards_Contracts from "TFS/Dashboards/Contracts";
import * as Chart_Contracts from "Charts/Contracts";
import { addTooltipIfOverflow } from "Presentation/Scripts/TFS/TFS.UI.Controls.Accessibility.Utils";

let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
let getErrorMessage = VSS.getErrorMessage;


export class ErrorHelper {
    ///<summary>Recognizes known Service errors, for which special policy is applicable.</summary>

    public static isFilterUnusable(error) {
        return error && error.typeKey === "InvalidHierarchicalQueryException";
    }

    public static isNonExistentTransform(error) {
        return error && error.typeKey === "TransformOptionsDoesNotExistException";
    }
}

/** Retroactive definition of Data contract of ChartHost Control, which had a runaway set of optional parameters,
  * arising from a poorly implemented factoring to support Pinning.
  * If you see any parts which are not obvious, please review implementation and add member commentary.*/
export interface ChartHostOptions {
    chartState?: Charting_Charts.IChartState;

    hideEllipsisMenu?: boolean;
    hideEditChart?: boolean;
    hideDeleteChart?: boolean;

    canAddToDashboard?: boolean;

    canEditChart?: boolean;
    canDeleteChart?: boolean;

    onDelete?: (listener: any) => void;
    onEdit?: (listener: any) => void;

    /** Allows opt-out to skip default behavior of decoding a title when rendering. */
    ignoreDecoding?: boolean;

    /** Allows the chart host to react to chart click events for navigation purposes and telemetry. */
    onClick?: (openInNewWindow: boolean) => void;

    /** Allows the chart host to react to legend click events for telemetry. */
    onLegendClick: () => void;

    /**
     * Additional contextual description appended to ChartingResources.EmptyChart_AltTextFormat when showing empty chart
     */
    altTextExtraDescription?: string;
}

export class ChartHost extends Controls.Control<ChartHostOptions> {
    /// <Summary>ChartsHosts is responsible for providing event integration of UI for editing chart state. It's parents are responsible for responding to the events.</Summary>

    private _chartState: Charting_Charts.IChartState;
    private _chartPlot: Charting_Charts.LightweightChartBase;
    private _menuBar: Menus.MenuBar;

    public static enhancementTypeName: string = "tfs.chartsHostList";
    private static _deleteChartCommand: string = "delete-chart";
    private static _pinChartCommand: string = "pin-chart";
    private static _unpinChartCommand: string = "unpin-chart";
    private static _editChartCommand: string = "edit-chart";
    private _colorDictionary: Chart_Contracts.ColorDictionary;
    private $_messageBlock: JQuery;
    private _editModeActive: boolean;
    private $title: JQuery;

    constructor(options?: ChartHostOptions) {
        /// <param name="options" type="any" />

        super(options);
    }

    public initializeOptions(options?: ChartHostOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: "chart-host chart-container chartpin"
        }, options));
        this._chartState = options.chartState;
    }

    public focus(): void {
        this._showMenuBar();
        this._menuBar.getElement().focus();
    }

    public dispose(): void {
        if (this._chartPlot) {
            this._chartPlot.dispose();
            this._chartPlot = null;
        }
        super.dispose();
    }

    public getLegendItems(): string[] {
        if (this._chartPlot) {
            return this._chartPlot.getColoringItems();
        }
    }

    public getState(): Charting_Charts.IChartState {
        return <Charting_Charts.IChartState>$.extend({}, this._chartState, true);
    }

    public setState(chartState: Charting_Charts.IChartState, contractVersion?: number) {
        ///</summary> When configuration gets updated, old assumptions don't hold, re-initialize.</summary>
        try {
            this._chartState = chartState;
            let featureColorProvider = Charting_Color.getFeatureColorProvider(this._chartState.configuration.scope);
            this._colorDictionary = Charting_Color.ColorDictionary.fromColorEntries(
                featureColorProvider,
                this._chartState.configuration.userColors,
                contractVersion);
            this.repaint();
        } catch (ex) {
            VSS.errorHandler.showError(VSS.getErrorMessage(ex));
        }
    }

    /**
     * Notifies the host that it is being used in an edit mode scenario.
     * While edit mode experiences are active, animations are suppressed.
     * @param editModeActive
     */
    public toggleEditMode(editModeActive: boolean): void{
        this._editModeActive = editModeActive;
    }

    public setErrorState(error: any) {
        this.applyMessage(DataServices.DataServicesHelpers.InterpretServerError(error), false);
    }

    public repaint() {
        ///<summary>Repaint the host - neccessary when the active chart type has changed.</summary>
        this.initialize();
    }

    public initialize(): void {
        ///<summary>(re)Initialize the control using the current configuration.</summary>
        this._element.empty();
        let $header = $("<div/>")
            .addClass("chart-host-header header")
            .appendTo(this.getElement());
        this.$_messageBlock = $("<div />").addClass("message-block").appendTo(this.getElement());
        this.hideMessageBlock();
        this.applyMessage(Resources.ChartsListLoading, true);
        if (this._chartState && this._chartState.configuration) {
            let chartTitle = this._chartState.configuration.title;
            if (!this._options.ignoreDecoding) {
                chartTitle = Utils_String.decodeHtmlSpecialChars(chartTitle);
            }

            this.$title = $("<h2 />")
                .text(chartTitle)
                .addClass("chart-host-title")
                .appendTo($header);

            addTooltipIfOverflow(this.$title);

            if (this._chartState.suppressTitle) {
                $header.hide();
            }
        }

        let hoverChange = (hasHover: boolean) => {
            this._element.toggleClass("chartHover", hasHover);
            if (this._menuBar) {
                if (hasHover) {
                    this._showMenuBar();
                } else {
                    this._hideMenuBar();
                }
            }
        };

        if (!this._options.hideEllipsisMenu) {
            let hideMenubar = true;

            this._menuBar = <TFS_EllipsisMenuBar.EllipsisMenuBar>Controls.BaseControl.createIn(TFS_EllipsisMenuBar.EllipsisMenuBar, $header, {
                iconType: "icon-ellipsis",
                subItems: this._createMenubarItems(),
                onActivate: () => { hoverChange(true); },
                onDeactivate: () => { hoverChange(false); },
                executeAction: Utils_Core.delegate(this, this._onMenubarItemClick)
            });

            this._menuBar.getElement().addClass("no-height");
            this._menuBar.getElement().find(".menu-focus-receiver")
                .focusin((e) => {
                    hideMenubar = true;
                    this._showMenuBar();
                })
                .focusout((e) => {
                    // delay for 100 ms for click event on the ellipsis item to go through.
                    if (hideMenubar) {
                        this._hideMenuBar();
                    } else {
                        hideMenubar = true;
                    }
                });

            this._menuBar.getItems()[0].getElement().bind("mousedown", () => {
                hideMenubar = false;
            });
        }

        this._element.hover(
            () => { hoverChange(true); },
            () => { hoverChange(false); });

        this._element.mousemove(() => {
            hoverChange(true);
        });

        if (this._chartState && this._chartState.configuration) {

            let chartType = Charting_Charts.ChartTypes.makeChartTypeMap()[this._chartState.configuration.chartType];
            let paddingSpace = 10;
            let chartOptions: Charting_Charts.LightweightChartOptions = {
                width: this._chartState.width - paddingSpace || Charting_Charts.LightweightChartBase.defaultWidth,
                height: this._chartState.height || Charting_Charts.LightweightChartBase.defaultHeight,
                useCompactRenderMode: this._chartState.useCompactRenderMode,
                colorDictionary: this._colorDictionary,
                transformOptions: this._chartState.configuration.transformOptions,
                onLegendClick: () => {
                    if ($.isFunction(this._options.onLegendClick)) {
                        this._options.onLegendClick();
                    }
                },
                altTextExtraDescription: this._options.altTextExtraDescription,
                accessibleTitle: this._chartState.configuration.title
            };

            // Only provide onClick handler if we have one.
            // Downstream implementation skips creation of a hyperlink for the empty chart image if no onClick handler is provided.
            if ($.isFunction(this._options.onClick)) {
                chartOptions.onClick = (openInNewWindow: boolean) => {
                    this._options.onClick(openInNewWindow);
                };
            }

            if (this._editModeActive) {
                chartOptions.editModeActive = true;
            }

            this._chartPlot = <Charting_Charts.LightweightChartBase>Controls.BaseControl.createIn(chartType, this.getElement(), chartOptions);
            if (this._chartState.results) {
                this._chartPlot.setDataset(this._chartState.results.data);
                this.hideMessageBlock();
            }
        }
    }

    /**
     *  Allow a bypass of (slow) render during configuration when only the title has changed
     */
    public updateTitle(title: string) {
        this.$title.text(title);
    }

    private applyMessage(message: string, isLoading: Boolean): void {
        this.$_messageBlock.empty();
        this.$_messageBlock.toggleClass("invalid", !isLoading);
        this.$_messageBlock.removeClass("collapsed");
        if (isLoading) {
            (<StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this.$_messageBlock, { imageClass: "big-status-progress", message: message })).start();
        } else {
            (<StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this.$_messageBlock, { center: true, imageClass: "icon-warning", message: message })).start();

        }
    }

    private hideMessageBlock() {
        this.$_messageBlock.addClass("collapsed");
    }

    private _showMenuBar() {
        this._menuBar.getElement().removeClass("no-height");
        this._menuBar._selectItem();
    }

    private _hideMenuBar() {
        this._menuBar._selectItem(null);
        this._menuBar.getItems()[0].hideSubMenu({ immediate: true });
        this._menuBar.getElement().addClass("no-height");
    }

    public getChartId(): string {
        return this._chartState.configuration.chartId;
    }

    public getChartScope(): string {
        return this._chartState.configuration.scope;
    }

    public getTransformId(): string {
        return this._chartState.configuration.transformOptions.transformId;
    }

    public getTransformFilter(): string {
        return this._chartState.configuration.transformOptions.filter;
    }

    private _createMenubarItems(): any[] {
        let items = [];

        let canAuthor: boolean = TFS_FeatureLicenseService.FeatureLicenseService.getDefaultService(TfsContext).getFeatureState(TFS_Server_WebAccess_Constants.LicenseFeatureIds.ChartAuthoring) > TFS_Server_WebAccess_Constants.FeatureMode.Advertising;

        if (!this._options.hideEditChart) {
            items.push({
                id: ChartHost._editChartCommand,
                text: Resources.ChartHostEditChartTitle,
                icon: "bowtie-icon bowtie-settings-gear-outline",
                disabled: !(canAuthor && this._chartState && this._chartState.configuration && this._options.canEditChart)
            });
        }

        if (!this._options.hideDeleteChart) {
            items.push({
                id: ChartHost._deleteChartCommand,
                text: Resources.ChartHostDeleteChartTitle,
                icon: "bowtie-icon bowtie-edit-delete",
                disabled: !(canAuthor && this._chartState && this._chartState.configuration && this._options.canDeleteChart)
            });
        }

        if (this._options.canAddToDashboard) {
            if (this._chartState && this._chartState.configuration) {
                let widgetTypeId = this.mapChartScopeToWidgetType(this._chartState.configuration.scope);
                if (widgetTypeId) {
                    let widgetCustomData: any;

                    // Note: All Charts saved w/V1 contract hold just a reference to a chartId, which is stored in charting schema.
                    // Subsequent versions of Chart Widgets directly hold their own configuration settings, with no reference to an underlying Chart.
                    // One consequence of the old model is that users expect that edits from the shared underlying artifact continue to be reflected on homepage/dashboard.

                    // To preserve user expectations of consistency with legacy, widgets being added via pinning experience continue to use the Id reference model.
                    // Currently, an existing widget will only get upgraded to the current model via an explicit lazy upgrade process of in-place editing the widget on the dashboard.

                    let semanticVersion = <TFS_Dashboards_Contracts.SemanticVersion>{
                        major: 1,
                        minor: 0,
                        patch: 0
                    };
                    widgetCustomData = {chartId: this._chartState.configuration.chartId};

                    let widgetData = new TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning(this._chartState.configuration.title, widgetTypeId, JSON.stringify(widgetCustomData), semanticVersion);
                    let menuItem = TFS_Dashboards_PushToDashboard.PushToDashboard.createMenu(TfsContext.contextData, widgetData, (args: TFS_Dashboards_PushToDashboardInternal.PinArgs) => {});

                    items.push(menuItem);
                }
            }
        }

        return items;
    }

    private _onMenubarItemClick(e) {
        let command = e.get_commandName();
        let commandArgs = e.get_commandArgument();
        let callBackOptionsForPin: TFS_Dashboards_PushToDashboardInternal.callBackOptionsForPin = { callback: this.pinDashboardCallback, arguments: this };

        switch (command) {
            case ChartHost._editChartCommand:
                this._options.onEdit(this);
                this._hideMenuBar();
                break;
            case ChartHost._deleteChartCommand:
                if (confirm(Utils_String.format(Resources.ConfirmToDeleteChart, this._chartState.configuration.title))) {
                    this._options.onDelete(this);
                    this._hideMenuBar();
                }
                break;
        }
        return false;
    }

    public pinDashboardCallback() {
        this._menuBar.updateItems(this._createMenubarItems());
    }

    public mapChartScopeToWidgetType(chartScope: string): string {
        let widgetTypeId;

        // we do a case invariant equality comparison as inconsistencies has been noticed in the scope value between older and newer charts.
        let ignoreCaseForEqualityComparison = true;
        if (Utils_String.equals(this._chartState.configuration.scope, Charting.ChartProviders.witQueries, ignoreCaseForEqualityComparison)) {
            widgetTypeId = TFS_Dashboards_PushToDashboardConstants.WITChart_WidgetTypeID;
        } else if (Utils_String.equals(this._chartState.configuration.scope, Charting.ChartProviders.testReports, ignoreCaseForEqualityComparison)) {
            widgetTypeId = TFS_Dashboards_PushToDashboardConstants.TCMChart_WidgetTypeID;
        }

        return widgetTypeId;
    }
}

VSS.initClassPrototype(ChartHost, {
    _chartState: null,
    _chartPlot: null,
    _menuBar: null
});

Controls.Enhancement.registerEnhancement(ChartHost, ".chart-container")

export enum ChartsRenderOutcome {
    Success,
    Error,
    Empty
}

export interface IChartHostListSettings {
    ///<summary>Consumer specific info the Chart Hosts Lists needs from it's owner. The options interface provides no type information.</summary>
    getConfigurationGroupKey(): string;
    getConfigurationScope(): string;

    // Client state used for tailoring filter at run-time
    getFilterContext(): any;

    // View preferences to restrict presentation/editing of Charts
    viewIsReady(): Boolean;
    canShowCharts(): Boolean;
    canEditCharts(): Boolean;
    canDeleteCharts(): Boolean;
    canCreateNewChart(): Boolean;
    canAddToDashboard(): Boolean;

    // Callback for view to create/edit a chart
    editChart(configuration: DataServices.IChartConfiguration, onConfigurationUpdated: Charting_Editors.IChartEditCallback): any;

    // View Specific messaging about the charts.
    getEmptyChartMessage(): string;
    getChartsSuppressedMessage(): string;

    // callback for custom charts list error view
    onRenderCompleted?: (outcome: ChartsRenderOutcome) => void;
}

export class ChartHostsList extends Controls.BaseControl {
    /// <Summary>ChartsHostsList is the entity responsible for retaining a current set of charts for presentation, and synchronizing that state with server.
    ///
    ///  -Handle client driven additions and removals
    ///  -Flushing client driven chart preference updates
    ///  -Notifying the chart controls of updates.
    ///
    ///   The individual Chart Hosts are responsible for rendering details.
    ///</Summary >

    public static enhancementTypeName: string = "tfs.chartsHostList";
    private _chartHosts: ChartHost[];
    private $_listContainer: JQuery;
    private $_messageBlock: JQuery;

    // Within the store, the group key uniquely describes a group of charts within a given scope
    private _typedSettings: IChartHostListSettings;

    constructor(options?: any) {
        /// <param name="options" type="any" />

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        Diag.Debug.assertParamIsObject(options, "options must be populated");
        Diag.Debug.assertParamIsObject(options.chartHostListSettings, "chartHostListSettings must be populated on options");

        super.initializeOptions($.extend({
            coreCssClass: "chart-hosts-list",
        }, options));

        this._typedSettings = options.chartHostListSettings;
    }

    public initialize() {
        super.initialize();

        this.$_messageBlock = $("<div />").addClass("message-block").appendTo(this.getElement());
        this.hideMessageBlock();
        this.$_listContainer = $("<div />").addClass("chart-hosts-list-items").appendTo(this.getElement());
        this._clear();
    }

    public reportPageError(message) {
        this._reportError(message);
        this._clear();
    }

    public beginRefresh() {
        // Start from clean slate and rebuild the set of Hosts
        Diag.logTracePoint("ChartHostsList.beginRefresh.start");
        this._clear();
        this.applyMessage(Resources.ChartsListLoading, true);

        if (this._typedSettings.viewIsReady() && this._typedSettings.canShowCharts()) {
            this._refresh();
        } else {
            this._reportError(this._typedSettings.getChartsSuppressedMessage());
            if (this._typedSettings.onRenderCompleted) {
                this._typedSettings.onRenderCompleted(ChartsRenderOutcome.Error);
            }
        }
    }

    private _refresh() {
        DataServices.ChartConfigStore.beginGetChartConfigurationsInGroup(
            this._options.tfsContext.navigation.projectId,
            this._typedSettings.getConfigurationScope(),
            this._typedSettings.getConfigurationGroupKey(),
            (chartConfigurations) => {
                this._applyConfigurations(chartConfigurations);
                Diag.logTracePoint("ChartHostsList.beginRefresh.end");
            },
            (error) => {
                this._reportError(error);
            });
    }

    public focusOnLastChart(): void {
        ///<summary>When we add a new chart, we want to shift focus to the most recently created chart</summary>
        this._chartHosts[this._chartHosts.length - 1].focus();
    }

    public addChart(chartState: Charting_Charts.IChartState) {
        ///</summary>Add the specified chart to the end of the list</summary>
        let pinItem;
        if (this._options.pinItemsMap) {
            pinItem = this._options.pinItemsMap[chartState.configuration.chartId];
        }

        let host = <ChartHost>Controls.BaseControl.createIn(ChartHost, this.$_listContainer, {
            canAddToDashboard: this._typedSettings.canAddToDashboard(),
            hideEditChart: this._options.hideEditChart,
            canEditChart: this._typedSettings.canEditCharts(),
            canDeleteChart: this._typedSettings.canDeleteCharts(),
            hideDeleteChart: this._options.hideDeleteChart,
            hideEllipsisMenu: this._options.hideEllipsisMenu,
            onEdit: (chartHost: ChartHost) => {
                if (this._typedSettings.canEditCharts()) {
                    this._typedSettings.editChart(chartHost.getState().configuration, (chartState: Charting_Charts.IChartState) => {
                        this.updateChart(chartHost, chartState);
                    });
                }
            },
            onDelete: (chartHost: ChartHost) => {
                if (this._typedSettings.canDeleteCharts()) {
                    this.deleteChart(chartHost, () => {
                        if (this._options.onPinDelete && $.isFunction(this._options.onPinDelete)) {
                            this._options.onPinDelete(chartHost.getChartId());
                        }
                    });
                    DataServices.ChartTelemetry.OnDeletingChart(chartState.configuration);
                }
            }
        });
        host.setState(chartState);
        this._chartHosts[this._chartHosts.length] = host;
        this._checkForEmpty();
    }

    public updateChart(chartHost: ChartHost, chartState: Charting_Charts.IChartState) {
        ///</summary>Update the specified chart state, flush it to the server.</summary>
        chartHost.setState(chartState);
    }

    public deleteChart(chartHost: ChartHost, onDelete?: any) {
        ///</summary>Remove the specified chart host Control from the list, pull it from HTML and flush a deletion of underlying chart to the server.</summary>

        let chartId = chartHost.getChartId();
        Diag.Debug.assertIsNotNull(chartId, "Does the chart have an ID?");
        // Save the chart to the store - assume success- fire and forget, report on failure case.
        DataServices.ChartConfigStore.beginRemoveChartConfiguration(this._options.tfsContext.navigation.projectId, chartId, () => {
            if (onDelete && $.isFunction(onDelete)) {
                onDelete();
            }
            this._chartHosts.splice($.inArray(chartHost, this._chartHosts), 1);
            chartHost.getElement().remove();
            this._checkForEmpty();
            Diag.logTracePoint("ChartHostsList.deleteChart.end");
        }, (error) => {
            alert(getErrorMessage(error));
        });
    }

    public getChartHostListByFilter(filter: string): ChartHost[] {
        let chartHost: ChartHost[] = [];

        for (let i = 0, len = this._chartHosts.length; i < len; i++) {
            if (Utils_String.ignoreCaseComparer(this._chartHosts[i].getTransformFilter(), filter) === 0) {
                chartHost[chartHost.length] = this._chartHosts[i];
            }
        }

        return chartHost;
    }

    private _applyConfigurations(chartConfigurations: DataServices.IChartConfiguration[]) {
        ///<summary>Apply the supplied configurations and pinning data by adding new hosts and populate the results.</summary>
        let that = this;

        Diag.logTracePoint("ChartHostsList._applyConfigurations.start");
        this._clear();
        for (let i = 0, l = chartConfigurations.length; i < l; i++) {
            this.addChart(
                {
                    configuration: chartConfigurations[i],
                    results: null
                });
        }

        if (chartConfigurations.length > 0) {
            DataServices.ChartTelemetry.OnShowCharts(chartConfigurations[0].transformOptions.filter, chartConfigurations.length);
        }

        let transforms: DataServices.ITransformOptions[] = $.map(chartConfigurations, (val, i) => {
            return DataServices.DataServicesHelpers.applyFilterContext(val.transformOptions, this._typedSettings.getFilterContext());
        });

        // Load chart results if there are saved charts present. Otherwise, apply empty Chart Message
        if (transforms.length > 0) {
            let scope = chartConfigurations[0].scope;
            DataServices.ChartQueryEngine.beginPostDataQuery(this._options.tfsContext.navigation.projectId, scope, transforms,
                (results) => {
                    that._populateChartHosts(results);
                    Diag.logTracePoint("ChartHostsList._applyConfigurations.end");
                }, (error) => {

                    for (let i = 0, l = this._chartHosts.length; i < l; i++) {
                        this._chartHosts[i].setErrorState(error);
                    }
                    // If the transform is failing, clear the hosts.
                    this._reportError(error);
                    if (ErrorHelper.isFilterUnusable(error)) {
                        this._clear();
                    }
                });
        }

        this._checkForEmpty();
    }

    private _populateChartHosts(chartResults: DataServices.IDataTable[]): void {
        ///<Summary>Map the incoming chart results to the chart hosts and override the results state
        /// Note: For performance reasons, the server batches related kinds of charts together, which can cause re-ordering of result transforms.
        ///</summary>

        let hostMap: { [transformId: string]: ChartHost; } = {};

        for (let i = 0, l = this._chartHosts.length; i < l; i++) {
            let transformId = this._chartHosts[i].getTransformId();
            hostMap[transformId] = this._chartHosts[i];
        }

        for (let i = 0, l = chartResults.length; i < l; i++) {
            let transformId = chartResults[i].transform.transformId;
            if (transformId) {
                let target = hostMap[transformId];

                if (target) {
                    let chartState = target.getState();
                    chartState.results = chartResults[i];
                    target.setState(chartState);
                }
            }
        }
    }

    private _clear(): void {
        ///<summary>Clear prior host and render state</summary
        this._chartHosts = [];

        this.$_listContainer.empty();
    }

    private _checkForEmpty() {
        if (this._chartHosts && this._chartHosts.length === 0) {
            this._reportError(this._typedSettings.getEmptyChartMessage());
            if (this._typedSettings.onRenderCompleted) {
                this._typedSettings.onRenderCompleted(ChartsRenderOutcome.Empty);
            }
        } else {
            this.hideMessageBlock();
            if (this._typedSettings.onRenderCompleted) {
                this._typedSettings.onRenderCompleted(ChartsRenderOutcome.Success);
            }
        }
    }

    private hideMessageBlock() {
        this.$_messageBlock.addClass("collapsed")
    }

    private applyMessage(message: string, isLoading: Boolean): void {
        //
        this.$_messageBlock.empty();
        this.$_messageBlock.toggleClass("invalid", !isLoading);
        this.$_messageBlock.removeClass("collapsed");
        if (isLoading) {
            (<StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this.$_messageBlock, { imageClass: "big-status-progress", message: message })).start();
        } else {
            this.$_messageBlock
                .append($("<div />")
                    .addClass("message-text")
                    .append(message));
        }

    }

    private _reportError(error: any): void {
        let errorMessage = getErrorMessage(error);
        // Encode error text to remove unsafe tags in feature error messages.
        errorMessage = Utils_Html.HtmlNormalizer.normalize(errorMessage);
        this.applyMessage(errorMessage, false);
        // Telemetry Web service refuses HTML characters, such that normalization/Encoding isn't sufficient.
        let strippedMessage = $("<div>" + errorMessage + "</div>").text();
        DataServices.ChartTelemetry.OnChartClientFailure(this._typedSettings.getConfigurationScope(), strippedMessage);

    }
}

VSS.initClassPrototype(ChartHostsList, {
    options: null,
    _chartHosts: null,
    $_listContainer: null,
    $_messageBlock: null,
    _configurationStore: null,
    _configurationScope: null,
    _configurationgroupKey: null,
    _chartDataProvider: null
});

Controls.Enhancement.registerEnhancement(ChartHostsList, ".chart-hosts-list")



// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Charting.Hosts", exports);
