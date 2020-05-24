import { TeamBoardPivotActions } from "Agile/Scripts/BoardsHub/TeamBoardPivot/ActionsCreator/TeamBoardPivotActions";
import { ITeamBoardPivotContentDataProviderData, ITeamBoardPivotState } from "Agile/Scripts/BoardsHub/TeamBoardPivot/TeamBoardPivotContracts";
import { BoardModel } from "Agile/Scripts/TFS.Agile.Boards";
import { Store as VssStore } from "VSS/Flux/Store";
import { FilterState, IFilter, isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export class TeamBoardPivotStore extends VssStore {
    protected _boardContentData: ITeamBoardPivotContentDataProviderData = null;
    protected _boardModel: BoardModel = null;

    private _eventScopeId: string = null;
    private _boardFilter: IDictionaryStringTo<IFilter> = null;
    private _isFilterBarOpen: boolean;
    private _isFiltered: boolean;

    constructor(actions: TeamBoardPivotActions) {
        super();
        this._attachActionListeners(actions);
    }

    public getBoardViewState(): ITeamBoardPivotState {
        if (!this._eventScopeId) {
            this._eventScopeId = `BoardView_${(new Date()).getTime().toString()}`;
        }

        const state = <ITeamBoardPivotState>{
            // UI state
            initialFilterState: this._boardFilter,
            eventScopeId: this._eventScopeId,
            isFilterBarOpen: this._isFilterBarOpen,
            isFiltered: this._isFiltered
        };

        if (this._boardContentData) {
            state.signalrHubUrl = this._boardContentData.signalrHubUrl;
            state.boardModel = this._boardModel;
            state.backlogContextData = this._boardContentData.backlogContextData;
            state.contentExceptionInfo = this._boardContentData.exceptionInfo;
        } else {
            state.signalrHubUrl = null;
            state.boardModel = null;
            state.backlogContextData = null;
            state.contentExceptionInfo = null;
        }

        state.disableActions = !!state.contentExceptionInfo || !state.boardModel || state.boardModel.notReady;
        return state;
    }

    protected _attachActionListeners(actions: TeamBoardPivotActions) {
        actions.boardContentAvailable.addListener(this._boardContentAvailable);
        actions.boardCriteriaFilterChanged.addListener(this._handleBoardCriteriaFilterChanged);
        actions.resetBoard.addListener(this._handleResetBoard);
        actions.toggleFilterBarVisible.addListener(this._handleToggleFilterBar);
    }

    private _handleResetBoard = () => {
        this._boardFilter = null;
        this._eventScopeId = null;
        this._boardModel = null;
        this._boardContentData = null;

        this.emitChanged();
    }

    private _handleToggleFilterBar = (isFilterBarVisible: boolean): void => {
        this._isFilterBarOpen = isFilterBarVisible;
        this.emitChanged();
    }

    private _boardContentAvailable = (boardContentData: ITeamBoardPivotContentDataProviderData) => {
        this._boardContentData = boardContentData;
        this._boardModel = boardContentData.boardModel;
        this._boardFilter = this._getBoardFilter(boardContentData.boardModel);
        this._isFiltered = !isFilterStateEmpty(this._boardFilter);
        this._isFilterBarOpen = this._isFiltered;

        this.emitChanged();
    }

    private _handleBoardCriteriaFilterChanged = (filterState: FilterState): void => {
        this._boardFilter = filterState;
        this._isFiltered = !isFilterStateEmpty(this._boardFilter);
        this.emitChanged();
    }

    private _getBoardFilter(boardModel: BoardModel): FilterState {
        if (boardModel && boardModel.boardFilterSettings) {
            return boardModel.boardFilterSettings.initialFilter;
        }
        return null;
    }
}