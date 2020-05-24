///<amd-dependency path='VSS/LoaderPlugins/Css!MyWork' />


import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Grids = require("VSS/Controls/Grids");
import TFS_Build_Contracts = require("TFS/Build/Contracts");
import MyWorkTelemetry = require("MyWork/Scripts/TFS.MyWork.Telemetry");
import BuildManager = require("MyWork/Scripts/TFS.MyWork.Widget.Build");
import BuildDuration = require("Build.Common/Scripts/Duration");
import BuildHistogram = require("Build.Common/Scripts/Controls/Histogram");
import {BuildStatus} from "Build.Common/Scripts/BuildStatus";
import MyWorkProjectSelector = require("MyWork/Scripts/TFS.MyWork.Controls.ProjectSelector");
import SettingsManager = require("MyWork/Scripts/TFS.MyWork.Widget.SettingsManager");
import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");
import SDK = require("VSS/SDK/Shim");

var delegate = Utils_Core.delegate;
var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export module Constants {
    export var CORE_CSS_CLASS = "build-widget";
    export var GRID_CONTAINER_CSS_CLASS = "build-widget-grid-container";
    export var TITLE_CSS_CLASS = "build-widget-title";
    export var TITLE_QUALIFIER_CSS_CLASS = "build-widget-title-qualifier";
    export var PROJECT_SELECTOR_CSS_CLASS = "build-widget-projector-selector";
    export var COUNT_DETAILS_CSS_CLASS = "build-widget-count-details";
    export var GRID_CSS_CLASS = "build-widget-grid";
    export var SHOW_MORE_CSS_CLASS = "build-widget-show-more";
    export var RESULTS_CONTAINER_CSS_CLASS = "build-widget-results-container";
    export var NO_RESULTS_CONTAINER_CSS_CLASS = "build-widget-no-results-container";
    export var NO_RESULTS_MESSAGE_CSS_CLASS = "build-widget-no-results-message";
    export var NO_RESULTS_SYMBOL_CSS_CLASS = "build-widget-no-results-symbol";
    export var GRID_DATA_CELL_TITLE_CSS_CLASS = "build-widget-grid-data-cell-title";
    export var GRID_DATA_CELL_STATUS_ICON_CSS_CLASS = "build-widget-grid-data-cell-status-icon";
    export var GRID_DATA_CELL_DETAILS_CSS_CLASS = "build-widget-grid-data-cell-details";
    export var GRID_DATA_CELL_CSS_CLASS = "build-widget-grid-data-cell";
    export var GRID_HISTOGRAM_CELL_CSS_CLASS = "build-widget-grid-histogram-cell";
    export var ERROR_CONTAINER_CSS_CLASS = "build-widget-error-container";
    export var ERROR_MESSAGE_CSS_CLASS = "build-widget-error-message";
    export var ERROR_SYMBOL_CSS_CLASS = "build-widget-error-symbol";

    export var AREA_NAME = 'MyWork';
    export var DEFAULT_COLLECTION_NAME = 'DefaultCollection';
    export var BUILD_FAV_URL = "#favDefinitionId=";
    export var BUILD_HUB_URL = "/_build";
    export var BUILD_ID_URL = "#buildId={0}&_a=summary";
    export var REFRESH_INTERVAL = 5 * 60 * 1000;
    export var REFRESH_RETRYWAIT = 5 * 1000;
    export var RETRY_MAX = 1;
    export var MAX_ROWS = 4;
    export var GRID_ROW_HEIGHT = 50;
    export var GRID_DATA_CELL_WIDTH = 360;
    export var NO_RESULTS_SYMBOL = "chart-noresult-3.png";
    export var WIDGET_ID = "BuildWidget";
    export var NEW_WIDGET_NON_DASHBOARD_MODE = "non-dashboard-mode";
}

export module Events {
    export var ROW_CLICK_EVENT = "build-widget-row-click-event";
    export var SHOW_MORE_CLICK_EVENT = "build-widget-show-more-click-event";
    export var TITLE_CLICK_EVENT = "build-widget-title-click-event";
    export var PROJECT_CHANGE_EVENT = "build-widget-project-change-event";
    export var HISTOGRAM_CLICK_EVENT = "build-widget-histogram-click-event";
    export var BUILD_WIDGET_ONLOAD = "build-widget-on-load";
}

export interface IBuildWidgetViewOptions {
}

export interface IBuildWidgetGridOptions {
}

export interface IBuildWidgetGridData {
    builds: BuildManager.IBuildData[];
    buildDefinition: BuildManager.IBuildDefinitionData;
    latestBuild: BuildManager.IBuildData;
}

