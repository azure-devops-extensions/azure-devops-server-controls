/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IPoint, Constants, IGraphProps, INodeData, INodeDataForLayout, IEdgeDataForLayout, INodeMidPoints, EdgeMatrix, IGraphComponent, IGraphListComponent, IGraphSize } from "DistributedTaskControls/Components/Canvas/Types";
import { PathBuilder } from "DistributedTaskControls/Components/Canvas/PathHelpers";
import { Edge } from "DistributedTaskControls/Components/Canvas/Edge";
import { GraphLayoutHelper, IStagingOrderAndDependencies, IGraph } from "DistributedTaskControls/Components/Canvas/GraphLayoutHelper";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import * as StringUtils from "VSS/Utils/String";
import * as ArrayUtils from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/Canvas/Graph";

export interface IGraphListState {
    incomingEdges: JSX.Element[];
    incomingEdgesEvaluated: boolean;
}

export class GraphList extends Base.Component<IGraphProps, IGraphListState> implements IGraphListComponent {

    constructor(props: IGraphProps) {
        super(props);
        this.state = {
            incomingEdges: [],
            incomingEdgesEvaluated: false
        };
    }

    public componentWillMount() {
        this._disjointGraphs = GraphLayoutHelper.splitGraph(this.props.nodes, this.props.edges);
        this._graphComponents = [];
    }

    public componentWillReceiveProps(nextProps: IGraphProps) {
        this._disjointGraphs = GraphLayoutHelper.splitGraph(nextProps.nodes, nextProps.edges);
        this.setState({
            incomingEdgesEvaluated: false
        });

        this._graphComponents = [];
    }

    public getGraphComponents(): Graph[] {
        return this._graphComponents;
    }

    public render(): JSX.Element {
        let graphElements: JSX.Element[] = [];
        this._disjointGraphs.forEach((graph: IGraph, index) => {
            graphElements.push(
                <Graph
                    ref={(graph) => graph && this._graphComponents.push(graph)}
                    key={graph.nodes[0].key}
                    {...this.props}
                    nodes={graph.nodes}
                    edges={graph.edges}
                    leftMargin={0} />
            );
        });

        const width = this._getGraphLeftMargin();
        const height = this._getHeight();
        return (
            <div className="dtc-graph-list-parent">
                {width && width > 0 ?
                    <div className="dtc-incoming-edge-container" style={{ width: width, height: height }}>
                        <svg className="dtc-incoming-edge-canvas">
                            {this.state.incomingEdges}
                        </svg>
                    </div>
                    : null
                }
                <div className="dtc-disjoint-graph-container">
                    {graphElements}
                </div>
            </div>
        );
    }

    public componentDidMount() {
        this._evaluateAndSetIncomingEdges();
    }

    public componentDidUpdate() {
        this._evaluateAndSetIncomingEdges();
    }

    private _evaluateAndSetIncomingEdges() {
        if (!this.state.incomingEdgesEvaluated) {
            const edgeDataForLayout = GraphLayoutHelper.getIncomingEdgeLayouts(this.props, this._graphComponents);
            const edgeElements = edgeDataForLayout.map((edgeData) => {
                return <Edge
                    from={edgeData.from}
                    to={edgeData.to}
                    fromDepth={edgeData.fromDepth}
                    quadraticBezierVerticalDisplacement={this._getQuadraticBezierVerticalDisplacement()}
                    key={edgeData.key} />;
            });

            this.setState({
                incomingEdgesEvaluated: true,
                incomingEdges: edgeElements
            });
        }
    }

    private _getQuadraticBezierVerticalDisplacement(): number {
        return this.props.nodeHeight / Constants.edgeQuadraticBezierScaleDownFactor;
    }

    private _getGraphLeftMargin(): number {
        return GraphLayoutHelper.resolveGraphLeftMargin(this.props.leftMargin);
    }

    private _getHeight(): number {
        let height: number = 0;
        if (this._graphComponents) {
            for (let component of this._graphComponents) {
                height += component.getGraphSize().height;
            }
        }
        return height;
    }

