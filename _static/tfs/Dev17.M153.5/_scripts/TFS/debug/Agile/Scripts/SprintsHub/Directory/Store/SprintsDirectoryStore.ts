import { DirectoryActions } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActions";
import { Iteration, IterationBuilder } from "Agile/Scripts/Models/Iteration";
import { IAllSprintsData, IMySprintsData, ISprintsIterationData } from "Agile/Scripts/SprintsHub/Directory/SprintDirectoryContracts";
import { IStore, Store } from "VSS/Flux/Store";
import { SprintsDirectoryActions } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryActions";
import { removeWhere } from "VSS/Utils/Array";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { getErrorMessage } from "VSS/VSS";

export interface ISprintsDirectoryStore extends IStore {
    /** Is the all data for this store initialized */
    readonly isAllDataInitialized: boolean;
    /** Is the my data for this store initialized */
    readonly isMyDataInitialized: boolean;
    /** Are teams being paged */
    readonly isPagingTeams: boolean;
    /** The currently paged team ids */
    readonly pagedTeamIds: string[];
    /** The configured page size */
    readonly pageSize: number;
    /** Page teams error */
    readonly pageTeamsFailedError: ExceptionInfo;
    /** Get the current iteration for a team */
    getCurrentIteration(teamId: string): Iteration;
}

/**
 * Store which contains iterations and paging information for Sprint directory pages
 */
export class SprintsDirectoryStore extends Store implements ISprintsDirectoryStore {
    private _directoryActions: DirectoryActions;
    private _sprintsActions: SprintsDirectoryActions;

    // Data
    private _pageSize: number;
    private _pagedTeamIds: string[];
    private _teamToIterationMapping: IDictionaryStringTo<Iteration>;

    private _pageTeamsFailedError: ExceptionInfo;

    // Flags
    private _isAllDataInitialized: boolean;
    private _isMyDataInitialized: boolean;
    private _isPagingTeams: boolean;

    public getCurrentIteration(teamId: string): Iteration {
        return this._teamToIterationMapping[teamId];
    }

    public get pagedTeamIds(): string[] {
        return this._pagedTeamIds;
    }

    public get pageSize(): number {
        return this._pageSize;
    }

    public get isAllDataInitialized(): boolean {
        return this._isAllDataInitialized;
    }

    public get isMyDataInitialized(): boolean {
        return this._isMyDataInitialized;
    }

    public get isPagingTeams(): boolean {
        return this._isPagingTeams;
    }

    public get pageTeamsFailedError(): ExceptionInfo {
        return this._pageTeamsFailedError;
    }

    constructor(directoryActions: DirectoryActions, sprintsActions: SprintsDirectoryActions) {
        super();

        this._directoryActions = directoryActions;
        this._sprintsActions = sprintsActions;

        this._pagedTeamIds = [];
        this._teamToIterationMapping = {};
        this._isAllDataInitialized = false;
        this._isMyDataInitialized = false;
        this._isPagingTeams = false;

        this._directoryActions.allDataAvailableAction.addListener(this._handleAllDataAvailableAction);
        this._directoryActions.myDataAvailableAction.addListener(this._handleMyDataAvailableAction);
        this._sprintsActions.beginPagingTeams.addListener(this._handleBeginPagingTeams);
        this._sprintsActions.teamsPaged.addListener(this._handleTeamsPaged);
        this._sprintsActions.teamsPagedFailed.addListener(this._handleTeamsPagedFailed);
    }

    private _handleAllDataAvailableAction = (payload: IAllSprintsData): void => {
        this._addOrUpdateIterations(payload.currentIterationMapping || {});
        this._pagedTeamIds = (payload.pagedTeams || []).map(t => t.id);
        this._pageSize = payload.pageSize;

        this._isAllDataInitialized = true;
        this.emitChanged();
    };

    private _handleMyDataAvailableAction = (payload: IMySprintsData): void => {
        this._addOrUpdateIterations(payload.currentIterationMapping || {});

        this._isMyDataInitialized = true;
        this.emitChanged();
    }

    private _handleBeginPagingTeams = (): void => {
        this._isPagingTeams = true;
        this.emitChanged();
    }

    private _handleTeamsPaged = (teamsToIterations: IDictionaryStringTo<Iteration>): void => {
        this._isPagingTeams = false;
        for (const teamId in teamsToIterations) {
            const iteration: Iteration = teamsToIterations[teamId];
            this._teamToIterationMapping[teamId] = iteration;
            removeWhere(this._pagedTeamIds, (pagedTeamId: string) => pagedTeamId === teamId);
            this._pagedTeamIds.push(teamId);
        }

        this.emitChanged();
    }

    private _handleTeamsPagedFailed = (error: TfsError): void => {
        this._isPagingTeams = false;
        this._pageTeamsFailedError = {
            exceptionMessage: getErrorMessage(error)
        };

        this.emitChanged();
    }

    private _addOrUpdateIterations(iterationMapping: IDictionaryStringTo<ISprintsIterationData>): void {
        for (const teamId in iterationMapping) {
            const iteration: ISprintsIterationData = iterationMapping[teamId];
            if (iteration) {
                this._teamToIterationMapping[teamId] = IterationBuilder.fromISprintsIterationData(iteration);
            }
        }
    }
}