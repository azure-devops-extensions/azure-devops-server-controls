/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />


import Q = require("q");

import Dashboard_Contracts = require("Dashboards/Scripts/Contracts");

import Configuration = require("TestManagement/Scripts/TestReporting/Widgets/Traceability.Configuration");
import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");
import TraceabilityGridView = require("TestManagement/Scripts/TestReporting/Traceability/GridView");
import WorkItemDataProvider = require("TestManagement/Scripts/TestReporting/DataProviders/WorkItem.DataProvider");
import { ServiceManager as TMServiceManager } from "TestManagement/Scripts/TFS.TestManagement.Service";

import Contracts = require("TFS/TestManagement/Contracts");
import TFS_Dashboard_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboard_WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

import BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");

import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";

import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

let delegate = Utils_Core.delegate;

export class Constants {
    public static CORE_CSS_CLASS: string = "testresults-traceability-widget";
    public static GRID_CONTAINER_CSS_CLASS: string = "testresults-traceability-widget-grid-container";
    public static TITLE_CSS_CLASS: string = "testresults-traceability-widget-title";
    public static TITLE_CONTAINER_CSS_CLASS: string = "testresults-traceability-widget-title-container";
    public static RESULTS_CONTAINER_CSS_CLASS: string = "testresults-traceability-widget-results-container";
    public static VIEW_ALL_CSS_CLASS: string = "testresults-traceability-widget-view-all";
    public static MORE_REQUIREMENTS_CSS_CLASS = "testresults-traceability-widget-more-requirements";
    public static CLASS_NAME_UNCONFIGURED = "unconfigured";

    public static MAX_REQUIREMENT_COUNT: number = 100;

    public static ROW_CLICK_EVENT: string = "testresults-traceability-widget-row-click-event";
}

export interface ITraceabilityWidgetData {
    testSummary: Contracts.TestSummaryForWorkItem[];
    workItemColorsProvider: WorkItemTypeColorAndIconsProvider;
}

