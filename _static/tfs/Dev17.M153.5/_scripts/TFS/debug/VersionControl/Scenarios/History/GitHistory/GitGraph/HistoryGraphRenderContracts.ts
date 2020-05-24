import { VisualizationCell } from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationCell";

/**
 * Enum of all the orientation directions used for graph rendering
 */
export enum HistoryGraphOrientation {
    /*
        The commit dots start occupying the cells in rows from the left most and the graph grows rightward
        The excisions and tracing cells are present in the left of the graph cells
    */
    LeftJustify,
    /*
        The commit dots start occupying the cells in rows from the right most and the graph grows leftward
        The excisions and tracing cells are present to the right of the graph cells
    */
    RightJustify
}

/**
 * Settings pertaining to rendering of graph nodes and lines
 */
export interface IHistoryGraphRenderSettings {
    /* Node settings */
    nodeStrokeWidth: number;
    mergeStrokeWidth: number;
    nodeRadius: number;
    mergeRadius: number;
    nodeHighlightRadius: number;
    mergeHighlightRadius: number;
    nodeColor: string;
    mergeColor: string;
    nodeHighlightColor: string;
    mergeHighlightColor: string;
    nodeFillColor: string;
    mergeFillColor: string;
    nodeHighlightFillColor: string;
    mergeHighlightFillColor: string;

    /* Line settings */
    lineWidth: number;
    lineHighlightWidth: number;
    lineColor: string;
    lineHighlightColor: string;

    /* Cell settings */
    cellStaticWidth: number;
    cellStaticHeight: number;
}

/**
 * Renderer to support in drawing components into the graph cell canvas
 */
export interface IHistroyGraphCellRenderer {
    drawCell(cell: VisualizationCell, canvasContext: CanvasRenderingContext2D, canvasStaticWidth: number, canvasStaticHeight: number, canvasExtendedHeight?: number): void;
    cleanCell(canvasContext: CanvasRenderingContext2D, canvasStaticWidth: number, canvasStaticHeight: number, canvasExtendedHeight?: number): void;
}