    private _disjointGraphs: IGraph[] = [];
    private _graphComponents: Graph[] = [];
}

export class Graph extends Base.Component<IGraphProps, Base.IStateless> implements IGraphComponent {

    public componentWillMount() {
        this._validateNodesAndEdges(this.props.nodes, this.props.edges);
        this._stagingOrderAndDependencies = GraphLayoutHelper.createStagingOrderAndDependencies(this.props.nodes, this.props.edges);
    }

    private _nodesComparer = (s: INodeData, t: INodeData): boolean => {
        return (s.key === t.key && s.nodeRankHint === t.nodeRankHint
            && s.nodeHeightHint === t.nodeHeightHint && s.friendlyName === t.friendlyName);
    }

    public componentWillReceiveProps(nextProps: IGraphProps) {
        if (!Utils_Core.equals(nextProps.edges, this.props.edges)) {
            this._validateNodesAndEdges(nextProps.nodes, nextProps.edges);
            this._stagingOrderAndDependencies = GraphLayoutHelper.createStagingOrderAndDependencies(nextProps.nodes, nextProps.edges);
            this._identifiedAncestors = {};
        }
        else if (!ArrayUtils.arrayEquals(nextProps.nodes, this.props.nodes, this._nodesComparer, false, true)) {
            this._validateNodesAndEdges(nextProps.nodes, nextProps.edges);
            this._stagingOrderAndDependencies = GraphLayoutHelper.createStagingOrderAndDependencies(nextProps.nodes, nextProps.edges);
        }
    }

    public getStagingOrder(): INodeData[][] {
        return this._stagingOrderAndDependencies ? this._stagingOrderAndDependencies.stagingOrder : [];
    }

    public getGraphSize(): IGraphSize {
        return { height: this._svgHeight, width: this._svgWidth };
    }

    public getPositionOfIncomingNodes(): IPoint[] {
        return this._incomingNodeRelativePositions;
    }

    public render(): JSX.Element {

        const stagingOrderAndDependencies = this._stagingOrderAndDependencies;
        const stagingOrder = stagingOrderAndDependencies.stagingOrder;
        this._publishTelemetry(stagingOrder);

        let dependencies = stagingOrderAndDependencies.dependencies;
        let layoutError = stagingOrderAndDependencies.layoutError;

        // Get the max bottom right position of the node that is drawn. This is used to set the height and width of svg. 
        let maxBottomRight: IPoint = { x: 0, y: 0 };
        let nodeElements: JSX.Element[] = this._getNodeElements(stagingOrder, maxBottomRight);
        let edgeElements: JSX.Element[] = [];
        if (!layoutError) {
            // If there are layout errors, do not bother drawing any edges.
            edgeElements = this._getEdgeElements(stagingOrder, dependencies);
        }

        const graphLeftMargin = this._getGraphLeftMargin();
        this._svgWidth = maxBottomRight.x + this.props.horizontalMargin + graphLeftMargin;
        this._svgHeight = maxBottomRight.y + this.props.verticalMargin;

        if (!layoutError) {
            this._populateIncomingNodeIndices(stagingOrder[0]);
        }
        else {
            this._incomingNodeRelativePositions = [];
        }

        return (
            <div className="dtc-canvas-container">
                {
                    layoutError && <ErrorComponent cssClass="dtc-canvas-error" errorMessage={layoutError} />
                }
                <div className="dtc-graph-container">
                    <svg className="svg-surface" height={this._svgHeight + "px"} width={this._svgWidth + "px"} focusable="false">
                        {edgeElements}
                    </svg>
                    {nodeElements}
                </div>
            </div>
        );
    }

    private _populateIncomingNodeIndices(firstStage: INodeDataForLayout[]): void {
        const incomingNodesMap = this.props.edges[StringUtils.empty];
        this._incomingNodeRelativePositions = [];
        if (incomingNodesMap) {
            firstStage.forEach((node, index) => {
                if (incomingNodesMap[node.key]) {
                    this._incomingNodeRelativePositions.push({
                        x: node.midPoints.left.x,
                        y: node.midPoints.left.y
                    });
                }
            });
        }
    }