export class TraceabilityWidgetView extends BaseWidget.BaseWidgetControl<Dashboard_Contracts.WidgetOptions>
    implements TFS_Dashboard_WidgetContracts.IConfigurableWidget {

    public initializeOptions(options?: Dashboard_Contracts.WidgetOptions) {
        super.initializeOptions($.extend({
            coreCssClass: Constants.CORE_CSS_CLASS
        }, options));
    }

    public preload(widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {
        this._initializeLayout();

        if (!widgetSettings.customSettings.data) {
            // Configuration options are not available. Widget configuration required.
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
        }

        return this._updateWidgetConfigOptions(widgetSettings.customSettings.data)
            .then((status: TFS_Dashboard_WidgetContracts.WidgetStatus) => {
                this._updateWidgetTitle(widgetSettings.name || Resources.RequirementsQuality);

                return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
            });
    }

    public load(widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {
        if (!widgetSettings.customSettings.data) {
            this.showUnConfiguredControl(widgetSettings.size, widgetSettings.name);
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Unconfigured();
        }

        return this.fetchData()
            .then((traceabilityWidgetData: ITraceabilityWidgetData) => {
                try {
                    this._grid.setColorsProvider(traceabilityWidgetData.workItemColorsProvider);

                    this._successfullWidgetSetting = $.extend(true, {}, widgetSettings);

                    this._testSummaryData = traceabilityWidgetData.testSummary || [];
                    this.displayResult(this._testSummaryData);    
                    this._populateMoreRequirementsSection(this._testSummaryData.length);                
                    return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
                }
                catch (error) {
                    return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(error);
                }
            }, (error) => {
                return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(error);
            });
    }

    public reload(newWidgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {
        if (!this._hasConfigurationChanged(newWidgetSettings)) {
            this._updateWidgetTitle(newWidgetSettings.name);
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
        }

        if (this.getElement().hasClass(Constants.CLASS_NAME_UNCONFIGURED)) {
            this.getElement().empty();
            this._initializeLayout();
        }

        if (!newWidgetSettings.customSettings.data) {
            this.showUnConfiguredControl(newWidgetSettings.size, newWidgetSettings.name);
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Unconfigured();
        }

        return this._updateWidgetConfigOptions(newWidgetSettings.customSettings.data).then((status: TFS_Dashboard_WidgetContracts.WidgetStatus) => {
            this._updateWidgetTitle(newWidgetSettings.name || Resources.RequirementsQuality);
            return this.load(newWidgetSettings);
        });
    }

     public listen(event: string, data: TFS_Dashboard_WidgetContracts.EventArgs<any>): void {
        if (event === TFS_Dashboard_WidgetHelpers.WidgetEvent.LightboxResized) {
            let lightboxSize = <TFS_Dashboard_WidgetContracts.EventArgs<TFS_Dashboard_WidgetContracts.Size>>data;
            let height = lightboxSize.data.height;
            let width = lightboxSize.data.width;
            let abc = this.getElement();
            this.getElement().css("width", width).css("height", height);
        }
    }

    public lightbox(widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings, lightboxSize: TFS_Dashboard_WidgetContracts.Size): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {
        this._isInLightbox = true;
        return this.preload(widgetSettings).then(() => {
            this.getElement().addClass("lightboxed");
            this.getElement().css("width", lightboxSize.width).css("height", lightboxSize.height);
            return this.load(widgetSettings);
        });      
    }

    public fetchData(): IPromise<ITraceabilityWidgetData> {
        let deferred: Q.Deferred<ITraceabilityWidgetData> = Q.defer<ITraceabilityWidgetData>();

        let dataProvider = WorkItemDataProvider.WorkItemDataProvider.getInstance();
        let workItemColorsPromise: IPromise<WorkItemTypeColorAndIconsProvider> = dataProvider.beginGetColorsProvider();
        let testSummaryPromise: IPromise<Contracts.TestSummaryForWorkItem[]> = this.fetchResultSummaryData();

        Q.all([workItemColorsPromise, testSummaryPromise])
            .then((response: any[]) => {
                let workItemsColorsProvider: WorkItemTypeColorAndIconsProvider = response[0];
                let testSummaryData: Contracts.TestSummaryForWorkItem[] = response[1];

                let widgetData: ITraceabilityWidgetData = {
                    testSummary: testSummaryData,
                    workItemColorsProvider: workItemsColorsProvider
                };

                deferred.resolve(widgetData);
            }, (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public displayResult(results: Contracts.TestSummaryForWorkItem[]): void {
        let truncatedResults: Contracts.TestSummaryForWorkItem[] = results.slice(0, this._getNumberOfRowsToDisplay());      
        this._grid.setDataSource(truncatedResults, null, null, null, 0);    
        this._$resultsContainer.show();
    }

    public fetchResultSummaryData(): IPromise<Contracts.TestSummaryForWorkItem[]> {
        let deferred: Q.Deferred<Contracts.TestSummaryForWorkItem[]> = Q.defer<Contracts.TestSummaryForWorkItem[]>();

        let dataProvider = WorkItemDataProvider.WorkItemDataProvider.getInstance();
        let queryId: string = this._widgetConfigOptions.workItemQuery ? this._widgetConfigOptions.workItemQuery.queryId : null;

        dataProvider.beginWorkItemIdsFromQueryId(queryId)
            .then((workItemIds: number[]) => {
            let branchName: string = this._getSelectedBranchName();
            let repositoryId: string = this._getSelectedRepositoryId();
            let context: Contracts.TestResultsContextType = this._widgetConfigOptions.context;
                let resultsContext = <Contracts.TestResultsContext>{
                    contextType: context,
                };
                switch (context) {
                    case Contracts.TestResultsContextType.Build:
                        resultsContext.build = <Contracts.BuildReference>{
                            definitionId: this._widgetConfigOptions.buildDefinition.id,
                            branchName: branchName,
                            repositoryId: repositoryId
                        };
                        break;
                    case Contracts.TestResultsContextType.Release:
                        resultsContext.release = <Contracts.ReleaseReference>{
                            definitionId: this._widgetConfigOptions.releaseDefinition.id
                        };
                        break;
                }
                TMServiceManager.instance().testResultsService().getTestSummaryByRequirements(resultsContext, workItemIds)
                    .then((testSummary: Contracts.TestSummaryForWorkItem[]) => {
                        deferred.resolve(testSummary);
                    }, (error) => {
                        deferred.reject(error);
                    });

            }, (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    private _populateMoreRequirementsSection(requirementsCount: number): void {
        if (!this._isInLightbox) {
            let rows = this._getNumberOfRowsToDisplay();
            if (requirementsCount > 0 && rows < requirementsCount) {
                this._$moreRequirements.text(Utils_String.format(Resources.MoreRequirementsText, (requirementsCount - rows)));
            }
        }
    }

    private _getSelectedBranchName(): string{
        if (this._widgetConfigOptions.repoAndBranch.version) {
            return GitRefUtility.versionStringToRefName(this._widgetConfigOptions.repoAndBranch.version);
        }        

        // for tfVc projects there will be path and not repo/branch
        return this._widgetConfigOptions.repoAndBranch.path;
    }

    private _getSelectedRepositoryId(): string {
        if (this._widgetConfigOptions.repoAndBranch.repositoryId) {
            return this._widgetConfigOptions.repoAndBranch.repositoryId;
        }        
        // for tfVc projects the repository Id is "$/"
        return this._defaultRepositoryId;
    }

    private _updateWidgetConfigOptions(data: string): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {
        let retValue: IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> = TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();

        try {
            let parsedData = JSON.parse(data);
            this._widgetConfigOptions = parsedData;
            this._widgetConfigOptions.context = parsedData.context;
            this._widgetConfigOptions.buildDefinition = parsedData.buildDefinition;
            this._widgetConfigOptions.releaseDefinition = parsedData.releaseDefinition;
            this._widgetConfigOptions.workItemQuery = parsedData.workItemQuery;
            this._widgetConfigOptions.repoAndBranch = parsedData.repoAndBranch;
            retValue = TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
        }
        catch (e) {
            retValue = TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(e);
        }

        return retValue;
    }

    private _initializeLayout() {
        let widgetTemplate: JQuery = $(`<div class='${Constants.TITLE_CONTAINER_CSS_CLASS}'>
                                         <span class='${Constants.TITLE_CSS_CLASS}'/>        
                                      </div>
                                       <div class='${Constants.RESULTS_CONTAINER_CSS_CLASS}'>
                                           <div class='${Constants.GRID_CONTAINER_CSS_CLASS}'/>
                                       </div>
                                      <span class='${Constants.MORE_REQUIREMENTS_CSS_CLASS}'/>
                                      <a class='${Constants.VIEW_ALL_CSS_CLASS}'/>`);

        this._element.append(widgetTemplate);
        this._$titleContainer = this.getElement().find("." + Constants.TITLE_CONTAINER_CSS_CLASS);
        this._$gridContainer = this.getElement().find("." + Constants.GRID_CONTAINER_CSS_CLASS);
        this._$resultsContainer = this.getElement().find("." + Constants.RESULTS_CONTAINER_CSS_CLASS);
       
        this._$moreRequirements = this.getElement().find("." + Constants.MORE_REQUIREMENTS_CSS_CLASS);

        this._grid = <TraceabilityGridView.TestResultsTraceabilityWidgetGrid>Controls.BaseControl.createIn(
            TraceabilityGridView.TestResultsTraceabilityWidgetGrid,
            this._$gridContainer,
            {
                showExpandedView: this._isInLightbox
            }
        );

        this._$resultsContainer.hide();
      
    }

    private _hasConfigurationChanged(newWidgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): boolean {
        return (this._successfullWidgetSetting === null
            || this._successfullWidgetSetting === undefined
            || (newWidgetSettings.customSettings.data !== this._successfullWidgetSetting.customSettings.data)
            || (newWidgetSettings.size.columnSpan !== this._successfullWidgetSetting.size.columnSpan)
            || (newWidgetSettings.size.rowSpan !== this._successfullWidgetSetting.size.rowSpan));
    }

    private _getNumberOfRowsToDisplay(): number {
        if (this._isInLightbox) {
            if (this._testSummaryData.length <= Constants.MAX_REQUIREMENT_COUNT) {
                return this._testSummaryData.length;
            }
            return Constants.MAX_REQUIREMENT_COUNT;
        }
        else {
            let rowSpan: number = this._successfullWidgetSetting ?
                this._successfullWidgetSetting.size.rowSpan : Constants.MAX_REQUIREMENT_COUNT;

            switch (rowSpan) {
                case 2:
                    return 7;
                case 3:
                    return 12;
                case 4:
                    return 18;
            }

            return Constants.MAX_REQUIREMENT_COUNT;
        }
       
    }

    private _updateWidgetTitle(title: string): void {
        let titleElement: JQuery;

        this._$titleContainer.empty();

        titleElement = $(`<span />`).addClass(Constants.TITLE_CSS_CLASS);
        titleElement.text(title);
        RichContentTooltip.addIfOverflow(title, titleElement);

        this._$titleContainer.append(titleElement);
    }

    private _$titleContainer: JQuery;
    private _$gridContainer: JQuery;
    private _$resultsContainer: JQuery;
    private _$moreRequirements: JQuery;

    private _grid: TraceabilityGridView.TestResultsTraceabilityWidgetGrid;
    private _successfullWidgetSetting: TFS_Dashboard_WidgetContracts.WidgetSettings;
    private _widgetConfigOptions: Configuration.ITraceabilityWidgetConfigurationOptions;
    private _testSummaryData: Contracts.TestSummaryForWorkItem[];
    private _defaultRepositoryId: string = "$/";
    private _isInLightbox = false;
}

SDK.registerContent("testresults.traceability.initialize", (context) => {
    return Controls.create(TraceabilityWidgetView, context.$container, context.options);
});
