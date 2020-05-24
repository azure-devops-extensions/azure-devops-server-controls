import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration, IterationTimeframe } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import { LoadingStatus } from "Agile/Scripts/SprintsHub/Common/CommonContracts";
import { SprintsViewActions } from "Agile/Scripts/SprintsHub/SprintView/ActionsCreator/SprintsViewActions";
import { ISprintHubHeaderData, ITeamIterations } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { DateRange } from "TFS/Work/Contracts";
import { Store } from "VSS/Flux/Store";

export class SprintsViewStore extends Store {
    private _isSprintEditorCalloutOpen: boolean;
    private _isSprintPickerCalloutOpen: boolean;
    private _team: Team;
    private _selectedIteration: Iteration;
    private _selectedIterationTimeframe: IterationTimeframe;
    private _nextIteration?: Iteration;
    private _previousIteration?: Iteration;
    private _backlogIterationFriendlyPath?: string;
    private _exceptionInfo: ExceptionInfo;
    private _teamIterations: ITeamIterations;
    private _teamWeekends: number[];
    private _teamDaysOff: DateRange[];
    private _status: LoadingStatus;

    constructor(actions: SprintsViewActions) {
        super();
        this._status = LoadingStatus.Loading;
        this._attachActionListeners(actions);
    }

    public get isSprintEditorPaneOpen(): boolean {
        return this._isSprintEditorCalloutOpen;
    }

    public get isSprintPickerCalloutOpen(): boolean {
        return this._isSprintPickerCalloutOpen;
    }

    public get team(): Team {
        return this._team;
    }

    public get selectedIteration(): Iteration {
        return this._selectedIteration;
    }

    public get selectedIterationTimeframe(): IterationTimeframe {
        return this._selectedIterationTimeframe;
    }

    public get nextIteration(): Iteration {
        return this._nextIteration;
    }

    public get previousIteration(): Iteration {
        return this._previousIteration;
    }

    public get backlogIterationFriendlyPath(): string {
        return this._backlogIterationFriendlyPath;
    }

    public get exceptionInfo(): ExceptionInfo {
        return this._exceptionInfo;
    }

    public get teamIterations(): ITeamIterations {
        return this._teamIterations;
    }

    public get teamWeekends(): number[] {
        return this._teamWeekends;
    }

    public get teamDaysOff(): DateRange[] {
        return this._teamDaysOff;
    }

    public get status(): LoadingStatus {
        return this._status;
    }

    protected _attachActionListeners(actions: SprintsViewActions) {
        actions.headerDataAvailable.addListener(this._headerDataAvailable);
        actions.updateSprintEditorCalloutVisibility.addListener(this._newSprintCalloutStateChanged);
        actions.updateSprintPickerCalloutVisibility.addListener(this._sprintPickerCalloutStateChanged);
        actions.updateTeamDaysOff.addListener(this._onTeamDaysOffChanged);
    }

    private _headerDataAvailable = (headerData: ISprintHubHeaderData): void => {
        this._team = new Team({ id: headerData.teamId, name: headerData.teamName });
        this._selectedIteration = headerData.selectedIteration;
        this._selectedIterationTimeframe = headerData.selectedIterationTimeframe;
        this._nextIteration = headerData.nextIteration;
        this._previousIteration = headerData.previousIteration;
        this._backlogIterationFriendlyPath = headerData.backlogIterationFriendlyPath;
        this._exceptionInfo = headerData.exceptionInfo;
        this._teamIterations = headerData.teamIterations;
        this._teamWeekends = headerData.teamWeekends;
        this._teamDaysOff = headerData.teamDaysOff;
        this._status = headerData.exceptionInfo ? LoadingStatus.ErrorLoadingData : LoadingStatus.LoadedWithContent;

        this.emitChanged();
    }

    private _onTeamDaysOffChanged = (newTeamDaysOff: DateRange[]): void => {
        this._teamDaysOff = newTeamDaysOff;
        this.emitChanged();
    }

    private _newSprintCalloutStateChanged = (open: boolean): void => {
        this._isSprintEditorCalloutOpen = open;
        this.emitChanged();
    }

    private _sprintPickerCalloutStateChanged = (open: boolean): void => {
        this._isSprintPickerCalloutOpen = open;
        this.emitChanged();
    }
}
