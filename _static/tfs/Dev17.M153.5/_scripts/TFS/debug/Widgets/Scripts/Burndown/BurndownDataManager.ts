import { ISettingsManager } from '../ModernWidgetTypes/SettingsManagerBase';
import { CommonChartOptions } from "Charts/Contracts";
import { WorkItemStateCategoryNames } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCategories";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import WITConstants = require('Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants');
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Q from 'q';
import * as CultureUtils from 'VSS/Utils/Culture';
import * as DateUtils from 'VSS/Utils/Date';
import * as StringUtils from 'VSS/Utils/String';
import * as NumberUtils from 'VSS/Utils/Number';
import { DemandType } from "WidgetComponents/Demands/DemandType";
import { LayoutState, MessageType } from "WidgetComponents/LayoutState";
import { ScalarComponentProps } from "WidgetComponents/ScalarComponent";
import { wiqlURLBuilder } from "Widgets/Scripts/AssignedToMe";
import { BurndownChartClickInfo } from "Widgets/Scripts/Burndown/BurndownChartOptionFactory";
import { BurndownDataFactory } from "Widgets/Scripts/Burndown/BurndownDataFactory";
import { CurrentEffortQuery } from "Widgets/Scripts/Burndown/Queries/CurrentEffortQuery";
import { BurndownChartOptionFactory } from "Widgets/Scripts/Burndown/BurndownChartOptionFactory";
import { WorkItemEffort, WorkItemFieldDescriptor, CurrentWorkItemAggregateEffort } from "Widgets/Scripts/Burndown/BurndownDataContract";
import { BurndownSettings, DateSampleMode, DateSamplingConfiguration, TimePeriodConfiguration } from "Widgets/Scripts/Burndown/BurndownSettings";
import BurndownSettingsManager from "Widgets/Scripts/Burndown/BurndownSettingsManager";
import { CompletedWorkItemIdsQuery } from "Widgets/Scripts/Burndown/Queries/CompletedWorkItemsQuery";
import { EffortSnapshotsQuery } from "Widgets/Scripts/Burndown/Queries/EffortSnapshotsQuery";
import { ProjectsIterationsByDateQuery } from "Widgets/Scripts/Burndown/Queries/ProjectsIterationsByDateQuery";
import { ProjectsIterationsByIdQuery } from "Widgets/Scripts/Burndown/Queries/ProjectsIterationsByIdQuery";
import { UnestimatedWorkItemsCountQuery, UnestimatedWorkItemIdsQuery } from "Widgets/Scripts/Burndown/Queries/UnestimatedWorkItemsQueries";
import { WorkItemIdsSnapshotQuery } from "Widgets/Scripts/Burndown/Queries/WorkItemIdsSnapshotQuery";
import { WidgetsCacheableQueryService } from "Widgets/Scripts/DataServices/WidgetsCacheableQueryService";
import { Iteration } from "Analytics/Scripts/CommonClientTypes";
import { AggregationMode } from "Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes";
import { WidgetDataManagerBase, WidgetDataManagerOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase";
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import { getTodayInAccountTimeZone } from "Widgets/Scripts/Shared/TimeZoneUtilities";
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";
import { WorkItemTypeFilterMode } from "Widgets/Scripts/Shared/WorkItemTypePicker";
import { BurnDirection } from 'Widgets/Scripts/Burndown/BurnDirection';
import { SettingsHelper } from "Widgets/Scripts/Utilities/SettingsHelper";
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";
import { TimeIntervalUtils } from "Widgets/Scripts/Burndown/TimeIntervalUtils";
import { LookBackDataManagerHelper } from 'Widgets/Scripts/LookBackDataManagerHelper';


import { AnalyticsExceptionType, AnalyticsExceptionParsing, ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";

/**
 * Responsible for heuristically optimizing for the lowest cost set of query implementations for Burndown data requirements.
 */
export class BurndownDataManager extends WidgetDataManagerBase {
    private dataService: WidgetsCacheableQueryService;
    private settingsManager: ISettingsManager<BurndownSettings>;

    constructor(options: WidgetDataManagerOptions, settingsManager?: ISettingsManager<BurndownSettings>) {
        super(options);
        this.dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        this.settingsManager = settingsManager ? settingsManager : new BurndownSettingsManager();
    }

    /**
     * Gets burn direction
     */
    protected getBurnDirection(): BurnDirection {
        return BurnDirection.Down;
    }

    /**
     * Looks up the work item type field name from a list of queried work item type fields.
     * @param aggregationWorkItemTypeFields
     * @param fieldReferenceName
     */
    private getWorkItemTypeFieldName(aggregationWorkItemTypeFields: WorkItemFieldDescriptor[], fieldReferenceName: string): string {
        let fieldName = StringUtils.empty;

        for (let workItemTypeField of aggregationWorkItemTypeFields) {
            if (StringUtils.ignoreCaseComparer(workItemTypeField.FieldReferenceName, fieldReferenceName) === 0) {
                fieldName = workItemTypeField.FieldName;
                break;
            }
        }

        return fieldName;
    }

    private getIterationsPromise(timePeriodConfiguration: TimePeriodConfiguration, projectIds: string[]): IPromise<Iteration[]> {
        let iterationIDs: string[] = <string[]>timePeriodConfiguration.samplingConfiguration.settings;

        // To avoid running the iterations query with invalid data, we return a helpful error.
        for (var id of iterationIDs) {
            if (!id) {
                return Q.reject(WidgetResources.Config_InvalidQueryValues);
            }
        }

        let iterationsQuery = (DateSampleMode[timePeriodConfiguration.samplingConfiguration.identifier] == DateSampleMode[DateSampleMode.ByIterations]) ?
             new ProjectsIterationsByIdQuery(projectIds, iterationIDs):
             new ProjectsIterationsByDateQuery(projectIds, timePeriodConfiguration.startDate);
        return this.dataService.getCacheableQueryResult(iterationsQuery);
    }

    private getEffortSnapshotsPromise(burndownSettings: BurndownSettings, workItemTypes: string[], workItemTypesFields: WorkItemFieldDescriptor[], sampleDates: string[], iterations?: Iteration[]): IPromise<WorkItemEffort[]> {
        const pastEffortQuery = new EffortSnapshotsQuery(
            sampleDates,
            burndownSettings.teams,
            burndownSettings.fieldFilters,
            burndownSettings.aggregation,
            workItemTypes,
            workItemTypesFields
        );

        return this.dataService.getCacheableQueryResult(pastEffortQuery);
    }

    private getUnestimatedCountPromise(burndownSettings: BurndownSettings, workItemTypes: string[], workItemTypeFields: WorkItemFieldDescriptor[]): IPromise<number> {
        const unestimatedCountQuery = new UnestimatedWorkItemsCountQuery(
            burndownSettings.teams,
            burndownSettings.fieldFilters,
            workItemTypes,
            workItemTypeFields,
            burndownSettings.aggregation.settings,
        );

        return this.dataService.getCacheableQueryResult(unestimatedCountQuery);
    }

    private getChartOptions(datesToTotalEffort: IDictionaryStringTo<number>, datesToEffort: IDictionaryStringTo<number>, remainingEffort: WorkItemEffort[], completedEffort: WorkItemEffort[], averageBurn: number, sampleDatesStructure: any, workItemTypes: string[], workItemTypesFields: WorkItemFieldDescriptor[], burndownSettings: BurndownSettings, allowChartClicks: boolean, iterations?: Iteration[]): IPromise<CommonChartOptions> {
        let colorPromise: IPromise<IDictionaryStringTo<string>>;
        if (burndownSettings.stackByWorkItemTypeEnabled) {
            // Use current context project to define work item type colors
            let contextProjectName = TfsContext.getDefault().contextData.project.name;
            colorPromise = BurndownDataManager.getWitColorDictionary(workItemTypes, contextProjectName);
        }
        else {
            colorPromise = Q(undefined);
        }

        return colorPromise.then((colorDictionary?: IDictionaryStringTo<string>) => {
                // Pass date interval if we're not using iterations
                let sampleDatesInterval = (iterations != null)
                    ? undefined
                    : (burndownSettings.timePeriodConfiguration.samplingConfiguration.settings as DateSamplingConfiguration).sampleInterval;

                let chartOptions = new BurndownChartOptionFactory().createChartOptions({
                    showCompletedEffort: burndownSettings.completedWorkEnabled,
                    showScopeTrendline: burndownSettings.totalScopeTrendlineEnabled,
                    showBurnTrendline: burndownSettings.burndownTrendlineEnabled,
                    iterations: iterations,
                    sampleDatesInterval: sampleDatesInterval,
                    lastGeneratedIntervalSampleDate: sampleDatesStructure.lastIntervalDate,
                    sampleDates: sampleDatesStructure.sampleDates,
                    datesToTotalEffort: datesToTotalEffort,
                    remainingEffort: remainingEffort,
                    completedEffort: completedEffort,
                    startDate: burndownSettings.timePeriodConfiguration.startDate,
                    suppressAnimations: this.suppressAnimations,
                    showStackedWorkItemTypes: burndownSettings.stackByWorkItemTypeEnabled,
                    workItemTypeColorDictionary: colorDictionary,
                    averageBurn: averageBurn,
                    datesToPrimarySeriesEffort: datesToEffort,
                    onClick: this.getOnClickChartHandler(burndownSettings, workItemTypes, workItemTypesFields),
                    burnDirection: this.getBurnDirection(),
                    allowChartClicks: allowChartClicks
                });

                return chartOptions;
            },(e)=>{
                WidgetTelemetry.onWidgetFailure(
                    this.widgetTypeId,
                    "Failure getting Work Item Color information.",
                    "ColorPromiseFailure",
                    { "ErrorDetail": JSON.stringify(e) });
            });
    }

    private getOnClickChartHandler(burndownSettings: BurndownSettings, allShownWorkItemTypes: string[], workItemTypesFields: WorkItemFieldDescriptor[]): (event: BurndownChartClickInfo) => void {
        return (event: BurndownChartClickInfo) => {

            let workItemTypes: string[];
            // Check if user clicked a series for a particular work item type
            if (event.seriesName !== WidgetResources.BurndownWidget_CompletedEffortSeriesName
                && event.seriesName !== WidgetResources.BurndownWidget_RemainingEffortSeriesName) {
                // Query for single item type if user clicked on specific item type - 
                // i.e.not green or blue "Completed" or "Remaining"
                workItemTypes = [event.seriesName];
            } else {
                // Otherwise query all types in that category
                workItemTypes = allShownWorkItemTypes;
            }

            // Determine which items to query - completed or remaining

            // For burndown, we query completed only if user explicitly clicked green "Completed"
            // which can't have specific work item series. 
            // Specific work item types only show up as remaining.

            // For burnup, we always query completed items, as we don't show remaining ones.

            const queryCompletedItems = this.getBurnDirection() === BurnDirection.Down ?
                event.seriesName === WidgetResources.BurndownWidget_CompletedEffortSeriesName
                :
                true;

            // Some browser popup blockers do not allow opening a new window if it is not performed on the main thread
            // of execution resulting from a user action. To circumvent this we open a window on the main thread and
            // assign a new URL to it later once we've constructed it.
            let tempWindow = window.open();
            this.dataService.getCacheableQueryResult(
                new WorkItemIdsSnapshotQuery(
                    event.sampleDate,
                    burndownSettings.teams,
                    burndownSettings.fieldFilters,
                    workItemTypesFields,
                    burndownSettings.aggregation,
                    queryCompletedItems,
                    workItemTypes
                )
            )
            .then((workItemIds: string[]) => {
                let queryNamePrefix = queryCompletedItems
                    ? WidgetResources.BurndownWidget_CompletedEffortSeriesName
                    : WidgetResources.BurndownWidget_RemainingEffortSeriesName;
                let tempQueryName = `${queryNamePrefix} work items - ${event.dataPointName}`;

                this.navigateToWorkItemList(tempQueryName, workItemIds, tempWindow);
            })
            .then(undefined, e => {
                WidgetTelemetry.onWidgetFailure(
                    this.widgetTypeId,
                    "Failure handling chart click in Burndown widget.",
                    "handleChartClick",
                    { "ErrorDetail": JSON.stringify(e) });
            });
        }
    }

    private getOnClickCompletedHandler(burndownSettings: BurndownSettings, workItemTypes: string[], workItemTypesFields: WorkItemFieldDescriptor[]): () => void {
        return () => {
            let tempWindow = window.open();
            this.dataService.getCacheableQueryResult(
                new CompletedWorkItemIdsQuery(
                    burndownSettings.teams,
                    burndownSettings.fieldFilters,
                    workItemTypes,
                    workItemTypesFields,
                    burndownSettings.aggregation
                )
            )
            .then(workItemIds => {
                const queryName = `Completed - ${this.title}`;
                this.navigateToWorkItemList(queryName, workItemIds, tempWindow);
            })
            .then(undefined, e => {
                WidgetTelemetry.onWidgetFailure(
                    this.widgetTypeId,
                    "Failure handling completed submetric click in Burndown widget.",
                    "handleChartClick",
                    { "ErrorDetail": JSON.stringify(e) });
            });
        }
    }

    private getOnClickUnestimatedHandler(burndownSettings: BurndownSettings, workItemTypes: string[], workItemTypesFields: WorkItemFieldDescriptor[]): () => void {
        return () => {
            let tempWindow = window.open();
            this.dataService.getCacheableQueryResult(
                new UnestimatedWorkItemIdsQuery(
                    burndownSettings.teams,
                    burndownSettings.fieldFilters,
                    workItemTypes,
                    workItemTypesFields,
                    burndownSettings.aggregation.settings
                )
            )
            .then(workItemIds => {
                const queryName = `Unestimated items - ${this.title}`;
                this.navigateToWorkItemList(queryName, workItemIds, tempWindow);
            })
            .then(undefined, e => {
                WidgetTelemetry.onWidgetFailure(
                    this.widgetTypeId,
                    "Failure handling unestimated submetric click in Burndown widget.",
                    "handleChartClick",
                    { "ErrorDetail": JSON.stringify(e) });
            });
        }
    }

    private navigateToWorkItemList(queryName: string, workItemIds: string[], tempWindow: Window): void {
        let workItemIdsString = workItemIds.join(",");
        let wiql = "";

        if (workItemIds.length > 0) {
            wiql = `SELECT [${WITConstants.CoreFieldRefNames.Id}],[${WITConstants.CoreFieldRefNames.Title}] FROM WorkItems WHERE [${WITConstants.CoreFieldRefNames.Id}] IN (${workItemIdsString})`;
        }

        this.navigateToQueryPage(wiql, queryName, tempWindow);
    }

    private navigateToQueryPage(wiql: string, queryName: string, tempWindow: Window) {
        let queryBuilder = new wiqlURLBuilder()
            .BuildQueryURL(wiql, queryName)
            .then(url => {
                tempWindow.location.href = url;
            });
    }

    private getRemainingEffortForHero(burndownSettings: BurndownSettings, workItemTypes: string[], workItemTypeFields: WorkItemFieldDescriptor[]): IPromise<ScalarComponentProps> {
        const remainingEffortQuery = new CurrentEffortQuery(
            burndownSettings.teams,
            burndownSettings.fieldFilters,
            burndownSettings.aggregation,
            workItemTypes,
            workItemTypeFields
        );

        let valuePromise = this.dataService
            .getCacheableQueryResult(remainingEffortQuery)
            .then(effort => {
                // Calculate total remaining effort
                let value = 0;
                effort.forEach(e => {
                    if (e.StateCategory !== WorkItemStateCategoryNames.Completed) {
                        value += e.AggregatedEffort;
                    }
                });

                return value;
            });

        let measurePromise: IPromise<string>;
        if (burndownSettings.aggregation.identifier === AggregationMode.Count) {
            if (burndownSettings.workItemTypeFilter.identifier === WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory]) {
                measurePromise = SettingsHelper.getPluralBacklogNameOfBacklogCategory(
                    TfsContext.getDefault().contextData.project.id, // Using current context project for retrieving the plural backlog name
                    burndownSettings.workItemTypeFilter.settings);
            } else {
                measurePromise = Q(burndownSettings.workItemTypeFilter.settings);
            }
        } else {
            const measure = this.getWorkItemTypeFieldName(
                workItemTypeFields,
                burndownSettings.aggregation.settings)

            measurePromise = Q(measure);
        }

        return Q.all<string | number>([valuePromise, measurePromise])
            .spread((value: number, measure: string) => {
                const description = WidgetResources.BurndownWidget_HeroDescription;

                return {
                    description: description,
                    measure: measure,
                    value: value
                };
            });
    }

    private getCurrentEffortPromise(burndownSettings: BurndownSettings, workItemTypes: string[], workItemTypeFields: WorkItemFieldDescriptor[]): IPromise<CurrentWorkItemAggregateEffort[]> {
        const remainingEffortQuery = new CurrentEffortQuery(
            burndownSettings.teams,
            burndownSettings.fieldFilters,
            burndownSettings.aggregation,
            workItemTypes,
            workItemTypeFields
        );

        return this.dataService.getCacheableQueryResult(remainingEffortQuery);
    }

    private getCompletedPercentage(currentEffort: CurrentWorkItemAggregateEffort[]): number {
        // Calculate total remaining effort
        let completedEffort = 0;
        let totalEffort = 0;
        currentEffort.forEach(e => {
            if (e.StateCategory === WorkItemStateCategoryNames.Completed) {
                completedEffort += e.AggregatedEffort;
            }
            totalEffort +=  e.AggregatedEffort;
        });

        if (totalEffort === 0) {
            return 0;
        }
        else {
            return Math.floor(completedEffort * 100 / totalEffort);
        }
    }

    private getDataImpl(): IPromise<LayoutState> {
        const burndownSettings = JSON.parse(this.settings.data) as BurndownSettings;

        const projectIds = burndownSettings.teams.map(team => team.projectId);

        // Retrieve the work item types and fields
        let workItemTypesPromise = LookBackDataManagerHelper.getWorkItemTypes(burndownSettings.workItemTypeFilter, burndownSettings.includeBugsForRequirementCategory);
        let workItemTypesFieldsPromise = workItemTypesPromise
            .then(workItemTypes => LookBackDataManagerHelper.getWorkItemTypeFieldsPromise(workItemTypes, projectIds, this.dataService),
            (e)=>{
                WidgetTelemetry.onWidgetFailure(
                    this.widgetTypeId,
                    "Failure getting Work Item Type Fields information.",
                    "WorkItemTypesPromiseFailure",
                    { "ErrorDetail": JSON.stringify(e) });
            });

        // Retrieve iterations
        let iterationsPromise;
        if (burndownSettings.timePeriodConfiguration.samplingConfiguration.identifier === DateSampleMode.ByIterations) {
            iterationsPromise = this.getIterationsPromise(burndownSettings.timePeriodConfiguration, projectIds);
        }

        return Q.all([workItemTypesPromise, workItemTypesFieldsPromise, iterationsPromise])
            .spread((workItemTypes: string[], workItemTypesFields: WorkItemFieldDescriptor[], iterations?: Iteration[]) => {
                let chartAndSubmetricUpdatedPromise;
                if (this.demandTracker.isDemandPresent(DemandType.chart)
		            || this.demandTracker.isDemandPresent(DemandType.submetrics)) {

                    const sampleDatesStructure = (iterations != null)
                        ? TimeIntervalUtils.getSampleDates(
                            burndownSettings.timePeriodConfiguration.startDate,
                            iterations)
                        : TimeIntervalUtils.getSampleDates(
                            burndownSettings.timePeriodConfiguration.startDate,
                            burndownSettings.timePeriodConfiguration.samplingConfiguration.settings as DateSamplingConfiguration);

                    const effortSnapshotsPromise = this.getEffortSnapshotsPromise(burndownSettings, workItemTypes, workItemTypesFields, sampleDatesStructure.sampleDates, iterations);
                    const currentEffortPromise = this.getCurrentEffortPromise(burndownSettings, workItemTypes, workItemTypesFields);

                    let unestimatedCountQuery;
                    if (burndownSettings.aggregation.identifier === AggregationMode.Sum) { // TODO should only do this is submetrics demand is present
                        unestimatedCountQuery = this.getUnestimatedCountPromise(burndownSettings, workItemTypes, workItemTypesFields);
                    }

                    chartAndSubmetricUpdatedPromise = Q.all<any>([effortSnapshotsPromise, currentEffortPromise, unestimatedCountQuery])
                        .spread<any>((effortSnapshots: WorkItemEffort[], currentEffort: CurrentWorkItemAggregateEffort[], unestimatedCount?: number) => {
                            // Empty chart experience when we have no data. If we have unestimated count data, proceed as normal since
                            // we want to show you that useful submetric.
                            if (effortSnapshots.length === 0 && unestimatedCount == null) {
                                return this.packMessageAsState(MessageType.NoData);
                            }

                            const today = DateUtils.format(getTodayInAccountTimeZone(), "yyyy-MM-dd");
                            const pastDays = sampleDatesStructure.sampleDates.filter(date => StringUtils.ignoreCaseComparer(date, today) <= 0);

                            const remainingSnapshotEffort = BurndownDataFactory.getRemainingEffort(effortSnapshots);
                            const completedSnapshotEffort = BurndownDataFactory.getCompletedEffort(effortSnapshots);
                            const datesToTotalSnapshotEffort = BurndownDataFactory.getEffortByDate(effortSnapshots);

                            let datesToEffortForMainSeries: IDictionaryStringTo<number>;
                            if (this.getBurnDirection() == BurnDirection.Down) {
                                datesToEffortForMainSeries = BurndownDataFactory.getEffortByDate(remainingSnapshotEffort);
                            }
                            else {
                                datesToEffortForMainSeries = BurndownDataFactory.getEffortByDate(completedSnapshotEffort);
                            }

                            // Fill empty days that came from backend
                            pastDays.forEach(day => {
                                if (!datesToEffortForMainSeries[day]){
                                    datesToEffortForMainSeries[day] = 0; // Use 0 if no effort is defined for the given date
                                }
                                if (!datesToTotalSnapshotEffort[day]){
                                    datesToTotalSnapshotEffort[day] = 0;
                                }
                            });

                            const averageBurn = -BurndownDataFactory.getAverageChange(datesToEffortForMainSeries, pastDays);
                            const completedPercentage = this.getCompletedPercentage(currentEffort);
                            const scopeChange = BurndownDataFactory.getSumOfAggregatedEffort(currentEffort) - datesToTotalSnapshotEffort[pastDays[0]];
                            const allowChartClicks = WidgetLinkHelper.canOpenAsyncLink() && WidgetLinkHelper.canUserAccessWITQueriesPage();
                            // Chart Options
                            let chartOptionsPromise = this.getChartOptions(
                                    datesToTotalSnapshotEffort, datesToEffortForMainSeries, remainingSnapshotEffort, completedSnapshotEffort, averageBurn,
                                    sampleDatesStructure, workItemTypes, workItemTypesFields, burndownSettings, allowChartClicks, iterations)
                                .then(chartOptions => {
                                    this.currentState.chartData = {
                                        chartOptions: chartOptions
                                    };
                                });

                            // SubMetrics
                            this.currentState.submetricsData = {
                                items: [{
                                    label: WidgetResources.BurndownWidget_CompletedMetricName,
                                    value: completedPercentage + "%",
                                    onClick: (completedPercentage > 0 && allowChartClicks) ? this.getOnClickCompletedHandler(burndownSettings, workItemTypes, workItemTypesFields) : undefined
                                }, {
                                    label: (this.getBurnDirection() == BurnDirection.Down) ? WidgetResources.BurndownWidget_AverageBurndownMetricName : WidgetResources.BurndownWidget_AverageBurnupMetricName,
                                    value: ((this.getBurnDirection() == BurnDirection.Down? 1 : -1 ) * BurndownDataFactory.formatAverageBurn(averageBurn)).toString()
                                }, {
                                    label: WidgetResources.BurndownWidget_TotalScopeIncreaseMetricName,
                                    value: scopeChange ? NumberUtils.toDecimalLocaleString(scopeChange) : "0" // If there's no scope at all, like in initial case, also return zero
                                }
                            ]};

                            if (unestimatedCount != null) {
                                const unestimatedSubmetricData = {
                                    label: WidgetResources.BurndownWidget_ItemsNotEstimatedMetricName,
                                    value: unestimatedCount.toString(),
                                    onClick: (unestimatedCount > 0 && allowChartClicks) ? this.getOnClickUnestimatedHandler(burndownSettings, workItemTypes, workItemTypesFields) : undefined
                                };

                                // Insert at position 3
                                this.currentState.submetricsData.items.splice(2, 0, unestimatedSubmetricData);
                            }

                            let startDateString = DateUtils.localeFormat(
                                DateUtils.parseDateString(
                                    burndownSettings.timePeriodConfiguration.startDate,
                                    "yyyy-MM-dd"),
                                CultureUtils.getDateTimeFormat().ShortDatePattern);

                            let endDateString = DateUtils.localeFormat(
                                DateUtils.parseDateString(
                                    sampleDatesStructure.sampleDates[sampleDatesStructure.sampleDates.length - 1],
                                    "yyyy-MM-dd"),
                                CultureUtils.getDateTimeFormat().ShortDatePattern);

                            this.currentState.subtitle = {
                                text: `${startDateString} - ${endDateString}`
                            };

                            return Q.all([chartOptionsPromise]);
                        });
                }

                let scalarDataUpdatedPromise;
                if (this.demandTracker.isDemandPresent(DemandType.scalar)) {
                    scalarDataUpdatedPromise = this.getRemainingEffortForHero(burndownSettings, workItemTypes, workItemTypesFields)
                        .then(scalarDataProps => {
                            this.currentState.scalarData = scalarDataProps;
                        });
                }

                return Q.all([chartAndSubmetricUpdatedPromise, scalarDataUpdatedPromise])
                    .then(() => this.currentState);
            })
            .then(
                undefined, /* Catch pattern */
                error => {
                    const errorMessage = ErrorParser.stringifyODataError(error);
                    return this.packMessageAsState(MessageType.WidgetError, errorMessage);
                }
            );
    }

    /** Start running any demands which require async behavior. */
    public getData(): IPromise<LayoutState> {
        let layoutStatePromise;

        if (!LookBackDataManagerHelper.hasSatisfactoryConfiguration(this.settings, this.settingsManager, this.widgetTypeId)) {
            layoutStatePromise = LookBackDataManagerHelper.configNotSatisfactory(this, this.dataService);
        } else if (LookBackDataManagerHelper.demandsArePresent(this.demandTracker)) {
            layoutStatePromise = this.getDataImpl();
        } else {
            layoutStatePromise = Q.resolve(this.currentState);
        }

        return layoutStatePromise;
    }

    /**
     * Retrieves the color dictionary for the given work item types as defined by the given project.
     * @param workItemTypes A list of work item types for which to retrieve the colors
     * @param projectName The name of the project which defines colors
     */
    private static getWitColorDictionary(workItemTypes: string[], projectName: string): IPromise<IDictionaryStringTo<string>> {
        return WorkItemTypeColorAndIconsProvider.getInstance()
            .ensureColorAndIconsArePopulated([projectName])
            .then(() => {
                let colorDictionary: IDictionaryStringTo<string> = {};
                workItemTypes.forEach(workItemTypeName => {
                    colorDictionary[workItemTypeName] = WorkItemTypeColorAndIconsProvider
                        .getInstance()
                        .getColor(projectName, workItemTypeName);
                });

                return colorDictionary;
            });
    }

}

export class BurnupDataManager extends BurndownDataManager {

    /**
     * Gets burn direction
     */
    protected getBurnDirection(): BurnDirection {
        return BurnDirection.Up;
    }
}

