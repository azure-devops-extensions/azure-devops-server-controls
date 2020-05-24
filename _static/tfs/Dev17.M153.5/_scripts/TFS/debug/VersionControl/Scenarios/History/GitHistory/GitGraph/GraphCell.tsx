/// <reference types="react" />

import * as React from "react";
import * as Utils_UI from "VSS/Utils/UI";
import {
    HistoryGraphOrientation,
    IHistroyGraphCellRenderer,
    IHistoryGraphRenderSettings
} from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphRenderContracts";
import { VisualizationCell } from "VersionControl/Scenarios/History/GitHistory/GitGraph/VisualizationCell";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/GraphCell";

export interface IGraphCellProps {
    cellId: string,
    className: string,
    cell: VisualizationCell,
    cellRenderer: IHistroyGraphCellRenderer,
    width: number,
    height: number,
    extendedHeight: number
}

/**
 * Renders a single cell in the graph row
 */
export class GraphCell extends React.Component<IGraphCellProps, {}> {

    private _canvas: HTMLCanvasElement;
    private _context: CanvasRenderingContext2D;
    private _pixelRatio: number;
   
    constructor(props: IGraphCellProps, context?: any) {
        super(props, context);
        this._resetPixelRatio();
    }

    public render(): JSX.Element {
        this._resetPixelRatio(); // required on every re-render since pixel ratio might have changed from previous rendering
        const canvasHeight = (this.props.extendedHeight > this.props.height ? this.props.extendedHeight : this.props.height) * this._pixelRatio;
        const canvasWidth = this.props.width * this._pixelRatio;

        return (
            <canvas
                className={ this.props.className }
                id={ this.props.cellId }
                aria-label={ VCResources.GitGraphCellAriaLabel }
                aria-hidden={ !this.props.cell || this.props.cell.isEmpty ? "true" : "false" }
                width={ canvasWidth }
                height={ canvasHeight } />
        );
    }

    public componentDidMount(): void {
        this._updateCell();
    }

    public componentWillUnmount(): void {
        this._canvas = null;
        this._context = null;
    }

    public componentDidUpdate(): void {
        this._updateCell();
    }

    private _updateCell(): void {
        if (!this._canvas) {
            this._canvas = document.getElementById(this.props.cellId) as HTMLCanvasElement;

            if (this._canvas) {
                this._context = this._canvas.getContext("2d");
            }
        }

        if (!this._context || !this._canvas) {
            return;
        }

        this._context.setTransform(this._pixelRatio, 0, 0, this._pixelRatio, 0, 0);        

        if (this.props.cell) {
            // Draw inside the canvas here
            this._draw();
        } else {
            // Clear the content of the canvas
            this._clear();
        }
    }

    /**
     * Renders into the canvas using the cellRenderer
     */
    private _draw(): void {
        this.props.cellRenderer.drawCell(this.props.cell,
            this._context,
            this.props.width,
            this.props.height,
            this.props.extendedHeight
        );
    }

    /**
     * Clears the content of the canvas
     */
    private _clear(): void {
        this.props.cellRenderer.cleanCell(this._context,
            this.props.width,
            this.props.height,
            this.props.extendedHeight);
    }

    private _resetPixelRatio(): void {
        this._pixelRatio = window.devicePixelRatio > 1 ? window.devicePixelRatio : 1;

        // Whole pixel ratio number is causing canvas rendering issues in Chrome.
        // Hence, adding a decimal value to whole pixel ratio number
        if (Utils_UI.BrowserCheckUtils.isChrome()) {
            const decimalValueToAdd = this._pixelRatio % 1 === 0 ? 0.1 : 0;

            this._pixelRatio = this._pixelRatio + decimalValueToAdd;
        }
    }
}
