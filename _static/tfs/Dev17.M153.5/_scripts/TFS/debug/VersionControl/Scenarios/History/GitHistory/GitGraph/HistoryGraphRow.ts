import { GitCommitRef } from "TFS/VersionControl/Contracts";
import {
    HighlightDirection,
    ExcisionVisComponents,
    VisComponents
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationContracts";
import {
    IHistoryGraph,
    IHistoryGraphRow
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { VisualizationCell } from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationCell";

export class HistoryGraphRow implements IHistoryGraphRow {
    private _id: number;
    private _commit: GitCommitRef;
    private _commitCellId: number;
    private _maxCellId: number;
    private _cells: IDictionaryNumberTo<VisualizationCell>;
    private _hasOutgoingExcisedCommits: boolean;
    private _hasIncomingExcisedCommits: boolean;
    private _aboveCommitId: string;
    private _belowCommitId: string;
    private _parentCommitIds: string[];
    private _childCommitIds: string[];
    private _parentGraph: IHistoryGraph;

    // excision cells
    private _excisionCell: VisualizationCell;
    private _tracingCell: VisualizationCell;

    constructor(options: {
        id: number,
        commit: GitCommitRef,
        commitCellId: number,
        maxCellId: number,
        cells: IDictionaryNumberTo<VisualizationCell>,
        hasOutgoingExcisedCommits: boolean,
        hasIncomingExcisedCommits: boolean,
        aboveCommitId: string,
        belowCommitId: string
    }) {
        this._id = options.id;
        this._commit = options.commit;
        this._commitCellId = options.commitCellId;
        this._maxCellId = options.maxCellId;
        this._cells = options.cells;
        this._hasOutgoingExcisedCommits = options.hasOutgoingExcisedCommits;
        this._hasIncomingExcisedCommits = options.hasIncomingExcisedCommits;
        this._aboveCommitId = options.aboveCommitId;
        this._belowCommitId = options.belowCommitId;
    }

    public get id(): number {
        return this._id;
    }

    public get commit(): GitCommitRef {
        return this._commit;
    }

    public get commitCellId(): number {
        return this._commitCellId;
    }

    public get maxCellId(): number {
        return this._maxCellId;
    }

    public get cells(): IDictionaryNumberTo<VisualizationCell> {
        return this._cells;
    }

    public get hasOutgoingExcisedCommits(): boolean {
        return this._hasOutgoingExcisedCommits;
    }

    public get hasIncomingExcisedCommits(): boolean {
        return this._hasIncomingExcisedCommits;
    }

    public get hasOngoingExcisedCommitTrackingLine(): boolean {
        return !!(this.parentGraph &&
            this.parentGraph.selectedCommitId &&
            !this.isSelected &&
            this.parentGraph.selectedOldestExcisedParentRowId !== this.id &&
            this.parentGraph.selectedYoungestExcisedChildRowId !== this.id &&
            this._isInSelectedRange());
    }

    public get isSelected(): boolean {
        return !!(this.parentGraph &&
            this.parentGraph.selectedCommitId === this.commit.commitId);
    }

    public get isSelectedExcisedCommitParent(): boolean {
        return !!(this.parentGraph &&
            this.parentGraph.selectedCommitId &&
            ((this.parentGraph.selectedExcisedParentCommitIds && this.parentGraph.selectedExcisedParentCommitIds.indexOf(this.commit.commitId) >= 0)
                || (this.isSelected && this.hasIncomingExcisedCommits)));
    }

    public get isSelectedExcisedCommitChild(): boolean {
        return !!(this.parentGraph &&
            this.parentGraph.selectedCommitId &&
            ((this.parentGraph.selectedExcisedChildCommitIds && this.parentGraph.selectedExcisedChildCommitIds.indexOf(this.commit.commitId) >= 0)
                || (this.isSelected && this.hasOutgoingExcisedCommits)));
    }

    public get aboveCommitId(): string {
        return this._aboveCommitId;
    }

    public get belowCommitId(): string {
        return this._belowCommitId;
    }

    public get parentCommitIds(): string[] {
        return this._parentCommitIds;
    }

    public set parentCommitIds(parentIds: string[]) {
        this._parentCommitIds = parentIds;
    }

    public get childCommitIds(): string[] {
        return this._childCommitIds;
    }

    public set childCommitIds(childIds: string[]) {
        this._childCommitIds = childIds;
    }

    public get parentGraph(): IHistoryGraph {
        return this._parentGraph;
    }

    public set parentGraph(graph: IHistoryGraph) {
        this._parentGraph = graph;
    }
    
    /**
     * Constructs and returns the cell corresponding to the excision lane of the row.
     * It will primarily hold the excision components of the row
     */
    public getExcisionCell(): VisualizationCell {
        const components: VisComponents = VisComponents.None;
        let excisionComponents: ExcisionVisComponents = ExcisionVisComponents.None;

        if (this.hasOutgoingExcisedCommits || this.hasIncomingExcisedCommits) {
            excisionComponents |=
                (this.hasOutgoingExcisedCommits && !this.isSelectedExcisedCommitChild) ? ExcisionVisComponents.OutgoingExcision : ExcisionVisComponents.None;
            excisionComponents |=
                (this.hasIncomingExcisedCommits && !this.isSelectedExcisedCommitParent) ? ExcisionVisComponents.IncomingExcision : ExcisionVisComponents.None;
            excisionComponents |=
                (this.hasOutgoingExcisedCommits && this.isSelectedExcisedCommitChild) ? ExcisionVisComponents.ExcisionHorizontal : ExcisionVisComponents.None;
            excisionComponents |=
                (this.hasIncomingExcisedCommits && this.isSelectedExcisedCommitParent) ? ExcisionVisComponents.ExcisionHorizontal : ExcisionVisComponents.None;
        }

        // Id assigned to excision cell is -1
        const excisionCell: VisualizationCell = new VisualizationCell(-1,
            components,
            excisionComponents);
        let highlightExcisions: boolean = false;

        for (let i = 0; i <= this.maxCellId; i++) {
            const cell: VisualizationCell = this.cells[i];
            if (cell) {
                highlightExcisions = cell.leftMiddleHighlit;
                break;
            }
        }

        // Do not highlight if the excision is not selected
        if (this.isSelectedExcisedCommitChild || this.isSelectedExcisedCommitParent || highlightExcisions) {
            excisionCell.setExcisionHighlights(excisionComponents);
        }

        return excisionCell; 
    }

    /**
     * Constructs and returns the cell corresponding to the tracing lane of the row.
     * It will primarily hold the excision components/ tracing line of the row
     */
    public getTracingCell(): VisualizationCell {
        const components: VisComponents = VisComponents.None;
        let excisionComponents: ExcisionVisComponents = ExcisionVisComponents.None;

        if (this.hasOutgoingExcisedCommits || this.hasIncomingExcisedCommits || this.hasOngoingExcisedCommitTrackingLine ||
            this.isSelectedExcisedCommitParent || this.isSelectedExcisedCommitChild) {
            excisionComponents |=
                this.hasOngoingExcisedCommitTrackingLine ? ExcisionVisComponents.ContinuingSelectedTrackingLine : ExcisionVisComponents.None;
            excisionComponents |=
                (this.hasOutgoingExcisedCommits && this.isSelectedExcisedCommitChild) ? ExcisionVisComponents.OutgoingSelectedExcision : ExcisionVisComponents.None;
            excisionComponents |=
                (this.hasIncomingExcisedCommits && this.isSelectedExcisedCommitParent) ? ExcisionVisComponents.IncomingSelectedExcision : ExcisionVisComponents.None;
        }

        // Id assigned to tracing cell is -2
        const tracingCell: VisualizationCell = new VisualizationCell(-2,
            components,
            excisionComponents);

        // We can always highlight all tracing cell since this cell is made visible only if the commit is either selectedParent/selectedChild/HasOngoingExcisedCommitTrackingLine
        tracingCell.highlightAll();

        return tracingCell;
    }

    /**
     * Highlight the current row based on the cells from the row below
     * This does not highlight the excision/tracing cells
     * @param cellsBelow - cells from the row below
     */
    public highlightFromBelow(cellsBelow: IDictionaryNumberTo<VisualizationCell>): void {
        if (!this.cells || Object.keys(this.cells).length === 0 || !cellsBelow) {
            return;
        }

        const cellsAboveWithHorizontal: IDictionaryNumberTo<boolean> = {};

        for (const cellId in cellsBelow) {
            const cellBelow: VisualizationCell = cellsBelow[cellId];
            const index: number = cellBelow.id;

            // Only if the cell below is highlighted, we would have any component to highlight in the current row
            if (cellBelow.hasHighlights()) {
                const upLeftCell: VisualizationCell = this.cells[index - 1];
                const upCenterCell: VisualizationCell = this.cells[index];
                const upRightCell: VisualizationCell = this.cells[index + 1];

                /*                 (0)   (1)   (2)
                 *               +++++++++++++++++++
                 *               +     +     +     +                      0- upLeftCell
                 *               +     +     +     +                      1- upCenterCell
                 *               +     +     +     +                      2- upRightCell
                 *               +     +     +     +
                 *               +++++++++++++++++++
                 *                     +     +
                 *                     +     +
                 *                     +     +
                 *                     +     +
                 *                     +++++++
                 *                    cellBelow
                 */

                const topHalf: VisComponents = VisComponents.TopLeft | VisComponents.TopMiddle | VisComponents.TopRight | VisComponents.Circle;
                if (upLeftCell && cellBelow.topLeftHighlit && upLeftCell.bottomRight) {
                    /*
                     * 'upLeftCell' will get highlights only if 'cellBelow' has a top left highlight and 'upLeftCell' has bottom right
                     *
                     *                 (0)   (1)   (2)
                     *               +++++++++++++++++++
                     *               +     +     +     +                      0- upLeftCell
                     *               +     +     +     +                      1- upCenterCell
                     *               +   \ +     +     +                      2- upRightCell
                     *               +    \+     +     +
                     *               ++++++\++++++++++++
                     *                     +\    +
                     *                     + \   +
                     *                     +     +
                     *                     +     +
                     *                     +++++++
                     *                    cellBelow
                     */
                    upLeftCell.setHighlights(VisComponents.BottomRight | topHalf);
                    if (upLeftCell.setHighlights(VisComponents.RightCenter) &&
                        !cellsAboveWithHorizontal[index - 1]) {
                        cellsAboveWithHorizontal[index - 1] = true;
                    }
                }
                if (upCenterCell && cellBelow.topMiddleHighlit && (upCenterCell.bottomMiddle || upCenterCell.octopusMerge)) {
                    /*
                     * 'upCenterCell' will get highlights only if 'cellBelow' has a top middle highlight and 'upCenterCell' has bottom middle
                     *
                     *                 (0)   (1)   (2)
                     *               +++++++++++++++++++
                     *               +     +     +     +                      0- upLeftCell
                     *               +     +     +     +                      1- upCenterCell
                     *               +     +  |  +     +                      2- upRightCell
                     *               +     +  |  +     +
                     *               +++++++++|+++++++++
                     *                     +  |  +
                     *                     +  |  +
                     *                     +     +
                     *                     +     +
                     *                     +++++++
                     *                    cellBelow
                     */
                    upCenterCell.setHighlights(VisComponents.BottomMiddle | VisComponents.OctopusMerge | topHalf);
                    if (upCenterCell.setHighlights(VisComponents.LeftMerge | VisComponents.RightMerge) &&
                        !cellsAboveWithHorizontal[index]) {
                        cellsAboveWithHorizontal[index] = true;
                    }
                }
                if (upRightCell && cellBelow.topRightHighlit && upRightCell.bottomLeft) {
                    /*
                     * 'upRightCell' will get highlights only if 'cellBelow' has a top right highlight and 'upRightCell' has bottom left
                     *
                     *                 (0)   (1)   (2)
                     *               +++++++++++++++++++
                     *               +     +     +     +                      0- upLeftCell
                     *               +     +     +     +                      1- upCenterCell
                     *               +     +     + /   +                      2- upRightCell
                     *               +     +     +/    +
                     *               ++++++++++++/++++++
                     *                     +    /+
                     *                     +   / +
                     *                     +     +
                     *                     +     +
                     *                     +++++++
                     *                    cellBelow
                     */
                    upRightCell.setHighlights(VisComponents.BottomLeft | topHalf);
                    if (upRightCell.setHighlights(VisComponents.LeftCenter) &&
                        !cellsAboveWithHorizontal[index + 1]) {
                        cellsAboveWithHorizontal[index + 1] = true;
                    }
                }
            }
        }

        for (const cellIdString in cellsAboveWithHorizontal) {
            const cellId = parseInt(cellIdString);
            if (!isNaN(cellId)) {
                this.highlightHorizontal(cellId, HighlightDirection.FromBelow, false, false);
            }
        }
    }

    /**
     * Highlight the current row based on the cells from the row above
     * This does not highlight the excision/tracing cells
     * @param cellsAbove - cells from the row above
     */
    public highlightFromAbove(cellsAbove: IDictionaryNumberTo<VisualizationCell>): void {
        if (!this.cells || Object.keys(this.cells).length === 0 || !cellsAbove) {
            return;
        }
       
        const cellsBelowWithHorizontal: IDictionaryNumberTo<boolean> = {};

        for (const cellId in cellsAbove) {
            const cellAbove: VisualizationCell = cellsAbove[cellId];
            const index: number = cellAbove.id;

            // Only if the cell above is highlighted, we would have any component to highlight in the current row
            if (cellAbove.hasHighlights()) {
                const downLeftCell: VisualizationCell = this.cells[index - 1];
                const downCenterCell: VisualizationCell = this.cells[index];
                const downRightCell: VisualizationCell = this.cells[index + 1];

                /*                    cellAbove
                 *                     +++++++
                 *                     +     +
                 *                     +     +
                 *                     +     +
                 *                     +     +
                 *               +++++++++++++++++++
                 *               +     +     +     +                      0- downLeftCell
                 *               +     +     +     +                      1- downCenterCell
                 *               +     +     +     +                      2- downRightCell
                 *               +     +     +     +
                 *               +++++++++++++++++++
                 *                 (0)   (1)   (2)
                 */

                const bottomHalf: VisComponents = VisComponents.BottomLeft | VisComponents.BottomMiddle | VisComponents.BottomRight | VisComponents.Circle;
                if (downLeftCell && downLeftCell.topRight && cellAbove.bottomLeftHighlit) {
                    /*
                     * 'downLeftCell' will get highlights only if 'cellAbove' has a bottom left highlight and 'downLeftCell' has top right
                     * 
                     *                    cellAbove
                     *                     +++++++
                     *                     +     +
                     *                     +     +
                     *                     + /   +
                     *                     +/    +
                     *               ++++++/++++++++++++
                     *               +    /+     +     +                      0- downLeftCell
                     *               +   / +     +     +                      1- downCenterCell
                     *               +     +     +     +                      2- downRightCell
                     *               +     +     +     +
                     *               +++++++++++++++++++
                     *                 (0)   (1)   (2)
                     */
                    downLeftCell.setHighlights(VisComponents.TopRight | bottomHalf);
                    if (downLeftCell.circle && downLeftCell.setHighlights(VisComponents.RightCenter) &&
                        !cellsBelowWithHorizontal[index - 1]) {
                        cellsBelowWithHorizontal[index - 1] = true;
                    }
                }

                if (downCenterCell && downCenterCell.topMiddle && (cellAbove.bottomMiddleHighlit || cellAbove.octopusMergeHighlit)) {
                    /*
                     * 'downCenterCell' will get highlights only if 'cellAbove' has a bottom middle highlight and 'downLeftCell' has top middle
                     * 
                     *                    cellAbove
                     *                     +++++++
                     *                     +     +
                     *                     +     +
                     *                     +  |  +
                     *                     +  |  +
                     *               +++++++++|+++++++++
                     *               +     +  |  +     +                      0- downLeftCell
                     *               +     +  |  +     +                      1- downCenterCell
                     *               +     +     +     +                      2- downRightCell
                     *               +     +     +     +
                     *               +++++++++++++++++++
                     *                 (0)   (1)   (2)
                     */
                    downCenterCell.setHighlights(VisComponents.TopMiddle | bottomHalf);
                    if (downCenterCell.circle && downCenterCell.setHighlights(VisComponents.LeftCenter | VisComponents.RightCenter) &&
                        !cellsBelowWithHorizontal[index]) {
                        cellsBelowWithHorizontal[index] = true;
                    }
                }

                if (downRightCell && downRightCell.topLeft && cellAbove.bottomRightHighlit) {
                    /*
                     * 'downRightCell' will get highlights only if 'cellAbove' has a bottom right highlight and 'downLeftCell' has top left
                     * 
                     *                    cellAbove
                     *                     +++++++
                     *                     +     +
                     *                     +     +
                     *                     +   \ +
                     *                     +    \+
                     *               ++++++++++++\++++++
                     *               +     +     +\    +                      0- downLeftCell
                     *               +     +     + \   +                      1- downCenterCell
                     *               +     +     +     +                      2- downRightCell
                     *               +     +     +     +
                     *               +++++++++++++++++++
                     *                 (0)   (1)   (2)
                     */
                    downRightCell.setHighlights(VisComponents.TopLeft | bottomHalf);
                    if (downRightCell.circle && downRightCell.setHighlights(VisComponents.LeftCenter) &&
                        !cellsBelowWithHorizontal[index + 1]) {
                        cellsBelowWithHorizontal[index + 1] = true;
                    }
                }
            }
        }
        
        for (const cellIdString in cellsBelowWithHorizontal) {
            const cellId = parseInt(cellIdString);
            if (!isNaN(cellId)) {
                this.highlightHorizontal(cellId, HighlightDirection.FromAbove, false, false);
            }
        }
    }

    /**
     * Highlighting the cells in the current row horizontally based on the highlight directions provided
     * @param commitCellId - cell Id from which the horizontal highlight begins
     * @param highlightDirection - the direction in which the current row is highlighted
     * @param highlightCentreAndAbove - dictates if the part of the cells above the center have to be highlighted
     * @param highlightCentreAndBelow - dictates if the part of the cells below the center have to be highlighted
     */
    public highlightHorizontal(commitCellId: number, highlightDirection: HighlightDirection, highlightCentreAndAbove: boolean, highlightCentreAndBelow: boolean): void {
        let lastCell: VisualizationCell = null;
        let workingCell: VisualizationCell = null;
        const startingCell: VisualizationCell = this.cells[commitCellId];
        let i: number = commitCellId - 1;

        if (startingCell) {
            // Highlighting the cell which we are starting with
            workingCell = startingCell;
            lastCell = workingCell;
            if (highlightDirection === HighlightDirection.SelectionRow) {
                if (highlightCentreAndAbove) {
                    workingCell.setHighlights(VisComponents.TopLeft | VisComponents.TopRight | VisComponents.TopMiddle | VisComponents.LeftCenter | VisComponents.RightCenter);
                }
                if (highlightCentreAndBelow) {
                    workingCell.setHighlights(VisComponents.BottomLeft | VisComponents.BottomRight | VisComponents.BottomMiddle | VisComponents.LeftCenter | VisComponents.RightCenter);
                }
            }
            else if (highlightDirection === HighlightDirection.FromAbove) {
                workingCell.setHighlights(VisComponents.BottomLeft | VisComponents.BottomRight | VisComponents.BottomMiddle);
            }
            else if (highlightDirection === HighlightDirection.FromBelow) {
                workingCell.setHighlights(VisComponents.TopLeft | VisComponents.TopRight | VisComponents.TopMiddle);
            }

            // Highlighting the cells to the left of the start cell
            workingCell = this.cells[i];
            while (lastCell && (lastCell.leftMiddleHighlit || lastCell.leftMergeHighlit) && workingCell && i >= 0) {
                i--;
                let addedHighlight: boolean = false;
                if (workingCell.setHighlights(VisComponents.LeftCenter) || workingCell.setHighlights(VisComponents.RightCenter)) {
                    addedHighlight = true;
                    workingCell.setHighlights(VisComponents.RightCenter);
                    if (highlightDirection === HighlightDirection.FromAbove) {
                        if (workingCell.circle) {
                            // Only if a commit is present, we must highlight the bottom components. Other bottom components cells are just intersection lines from other branches
                            workingCell.setHighlights(VisComponents.BottomMiddle | VisComponents.BottomLeft | VisComponents.BottomRight);
                        }
                    }
                    if (highlightDirection === HighlightDirection.FromBelow) {
                        if (workingCell.circle) {
                            // Only if a commit is present, we must highlight the top components. Other top components cells are just intersection lines from other branches
                            workingCell.setHighlights(VisComponents.TopMiddle | VisComponents.TopLeft | VisComponents.TopRight);
                        }
                    }
                }
                if ((highlightDirection === HighlightDirection.FromAbove || highlightDirection === HighlightDirection.SelectionRow) &&
                    workingCell.setHighlights(VisComponents.RightMerge)) {
                    addedHighlight = true;
                    workingCell.setHighlights(VisComponents.OctopusMerge);
                }
                if (!addedHighlight) {
                    break;
                }
                lastCell = workingCell;
                workingCell = this.cells[i];
            }

            // Highlighting the cells to the right of the start cell
            i = commitCellId + 1;
            lastCell = startingCell;
            workingCell = this.cells[i];
            while (lastCell && (lastCell.rightMiddleHighlit || lastCell.rightMergeHighlit) && workingCell) {
                i++;
                let addedHighlight: boolean = false;
                if (workingCell.setHighlights(VisComponents.RightCenter) || workingCell.setHighlights(VisComponents.LeftCenter)) {
                    addedHighlight = true;
                    workingCell.setHighlights(VisComponents.LeftCenter);
                    if (highlightDirection === HighlightDirection.FromAbove) {
                        if (workingCell.circle) {
                            // Only if a commit is present, we must highlight the bottom components. Other bottom components cells are just intersection lines from other branches
                            workingCell.setHighlights(VisComponents.BottomMiddle | VisComponents.BottomLeft | VisComponents.BottomRight);
                        }
                    }
                    if (highlightDirection === HighlightDirection.FromBelow) {
                        if (workingCell.circle) {
                            // Only if a commit is present, we must highlight the top components. Other top components cells are just intersection lines from other branches
                            workingCell.setHighlights(VisComponents.TopMiddle | VisComponents.TopLeft | VisComponents.TopRight);
                        }
                    }
                }
                if ((highlightDirection === HighlightDirection.FromAbove || highlightDirection === HighlightDirection.SelectionRow) &&
                    workingCell.setHighlights(VisComponents.LeftMerge)) {
                    addedHighlight = true;
                    workingCell.setHighlights(VisComponents.OctopusMerge);
                }
                if (!addedHighlight) {
                    break;
                }
                lastCell = workingCell;
                workingCell = this.cells[i];
            }
        }
    }

    /**
     * Un-highlights all the cells in the current row
     */
    public unHighlight(): void {
        for (const key in this.cells) {
            this.cells[key].unsetAllHighlights();
        }
    }

    /**
     * Checks if the current row is present in the range of the selection.i.e. in between the youngest selected child commit and the oldest selected parent commit
     */
    private _isInSelectedRange(): boolean {
        return !!(this.parentGraph &&
            this.parentGraph.selectedOldestExcisedParentRowId >= 0 &&
            this.parentGraph.selectedYoungestExcisedChildRowId >= 0 &&
            this.id < this.parentGraph.selectedOldestExcisedParentRowId &&
            this.id > this.parentGraph.selectedYoungestExcisedChildRowId);
    }
}