var WIDGET_TEMPLATE =
    `<span class='${Constants.TITLE_CSS_CLASS}'/> <span class='${Constants.TITLE_QUALIFIER_CSS_CLASS}'/>
      <div class='${Constants.PROJECT_SELECTOR_CSS_CLASS}'/>
      <span class='${Constants.COUNT_DETAILS_CSS_CLASS}'></span>
      <div class='${Constants.RESULTS_CONTAINER_CSS_CLASS}'>
         <div class='${Constants.GRID_CONTAINER_CSS_CLASS}'/>
      </div>
      <div class='${Constants.NO_RESULTS_CONTAINER_CSS_CLASS}'>
         <div class='${Constants.NO_RESULTS_MESSAGE_CSS_CLASS}'/>
         <div class='${Constants.NO_RESULTS_SYMBOL_CSS_CLASS}'/>
      </div>
      <div class='${Constants.ERROR_CONTAINER_CSS_CLASS}'>
         <div class='${Constants.ERROR_MESSAGE_CSS_CLASS}'/>
         <div class='${Constants.ERROR_SYMBOL_CSS_CLASS}'/>
      </div>
      <a class='${Constants.SHOW_MORE_CSS_CLASS}'/>`;

export class BuildWidgetGrid extends Grids.GridO<IBuildWidgetGridOptions> {
    public initializeOptions(options?: IBuildWidgetGridOptions) {
        var that = this;

        super.initializeOptions($.extend({
            cssClass: Constants.GRID_CSS_CLASS,
            allowMultiSelect: false,
            header: false,
            gutter: {
                contextMenu: false
            },
            columns: <any[]>[
                {
                    index: 'data',
                    width: Constants.GRID_DATA_CELL_WIDTH,
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var cell = this._drawCell
                            .apply(this, arguments)
                            .html('')
                            .addClass(Constants.GRID_DATA_CELL_CSS_CLASS);

                        var buildDefinition = that.getRowData(dataIndex).buildDefinition;
                        if (buildDefinition) {
                            var $title = ($("<a>")
                                .addClass(Constants.GRID_DATA_CELL_TITLE_CSS_CLASS)
                                .text(that.getRowData(dataIndex).buildDefinition.buildDefinitionTitle));
                            $title.attr('title', $title.text()).appendTo(cell);
                        }

                        var latestBuild = that.getRowData(dataIndex).latestBuild;
                        if (latestBuild) {
                            var statusText = BuildDuration.getBuildDurationText(
                                latestBuild.status,
                                latestBuild.startTime,
                                latestBuild.finishTime);
                            var $statusIcon = ($("<span>")
                                .addClass(BuildStatus.getIconClassName(latestBuild.status, latestBuild.result))
                                .addClass("icon"))
                                .addClass(Constants.GRID_DATA_CELL_STATUS_ICON_CSS_CLASS);
                            var $statusText = ($("<div>")
                                .addClass(Constants.GRID_DATA_CELL_DETAILS_CSS_CLASS)
                                .text(statusText));
                            $statusIcon.appendTo(cell);
                            $statusText.attr('title', $statusText.text()).appendTo(cell);
                        }
                        return cell;
                    }
                },
                {
                    index: 'histogram',
                    getCellContents: function (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                        var cell = this._drawCell
                            .apply(this, arguments)
                            .html('')
                            .addClass(Constants.GRID_HISTOGRAM_CELL_CSS_CLASS);

                        //reuse the BuildHistogram control
                        var buildDefData = that.getRowData(dataIndex);
                        var lastBuildId = 0;
                        if (!!buildDefData.latestBuild && buildDefData.latestBuild.id !== null) {
                            lastBuildId = buildDefData.latestBuild.id;
                        }
                        var buildsInfo = new BuildHistogram.BuildsInfo(<TFS_Build_Contracts.Build[]>buildDefData.builds, lastBuildId);
                        var histogram = <BuildHistogram.BuildHistogram>Controls.BaseControl.createIn(
                            BuildHistogram.BuildHistogram,
                            cell,
                            {
                                cssClass: "build-histogram definition-histogram",
                                barCount: 10,
                                barWidth: 6,
                                barHeight: 35,
                                barSpacing: 2,
                                selectedState: "selected",
                                hoverState: "hover",
                                clickAction: (build: TFS_Build_Contracts.Build) => {
                                    this._fire(Events.HISTOGRAM_CLICK_EVENT, { id: build.id });
                                }
                            });

                        histogram.updateData(buildsInfo);
                        cell.click((e) => { e.stopImmediatePropagation(); })
                        return cell;
                    }
                }]
        }, options));
    }

    public initialize() {
        super.initialize();
        this._rowHeight = Constants.GRID_ROW_HEIGHT;
    }

    //@Override
    public _onRowClick(e): any {
        var rowInfo = this._getRowInfoFromEvent(e, ".grid-row");
        if (rowInfo && e.which === 1) {
            var id = this.getRowData(rowInfo.dataIndex).buildDefinition.buildDefinitionId;
            var target: string;
            var features: string = null;

            if (!e.shiftKey) {
                target = e.ctrlKey ? "_blank" : "_self";
            } else {
                target = "_blank";
                features = Utils_String.format("height = {0 }, width = {1 }", screen.availHeight, screen.availWidth);
            }

            this._fire(Events.ROW_CLICK_EVENT, {
                id: id,
                target: target,
                features: features
            });
        } else if (e.which === 3) { //Right mouse button
            super._onRowClick(e);
        }
    }
	
    //@override
    public _updateRowSelectionStyle(rowInfo, selectedRows, focusIndex) {
        //Leaving this function empty since we don't want any kind of highliting on the grid.
        return;
    }
    
    //@override
    public getRowData(dataIndex: number): IBuildWidgetGridData {
        return <IBuildWidgetGridData>super.getRowData(dataIndex);
    }
}

