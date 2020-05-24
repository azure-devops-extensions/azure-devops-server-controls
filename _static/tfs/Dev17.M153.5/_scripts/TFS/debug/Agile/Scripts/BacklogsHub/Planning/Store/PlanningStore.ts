import {
    IIterationEffortLoadFailedPayload,
    IIterationsLoadedPayload,
    IIterationTeamDaysOff,
    PlanningActions
} from "Agile/Scripts/BacklogsHub/Planning/ActionsCreator/PlanningActions";
import { IIterationEffort, IPlanningWorkItem } from "Agile/Scripts/BacklogsHub/Planning/PlanningContracts";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { DateRange } from "TFS/Work/Contracts";
import { IStore, Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";

export interface IPlanningStore extends IStore {
    /** The backlog iteration */
    readonly backlogIteration: Iteration;
    /** The current iteration id */
    readonly currentIterationId: string;
    /** Is the sprint editor dialog visible? */
    readonly isNewSprintCalloutVisible: boolean;
    /** The loaded iterations ready for planning */
    readonly iterations: Iteration[];
    /** The effort information for the loaded iterations, keyed by id */
    readonly iterationEfforts: IDictionaryStringTo<IIterationEffort>;
    /** The error information for the loaded iterations, keyed by id */
    readonly iterationSummaryErrors: IDictionaryStringTo<TfsError>;
    readonly iterationTeamDaysOffUTC: IDictionaryStringTo<DateRange[]>;
    /** Which iterations are loading, keyed by id */
    readonly iterationLoading: IDictionaryStringTo<boolean>;
    /** The days off for the team */
    readonly weekends: number[];
}

export class PlanningStore extends Store implements IPlanningStore {
    private _actions: PlanningActions;
    private _backlogIteration: Iteration;
    private _currentIterationId: string;
    private _isNewSprintCalloutVisible: boolean;
    private _iterations: Iteration[];
    private _iterationEfforts: IDictionaryStringTo<IIterationEffort>;
    private _iterationSummaryErrors: IDictionaryStringTo<TfsError>;
    private _iterationTeamDaysOffUTC: IDictionaryStringTo<DateRange[]>;
    private _iterationLoading: IDictionaryStringTo<boolean>;
    private _weekends: number[];

    public get backlogIteration(): Iteration {
        return this._backlogIteration;
    }

    public get currentIterationId(): string {
        return this._currentIterationId;
    }

    public get isNewSprintCalloutVisible(): boolean {
        return this._isNewSprintCalloutVisible;
    }

    public get iterations(): Iteration[] {
        return this._iterations;
    }

    public get iterationEfforts(): IDictionaryStringTo<IIterationEffort> {
        return this._iterationEfforts;
    }

    public get iterationSummaryErrors(): IDictionaryStringTo<TfsError> {
        return this._iterationSummaryErrors;
    }

    public get iterationTeamDaysOffUTC(): IDictionaryStringTo<DateRange[]> {
        return this._iterationTeamDaysOffUTC;
    }

    public get iterationLoading(): IDictionaryStringTo<boolean> {
        return this._iterationLoading;
    }

    public get weekends(): number[] {
        return this._weekends;
    }

    constructor(actions: PlanningActions) {
        super();
        this._actions = actions;
        this._registerActionHandlers();
        this._reset();
    }

    private _registerActionHandlers(): void {
        this._actions.resetData.addListener(this._handleResetData);
        this._actions.iterationsLoaded.addListener(this._handleIterationsLoaded);
        this._actions.beginLoadIteration.addListener(this._handleBeginLoadIterationEfforts);
        this._actions.iterationEffortLoadFailed.addListener(this._handleIterationEffortLoadFailed);
        this._actions.iterationEffortLoadSucceeded.addListener(this._handleIterationEffortLoadSucceeded);
        this._actions.iterationTeamDaysOffLoadSucceeded.addListener(this._handleIterationTeamDaysOffLoadSucceeded);
        this._actions.iterationLoadComplete.addListener(this._handleIterationLoadCompleted);
        this._actions.toggleNewSprintCallout.addListener(this._handleToggleNewSprintCallout);
        this._actions.weekendsLoaded.addListener(this._handleWeekendsLoaded);
        this._actions.workItemRemoved.addListener(this._handleWorkItemRemoved);
        this._actions.workItemChanged.addListener(this._handleWorkItemChanged);
    }

    private _handleWorkItemRemoved = (workItemId: number): void => {
        if (this._removeWorkItem(workItemId)) {
            this.emitChanged();
        }
    }

    private _handleWorkItemChanged = (updatedWorkItem: IPlanningWorkItem): void => {
        const workItemId = updatedWorkItem.id;

        let emitChange = this._removeWorkItem(workItemId);
        emitChange = this._addWorkItem(updatedWorkItem) || emitChange;

        if (emitChange) {
            this.emitChanged();
        }
    }

    private _handleToggleNewSprintCallout = (isVisible: boolean): void => {
        this._isNewSprintCalloutVisible = isVisible;
        this.emitChanged();
    }

    private _handleIterationsLoaded = (payload: IIterationsLoadedPayload): void => {
        this._backlogIteration = payload.backlogIteration;
        this._currentIterationId = payload.currentIterationId;
        this._iterations = payload.iterations;
        this.emitChanged();
    }

    private _handleBeginLoadIterationEfforts = (iterationIds: string[]): void => {
        if (iterationIds) {
            iterationIds.forEach((id) => this._iterationLoading[id] = true);
            this.emitChanged();
        }
    }

    private _handleIterationEffortLoadFailed = (payload: IIterationEffortLoadFailedPayload): void => {
        if (payload) {
            delete this._iterationLoading[payload.iterationId];
            this._iterationSummaryErrors[payload.iterationId] = payload.error;
            this.emitChanged();
        }
    }

    private _handleIterationEffortLoadSucceeded = (iterationEffort: IIterationEffort): void => {
        if (iterationEffort) {
            const iterationId = iterationEffort.iterationId;
            this._iterationEfforts[iterationId] = iterationEffort;
            delete this._iterationLoading[iterationId];

            this.emitChanged();
        }
    }

    private _handleIterationTeamDaysOffLoadSucceeded = (iterationTeamDaysOff: IIterationTeamDaysOff): void => {
        if (iterationTeamDaysOff) {
            this._iterationTeamDaysOffUTC[iterationTeamDaysOff.iterationId] = iterationTeamDaysOff.teamDaysOffUTC;
            this.emitChanged();
        }
    }

    private _handleIterationLoadCompleted = (iterationId: string): void => {
        if (this._iterationLoading[iterationId]) {
            delete this._iterationLoading[iterationId];
            this.emitChanged();
        }
    }

    private _handleWeekendsLoaded = (weekends: number[]): void => {
        if (weekends) {
            this._weekends = weekends;
            this.emitChanged();
        }
    }

    private _handleResetData = (): void => {
        this._reset();
        this.emitChanged();
    }

    private _removeWorkItem(workItemId: number): boolean {
        const iterationEffort = this._findIterationByWorkItem(workItemId);

        // Update only if we are tracking that workItem
        if (iterationEffort) {
            const workItem = iterationEffort.workItemsById[workItemId];
            if (workItem) {
                iterationEffort.totalEfforts -= workItem.effort;
                iterationEffort.countByWorkItemType[workItem.workItemType]--;
                delete iterationEffort.workItemsById[workItem.id];
                return true;
            }
        }
        return false;
    }

    private _addWorkItem(workItem: IPlanningWorkItem): boolean {
        const iterationPath = workItem.iterationPath;
        const iterationId = this._getIterationId(iterationPath);
        const iterationEffort = this._iterationEfforts[iterationId];

        // Check if we can find the target iteration path and we are infact tracking work items of that type
        if (iterationEffort &&
            iterationEffort.countByWorkItemType.hasOwnProperty(workItem.workItemType)) {

            iterationEffort.totalEfforts += workItem.effort;
            iterationEffort.countByWorkItemType[workItem.workItemType]++;
            iterationEffort.workItemsById[workItem.id] = workItem;
            return true;
        }
        return false;
    }

    private _findIterationByWorkItem(workItemId: number): IIterationEffort {
        for (const iterationId in this._iterationEfforts) {
            const iterationEffort = this._iterationEfforts[iterationId];
            const workItem = iterationEffort.workItemsById[workItemId];
            if (workItem) {
                return iterationEffort;
            }
        }

        return null;
    }

    private _getIterationId(iterationPath: string): string {
        for (const iteration of this._iterations) {
            if (Utils_String.equals(iteration.iterationPath, iterationPath, /* ignore case */ true)) {
                return iteration.id;
            }
        }
        return null;
    }

    private _reset(): void {
        this._backlogIteration = null;
        this._currentIterationId = null;
        this._isNewSprintCalloutVisible = false;
        this._iterations = [];
        this._iterationEfforts = {};
        this._iterationSummaryErrors = {};
        this._iterationLoading = {};
        this._iterationTeamDaysOffUTC = {};
        this._weekends = [];
    }
}