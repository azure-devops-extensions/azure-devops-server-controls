import { IHistoryGraph, IHistoryGraphRow, IHistoryGraphExcisionSettings }
from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { IHistoryGraphRenderSettings, HistoryGraphOrientation } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphRenderContracts";
import { HistoryGraph } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraph";
import { HistoryGraphRow } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphRow";
import { WebClientGraphRow, WebClientVisualizationCell } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { VisComponents, ExcisionVisComponents } from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationContracts";
import { VisualizationCell, VisComponentsHelper, ExcisionVisComponentsHelper }
from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationCell";
import { GraphSettingsConstants } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphConstants";

export class HistoryGraphHelper {
    public static getHistoryGraph(webClientGraphRows: WebClientGraphRow[]): IHistoryGraph {
        if (!webClientGraphRows) {
            return null;
        }

        const graphRows: IDictionaryStringTo<IHistoryGraphRow> = {};
        const rowIdCommitIdMap: IDictionaryNumberTo<string> = {};

        webClientGraphRows.forEach((row: WebClientGraphRow, index: number) => {
            const aboveRow = webClientGraphRows[index - 1];
            const belowRow = webClientGraphRows[index + 1];

            const constructedRow: IHistoryGraphRow = new HistoryGraphRow({
                id: index,
                commit: row.commit,
                cells: this._getGraphCell(row.cells),
                maxCellId: row.maxCellId,
                commitCellId: row.commitLane,
                hasIncomingExcisedCommits: row.hasIncomingExcisedCommits,
                hasOutgoingExcisedCommits: row.hasOutgoingExcisedCommits,
                aboveCommitId: aboveRow ? aboveRow.commit.commitId : null,
                belowCommitId: belowRow ? belowRow.commit.commitId : null,
            });
            graphRows[row.commit.commitId] = constructedRow;
            rowIdCommitIdMap[index] = row.commit.commitId;
        });

        this._populateChildAndParentCommitIds(graphRows);

        const historyGraph = new HistoryGraph(graphRows, rowIdCommitIdMap, {
            orientation: HistoryGraphOrientation.RightJustify,
            excisionSettings: this.getDefaultExcisionSettings(),
            renderSettings: this.getDefaultRendererSettings(),
        });

        this._setParentGraph(historyGraph);

        return historyGraph;
    }

    public static getDefaultExcisionSettings(): IHistoryGraphExcisionSettings {
        return {
            excisionEnabled: true,
            emptyLineLengthLimit: GraphSettingsConstants.EmptyLineLengthLimit,
            emptyLineLengthMultiplier: undefined,
        };
    }

    /**
     * Returns default Renderer settings.
     * These are not finalized yet.
     * TODO:- Discuss with SanCha and update these with finalized settings.
     */
    public static getDefaultRendererSettings(): IHistoryGraphRenderSettings {
        return {
            /* Node settings */
            nodeStrokeWidth: 1,
            mergeStrokeWidth: 1,
            nodeRadius: 4,
            mergeRadius: 4,
            nodeHighlightRadius: 4,
            mergeHighlightRadius: 4,
            nodeColor: "#3399FF",
            mergeColor: "#6D6D6D",
            nodeHighlightColor: "#3399FF",
            mergeHighlightColor: "#6D6D6D",
            nodeFillColor: "#3399FF",
            mergeFillColor: "#6D6D6D",
            nodeHighlightFillColor: "#3399FF",
            mergeHighlightFillColor: "#6D6D6D",

            /* Line settings */
            lineWidth: 1,
            lineHighlightWidth: 2,
            lineColor: "#8D8D8D",
            lineHighlightColor: "#3399FF",

            /* Cell settings */
            cellStaticWidth: 16,
            cellStaticHeight: 32,
        }
    }

    private static _populateChildAndParentCommitIds(graphRows: IDictionaryStringTo<IHistoryGraphRow>): void {
        for (const commitId in graphRows) {
            const graphRow = graphRows[commitId];
            if (graphRow.commit.parents && graphRow.commit.parents.length > 0) {
                graphRow.commit.parents
                    .map((parentCommitId) => {
                        if (graphRows[parentCommitId]) {
                            const parentGraphRow = graphRows[parentCommitId];
                            if (parentGraphRow.childCommitIds == undefined) {
                                parentGraphRow.childCommitIds = [];
                            }

                            parentGraphRow.childCommitIds.push(graphRow.commit.commitId);
                            return parentCommitId;
                        }
                        else {
                            // parent is present but not yet loaded into the history list
                            return "-1";
                        }
                    })
                    .forEach((parentCommitId: string) => {
                        if (graphRow.parentCommitIds == undefined) {
                            graphRow.parentCommitIds = [];
                        }

                        // adding parent row ids to current row
                        graphRow.parentCommitIds.push(parentCommitId);
                    });
            }
        }

        for (const index in graphRows) {
            if (graphRows[index].childCommitIds) {
                graphRows[index].childCommitIds.sort();
            }

            if (graphRows[index].parentCommitIds) {
                graphRows[index].parentCommitIds.sort();
            }
        }
    }

    private static _getGraphCell(cells: IDictionaryNumberTo<WebClientVisualizationCell>): VisualizationCell[] {
        const constructedCells: VisualizationCell[] = [];

        for (const index in cells) {
            const cell = cells[index];
            const components = typeof cell.components === "string" ? VisComponentsHelper.GetComponentsFromString(cell.components) : cell.components;
            const excisionComponents = typeof cell.excisionComponents === "string" ? ExcisionVisComponentsHelper.GetComponentsFromString(cell.excisionComponents) : cell.excisionComponents;

            constructedCells[index] = new VisualizationCell(parseInt(index), components, excisionComponents);
        }

        return constructedCells;
    }

    private static _setParentGraph(historyGraph: IHistoryGraph): void {
        for (const commitId in historyGraph.rows) {
            historyGraph.rows[commitId].parentGraph = historyGraph;
        }
    }
}
