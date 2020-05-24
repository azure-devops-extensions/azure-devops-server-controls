import * as Q from 'q';
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import MonteCarloSettingsManager from "Widgets/Scripts/MonteCarloWidget/MonteCarloSettingsManager";
import { MonteCarloSettings } from "Widgets/Scripts/MonteCarloWidget/MonteCarloSettings";
import { WorkItemFieldDescriptor } from "Widgets/Scripts/Burndown/BurndownDataContract";
import { WidgetsCacheableQueryService } from "Widgets/Scripts/DataServices/WidgetsCacheableQueryService";
import { ISettingsManager } from "Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase";
import { WidgetDataManagerBase, WidgetDataManagerOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase";
import { HistoryQueryResult } from "Widgets/Scripts/MonteCarloWidget/MonteCarloHistoryQuery";
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";
import { LayoutState, MessageType } from "WidgetComponents/LayoutState";
import { ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { DemandType } from "WidgetComponents/Demands/DemandType";
import VSS_Diag = require("VSS/Diag");
import { LookBackDataManagerHelper } from 'Widgets/Scripts/LookBackDataManagerHelper';
import { MonteCarloHistoryQuery } from "Widgets/Scripts/MonteCarloWidget/MonteCarloHistoryQuery";
import { MonteCarloDataProcessor, MonteCarloProcessedDataResult } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloDataProcessor';
import { MonteCarloSimulator, SimulationResult } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloSimulator';
import { MonteCarloChartOptionFactory, MonteCarloChartInputs } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloChartOptionFactory';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import * as DateUtils from 'VSS/Utils/Date';
import * as CultureUtils from "VSS/Utils/Culture";
import { MonteCarloConstants } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloConstants';
import { ScalarComponentProps } from 'WidgetComponents/ScalarComponent';
import * as StringUtils from "VSS/Utils/String";
import Telemetry = require("VSS/Telemetry/Services");

/** Data Manager is responsible for calling MonteCarloHistoryQuery,
 *  processing the query results, and running the Monte Carlo simulation.
 *  It then renders the chart with the simulation data.
 */
export class MonteCarloDataManager extends WidgetDataManagerBase {
    private dataService: WidgetsCacheableQueryService;
    private settingsManager: ISettingsManager<MonteCarloSettings>;

    constructor(options: WidgetDataManagerOptions, settingsManager?: ISettingsManager<MonteCarloSettings>) {
        super(options);
        this.dataService = ProjectCollection.getDefaultConnection().getService(WidgetsCacheableQueryService);
        this.settingsManager = <ISettingsManager<MonteCarloSettings>>(settingsManager ? settingsManager : new MonteCarloSettingsManager());
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

    /** Gets user history, processes it, and builds the MonteCarlo chart */
    private getDataImpl(): IPromise<LayoutState> {
        const monteCarloSettings = JSON.parse(this.settings.data) as MonteCarloSettings;
        const projectIds = monteCarloSettings.teams.map(team => team.projectId);

        // Retrieve the work item types and fields
        let workItemTypesPromise = LookBackDataManagerHelper.getWorkItemTypes(monteCarloSettings.workItemTypeFilter, monteCarloSettings.includeBugsForRequirementCategory);
        let workItemTypesFieldsPromise = workItemTypesPromise
            .then(workItemTypes => LookBackDataManagerHelper.getWorkItemTypeFieldsPromise(workItemTypes, projectIds, this.dataService),
            (e)=>{
                WidgetTelemetry.onWidgetFailure(
                    this.widgetTypeId,
                    "Failure getting Work Item Type Fields information.",
                    "WorkItemTypesPromiseFailure",
                    { "ErrorDetail": JSON.stringify(e) });
            });

        return Q.all([workItemTypesPromise, workItemTypesFieldsPromise])
            .spread<any>((workItemTypes: string[], workItemTypesFields: WorkItemFieldDescriptor[]) => {
                let chartAndSubmetricUpdatedPromise;
                if (this.demandTracker.isDemandPresent(DemandType.chart)) {
                    const userHistoryPromise = this.getMonteCarloHistoryPromise(monteCarloSettings, workItemTypes, workItemTypesFields);
                    chartAndSubmetricUpdatedPromise = Q.all<any>([userHistoryPromise])
                        .spread<any>((userHistory: HistoryQueryResult[]) => {
                            if (userHistory.length === 0) {
                                return this.packMessageAsState(MessageType.NoData);
                            }

                            // call data processor
                            let dataProcessor = new MonteCarloDataProcessor();
                            let dataResult = dataProcessor.getStats(userHistory, monteCarloSettings.timePeriodConfiguration);

                            // call simulator
                            let simulator = new MonteCarloSimulator();
                            let simulationResults = simulator.getDaysToCompletion(dataResult, this.getNumTasks(monteCarloSettings.numberOfWorkItems));
                            if (simulationResults == null) {
                                return this.packMessageAsState(MessageType.NoData);
                            }

                            if (this.calculateError(dataResult, simulationResults.numIterations) > MonteCarloConstants.targetError) {
                                var measuredFeatureName = "ErrorGreaterThan2Percent";
                                var properties: IDictionaryStringTo<any> =
                                    {
                                        "WidgetTypeId": this.widgetTypeId,
                                    };
                                Telemetry.publishEvent(new Telemetry.TelemetryEventData("Monte Carlo Forecast", measuredFeatureName, properties));
                                return this.packMessageAsState(MessageType.NoData);
                            }

                            // ready chart data options
                            let numDaysList = this.getNumDaysList(simulationResults.daysToCompletion);
                            let sampleDates: string[] = monteCarloSettings.isUseDurationsCheckboxEnabled ? numDaysList.map(x => x.toString()): this.getSampleDates(numDaysList);
                            let iterationCounts: number[] = this.getIterCount(simulationResults.daysToCompletion, numDaysList);
                            let probabilityOfCompletion: number[] = this.getProbabilitiesOfCompletion(iterationCounts, simulationResults.numIterations);

                            let chartInputs = this.getChartInputs(monteCarloSettings, simulationResults, sampleDates, iterationCounts, probabilityOfCompletion);

                            // render chart
                            let optionFactory = new MonteCarloChartOptionFactory();
                            let chartOptions = optionFactory.createChartOptions(chartInputs);
                            this.currentState.chartData = {
                                chartOptions: chartOptions
                            }

                            // render hero metric (days to / date of completion with 95% confidence)
                            this.currentState.scalarData = this.getScalarDataProps(monteCarloSettings, sampleDates, probabilityOfCompletion);

                            return this.currentState;
                        }, (e) => {
                            VSS_Diag.logError("Query failure: " + e);
                        });
                    return chartAndSubmetricUpdatedPromise;
                } else {
                    return Q(this.currentState);
                }
            })
            .then(
                undefined, 
                error => {
                    const errorMessage = ErrorParser.stringifyODataError(error);
                    return this.packMessageAsState(MessageType.WidgetError, errorMessage);
                }
            );
    }

    /** Converts user input from a string to a number, and checks that the input was a number */
    private getNumTasks(numTasks: string): number {
        let numTasksNumber = new Number(numTasks);
        if (isNaN(numTasksNumber.valueOf()) || numTasksNumber.valueOf() > MonteCarloConstants.maxNumberOfWorkItemsToForecast) {
            return 0;
        }
        return Math.ceil(numTasksNumber.valueOf());
    }

    private calculateError(dataResult: MonteCarloProcessedDataResult, numIterations: number): number {
        // https://www.projectsmart.co.uk/docs/monte-carlo-simulation.pdf
        // error formula: e = (3 * stdDev) / sqrt(number of iterations) / avg
        const stdDevMultiplier = 3;
        return +(((stdDevMultiplier * dataResult.stdDev) / Math.sqrt(numIterations)) / dataResult.average).toFixed(2);
    }

    /** Returns chart input information to render the chart */
    private getChartInputs(
        monteCarloSettings: MonteCarloSettings, 
        simulationResults: SimulationResult, 
        sampleDates: string[],
        iterationCounts: number[],
        probabilityOfCompletion: number[]
    ): MonteCarloChartInputs {
        let simulationPercentageCounts: number[] = iterationCounts.map(count  => (+((count / simulationResults.numIterations) * 100).toFixed(2)));
        return {
            suppressAnimations: true,
            sampleDates: sampleDates,
            probabilityOfCompletion: probabilityOfCompletion,
            simulationCounts: simulationPercentageCounts,
            showStatisticalProbabilities: monteCarloSettings.isShowStatisticalProbabilitiesEnabled,
            onClick: null,
            allowChartClicks: false
        }
    }

    /** Hero metric (shows estimated completion based on a given desired confidence level) */
    private getScalarDataProps(monteCarloSettings: MonteCarloSettings, sampleDates: string[], probabilityOfCompletion: number[]): ScalarComponentProps {
        let probabilityConfidenceLvlpercentIdx = 0;
        const confidenceLevel = 95;
        while (probabilityOfCompletion[probabilityConfidenceLvlpercentIdx] < confidenceLevel) {
            probabilityConfidenceLvlpercentIdx++;
        }
        
        return {
            description: StringUtils.format(WidgetResources.MonteCarloWidget_ProjectionConfidenceLevelLabel, confidenceLevel),
            measure: monteCarloSettings.isUseDurationsCheckboxEnabled ? WidgetResources.MonteCarloWidget_CompleteDurationLabel : WidgetResources.MonteCarloWidget_CompleteDateLabel,
            value: (sampleDates[probabilityConfidenceLvlpercentIdx])
        };
    }

    /** returns a sorted list of the keys from the simulation results in an array */
    private getNumDaysList(simulationResults: Map<number, number>): number[] {
        let numDaysList = [];

        simulationResults.forEach((value, key) => { // value needs to be included so that key isn't assigned the value
            numDaysList.push(key)
        });

        numDaysList.sort(function (a, b) {
            return a - b;
        });
        return numDaysList;
    }

    /** returns a list of the dates for the x-axis */
    private getSampleDates(numDaysList: number[]): string[] {
        let localeDatePattern = CultureUtils.getDateTimeFormat().ShortDatePattern;
        const millisecondsInDay = 86400000;
        let sampleDates = [];
        
        let now = Date.now();
        for (let numDays of numDaysList) {
            let newDate = new Date(now + (numDays * millisecondsInDay));

            let formattedDate = DateUtils.localeFormat(
                newDate,
                localeDatePattern,
                true /* ignore time zone */);
            sampleDates.push(formattedDate);
        }

        return sampleDates;
    }

    /** returns a list of the probabilities that the tasks will be completed by that day */
    private getProbabilitiesOfCompletion(iterationCounts: number[], numIterations: number): number[] {
        let probabilitiesOfCompletion = [];
        let totalIterations = 0;
        for (let numIters of iterationCounts) {
            totalIterations += numIters;
            probabilitiesOfCompletion.push(+((totalIterations / numIterations) * 100).toFixed(2));
        }
        return probabilitiesOfCompletion;
    }

    /** Returns a list of the number of iterations resulting in each date */
    private getIterCount(simulationResults: Map<number, number>, numDaysList: number[]): number[] {
        let iterCount = [];
        for (let dateIdx in numDaysList) {
            let dateIterationCount = simulationResults.get(numDaysList[dateIdx]);
            iterCount.push(dateIterationCount);
        }
        return iterCount;
    }

    /** Runs the Monte Carlo History Query */
    private getMonteCarloHistoryPromise(monteCarloSettings: MonteCarloSettings, 
                                            workItemTypes: string[], 
                                            workItemTypeFields: WorkItemFieldDescriptor[]) {
        const monteCarloHistoryQuery = new MonteCarloHistoryQuery(
            monteCarloSettings.teams,
            monteCarloSettings.fieldFilters,
            workItemTypes,
            workItemTypeFields,
            monteCarloSettings.timePeriodConfiguration
        );

        return this.dataService.getCacheableQueryResult(monteCarloHistoryQuery);
    }
}