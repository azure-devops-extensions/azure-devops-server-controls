import { BacklogsHubTelemetryConstants } from "Agile/Scripts/BacklogsHub/BacklogsHubTelemetryConstants";
import { PlanningActions } from "Agile/Scripts/BacklogsHub/Planning/ActionsCreator/PlanningActions";
import { IPlanningDataProvider } from "Agile/Scripts/BacklogsHub/Planning/ActionsCreator/PlanningDataProvider";
import { IIterationEffort, IPlanningWorkItem } from "Agile/Scripts/BacklogsHub/Planning/PlanningContracts";
import { BacklogsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { DateRange } from "TFS/Work/Contracts";
import { publishErrorToTelemetry } from "VSS/Error";
import { getScenarioManager } from "VSS/Performance";

export interface IPlanningActionsCreator {
    reloadPlanningData: () => void;
    toggleNewSprintCallout: (isVisible: boolean) => void;
    initialize(): Promise<void>;
    workItemChanged(workItem: IPlanningWorkItem): void;
    workItemRemoved(id: number): void;
}

const INITIAL_BUCKET_SIZE = 5;
const ADDITIONAL_BUCKET_SIZE = 2;

export class PlanningActionsCreator implements IPlanningActionsCreator {
    private _actions: PlanningActions;
    private _dataProvider: IPlanningDataProvider;

    constructor(actions: PlanningActions, dataProvider: IPlanningDataProvider) {
        this._actions = actions;
        this._dataProvider = dataProvider;
    }

    public initialize(): Promise<void> {
        // Load the iterations
        const loadScenario = getScenarioManager().startScenario(BacklogsHubConstants.HUB_NAME, BacklogsHubTelemetryConstants.PLANNING_INITIAL_LOAD);
        const iterations = this._dataProvider.getIterations();
        const backlogIteration = this._dataProvider.getBacklogIteration();
        const currentIteration = this._dataProvider.getCurrentIteration();
        const weekends = this._dataProvider.getWeekends();

        this._actions.iterationsLoaded.invoke({ backlogIteration, currentIterationId: currentIteration ? currentIteration.id : null, iterations });
        this._actions.weekendsLoaded.invoke(weekends);

        if (iterations) {
            // Load the iteration efforts for each iteration
            this._actions.beginLoadIteration.invoke(iterations.map(i => i.id));

            loadScenario.addData({ [BacklogsHubTelemetryConstants.IterationCount]: iterations.length });

            // Using reduce to sequentially chain the promises for each bucket
            return this._bucketIterations(iterations).reduce(
                (promise, iterationBucket) => {
                    return promise.then(() => {
                        return this._loadIterationDetails(iterationBucket).then(
                            () => {
                                loadScenario.addSplitTiming(BacklogsHubTelemetryConstants.BucketLoadedSplit);
                            }
                        );
                    });
                },
                // Initial dummy promise to start the chain
                Promise.resolve()
            ).then(() => loadScenario.end());
        } else {
            loadScenario.abort();
        }
    }

    public reloadPlanningData(): void {
        this._actions.resetData.invoke(null);
        this.initialize();
    }

    public toggleNewSprintCallout(isVisible: boolean): void {
        this._actions.toggleNewSprintCallout.invoke(isVisible);
    }

    public workItemChanged(workItem: IPlanningWorkItem): void {
        this._actions.workItemChanged.invoke(workItem);
    }

    public workItemRemoved(workItemId: number): void {
        this._actions.workItemRemoved.invoke(workItemId);
    }

    private _loadIterationDetails(iterations: Iteration[]): Promise<void[]> {
        return Promise.all(
            iterations.map((iteration: Iteration) => {
                return Promise.all([
                    this._loadIterationEffort(iteration),
                    this._loadIterationTeamDaysOff(iteration)
                ]).then(() => {
                    this._actions.iterationLoadComplete.invoke(iteration.id);
                });
            })
        );
    }

    private _loadIterationEffort(iteration: Iteration): Promise<void> {
        return this._dataProvider.getIterationEffort(iteration).then(
            (iterationEffort: IIterationEffort) => {
                this._actions.iterationEffortLoadSucceeded.invoke(iterationEffort);
            },
            (error: TfsError) => {
                if (error) {
                    publishErrorToTelemetry(error);
                }

                this._actions.iterationEffortLoadFailed.invoke({ iterationId: iteration.id, error });
            }
        );
    }

    private _loadIterationTeamDaysOff(iteration: Iteration): Promise<void> {
        return this._dataProvider.getIterationTeamDaysOff(iteration).then(
            (teamDaysOffUTC: DateRange[]) => {
                this._actions.iterationTeamDaysOffLoadSucceeded.invoke({
                    iterationId: iteration.id,
                    teamDaysOffUTC
                });
            },
            (error: TfsError) => {
                if (error) {
                    publishErrorToTelemetry(error);
                }
            }
        );
    }

    private _bucketIterations(iterations: Iteration[]): Iteration[][] {
        // Bucket the iterations
        const iterationLoadBuckets: Iteration[][] = [];
        let bucketSize = INITIAL_BUCKET_SIZE;
        let currentBucketIndex = 0;

        if (iterations) {
            iterations.forEach((iteration) => {
                let currentBucket = iterationLoadBuckets[currentBucketIndex];
                if (!currentBucket) {
                    currentBucket = [];
                    iterationLoadBuckets[currentBucketIndex] = currentBucket;
                }

                currentBucket.push(iteration);

                if (currentBucket.length === bucketSize) {
                    bucketSize = ADDITIONAL_BUCKET_SIZE;
                    currentBucketIndex += 1;
                }
            });
        }

        return iterationLoadBuckets;
    }
}