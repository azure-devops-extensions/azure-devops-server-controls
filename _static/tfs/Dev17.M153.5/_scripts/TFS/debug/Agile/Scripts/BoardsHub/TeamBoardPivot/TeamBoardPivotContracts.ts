import { BoardFilterDataSource } from "Agile/Scripts/Board/BoardFilterDataSource";
import { IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { BoardModel } from "Agile/Scripts/TFS.Agile.Boards";
import { IFilter } from "VSSUI/Utilities/Filter";
import { IObservableValue } from "VSS/Core/Observable";
import { IWorkItemFilterField } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { ITeamBoardPivotContext } from "Agile/Scripts/BoardsHub/BoardsHubContracts";

// DataProvider Contracts

/**
 * Hub content data coming via the data provider
 */
export interface ITeamBoardPivotContentDataProviderData {
    boardModel: BoardModel;
    backlogContextData: IBacklogContextData;
    exceptionInfo: ExceptionInfo;
    signalrHubUrl: string;
}

// State Contracts

/**
 * State for the BoardView
 */
export interface ITeamBoardPivotState {
    // From content view
    pivotContext: ITeamBoardPivotContext;

    // Filter
    initialFilterState: FilterState;

    // Signal R
    signalrHubUrl?: string;

    // Content
    boardModel?: BoardModel;
    backlogContextData?: IBacklogContextData;
    contentExceptionInfo?: ExceptionInfo;
    isFilterBarOpen: boolean;
    isFiltered: boolean;

    // Should all actions be disabled?
    disableActions: boolean;

    //Scope id to be used for all events
    eventScopeId: string;
}

/** Boards hub filter context */
export interface IBoardsHubFilterContext {
    /** Board Id */
    boardId: string;

    /** Boards filter data source */
    dataSource: BoardFilterDataSource;

    /** Filter fields supported by the board */
    filterFields: IWorkItemFilterField[];

    /** Initial board filter state */
    initialFilterState: FilterState;

    /** Filter instance from hubViewState */
    filter: IFilter;

    /** Event scope id */
    eventScopeId: string;

    /** Flag indicating whether the filter should not be focussed on component mount */
    skipFocusOnMount: boolean;
}

/** Filter options interface for boards wrapper */
export interface IBoardsWrapperFilterOptions {
    /** Filter instance from hubViewState */
    filter: IFilter;

    /** Initial board fitler state */
    initialFilterState: FilterState;

    /** Boards hub filter options observable */
    hubFilterContext: IObservableValue<IBoardsHubFilterContext>;

    /** HubFilterControl set filter visibility state */
    showHubFilter: (filterState: boolean) => void;
}