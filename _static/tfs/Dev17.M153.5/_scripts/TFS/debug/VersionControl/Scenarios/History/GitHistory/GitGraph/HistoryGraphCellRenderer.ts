import {
    HistoryGraphOrientation,
    IHistroyGraphCellRenderer,
    IHistoryGraphRenderSettings
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphRenderContracts";
import {
    HighlightDirection,
    ExcisionVisComponents,
    VisComponents
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationContracts";
import {
    VisualizationCell,
    VisComponentsHelper,
    ExcisionVisComponentsHelper
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationCell";

/**
 * Canvas renderer class to help rendering cell components/excisonComponents onto canvases
 */
export class HistoryGraphCellRenderer implements IHistroyGraphCellRenderer {
    private _orientation: HistoryGraphOrientation;
    private _renderSettings: IHistoryGraphRenderSettings;

    constructor(graphOrientation: HistoryGraphOrientation,
        renderSettings: IHistoryGraphRenderSettings) {
        this._orientation = graphOrientation;
        this._renderSettings = renderSettings;
    }

    /**
     * Draws the components and excision components present in the cell onto the canvas provided. Highlights, if any, are also drawn
     * @param cell - Visualization cell which will be rendered in the canvas
     * @param canvasContext - context of the canvas on which the drawings are to be rendered
     * @param canvasStaticWidth - static width of the canvas
     * @param canvasStaticHeight - static height of the canvas
     * @param canvasExtendedHeight (optional) - extended/resized height of the canvas
     */
    public drawCell(cell: VisualizationCell,
        canvasContext: CanvasRenderingContext2D,
        canvasStaticWidth: number,
        canvasStaticHeight: number,
        canvasExtendedHeight?: number): void {

        if (!cell || !canvasContext ) {
            return;
        }

        const xCoordinates: Coordinates = new Coordinates(canvasStaticWidth);
        const yCoordinates: Coordinates = new Coordinates(canvasStaticHeight);

        // Clean the cell before drawing new contents
        this.cleanCell(canvasContext, canvasStaticWidth, canvasStaticHeight, canvasExtendedHeight);

        if (cell.components !== VisComponents.None) {
            this._drawComponents(cell.components, cell.highlitComponents, canvasContext, xCoordinates, yCoordinates);
        } else if (cell.excisionComponents !== ExcisionVisComponents.None) {
            this._drawExcisionComponents(cell.excisionComponents, cell.highlitExcisionComponents, canvasContext, xCoordinates, yCoordinates);
        }

        // We need to draw extended cell for both normal components and excision components, if any
        if (canvasExtendedHeight && canvasExtendedHeight > canvasStaticHeight) {
            const extendedYCoordinates: Coordinates = new Coordinates(canvasExtendedHeight);
            this._drawExtendedCell(cell, canvasContext, xCoordinates, yCoordinates, extendedYCoordinates);
        }

        // Final render should be commit cirlce rendering so that the lines do not overlay on the commit dot
        this._drawCommitCircle(cell, canvasContext, xCoordinates, yCoordinates);
    }

    /**
     * Clears all the drawing on the canvas provided
     * @param canvasContext - context of the canvas on which the drawings are to be cleared
     * @param canvasStaticWidth - static width of the canvas
     * @param canvasStaticHeight - static height of the canvas
     * @param canvasExtendedHeight (optional) - extended/resized height of the canvas
     */
    public cleanCell(canvasContext: CanvasRenderingContext2D, canvasStaticWidth: number, canvasStaticHeight: number, canvasExtendedHeight?: number): void {
        if (canvasExtendedHeight && canvasExtendedHeight > canvasStaticHeight) {
            canvasContext.clearRect(0, 0, canvasStaticWidth, canvasExtendedHeight);
        } else {
            canvasContext.clearRect(0, 0, canvasStaticWidth, canvasStaticHeight);
        }
    }

    /**
     * Draws the commit node/merge node based on the settings provided in the render settings
     * @param cell - Visualization cell which will contains information on the commit/merge node
     * @param canvasContext - context of the canvas on which the drawings are to be cleared
     * @param xCoordinates - x-Axis coordinates on the canvas
     * @param yCoordinates - y-Axis coordinates on the canvas
     */
    private _drawCommitCircle(cell: VisualizationCell,
        canvasContext: CanvasRenderingContext2D,
        xCoordinates: Coordinates,
        yCoordinates: Coordinates): void {

        let radius: number;
        let fillColor: string;
        let strokeColor: string;
        let strokeWidth: number;

        if (cell.circle) {
            if (cell.isMerge) {
                if (cell.circleHighlit) {
                    radius = this._renderSettings.mergeHighlightRadius;
                    fillColor = this._renderSettings.mergeHighlightFillColor;
                    strokeColor = this._renderSettings.mergeHighlightColor;
                }
                else {
                    radius = this._renderSettings.mergeRadius;
                    fillColor = this._renderSettings.mergeFillColor;
                    strokeColor = this._renderSettings.mergeColor;
                }
                strokeWidth = this._renderSettings.mergeStrokeWidth;
            } else {
                if (cell.circleHighlit) {
                    radius = this._renderSettings.nodeHighlightRadius;
                    fillColor = this._renderSettings.nodeHighlightFillColor;
                    strokeColor = this._renderSettings.nodeHighlightColor;
                }
                else {
                    radius = this._renderSettings.nodeRadius;
                    fillColor = this._renderSettings.nodeFillColor;
                    strokeColor = this._renderSettings.nodeColor;
                }
                strokeWidth = this._renderSettings.nodeStrokeWidth;
            }

            canvasContext.beginPath();
            canvasContext.arc(xCoordinates.P4, yCoordinates.P4, radius, 0, 2 * Math.PI);
            canvasContext.fillStyle = fillColor;
            canvasContext.fill();
            canvasContext.lineWidth = strokeWidth;
            canvasContext.strokeStyle = strokeColor;
            canvasContext.closePath();
            canvasContext.stroke();
        }
    }

    /**
     * Render appropriate components on the extended cell which has height taller than the static height of the cell
     * @param cell - Visualization cell which will be rendered in the canvas
     * @param canvasContext - context of the canvas on which the extended drawings are to be rendered
     * @param xCoordinates - x-Axis coordinates on the canvas
     * @param yCoordinates - y-Axis coordinates on the canvas
     * @param extendedYCoordinates - extended y-Axis coordinates on the canvas
     */
    private _drawExtendedCell(cell: VisualizationCell,
        canvasContext: CanvasRenderingContext2D,
        xCoordinates: Coordinates,
        yCoordinates: Coordinates,
        extendedYCoordinates: Coordinates): void {

        // For components
        // only three lines you can possibly draw.
        // 1. Left vertical line corresponding to BottomLeft
        // 2. Center vertical line corresponding to BottomMiddle
        // 3. Right vertical line corresponding to BottomRight

        const orientedComponents: VisComponents = this._orientation === HistoryGraphOrientation.LeftJustify ?
            cell.components :
            VisComponentsHelper.mirrorHorizontal(cell.components);

        const orientedHighlitComponents: VisComponents = this._orientation === HistoryGraphOrientation.LeftJustify ?
            cell.highlitComponents :
            VisComponentsHelper.mirrorHorizontal(cell.highlitComponents);

        VisComponentsHelper.ToList(orientedComponents).forEach((individualComponent: VisComponents) => {
            canvasContext.beginPath();
            switch (individualComponent) {
                case VisComponents.BottomLeft:
                    canvasContext.moveTo(xCoordinates.P0, yCoordinates.P8);
                    canvasContext.lineTo(xCoordinates.P0, extendedYCoordinates.P8);
                    break;
                case VisComponents.BottomMiddle:
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P8);
                    canvasContext.lineTo(xCoordinates.P4, extendedYCoordinates.P8);
                    break;
                case VisComponents.BottomRight:
                    canvasContext.moveTo(xCoordinates.P8, yCoordinates.P8);
                    canvasContext.lineTo(xCoordinates.P8, extendedYCoordinates.P8);
                    break;
                case VisComponents.OctopusMerge:
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P8);
                    canvasContext.lineTo(xCoordinates.P4, extendedYCoordinates.P8);
                    break;
            }

            if (VisComponentsHelper.HasComponent(orientedHighlitComponents, individualComponent)) {
                canvasContext.lineWidth = this._renderSettings.lineHighlightWidth;
                canvasContext.strokeStyle = this._renderSettings.lineHighlightColor;
            } else {
                canvasContext.lineWidth = this._renderSettings.lineWidth;
                canvasContext.strokeStyle = this._renderSettings.lineColor;
            }
            canvasContext.stroke();
            canvasContext.closePath();
        });

        // For excision components
        // 1. Center vertical line corresponding to outGoingSelectedExcision and continuingSelectedTrackingLine, for both the graph orientation
        if (cell.hasExcisionComponent(ExcisionVisComponents.OutgoingSelectedExcision)
            || cell.hasExcisionComponent(ExcisionVisComponents.ContinuingSelectedTrackingLine)) {
            canvasContext.beginPath();
            canvasContext.moveTo(xCoordinates.P4, yCoordinates.P8);
            canvasContext.lineTo(xCoordinates.P4, extendedYCoordinates.P8);

            // These excisions always to be highlit
            canvasContext.lineWidth = this._renderSettings.lineHighlightWidth;
            canvasContext.strokeStyle = this._renderSettings.lineHighlightColor;
            canvasContext.stroke();
            canvasContext.closePath();
        }
    }

    /**
     * Draws the given visComponents onto the canvas with context provided, based on the x & y coordinates and highlight option
     * @param components - visComponents that are to be rendered on the canvas
     * @param highlitComponents - visComponents that are to be highlit on the canvas
     * @param canvasContext - context of the canvas on which the components are to be rendered
     * @param xCoordinates - x-Axis coordinates on the canvas
     * @param yCoordinates - y-Axis coordinates on the canvas
     */
    private _drawComponents(components: VisComponents,
        highlitComponents: VisComponents,
        canvasContext: CanvasRenderingContext2D,
        xCoordinates: Coordinates,
        yCoordinates: Coordinates): void {

        const orientedComponents: VisComponents = this._orientation === HistoryGraphOrientation.LeftJustify ?
            components :
            VisComponentsHelper.mirrorHorizontal(components);

        const orientedHighlitComponents: VisComponents = this._orientation === HistoryGraphOrientation.LeftJustify ?
            highlitComponents :
            VisComponentsHelper.mirrorHorizontal(highlitComponents);

        VisComponentsHelper.ToList(orientedComponents).forEach((individualComponent: VisComponents) => {
            canvasContext.beginPath();
            switch (individualComponent) {
                case VisComponents.BottomLeft:
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P0, yCoordinates.P8);
                    break;
                case VisComponents.BottomMiddle:
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P8);
                    break;
                case VisComponents.BottomRight:
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P8, yCoordinates.P8);
                    break;
                case VisComponents.LeftMerge:
                    canvasContext.moveTo(xCoordinates.P0, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P2, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P6);
                    break;
                case VisComponents.RightCenter:
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P8, yCoordinates.P4);
                    break;
                case VisComponents.RightMerge:
                    canvasContext.moveTo(xCoordinates.P8, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P6, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P6);
                    break;
                case VisComponents.LeftCenter:
                    canvasContext.moveTo(xCoordinates.P0, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P4);
                    break;
                case VisComponents.TopLeft:
                    canvasContext.moveTo(xCoordinates.P0, yCoordinates.P0);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P4);
                    break;
                case VisComponents.TopMiddle:
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P0);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P4);
                    break;
                case VisComponents.TopRight:
                    canvasContext.moveTo(xCoordinates.P8, yCoordinates.P0);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P4);
                    break;
                case VisComponents.OctopusMerge:
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P6);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P8);
                    break;
            }

            if (VisComponentsHelper.HasComponent(orientedHighlitComponents, individualComponent)) {
                canvasContext.lineWidth = this._renderSettings.lineHighlightWidth;
                canvasContext.strokeStyle = this._renderSettings.lineHighlightColor;
            } else {
                canvasContext.lineWidth = this._renderSettings.lineWidth;
                canvasContext.strokeStyle = this._renderSettings.lineColor;
            }
            canvasContext.stroke();
            canvasContext.closePath();
        });
    }

    /**
     * Draws the given excision components onto the canvas with context provided, based on the x & y coordinates and highlight option
     * @param excisionComponents - the excision components to be drawn on the canvas
     * @param highlitExcisionComponents - the excision components to be highlit on the canvas
     * @param canvasContext - context of the canvas on which the components are to be rendered
     * @param xCoordinates - x-Axis coordinates on the canvas
     * @param yCoordinates - y-Axis coordinates on the canvas
     */
    private _drawExcisionComponents(excisionComponents: ExcisionVisComponents,
        highlitExcisionComponents: ExcisionVisComponents,
        canvasContext: CanvasRenderingContext2D,
        xCoordinates: Coordinates,
        yCoordinates: Coordinates): void {
        ExcisionVisComponentsHelper.ToList(excisionComponents).forEach((individualComponent: ExcisionVisComponents) => {
            canvasContext.beginPath();
            switch (individualComponent) {
                case ExcisionVisComponents.IncomingExcision:
                    if (this._orientation === HistoryGraphOrientation.LeftJustify) {
                        canvasContext.moveTo(xCoordinates.P8, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P3, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P1, yCoordinates.P3);
                    } else {
                        canvasContext.moveTo(xCoordinates.P0, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P5, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P7, yCoordinates.P3);
                    }
                    break;
                case ExcisionVisComponents.OutgoingExcision:
                    if (this._orientation === HistoryGraphOrientation.LeftJustify) {
                        canvasContext.moveTo(xCoordinates.P8, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P7, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P5, yCoordinates.P5);
                    } else {
                        canvasContext.moveTo(xCoordinates.P0, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P1, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P3, yCoordinates.P5);
                    }
                    break;
                case ExcisionVisComponents.ContinuingSelectedTrackingLine:
                    // Same visual rendering for both the orientation, since it is just a vertical line in the middle of the cell
                    canvasContext.moveTo(xCoordinates.P4, yCoordinates.P0);
                    canvasContext.lineTo(xCoordinates.P4, yCoordinates.P8);
                    break;
                case ExcisionVisComponents.OutgoingSelectedExcision:
                    if (this._orientation === HistoryGraphOrientation.LeftJustify) {
                        canvasContext.moveTo(xCoordinates.P8, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P6, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P4, yCoordinates.P6);
                        canvasContext.lineTo(xCoordinates.P4, yCoordinates.P8);
                    } else {
                        canvasContext.moveTo(xCoordinates.P0, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P2, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P4, yCoordinates.P6);
                        canvasContext.lineTo(xCoordinates.P4, yCoordinates.P8);
                    }
                    break;
                case ExcisionVisComponents.IncomingSelectedExcision:
                    if (this._orientation === HistoryGraphOrientation.LeftJustify) {
                        canvasContext.moveTo(xCoordinates.P8, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P6, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P4, yCoordinates.P2);
                        canvasContext.lineTo(xCoordinates.P4, yCoordinates.P0);
                    } else {
                        canvasContext.moveTo(xCoordinates.P0, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P2, yCoordinates.P4);
                        canvasContext.lineTo(xCoordinates.P4, yCoordinates.P2);
                        canvasContext.lineTo(xCoordinates.P4, yCoordinates.P0);
                    }
                    break;
                case ExcisionVisComponents.ExcisionHorizontal:
                    // Same visual rendering for both the orientation, since it is just a horizontal line in the middle of the cell
                    canvasContext.moveTo(xCoordinates.P8, yCoordinates.P4);
                    canvasContext.lineTo(xCoordinates.P0, yCoordinates.P4);
                    break;
            }

            if (ExcisionVisComponentsHelper.HasComponent(highlitExcisionComponents, individualComponent)) {
                canvasContext.lineWidth = this._renderSettings.lineHighlightWidth;
                canvasContext.strokeStyle = this._renderSettings.lineHighlightColor;
            } else {
                canvasContext.lineWidth = this._renderSettings.lineWidth;
                canvasContext.strokeStyle = this._renderSettings.lineColor;
            }
            canvasContext.stroke();
            canvasContext.closePath();
        });

        // To draw the arrows, in the same cell (add condition for the highlight)
        if (ExcisionVisComponentsHelper.HasComponent(excisionComponents, ExcisionVisComponents.IncomingExcision)) {
            canvasContext.beginPath();

            if (this._orientation === HistoryGraphOrientation.LeftJustify) {
                canvasContext.moveTo(xCoordinates.P1, yCoordinates.P0);
                canvasContext.lineTo(xCoordinates.P2, yCoordinates.P3);
                canvasContext.lineTo(xCoordinates.P0, yCoordinates.P3);
                canvasContext.lineTo(xCoordinates.P1, yCoordinates.P0);
            } else {
                canvasContext.moveTo(xCoordinates.P7, yCoordinates.P0);
                canvasContext.lineTo(xCoordinates.P6, yCoordinates.P3);
                canvasContext.lineTo(xCoordinates.P8, yCoordinates.P3);
                canvasContext.lineTo(xCoordinates.P7, yCoordinates.P0);
            }
            if (ExcisionVisComponentsHelper.HasComponent(highlitExcisionComponents, ExcisionVisComponents.IncomingExcision)) {
                canvasContext.lineWidth = this._renderSettings.lineHighlightWidth;
                canvasContext.fillStyle = this._renderSettings.lineHighlightColor;
            } else {
                canvasContext.lineWidth = this._renderSettings.lineWidth;
                canvasContext.fillStyle = this._renderSettings.lineColor;
            }
            canvasContext.fill();
            canvasContext.closePath();
        }

        if (ExcisionVisComponentsHelper.HasComponent(excisionComponents, ExcisionVisComponents.OutgoingExcision)) {
            canvasContext.beginPath();

            if (this._orientation === HistoryGraphOrientation.LeftJustify) {
                canvasContext.moveTo(xCoordinates.P4, yCoordinates.P5);
                canvasContext.lineTo(xCoordinates.P6, yCoordinates.P5);
                canvasContext.lineTo(xCoordinates.P5, yCoordinates.P8);
                canvasContext.lineTo(xCoordinates.P4, yCoordinates.P5);
            } else {
                canvasContext.moveTo(xCoordinates.P4, yCoordinates.P5);
                canvasContext.lineTo(xCoordinates.P2, yCoordinates.P5);
                canvasContext.lineTo(xCoordinates.P3, yCoordinates.P8);
                canvasContext.lineTo(xCoordinates.P4, yCoordinates.P5);
            }
            if (ExcisionVisComponentsHelper.HasComponent(highlitExcisionComponents, ExcisionVisComponents.OutgoingExcision)) {
                canvasContext.lineWidth = this._renderSettings.lineHighlightWidth;
                canvasContext.fillStyle = this._renderSettings.lineHighlightColor;
            } else {
                canvasContext.lineWidth = this._renderSettings.lineWidth;
                canvasContext.fillStyle = this._renderSettings.lineColor;
            }
            canvasContext.fill();
            canvasContext.closePath();
        }
    }
}

/**
 * Generic class to divide the given maximum axis value into 8 equal parts and expose them
 * (exporting the class for UTs)
 */
export class Coordinates {
    private _oneEighth: number;
    private _maxCoordinateValue: number;

    constructor(maxCoordinateValue: number) {
        this._maxCoordinateValue = maxCoordinateValue;
        this._oneEighth = maxCoordinateValue / 8;
    }

    public get P0(): number {
        return 0;
    }

    public get P1(): number {
        return 1 * this._oneEighth;
    }

    public get P2(): number {
        return 2 * this._oneEighth;
    }

    public get P3(): number {
        return 3 * this._oneEighth;
    }

    public get P4(): number {
        return 4 * this._oneEighth;
    }

    public get P5(): number {
        return 5 * this._oneEighth;
    }

    public get P6(): number {
        return 6 * this._oneEighth;
    }

    public get P7(): number {
        return 7 * this._oneEighth;
    }

    public get P8(): number {
        return this._maxCoordinateValue;
    }
}