import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/BoardsHub/TeamBoardPivot/Components/BoardWrapper";
import { BoardFilterDataSource } from "Agile/Scripts/Board/BoardFilterDataSource";
import { BoardView } from "Agile/Scripts/Board/BoardsControls";
import { LegacyBoardHelper } from "Agile/Scripts/Board/LegacyBoardHelper";
import { IBoardsHubFilterContext, IBoardsWrapperFilterOptions } from "Agile/Scripts/BoardsHub/TeamBoardPivot/TeamBoardPivotContracts";
import { BacklogContext, IBacklogContextData } from "Agile/Scripts/Common/Agile";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { BoardModel, BoardNode, ItemSource, Notifications } from "Agile/Scripts/TFS.Agile.Boards";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { BaseControl } from "VSS/Controls";
import * as Diag from "VSS/Diag";
import { Component, Props } from "VSS/Flux/Component";
import { equals } from "VSS/Utils/String";
import * as WorkItemFilter_NO_REQUIRE from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";

export interface IBoardWrapperProps extends Props {
    boardModel: BoardModel;
    backlogContextData: IBacklogContextData;
    signalrHubUrl: string;
    eventScopeId: string;
    filterOptions: IBoardsWrapperFilterOptions;
}

export class BoardWrapper extends Component<IBoardWrapperProps, {}> {
    private _boardView: BoardView = null;
    private _eventsHelper: ScopedEventHelper;

    constructor(props: IBoardWrapperProps) {
        super(props);
    }

    /**
     * Reference to the DOM
     */
    public refs: {
        [key: string]: (Element);
        boardContainer: HTMLDivElement;
    };

    public render(): JSX.Element {
        return (
            <div id="boardContainer" className="board-container" ref="boardContainer">
                {/* This message area is used by the board control to show info/warnings/errors */}
                <div className="agile-board-message-area" />
                {this.props.children}
            </div>
        );
    }

    public componentDidMount() {
        this._renderBoardView();
    }

    public componentDidUpdate() {
        this._renderBoardView();
    }

    public componentWillUnmount() {
        this._disposeBoardView();
    }

    public shouldComponentUpdate(nextProps: IBoardWrapperProps): boolean {
        const currentBoardId = (this.props.boardModel && this.props.boardModel.board) ? this.props.boardModel.board.id : null;
        const nextBoardId = (nextProps.boardModel && nextProps.boardModel.board) ? nextProps.boardModel.board.id : null;

        // The following is true only when the current board is either being updated or when a new board is being rendered
        return !equals(currentBoardId, nextBoardId, true);
    }

    private _renderBoardView() {
        if (!this.props.signalrHubUrl) {
            return;
        }

        this._disposeBoardView();

        BacklogContext.getInstance().setBacklogContextData(this.props.backlogContextData);

        // Create board view
        this._boardView = BaseControl.createIn(
            BoardView,
            $(this.refs.boardContainer),
            {
                team: this.props.backlogContextData.team,
                getBoardModel: () => LegacyBoardHelper.initializeBoardModel(this.props.boardModel),
                eventScopeId: this.props.eventScopeId,
                signalRHubUrl: this.props.signalrHubUrl
            }
        ) as BoardView;

        this._initializeFilters();
    }

    private _disposeBoardView() {
        if (this._boardView) {
            // Dispose board
            this._boardView.dispose();
            this._boardView = null;

            const filterOptions = this.props.filterOptions;
            if (filterOptions) {
                // Dispose filter options and reset the hub filter
                filterOptions.hubFilterContext.value = null;
                filterOptions.showHubFilter(false);
                filterOptions.filter.reset();
            }
        }

        if (this._eventsHelper) {
            this._eventsHelper.dispose();
        }
    }

    private _initializeFilters = (): void => {
        Diag.Debug.assertIsObject(this._boardView, "Board view cannot be null");

        const filterOptions = this.props.filterOptions;

        if (!filterOptions) {
            return;
        }

        const tfsContext = TfsContext.getDefault();
        const projectName = tfsContext.navigation.project;
        const boardFilterDataSource = new BoardFilterDataSource(
            this._getCurrentBoardItemSource,
            this._getCurrentBoardRootNode
        );

        const boardView = this._boardView;
        this._boardView.getBoardFilterFields(projectName, boardFilterDataSource).then(
            (filterFields: WorkItemFilter_NO_REQUIRE.IWorkItemFilterField[]) => {
                // Checking if the board was disposed before this call completed, if yes don't initialize filters
                if (!boardView || !boardView.board()) {
                    return;
                }

                filterOptions.hubFilterContext.value = {
                    boardId: this._boardView.board().id(),
                    dataSource: boardFilterDataSource,
                    filterFields: filterFields,
                    eventScopeId: this.props.eventScopeId,
                    filter: filterOptions.filter,
                    initialFilterState: filterOptions.initialFilterState
                } as IBoardsHubFilterContext;

                if (filterOptions.initialFilterState && !isFilterStateEmpty(filterOptions.initialFilterState)) {
                    // If sticky filters are available, toggle the hub filter ON
                    // SkipFocus on mount as this is not a user action
                    filterOptions.hubFilterContext.value.skipFocusOnMount = true;
                    filterOptions.showHubFilter(true);
                }

                this._eventsHelper = new ScopedEventHelper(this.props.eventScopeId);
                this._eventsHelper.attachEvent(Notifications.ToggleBoardsHubFilterON, this._onToggleBoardsHubFilterON)
            }
        );
    }

    private _onToggleBoardsHubFilterON = (): void => {
        const options = this.props.filterOptions;
        if (options) {
            options.showHubFilter(true);
        }
    }

    /** 
     * Get itemSource from current board instance
     */
    private _getCurrentBoardItemSource = (): ItemSource => {
        return this._boardView ? this._boardView.getCurrentBoardItemSource() : null;
    }

    /** 
     * Get rootNode from current board instance
     */
    private _getCurrentBoardRootNode = (): BoardNode => {
        return this._boardView ? this._boardView.getCurrentBoardRootNode() : null;
    }
}