export class BuildWidgetView extends Controls.Control<IBuildWidgetViewOptions> {
    private _$titleElement: JQuery;
    private _$titleQualifier: JQuery;
    private _$countDetails: JQuery;
    private _$projectSelectorContainer: JQuery;
    private _$gridContainer: JQuery;
    private _$showMoreAnchor: JQuery;
    private _$resultsContainer: JQuery;
    private _$noResultsContainer: JQuery;
    private _$noResultsMessage: JQuery;
    private _$noResultsSymbol: JQuery;
    private _$errorContainer: JQuery;
    private _$errorMessage: JQuery;
    private _$errorSymbol: JQuery;

    private _grid: BuildWidgetGrid;
    private _projectSelector: MyWorkProjectSelector.ProjectSelector;
    private _manager: BuildManager.BuildManager;
    private _settingsManager: SettingsManager.SettingsManager;
    private _urlPrefix: string;
    private _queryType: any;
    private _retryCount: number = 0;
    private _startLoadTime: number;

    public __test() {
        var that = this;
        return {
            $resultsContainer: this._$resultsContainer,
            $titleAnchor: this._$titleElement,
            $titleQualifier: this._$titleQualifier,
            $countDetails: this._$countDetails,
            $projectSelectorContainer: this._$projectSelectorContainer,
            $gridContainer: this._$gridContainer,
            $showMoreAnchor: this._$showMoreAnchor,
            $noResultsContainer: this._$noResultsContainer,
            $noResultsMessage: this._$noResultsMessage,
            $noResultsSymbol: this._$noResultsSymbol,
            grid: this._grid,
            projectSelector: this._projectSelector,
            manager: this._manager
        }
    }

    constructor(options?) {
        super(options);
    }

    public initialize() {
        this._startLoadTime = Date.now();
        super.initialize();
        this._element.addClass(Constants.CORE_CSS_CLASS);
        this._manager = new BuildManager.BuildManager(tfsContext);
        this._settingsManager = new SettingsManager.SettingsManager(tfsContext);
        this._projectSelector = new MyWorkProjectSelector.ProjectSelector();
        this.load();

        setInterval(() => { this.updateData(); }, Constants.REFRESH_INTERVAL);
        this._bind(Events.ROW_CLICK_EVENT, delegate(this, this._onRowClick));
        this._bind(Events.HISTOGRAM_CLICK_EVENT, delegate(this, this._onHistogramClick));
        this._bind(MyWorkProjectSelector.ProjectSelectorEvents.PROJECT_CHANGED_EVENT, delegate(this, this._onProjectChange)); 
    }

