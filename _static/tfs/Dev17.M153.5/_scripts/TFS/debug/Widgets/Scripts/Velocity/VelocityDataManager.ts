import { AdvancedFeaturesPanelValues } from './AdvancedFeaturesPanel';
import { FunctionNameParser } from 'Dashboards/Scripts/Common';
import { WorkItemStateCategory } from 'Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service';
import WITConstants = require('Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants');
import { ProjectCollection } from 'Presentation/Scripts/TFS/TFS.OM.Common';
import * as Q from 'q';
import * as ArrayUtils from 'VSS/Utils/Array';

import StringUtils = require('VSS/Utils/String');

import { Iteration } from "Analytics/Scripts/CommonClientTypes";
import { IterationsQuery } from 'Analytics/Scripts/QueryCache/IterationsQuery';

import { DemandType } from 'WidgetComponents/Demands/DemandType';
import { LayoutState, MessageType } from 'WidgetComponents/LayoutState';

import { wiqlURLBuilder } from 'Widgets/Scripts/AssignedToMe';
import { WidgetsCacheableQueryService } from 'Widgets/Scripts/DataServices/WidgetsCacheableQueryService';
import {
    AggregationWorkItemTypeFieldsQuery,
} from 'Widgets/Scripts/DataServices/ConfigurationQueries/AggregationWorkItemTypeFieldsQuery';
import { AggregationMode } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import { WidgetDataManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase';
import WidgetResources = require('Widgets/Scripts/Resources/TFS.Resources.Widgets');
import Resources = require('Widgets/Scripts/Resources/TFS.Resources.Widgets');
import { ModefulValueSetting } from 'Widgets/Scripts/Shared/ModefulValueSetting';
import { WorkItemTypeFilterMode } from 'Widgets/Scripts/Shared/WorkItemTypePicker';
import {
    CompletedLateMetastateByIterationDetailsQuery,
} from 'Widgets/Scripts/Velocity/Queries/CompletedLateMetastateByIterationDetailsQuery';
import {
    CompletedLateMetastateByIterationsQuery,
} from 'Widgets/Scripts/Velocity/Queries/CompletedLateMetastateByIterationsQuery';
import { MetastateByIterationDetailsQuery } from 'Widgets/Scripts/Velocity/Queries/MetastateByIterationDetailsQuery';
import { MetastateByIterationsQuery } from 'Widgets/Scripts/Velocity/Queries/MetastateByIterationsQuery';
import { PlannedWorkByDayDetailsQuery } from 'Widgets/Scripts/Velocity/Queries/PlannedWorkByDayDetailsQuery';
import { PlannedWorkByDayQuery } from 'Widgets/Scripts/Velocity/Queries/PlannedWorkByDayQuery';
import { VelocityConstants } from 'Widgets/Scripts/Velocity/VelocityConstants';
import {
    Metastate,
    Work,
    WorkItem,
    WorkItemTypeField,
    WorkItemWithState,
} from 'Widgets/Scripts/Velocity/VelocityDataContract';
import { VelocityDataHelper } from 'Widgets/Scripts/Velocity/VelocityDataHelper';
import { VelocitySettings } from 'Widgets/Scripts/Velocity/VelocitySettings';
import { SettingsHelper } from 'Widgets/Scripts/Utilities/SettingsHelper';
import { WidgetTelemetry } from 'Widgets/Scripts/VSS.Widget.Telemetry';
import { VelocityChartOptionFactory, VelocityChartClickEventData, IHandleVelocityChartEvents, VelocityChartInputs } from 'Widgets/Scripts/Velocity/VelocityChartOptionFactory';

import { AnalyticsExceptionType, AnalyticsExceptionParsing, ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { WidgetLinkHelper } from 'Widgets/Scripts/WidgetLinkHelper';


/**
 * Responsible for heuristically optimizing for the lowest cost set of query implementations for Velocity data requirements.
 */
export class VelocityDataManager extends WidgetDataManagerBase implements IHandleVelocityChartEvents {
    //Encapsulates state for downstream querying on click events. This needs to be factored away from here.
    private queryContext: { velocitySettings: VelocitySettings, workItemTypes: string[] };


    private getWorkItemTypes(velocitySettings: VelocitySettings): IPromise<string[]> {
        if (velocitySettings.workItemTypeFilter.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
            return SettingsHelper.getTeamWorkItemTypesOfBacklogCategory(velocitySettings.projectId, velocitySettings.teamId, velocitySettings.workItemTypeFilter.settings);
        } else {
            return Q([velocitySettings.workItemTypeFilter.settings]);
        }
    }

    /** Start running any demands which require async behavior. */
    public getData(): IPromise<LayoutState> {
        //Note: Scalar, subtitle and chart all rely on results from the same trend query. Scalar provides an average sum/count across iterations, and subtitle provides a count of the number of iterations we saw.
        // With this requirement - there is no substantial optimizations to distinguish the queries for those demands..
        if (!this.demandTracker.isDemandPresent(DemandType.subtitle)
            && !this.demandTracker.isDemandPresent(DemandType.scalar)
            && !this.demandTracker.isDemandPresent(DemandType.chart)) {
            return Q.resolve(this.currentState);
        }
        else {
            let dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
            //Only implementing general chart demand, at this stage.
            let velocitySettings = JSON.parse(this.settings.data) as VelocitySettings;

            let teamId = velocitySettings.teamId;
            let projectId = velocitySettings.projectId;
            let desiredIterationCount = velocitySettings.numberOfIterations;
            let aggregation: ModefulValueSetting<AggregationMode, string> = velocitySettings.aggregation;

            let iterationsQueryPromise = this.getIterations(dataService, projectId, teamId, desiredIterationCount);
            return this.getWorkItemTypes(velocitySettings)
                .then(workItemTypes => {
                    return iterationsQueryPromise
                        .then((iterations: Iteration[]) => {
                            if (iterations && iterations.length > 0) {
                                var iterationIds: string[] = [];
                                iterations.map((iteration: Iteration) => {
                                    iterationIds.push(iteration.IterationSK);
                                });

                                let demandFulfillmentPromises = [];

                                // Metastate
                                demandFulfillmentPromises.push(this.getMetastate(dataService, iterationIds, projectId, teamId, aggregation, workItemTypes));

                                // Late work (if delay is undefined, the feature is off... don't perform the query and instead return a promise resolved to null)
                                demandFulfillmentPromises.push((velocitySettings.lateWorkDelay != null)
                                    ? this.getCompletedLateMetastate(dataService, iterations, projectId, teamId, aggregation, workItemTypes, velocitySettings.lateWorkDelay)
                                    : Q<void>(null));

                                // Planned work (if delay is undefined, the feature is off... don't perform the query and instead return a promise resolved to null)
                                demandFulfillmentPromises.push((velocitySettings.plannedWorkDelay != null)
                                    ? this.getPlannedWorkByDay(dataService, projectId, teamId, iterations, aggregation, workItemTypes, velocitySettings.plannedWorkDelay)
                                    : Q<void>(null));

                                // AggregationWorkItemTypeField
                                demandFulfillmentPromises.push(this.getAggregationWorkItemTypeFields(dataService, projectId));

                                return Q.all(demandFulfillmentPromises)
                                    .spread((metastateQueryResult: Metastate[], completedLateQueryResult: Metastate[], plannedWorkByDayQueryResult: Work[], aggregationWorkItemTypeFieldResult: WorkItemTypeField[]) => {
                                        if (metastateQueryResult.length === 0) {
                                            return this.packMessageAsState(MessageType.NoData);
                                        }

                                        this.queryContext = {
                                            velocitySettings: velocitySettings,
                                            workItemTypes: workItemTypes
                                        };

                                        let chartInputs: VelocityChartInputs = {
                                            velocityClickHandler: this,

                                            iterations: iterations,
                                            metastateResult: metastateQueryResult,
                                            plannedWorkByDayResult: plannedWorkByDayQueryResult,
                                            completedLateResult: completedLateQueryResult,

                                            suppressAnimations: this.suppressAnimations,
                                            isAdvancedChart: velocitySettings.plannedWorkDelay != null,
                                            allowChartClicks: WidgetLinkHelper.canOpenAsyncLink()
                                        };
                                        const chartOptions = new VelocityChartOptionFactory().createChartOptions(chartInputs);

                                        this.currentState = {
                                            showMessage: false,
                                            title: { text: this.title },
                                            subtitle: { text: VelocityDataHelper.getSubtitle(iterations.length) },
                                            scalarData: {
                                                description: WidgetResources.VelocityWidget_AverageVelocity,
                                                measure: VelocityDataHelper.getScalarMeasure(aggregationWorkItemTypeFieldResult, aggregation),
                                                value: (metastateQueryResult && metastateQueryResult.length > 0) ? VelocityDataHelper.getAverageVelocity(metastateQueryResult, iterations) : 0
                                            },
                                            chartData: {
                                                chartOptions: chartOptions
                                            }
                                        };

                                        return this.currentState;
                                    });
                            } else {
                                // No iteration data available - set iteration dates.
                                return this.packMessageAsState(MessageType.SetIterationDates);
                            }
                        });
                })
                .then(null, error => { // Catch pattern
                    let messageType = MessageType.WidgetError;
                    // Check if we should show fault-in instead
                    if (AnalyticsExceptionParsing.recognizeAnalyticsException(error) === AnalyticsExceptionType.DataNotReady) {
                        messageType = MessageType.AxFaultIn;
                    }

                    let errorMessage = ErrorParser.stringifyODataError(error);
                    return this.packMessageAsState(messageType, errorMessage);
                });
        }
    }

    private getIterations(dataService: WidgetsCacheableQueryService, projectId: string, teamId: string, desiredIterationCount: number): IPromise<Iteration[]> {
        let iterationsQuery = IterationsQuery.onTeam(projectId, teamId, desiredIterationCount, "IterationSK,IterationName,StartDate,EndDate,IsEnded,IterationPath");

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getIterations),
            () => dataService.getCacheableQueryResult<Iteration[]>(iterationsQuery));
    }

    private getMetastate(dataService: WidgetsCacheableQueryService, iterationIds: string[], projectId: string, teamId: string, aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[]): IPromise<Metastate[]> {
        let metastateQuery = new MetastateByIterationsQuery(projectId, teamId, iterationIds, aggregation, workItemTypes);

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getMetastate),
            () => dataService.getCacheableQueryResult<Metastate[]>(metastateQuery));
    }

    private getCompletedLateMetastate(dataService: WidgetsCacheableQueryService, iterations: Iteration[], projectId: string, teamId: string, aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], delay: number): IPromise<Metastate[]> {
        let completedLateQuery = new CompletedLateMetastateByIterationsQuery(projectId, teamId, iterations, aggregation, workItemTypes, delay);

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getCompletedLateMetastate),
            () => dataService.getCacheableQueryResult<Metastate[]>(completedLateQuery));
    }

    private getPlannedWorkByDay(dataService: WidgetsCacheableQueryService, projectId: string, teamId: string, iterations: Iteration[], aggregation: ModefulValueSetting<AggregationMode, string>, workItemTypes: string[], delay: number): IPromise<Work[]> {
        let plannedWorkQuery = new PlannedWorkByDayQuery(projectId, teamId, iterations, aggregation, workItemTypes, delay);

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getPlannedWorkByDay),
            () => dataService.getCacheableQueryResult<Work[]>(plannedWorkQuery));
    }


    public handleLegendClick(): void {
        WidgetTelemetry.onWidgetClick(this.widgetTypeId, "LegendClicked");
    }

    public handleChartClick(clickEvent: VelocityChartClickEventData): void {
        //If the clicked point has no state, no-op on handling the click.
        if (clickEvent.valueAtPoint) {
            // Some browser popup blockers do not allow opening a new window if it is not performed on the main thread
            // of execution resulting from a user action. To circumvent this we open a window on the main thread and
            // assign a new URL to it later once we've constructed it.
            let tempWindow = window.open();
            let dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
            let promise: IPromise<WorkItem[]>;

            switch (clickEvent.stateName) {
                case Resources.VelocityChart_Planned_StateName:
                    promise = this.getPlannedWorkByDayDetails(dataService, this.queryContext.velocitySettings.projectId, this.queryContext.velocitySettings.teamId, clickEvent.iteration, this.queryContext.workItemTypes, this.queryContext.velocitySettings.plannedWorkDelay);
                    break;
                case Resources.VelocityChart_CompletedLate_StateName:
                    promise = this.getCompletedLateMetastateDetails(dataService, this.queryContext.velocitySettings.projectId, this.queryContext.velocitySettings.teamId, clickEvent.iteration, this.queryContext.workItemTypes, this.queryContext.velocitySettings.lateWorkDelay);
                    break;
                case Resources.VelocityChart_Completed_StateName:
                    promise = this.getCompletedMetastateDetails(dataService, this.queryContext.velocitySettings.projectId, this.queryContext.velocitySettings.teamId, clickEvent.iteration, this.queryContext.workItemTypes, this.queryContext.velocitySettings.lateWorkDelay);
                    break;
                case Resources.VelocityChart_Incomplete_StateName:
                    promise = this.getIncompleteMetastateDetails(dataService, this.queryContext.velocitySettings.projectId, this.queryContext.velocitySettings.teamId, clickEvent.iteration, this.queryContext.workItemTypes);
                    break;
            }

            if (promise != null) {
                promise.then((workItems: WorkItem[]) => {
                    const workItemIds = workItems.map(wi => wi.WorkItemId);
                    WidgetTelemetry.onWidgetClick(this.widgetTypeId, "ChartClicked");

                    this.navigateToWorkItemList(clickEvent.stateName, clickEvent.iteration, workItemIds, tempWindow);
                })
                    .then(undefined, error => {
                        WidgetTelemetry.onWidgetFailure(this.widgetTypeId, "Failure handling chart click in Velocity Chart.", "handleChartClick", { "ErrorDetail": JSON.stringify(error) });
                    });
            }
        }
    }

    private navigateToWorkItemList(metastate: string, iteration: Iteration, workItemIds: string[], tempWindow: Window) {
        let velocitySettings = JSON.parse(this.settings.data) as VelocitySettings;

        let wiql = `SELECT [${WITConstants.CoreFieldRefNames.Id}],[${WITConstants.CoreFieldRefNames.WorkItemType}],[${WITConstants.CoreFieldRefNames.Title}] ` +
            `FROM WorkItems WHERE [${WITConstants.CoreFieldRefNames.Id}] IN ({0})`;
        wiql = StringUtils.format(wiql, workItemIds.join(","));

        let tempQueryName = `${this.title} - ${iteration.IterationName} - ${metastate}`;

        this.navigateToQueryPage(wiql, tempQueryName, tempWindow);
    }

    private navigateToQueryPage(wiql: string, queryName: string, tempWindow: Window) {
        let queryBuilder = new wiqlURLBuilder()
            .BuildQueryURL(wiql, queryName)
            .then(url => {
                tempWindow.location.href = url;
            });
    }

    private getCompletedMetastateDetails(dataService: WidgetsCacheableQueryService, projectId: string, teamId: string, iteration: Iteration, workItemTypes: string[], lateWorkDelay?: number): IPromise<WorkItemWithState[]> {
        let metastateQuery = new MetastateByIterationDetailsQuery(iteration.IterationSK, projectId, teamId, workItemTypes);

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getMetastate),
            () => {
                let lateWorkPromise: IPromise<WorkItemWithState[]> = Q([]);
                if (lateWorkDelay != null) {
                    lateWorkPromise = this.getCompletedLateMetastateDetails(dataService, projectId, teamId, iteration, workItemTypes, lateWorkDelay);
                }

                let completedWorkPromise = dataService.getCacheableQueryResult<WorkItemWithState[]>(metastateQuery);

                return Q.spread<WorkItemWithState[], WorkItemWithState[]>([completedWorkPromise, lateWorkPromise], (metaWork: WorkItemWithState[], lateWork: WorkItemWithState[]) => {
                    let completedWork = metaWork.filter(wi => wi.StateCategory === WorkItemStateCategory[WorkItemStateCategory.Completed]);

                    let diff = ArrayUtils.subtract(completedWork, lateWork, (wi1: WorkItemWithState, wi2: WorkItemWithState) => StringUtils.defaultComparer(wi1.WorkItemId, wi2.WorkItemId));
                    return diff;
                }, null);
            });
    }

    private getIncompleteMetastateDetails(dataService: WidgetsCacheableQueryService, projectId: string, teamId: string, iteration: Iteration, workItemTypes: string[]): IPromise<WorkItemWithState[]> {
        let metastateQuery = new MetastateByIterationDetailsQuery(iteration.IterationSK, projectId, teamId, workItemTypes);

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getMetastate),
            () => {
                return dataService.getCacheableQueryResult<WorkItemWithState[]>(metastateQuery)
                    .then(metaWork => {
                        return metaWork.filter(wi => wi.StateCategory === WorkItemStateCategory[WorkItemStateCategory.InProgress]);
                    });
            });
    }

    private getCompletedLateMetastateDetails(dataService: WidgetsCacheableQueryService, projectId: string, teamId: string, iteration: Iteration, workItemTypes: string[], delay: number): IPromise<WorkItemWithState[]> {
        let completedLateQuery = new CompletedLateMetastateByIterationDetailsQuery(iteration, projectId, teamId, workItemTypes, delay);

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getCompletedLateMetastate),
            () => dataService.getCacheableQueryResult<WorkItemWithState[]>(completedLateQuery));
    }

    private getPlannedWorkByDayDetails(dataService: WidgetsCacheableQueryService, projectId: string, teamId: string, iteration: Iteration, workItemTypes: string[], delay: number): IPromise<WorkItem[]> {
        let plannedWorkQuery = new PlannedWorkByDayDetailsQuery(projectId, teamId, iteration, workItemTypes, delay);

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getPlannedWorkByDay),
            () => dataService.getCacheableQueryResult<WorkItem[]>(plannedWorkQuery));
    }

    private getAggregationWorkItemTypeFields(dataService: WidgetsCacheableQueryService, projectId: string): IPromise<WorkItemTypeField[]> {
        let aggregationWorkItemTypeFieldsQuery = new AggregationWorkItemTypeFieldsQuery(projectId);

        return WidgetTelemetry.executeAndTimeAsync(
            VelocityConstants.featureName,
            FunctionNameParser.getMethodName(this, this.getAggregationWorkItemTypeFields),
            () => dataService.getCacheableQueryResult<WorkItemTypeField[]>(aggregationWorkItemTypeFieldsQuery));
    }
}
