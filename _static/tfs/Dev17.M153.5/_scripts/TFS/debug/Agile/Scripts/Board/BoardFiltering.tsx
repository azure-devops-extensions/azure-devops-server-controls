import * as React from "react";
import * as ReactDOM from "react-dom";

import { BoardFilterAnnouncer } from "Agile/Scripts/Board/BoardFilterAnnouncer";
import { BoardFilterDataSource } from "Agile/Scripts/Board/BoardFilterDataSource";
import { Notifications } from "Agile/Scripts/TFS.Agile.Boards";
import { Fabric } from "OfficeFabric/Fabric";
import { Control } from "VSS/Controls";
import { getService as getEventService } from "VSS/Events/Services";
import { IFilter } from "VSSUI/Utilities/Filter";
import { IWorkItemFilterField, WorkItemFilter } from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";

// VSS
// WorkItemTracking
// Agile
export interface IBoardFilterProps {
    /** Project name of the board to be filtered */
    projectName: string;

    initialFilterState?: FilterState;

    /** Scope for the events */
    eventScopeId: string;

    /** Filter fields supported by the board */
    fields: IWorkItemFilterField[];

    /** Board filter data source */
    boardFilterDataSource: BoardFilterDataSource;

    /** Optional VSS filter object to subscribe to */
    filter?: IFilter;

    /** Optional callback to handle clicking on the filter bar dismiss button */
    onDismissClicked?: () => void;
}

export class BoardFilter extends React.Component<IBoardFilterProps> {
    private _workItemFilter: WorkItemFilter;
    private _boardFilterAnnouncer: BoardFilterAnnouncer;

    public componentWillMount() {
        const eventService = getEventService();
        eventService.attachEvent(Notifications.BoardItemsUpdated, this.onBoardItemsUpdated, this.props.eventScopeId);
        eventService.attachEvent(Notifications.BoardUpdated, this.onBoardItemsUpdated, this.props.eventScopeId);
        this._boardFilterAnnouncer = new BoardFilterAnnouncer();
    }

    public componentWillUnmount() {
        const eventService = getEventService();
        eventService.detachEvent(Notifications.BoardItemsUpdated, this.onBoardItemsUpdated, this.props.eventScopeId);
        eventService.detachEvent(Notifications.BoardUpdated, this.onBoardItemsUpdated, this.props.eventScopeId);
        this._boardFilterAnnouncer.dispose();
    }

    public componentDidUpdate() {
        this.onBoardItemsUpdated();
    }

    public render(): JSX.Element {
        return (
            <WorkItemFilter
                ref={this.resolveWorkItemFilter}
                dataSource={this.props.boardFilterDataSource}
                fields={this.props.fields}
                filterUpdatedCallback={this.onFilterChanged}
                initialFilterState={this.props.initialFilterState}
                filter={this.props.filter}
                setDefaultFilter={true}
                onDismissClicked={this.props.onDismissClicked}
            />
        );
    }

    public focus() {
        if (this._workItemFilter) {
            this._workItemFilter.focus();
        }
    }

    private resolveWorkItemFilter = (workItemFilter: WorkItemFilter) => {
        this._workItemFilter = workItemFilter;
    }

    private onFilterChanged = (filter: FilterState) => {
        this._boardFilterAnnouncer.startListening(this.props.boardFilterDataSource);
        getEventService().fire(
            Notifications.BoardCriteriaFilterChanged,
            {
                filter: filter
            },  /*args*/null, this.props.eventScopeId);
    }

    private onBoardItemsUpdated = () => {
        if (this._workItemFilter) {
            this._workItemFilter.update();
        }
    }
}

/** BoardFilterBar wraps board-filter react-component into a VSSControl. Options should be similar to IBoardFilterProps */
export interface IBoardFilterBarOptions extends IBoardFilterProps { }

/**
 * JQuery wrapper for legacy board experience
 */
export class BoardFilterBar extends Control<IBoardFilterBarOptions> {
    private _isVisible = false;
    private _boardFilter: BoardFilter;

    public dispose(): void {
        ReactDOM.unmountComponentAtNode(this.getElement()[0]);

        super.dispose();
    }

    public showElement(focus: boolean = false): void {
        super.showElement();

        this._isVisible = true;
        this._ensureFilterControls();
        if (focus && this._boardFilter) {
            this._boardFilter.focus();
        }
    }

    public hideElement(): void {
        super.hideElement();

        this._isVisible = false;
    }

    public isVisible(): boolean {
        return this._isVisible;
    }

    public toggleVisibility(): void {
        if (this._isVisible) {
            this.hideElement();
        } else {
            this.showElement(true);
        }
    }

    protected _ensureFilterControls() {
        ReactDOM.render(
            <Fabric>
                <BoardFilter
                    ref={this._resolveBoardFilter}
                    projectName={this._options.projectName}
                    initialFilterState={this._options.initialFilterState}
                    eventScopeId={this._options.eventScopeId}
                    fields={this._options.fields}
                    boardFilterDataSource={this._options.boardFilterDataSource}
                />
            </Fabric>,
            this.getElement()[0]
        );
    }

    private _resolveBoardFilter = (boardFilter: BoardFilter) => {
        this._boardFilter = boardFilter;
    }
}