    public load() {
        this.getElement().addClass(Constants.NEW_WIDGET_NON_DASHBOARD_MODE);

        var that = this;

        this._element.html(WIDGET_TEMPLATE);
        this._$titleElement = this._element.find('.' + Constants.TITLE_CSS_CLASS).first();
        this._$titleQualifier = this._element.find('.' + Constants.TITLE_QUALIFIER_CSS_CLASS).first();
        this._$countDetails = this._element.find('.' + Constants.COUNT_DETAILS_CSS_CLASS).first();
        this._$projectSelectorContainer = this._element.find('.' + Constants.PROJECT_SELECTOR_CSS_CLASS).first();
        this._$gridContainer = this._element.find('.' + Constants.GRID_CONTAINER_CSS_CLASS).first();
        this._$showMoreAnchor = this._element.find('.' + Constants.SHOW_MORE_CSS_CLASS).first();
        this._$resultsContainer = this._element.find('.' + Constants.RESULTS_CONTAINER_CSS_CLASS).first();
        this._$noResultsContainer = this._element.find('.' + Constants.NO_RESULTS_CONTAINER_CSS_CLASS).first();
        this._$noResultsMessage = this._element.find('.' + Constants.NO_RESULTS_MESSAGE_CSS_CLASS).first();
        this._$noResultsSymbol = this._element.find('.' + Constants.NO_RESULTS_SYMBOL_CSS_CLASS).first();
        this._$errorContainer = this._element.find('.' + Constants.ERROR_CONTAINER_CSS_CLASS).first();
        this._$errorMessage = this._element.find('.' + Constants.ERROR_MESSAGE_CSS_CLASS).first();
        this._$errorSymbol = this._element.find('.' + Constants.ERROR_SYMBOL_CSS_CLASS).first();

        this._collapseAll();

        this._grid = <BuildWidgetGrid>Controls.BaseControl.createIn(BuildWidgetGrid, this._$gridContainer);
        this._settingsManager.getWidgetSettings(Constants.WIDGET_ID, (result) => {
            var projectId: string = null;

            if (result.Settings) {
                if (result.Settings.ProjectId) {
                    projectId = result.Settings.ProjectId;
                }
            }

            var that = this;
            this._projectSelector = <MyWorkProjectSelector.ProjectSelector>Controls.BaseControl.createIn(MyWorkProjectSelector.ProjectSelector,
                this._$projectSelectorContainer,
                {
                    selectedProjectId: projectId,
                    widgetName: "Build",
                    postInitializeCallback: function (projectSelector: MyWorkProjectSelector.ProjectSelector) {

                        var selectorProjectInfo = projectSelector.getCurrentProjectInfo();
                        if (!selectorProjectInfo) {
                            that._displayEmptyResult();
                            return;
                        }
                        
                        if (projectId == null || projectId !== selectorProjectInfo.projectId) {
                            projectId = selectorProjectInfo.projectId;
                            that.saveProjectToWidgetSetting(projectId);
                        }

                        that._setProjectUrl(that._projectSelector.getCurrentProjectInfo().projectName);
                        that.updateData().done(() => {
                            var loadTime = `${Date.now() - that._startLoadTime}`;
                            var telemetryProperties: { [key: string]: string } = {
                                "loadTimeMsec": loadTime,
                                "projectId": that._projectSelector.getCurrentProjectInfo().projectName,
                                "projectName": that._projectSelector.getCurrentProjectInfo().projectName,
                                "numberOfFavBuildDefinition": that._$countDetails.text()
                            };
                            MyWorkTelemetry.MyWorkTelemetry.publishTelemetryBuild(Events.BUILD_WIDGET_ONLOAD, telemetryProperties, true);
                        }).fail((error: Error) => {
                            that._logWidgetLoadFailure(error.message);
                        });
                    }
                });
        });

        this._$titleElement.text(Resources.BuildWidgetTitle);
        this._$titleQualifier.text(Resources.BuildWidgetTitleQualifer);
        this._$showMoreAnchor.text(Resources.BuildWidgetViewAllAnchorText);
        this._$showMoreAnchor.bind('click', delegate(this, this._onShowMoreClick));
        this._$noResultsSymbol.append($("<img/>").attr("src", tfsContext.configuration.getResourcesFile(Constants.NO_RESULTS_SYMBOL)));
        this._$noResultsMessage.html(Resources.BuildWidgetNoResultsEmptyMessage);
        this._$errorSymbol.text(Resources.BuildWidgetNoResultsErrorSymbol);
    }

    public updateData(): JQueryPromise<void> {
        var deferred = $.Deferred<void>();
        var currentProjectInfo = this._projectSelector.getCurrentProjectInfo();
        if (!currentProjectInfo) {
            return;
        }
        this._manager.beginGetFavoriteBuilds(currentProjectInfo.projectName, currentProjectInfo.projectId)
            .done((results: BuildManager.IMyBuildDefinitionResults) => {
                if (results.buildDefinitions && results.buildDefinitions.length > 0) {
                    var transformedData = results.buildDefinitions.map((row) => {
                        return <IBuildWidgetGridData>{
                            builds: row.lastNBuilds,
                            buildDefinition: row,
                            latestBuild: row.lastNBuilds[0]
                        }
                    });
                    this._grid.setDataSource(transformedData, null, null, null, -1, false);
                    this._collapseAll();
                    this._$resultsContainer.show();
                    this._updateLayout(results);
                } else {
                    this._displayEmptyResult();
                }
                this._retryCount = 0;
                deferred.resolve();
            }).fail((err: Error) => {
                this._retryCount++;
                if (this._retryCount > Constants.RETRY_MAX) {
                    this._displayErrorResult(err);
                } else {
                    setTimeout(() => { this.updateData().fail((error: Error) => { this._logWidgetLoadFailure(error.message) }); }, Constants.REFRESH_RETRYWAIT);
                }
                deferred.reject(err);
            });
        return deferred.promise();
    }

