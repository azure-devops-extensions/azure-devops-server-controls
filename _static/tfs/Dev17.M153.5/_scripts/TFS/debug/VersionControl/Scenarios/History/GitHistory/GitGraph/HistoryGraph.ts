import {
    IHistoryGraph,
    IHistoryGraphRow,
    IHistoryGraphSettings
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import {
    HighlightDirection
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationContracts";

/**
 * Model for the git history graph
 * - Graph model here is primarily made up of only rows (IHistoryGraphRow) which hold both commit data and visual metadata
 * - Each row in the graph has 'n' number of cells(VisualizationCell), which on render will be horizontally stacked
 * - Each cell holds the data which dictates what should be drawn/rendered in it
 *
 * e.g. Assume we have 3 commits, 2 are in one branch and 1 is in another.
 * - The visual representation would be,
 *
 *               +++++++++++++++++++
 *               +     +     +     +
 *               +  O  +     +     +
 *               +  |\ +     +     +        Row 1 (cell 0, cell 1, cell 2)
 *               +  | \+     +     +
 *               +++|++\++++++++++++
 *               +  |  +\    +     +
 *               +  |  +  O  +     +
 *               +  |  + /   +     +        Row 2 (cell 0, cell 1, cell 2)
 *               +  |  +/    +     +
 *               +++|++/++++++++++++
 *               +  | /+     +     +
 *               +  O  +     +     +
 *               +  |  +     +     +        Row 3 (cell 0, cell 1, cell 2)
 *               +  |  +     +     +
 *               +++++++++++++++++++
 *
 */
export class HistoryGraph implements IHistoryGraph {
    private _rows: IDictionaryStringTo<IHistoryGraphRow>;
    private _rowIdCommitIdMap: IDictionaryNumberTo<string>;
    private _settings: IHistoryGraphSettings;
    private _selectedCommitId: string;
    private _selectedExcisedParentCommitIds: string[];
    private _selectedExcisedChildCommitIds: string[];
    private _selectedOldestExcisedParentRowId: number;
    private _selectedYoungestExcisedChildRowId: number;

    constructor(
        rows: IDictionaryStringTo<IHistoryGraphRow>,
        rowIdCommitIdMap: IDictionaryNumberTo<string>,
        settings: IHistoryGraphSettings
    ) {
        this._rows = rows;
        this._rowIdCommitIdMap = rowIdCommitIdMap;
        this._settings = settings;

        this._selectedCommitId = null;
        this._selectedExcisedParentCommitIds = [];
        this._selectedExcisedChildCommitIds = [];
        this._selectedOldestExcisedParentRowId = null;
        this._selectedYoungestExcisedChildRowId = null;
    }

    public get rows(): IDictionaryStringTo<IHistoryGraphRow> {
        return this._rows;
    }

    public get rowIdCommitIdMap(): IDictionaryNumberTo<string> {
        return this._rowIdCommitIdMap;
    }

    public get settings(): IHistoryGraphSettings {
        return this._settings;
    }

    public get selectedCommitId(): string {
        return this._selectedCommitId;
    }

    public get selectedExcisedParentCommitIds(): string[] {
        return this._selectedExcisedParentCommitIds;
    }

    public get selectedExcisedChildCommitIds(): string[] {
        return this._selectedExcisedChildCommitIds;
    }

    public get selectedOldestExcisedParentRowId(): number {
        return this._selectedOldestExcisedParentRowId;
    }

    public get selectedYoungestExcisedChildRowId(): number {
        return this._selectedYoungestExcisedChildRowId;
    }

    /**
     * Update selectedCommit in graph and perform highlight operation on the graph rows
     * This highlights the paths leading to the selectedCommit and highlights the paths leading away from the selectedCommit
     * @param selectedCommitId
     */
    public select(selectedCommitId: string): void {
        // Can skip if this is same as the previously selected commit
        if (this.selectedCommitId === selectedCommitId) {
            return;
        }

        // Unselect the previously selected commit
        if (this.selectedCommitId) {
            this.unSelect();
        }

        // Return if the commit id is not present. Do the unselect before returning.
        if (!selectedCommitId || !this.rows[selectedCommitId]) {
            return;
        }

        // Update the current selected commit id
        this._selectedCommitId = selectedCommitId;

        const selectedRow: IHistoryGraphRow = this.rows[this._selectedCommitId];
        if (selectedRow.hasIncomingExcisedCommits) {
            selectedRow.childCommitIds.forEach((childCommitId: string) => {
                if (this.rows[childCommitId]) {
                    if (this.rows[childCommitId].hasOutgoingExcisedCommits) {
                        // Add the child to the selected childs list
                        this._selectedExcisedChildCommitIds.push(childCommitId);

                        // Update the youngest selected child row id
                        if (!this._selectedYoungestExcisedChildRowId) {
                            this._selectedYoungestExcisedChildRowId = this.rows[childCommitId].id;
                        } else {
                            this._selectedYoungestExcisedChildRowId = Math.min(this.rows[childCommitId].id, this._selectedYoungestExcisedChildRowId);
                        }

                        // Highlight rows starting from the child row
                        this._highlightRows(this.rows[childCommitId], HighlightDirection.FromBelow);
                    }
                } else {
                    // This scenario is not possible, since child is always loaded if the parent is loaded, but for completeness
                    this._selectedYoungestExcisedChildRowId = Number.MIN_VALUE;
                }
            });
        } else {
            this._selectedYoungestExcisedChildRowId = selectedRow.id;
        }

        if (selectedRow.hasOutgoingExcisedCommits) {
            selectedRow.parentCommitIds.forEach((parentCommitId: string) => {
                if (this.rows[parentCommitId]) {
                    if (this.rows[parentCommitId].hasIncomingExcisedCommits) {
                        // Add the parent to the selected parents list
                        this._selectedExcisedParentCommitIds.push(parentCommitId);

                        // Update the oldest selected parent row id
                        if (!this._selectedOldestExcisedParentRowId) {
                            this._selectedOldestExcisedParentRowId = this.rows[parentCommitId].id;
                        } else {
                            this._selectedOldestExcisedParentRowId = Math.max(this.rows[parentCommitId].id, this._selectedOldestExcisedParentRowId);
                        }

                        // Highlight rows starting from the parent row
                        this._highlightRows(this.rows[parentCommitId], HighlightDirection.FromAbove);
                    }
                } else {
                    this._selectedOldestExcisedParentRowId = Number.MAX_VALUE;
                }
            });
        } else {
            this._selectedOldestExcisedParentRowId = selectedRow.id;
        }

        // Highlighting rows starting from the current selected row
        this._highlightRows(selectedRow);
    }

    /**
     * Perform unHighlight operation on the row corresponding to the selected commit
     */
    public unSelect(): void {
        if (this.selectedCommitId) {
            this._unHighlightRows();

            this._selectedCommitId = null;
            this._selectedExcisedChildCommitIds = [];
            this._selectedExcisedParentCommitIds = [];
            this._selectedOldestExcisedParentRowId = null;
            this._selectedYoungestExcisedChildRowId = null;
        }
    }

    /**
     * Highlights the rows of the graph starting from the row provided.
     * Step 1: highlights the provided row horizontally
     * Step 2: highlights the rows above the startingRow
     * Step 3: highlights the rows below the stratingRow
     * @param startingRow
     * @param highlightDirection
     */
    private _highlightRows(startingRow: IHistoryGraphRow, highlightDirection?: HighlightDirection): void {
        if (!highlightDirection) {
            highlightDirection = HighlightDirection.All;
        }

        if (!startingRow.cells || Object.keys(startingRow.cells).length === 0) {
            return;
        }

        const highlightAbove = (highlightDirection === HighlightDirection.All || highlightDirection === HighlightDirection.FromBelow);
        const highlightBelow = (highlightDirection === HighlightDirection.All || highlightDirection === HighlightDirection.FromAbove);

        // Highlight the starting row horizontally before highlighting above and below
        startingRow.highlightHorizontal(startingRow.commitCellId, HighlightDirection.SelectionRow,
            highlightAbove,
            highlightBelow
        );

        const rowCount = Object.keys(this.rows).length;
        for (let i: number = 1; i < rowCount; i++) {
            let withinBounds = false;
            if (i <= startingRow.id && highlightAbove) {
                const row: IHistoryGraphRow = this.rows[this.rowIdCommitIdMap[startingRow.id - i]];
                if (row && row.belowCommitId) {
                    withinBounds = true;
                    row.highlightFromBelow(this.rows[row.belowCommitId].cells);
                }
            }
            if (startingRow.id + i < rowCount && highlightBelow) {
                const row: IHistoryGraphRow = this.rows[this.rowIdCommitIdMap[startingRow.id + i]];
                if (row && row.aboveCommitId) {
                    withinBounds = true;
                    row.highlightFromAbove(this.rows[row.aboveCommitId].cells);
                }
            }
            if (!withinBounds) {
                break;
            }
        }
    }

    /**
     * Un-highlights the rows in the graph
     */
    private _unHighlightRows(): void {
        for (const commitId in this.rows) {
            const row: IHistoryGraphRow = this.rows[commitId];
            row.unHighlight();
        }
    }
}