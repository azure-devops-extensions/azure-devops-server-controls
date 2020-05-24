import * as Q from 'q';

import { AnalyticsExceptionType, AnalyticsExceptionParsing, ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";

import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

import { LayoutState, MessageType } from "WidgetComponents/LayoutState";

import { WidgetDataManagerBase, WidgetDataManagerOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase";
import { WidgetsCacheableQueryService } from "Widgets/Scripts/DataServices/WidgetsCacheableQueryService";

import { AnalyticsTestTrendSettings } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings';
import { AnalyticsTestTrendLayoutStateFactory } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendLayoutStateFactory';
import { TestTrendQuery, TestTrendResult } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/TestTrendQuery';
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
export class AnalyticsTestTrendDataManager extends WidgetDataManagerBase {

    private dataService: WidgetsCacheableQueryService;

    constructor(options: WidgetDataManagerOptions) {
        super(options);
        this.dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
    }

    private analyticsOnRejectedHandler(reason: any): IPromise<LayoutState> {
        let messageType = MessageType.WidgetError;

        // Check if we should show fault-in instead
        if (AnalyticsExceptionParsing.recognizeAnalyticsException(reason) === AnalyticsExceptionType.DataNotReady) {
            messageType = MessageType.AxFaultIn;
        }

        let errorMessage = ErrorParser.stringifyODataError(reason);
        return this.packMessageAsState(messageType, errorMessage);
    }

    private areRequiredFieldsSet(settings: AnalyticsTestTrendSettings): boolean {
        let pipelines = settings.workflow === Workflow.Build ? settings.buildPipelines : settings.releasePipelines;
        return pipelines.length > 0;
    }

    /** Start running any demands which require async behavior. */
    public getData(): IPromise<LayoutState> {
        if (this.settings.data === undefined) {
            return this.packMessageAsState(MessageType.Unconfigured);
        }

        const settings = JSON.parse(this.settings.data) as AnalyticsTestTrendSettings;
        if (!this.areRequiredFieldsSet(settings)) {
            return this.packMessageAsState(MessageType.Unconfigured);
        }

        return Q.spread(
            this.getTestTrendResults(settings),
            (primaryResults, secondaryResults) => {
                if (primaryResults.length === 0) {
                    return this.packMessageAsState(MessageType.NoData);
                }

                let layoutStateFactory = new AnalyticsTestTrendLayoutStateFactory();
                this.currentState = layoutStateFactory.getLayoutState(settings, this.title, primaryResults, secondaryResults);
                this.currentState.chartData.chartOptions.suppressAnimation = this.suppressAnimations;
                return Promise.resolve(this.currentState);
            },
            (reason) => {
                return this.analyticsOnRejectedHandler(reason);
            }
        );
    }

    private getTestTrendResults(settings: AnalyticsTestTrendSettings): IPromise<TestTrendResult[]>[] {
        let chartMetrics = [
            settings.chartMetric,
            settings.secondaryChartMetric,
        ];
        chartMetrics = chartMetrics.filter(chartMetric => chartMetric.metric);
        let results = chartMetrics.map(chartMetric => {
            let query = new TestTrendQuery(settings, chartMetric);
            return this.dataService.getCacheableQueryResult(query);
        });
        return results;
    }
}