    private _setProjectUrl(projectName: string) {
        this._urlPrefix = tfsContext.getHostUrl() + "/" + Constants.DEFAULT_COLLECTION_NAME + "/" + projectName;
        this._$showMoreAnchor.attr('href', this._urlPrefix + Constants.BUILD_HUB_URL);
    }

    private _displayEmptyResult() {
        this._collapseAll();
        this._$noResultsContainer.show();
        this._updateLayout(null);
    }

    private _displayErrorResult(err: Error) {
        this._$errorMessage.html(Resources.BuildWidgetNoResultsErrorMessage + err.message);
        this._collapseAll();
        this._$errorContainer.show();
        this._updateLayout(null);
    }

    private _collapseAll() {
        this._$noResultsContainer.hide();
        this._$resultsContainer.hide();
        this._$errorContainer.hide();
        this._$countDetails.hide();
    }

    private _onProjectChange(e, args) {
        this.saveProjectToWidgetSetting(args.CurrentProjectInfo.projectId);

        var telemetryProperties: { [key: string]: string } = {
            "projectId": args.CurrentProjectInfo.projectId,
            "projectName": args.CurrentProjectInfo.projectName
        };
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryBuild(Events.PROJECT_CHANGE_EVENT, telemetryProperties, true);
        this._setProjectUrl(args.CurrentProjectInfo.projectName);
        this.updateData();
    }

    private saveProjectToWidgetSetting(projectId: string) {
        if (projectId) {
            this._settingsManager.setWidgetSettings({
                WidgetName: Constants.WIDGET_ID,
                Settings: {
                    "ProjectId": projectId
                }
            },
            true);
        }
    }

    private _onShowMoreClick(e, args) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryBuild(Events.SHOW_MORE_CLICK_EVENT, {}, true);
    }

    private _onTitleClick(e, args) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryBuild(Events.TITLE_CLICK_EVENT, {}, true);
    }

    private _onRowClick(e, args) {
        var url = this._urlPrefix + Constants.BUILD_HUB_URL + Constants.BUILD_FAV_URL + args.id;

        var telemetryProperties: { [key: string]: string } = { "buildDefinitionId": args.id };
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryBuild(Events.ROW_CLICK_EVENT, telemetryProperties, true);

        if (args.features) {
            window.open(url, args.target, args.features);
        } else {
            window.open(url, args.target);
        }
    }

    private _onHistogramClick(e, args) {
        var url = this._urlPrefix + Constants.BUILD_HUB_URL + Utils_String.format(Constants.BUILD_ID_URL, args.id);
        window.open(url, "_self");

        var telemetryProperties: { [key: string]: string } = { "buildId": args.id };
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryBuild(Events.HISTOGRAM_CLICK_EVENT, telemetryProperties, true);
    }

    private _updateLayout(results: BuildManager.IMyBuildDefinitionResults) {
        var totalResults = -1;
        if (results) {
            totalResults = results.buildDefinitions.length;
        }
        if (totalResults >= 0) {
            this._$countDetails.text(Utils_String.format("({0})", totalResults.toString()));
            this._$countDetails.show();
        } else {
            this._$countDetails.hide();
        }
    }

    private _logWidgetLoadFailure(error: string) {
        MyWorkTelemetry.MyWorkTelemetry.publishTelemetryBuild(MyWorkTelemetry.TelemetryConstants.WIDGET_LOAD_ERROR, { "error": error });
    }
}
Controls.Enhancement.registerEnhancement(BuildWidgetView, "." + Constants.CORE_CSS_CLASS);

SDK.VSS.register("Microsoft.VisualStudioOnline.MyWork.BuildViewWidget", () => BuildWidgetView);
SDK.registerContent("Microsoft.VisualStudioOnline.MyWork.BuildViewWidget.Initialize", (context) => {
    return Controls.create(BuildWidgetView, context.$container, context.options);
});