    private _validateNodesAndEdges(nodes: INodeData[], edges: EdgeMatrix) {
        GraphLayoutHelper.validateNodesAndEdges(nodes, edges);
    }

    private _getNodeElements(stagingOrder: INodeDataForLayout[][], /* out */ maxBottomRight: IPoint): JSX.Element[] {

        const graphLeftMargin = this._getGraphLeftMargin();
        let nodeListForLayout = GraphLayoutHelper.getNodeDataForLayout(
            stagingOrder,
            this.props,
            graphLeftMargin,
            maxBottomRight);

        return nodeListForLayout.map((nodeDataForLayout: INodeDataForLayout) => {
            return this._getNodeElement(nodeDataForLayout, nodeDataForLayout.nodeHeightHint || this.props.nodeHeight, this.props.nodeWidth);
        });
    }

    private _getEdgeElements(stagingOrder: INodeDataForLayout[][], dependencies: IDictionaryStringTo<string[]>): JSX.Element[] {

        let edgeListForLayout = GraphLayoutHelper.getEdgeDataForLayout(
            stagingOrder, dependencies,
            this.props.edges,
            this.props,
            this.props.selectedNodeKey,
            this._identifiedAncestors);

        return edgeListForLayout.map((edgeDataForLayout: IEdgeDataForLayout) => {

            const classes = css({
                "dtc-cross-stage-edge": edgeDataForLayout.isCrossStage,
                "dtc-highlight-edge": edgeDataForLayout.highlightEdge
            });

            return (
                <Edge
                    cssClass={classes}
                    from={edgeDataForLayout.from}
                    to={edgeDataForLayout.to}
                    key={edgeDataForLayout.key}
                    fromDepth={edgeDataForLayout.fromDepth}
                    crossStages={edgeDataForLayout.isCrossStage || false}
                    quadraticBezierVerticalDisplacement={this._getQuadraticBezierVerticalDisplacement()}
                    showLabels={this.__unitTestMode} />
            );
        });
    }

    private _publishTelemetry(stagingOrder: INodeDataForLayout[][]): void {
        if (stagingOrder && stagingOrder.length > 0 && this.props.telemetryKey && !Graph.s_telemetryKeyTracker[this.props.telemetryKey]) {
            let maxRowCount = 0;
            stagingOrder.forEach((stage: INodeDataForLayout[]) => {
                if (stage) {
                    maxRowCount = Math.max(stage.length, maxRowCount);
                }
            });

            let properties = {};
            properties[Properties.canvasColumnCount] = stagingOrder.length;
            properties[Properties.canvasRowCount] = maxRowCount;
            Telemetry.instance().publishEvent(Feature.CanvasDimensions, properties);
            Graph.s_telemetryKeyTracker[this.props.telemetryKey] = true;
        }
    }

    private _getNodeElement(node: INodeDataForLayout, height: number, width: number): JSX.Element {

        const style: React.CSSProperties = {
            position: "absolute",
            height: height,
            width: width,
            top: node.topLeftPosition.y,
            left: node.topLeftPosition.x
        };

        return (
            <div className="div-node" style={style} key={node.key}>
                {node.getNodeElement && node.getNodeElement(node.key, node.data)}
            </div>
        );
    }

    private _getGraphLeftMargin(): number {
        return GraphLayoutHelper.resolveGraphLeftMargin(this.props.leftMargin);
    }

    private _getQuadraticBezierVerticalDisplacement(): number {
        return this.props.nodeHeight / Constants.edgeQuadraticBezierScaleDownFactor;
    }

    private _identifiedAncestors: IDictionaryStringTo<string[]> = {};
    private __unitTestMode = false;
    private static s_telemetryKeyTracker: IDictionaryStringTo<boolean> = {};
    private _stagingOrderAndDependencies: IStagingOrderAndDependencies;
    private _svgWidth: number;
    private _svgHeight: number;
    private _incomingNodeRelativePositions: IPoint[] = [];
}

