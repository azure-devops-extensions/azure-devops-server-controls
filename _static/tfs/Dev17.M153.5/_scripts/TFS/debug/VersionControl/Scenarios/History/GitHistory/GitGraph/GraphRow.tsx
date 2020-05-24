/// <reference types="react" />

import * as React from "react";

import * as Events_Services from "VSS/Events/Services";
import * as Utils_String from "VSS/Utils/String";

import { GraphCell } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphCell";
import {
    HistoryGraphOrientation,
    IHistroyGraphCellRenderer,
    IHistoryGraphRenderSettings
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphRenderContracts";
import {
    IHistoryGraphRow
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/GraphRow";

export interface IGraphRowProps {
    row: IHistoryGraphRow;
    cellRenderer: IHistroyGraphCellRenderer,
    rowMinWidth: number;
    staticWidth: number;
    staticHeight: number;
}

export interface IGraphRowState {
    currentHeight: number;
}

/**
 * Renders a single git graph row
 */
export class GraphRow extends React.Component<IGraphRowProps, IGraphRowState> {
    private _row: HTMLElement;
    private _isMounted: boolean;  // this is to fix the race condition between removing resize handler and its invocation

    constructor(props: IGraphRowProps, context?: any) {
        super(props, context);

        this.state = {
            currentHeight: this.props.staticHeight
        } as IGraphRowState;
    }

    public render(): JSX.Element {
        if (this.props.row) {
            return (
                <div style={ this._getStyleFromProps() } 
                    className="graph-row" 
                    aria-label={ Utils_String.format(VCResources.GitGraphRowAriaLabel, this.props.row.commit.commitId) }
                    ref={ this._saveRowRef }>
                    { this._getGraphCellCanvases() }
                </div>
            );
        } else {
            return null;
        }
    }

    public componentDidUpdate(): void {
        this._assignParentContainerHeight();
    }

    public componentDidMount(): void {
        this._isMounted = true;
        Events_Services.getService().attachEvent(getUpdateHeightEventName(this.props.row.id), this._assignParentContainerHeight)
        Events_Services.getService().attachEvent(getListUpdatedEventName(), this._assignParentContainerHeight)
        Events_Services.getService().attachEvent(getResetHeightEventName(this.props.row.id), this._resetHeight);
    }

    public componentWillUnmount(): void {
        this._isMounted = false;
        Events_Services.getService().detachEvent(getUpdateHeightEventName(this.props.row.id), this._assignParentContainerHeight)
        Events_Services.getService().detachEvent(getListUpdatedEventName(), this._assignParentContainerHeight)
        Events_Services.getService().detachEvent(getResetHeightEventName(this.props.row.id), this._resetHeight);
    }

    private _saveRowRef = (element: HTMLElement): void => {
        this._row = element;
    }

    private _getStyleFromProps(): React.CSSProperties {
        return {
            minWidth: this.props.rowMinWidth
        };
    }

    private _resetHeight = (): void => {
        // This will reset the height of the row. In the DidUpdate() we decide the new height of the row.

        if (this._isMounted) {
            // isMounted check if added since certain pages in DetailsList are having issues with unMounting.
            // TODO: Open issue with OfficeFabric Team
            this.setState({
                currentHeight: this.props.staticHeight
            });
        }
    }

    private _assignParentContainerHeight = (): void => {
        /*
            This is for re-rendering the row if the row height is higher than the static height
            Cases:
                1. Commit message wraps to next line due to zoom
                2. Commit message wraps to next line due to window resize
                3. Commit message wraps to next line due to right pane resize
                4. Commit message expands to see more comments
        */
        if (this._row) {
            const parent: any = this._row.offsetParent;
            if (parent) {
                const newHeight = Math.round(parent.offsetHeight);

                if (newHeight !== this.state.currentHeight) {
                    this.setState({
                        currentHeight: newHeight
                    });
                }
            }
        }
    }

    /**
     * Returns the array of graph cell elements that needs to be rendered in the row
     * 1. Creates the graph cell element for the row's tracing cell
     * 2. Creates the graph cell element for the row's excision cell
     * 3. Creates graph cell elements for all cells in the graph row model
     */
    private _getGraphCellCanvases(): JSX.Element[] {
        const graphCells: JSX.Element[] = [];
        let maxCellId: number = 0;

        if (this.props.row && this.props.row.commit) {
            for (const key in this.props.row.cells) {
                const cellIndex = parseInt(key);
                if (!isNaN(cellIndex)) {
                    maxCellId = cellIndex;
                }
            }

            // create the graph cell element for the row's tracing cell
            const commitId = this.props.row.commit.commitId;
            const tracingCellId = "cell-" + commitId + "-tracing";
            graphCells.push((
                <GraphCell key={ tracingCellId }
                    cellId={ tracingCellId }
                    className={ this._getCellClass() }
                    cell={ this.props.row.getTracingCell() }
                    cellRenderer={this.props.cellRenderer }
                    width={ this.props.staticWidth }
                    height={ this.props.staticHeight }
                    extendedHeight={ this.state.currentHeight } />
            ));

            // create the graph cell element for the row's excision cell
            const excisionCellId = "cell-" + commitId + "-excision";
            graphCells.push((
                <GraphCell key={ excisionCellId }
                    cellId={ excisionCellId }
                    className={ this._getCellClass() }
                    cell={ this.props.row.getExcisionCell() }
                    cellRenderer={this.props.cellRenderer }
                    width={ this.props.staticWidth }
                    height={ this.props.staticHeight }
                    extendedHeight={ this.state.currentHeight } />
            ));

            // create the graph cell elements for all the cells in the row model
            for (let i = 0; i <= maxCellId; i++) {
                const cellId = "cell-" + commitId + "-" + i;
                graphCells.push((
                    <GraphCell key={ cellId }
                        cellId={ cellId }
                        className={ this._getCellClass() }
                        cell={ this.props.row.cells[i] }
                        cellRenderer={this.props.cellRenderer }
                        width={ this.props.staticWidth }
                        height={ this.props.staticHeight }
                        extendedHeight={ this.state.currentHeight } />
                ));
            }
        }
        return graphCells;
    }

    /**
     * Returns the className for the cells.
     * This supports in rendering the cells from left to right and right to left in LeftJustify and RightJustify modes
     */
    private _getCellClass(): string {
        if (this.props.row.parentGraph.settings.orientation === HistoryGraphOrientation.LeftJustify) {
            return "graph-cell left-justify";
        } else {
            return "graph-cell right-justify";
        }
    }
}

/**
 * In the grid row, there can be other column's cells that can change the height of the grid row.
 * Fire this event to update the height of the graph cell to that of the parent's container height.
 */
export function getUpdateHeightEventName(index: number): string {
    return "EVENT_UPDATE_HEIGHT:" + index;
}

/**
 * Fire list update event to update the height of the entire graph column, instead of updating height of the individual row cell.
 * Height of the graph cell is updated to the height of the parent container.
 */
export function getListUpdatedEventName(): string {
    return "EVENT_LIST_UPDATED";
}

/**
 * This event resets the height of the graph cell to that of the default height.
 * Since above two events always assign the height of the parent. This event is used to reduce 
 * the height of the graph cell to the default value.
 */
export function getResetHeightEventName(index: number): string {
    return "EVENT_RESET_HEIGHT:" + index;
}