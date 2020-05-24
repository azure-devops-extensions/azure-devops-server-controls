import * as Base from "DistributedTaskControls/Common/Components/Base";


// Represents a point on a 2D surface
export interface IPoint {

    x: number;

    y: number;
}


export class Constants {

    public static readonly verticalDisplacement = 30;

    public static readonly depthScaleMultiplier = 4;

    public static readonly depthScaleOffset = 2;

    public static readonly minOffset = 5;

    public static readonly svgRightMargin = 20;

    public static readonly svgBottomMargin = 20;

    public static readonly verticalDisplacementOffsetIncrementForCrossStageEdges = 5;

    public static readonly horizontalDisplacementOffsetIncrementForCrossStageEdges = 10;

    public static readonly negativeNodeRank = -1;

    public static readonly graphLeftMargin = 80;

    public static readonly edgeQuadraticBezierScaleDownFactor = 2.5;
}


export interface INodeData {

    /**
     * Unique key for the node.
     */
    key: string;

    /**
     * Data associated with the node
     */
    data: any;

    /**
     * Callback to get the node element that needs to be rendered. 
     */
    getNodeElement(key: string, data: any): JSX.Element;

    /**
     * Friendly name for the node. This is used in messages that are shown to the user. 
     */
    friendlyName?: string;

    /**
     * Optional value that can be used to sort multiple nodes that are added at the end of the stage.
     */
    nodeRankHint?: number;

    /**
     * Optional value that indicates the height of the node (in px).
     * If it is 0 or undefined, then default height is used from IGraphDimensions
     */
    nodeHeightHint?: number;
}

/**
 * EdgeMatrix["node1"]["node2"] = true if there is an edge from node1 to node2
 */
export type EdgeMatrix = IDictionaryStringTo<IDictionaryStringTo<boolean>>;

export interface IGraphDimensions extends Base.IProps {

    /** 
     * Width of the node in px.
     */
    nodeWidth: number;

    /**
     *  Height of the node in px.
     */
    nodeHeight: number;

    /**
     * Horizontal distance between nodes
     */
    horizontalMargin: number;

    /** 
     * Vertical distance between the nodes
     */
    verticalMargin: number;

    /**
     * Relative position for first node in the graph.
     * This is needed to incorporate incoming edges to the graph.
     */
    leftMargin?: number;
}

export interface IGraphProps extends IGraphDimensions {

    /**
     * Node information.
     */
    nodes: INodeData[];

    /**
     * Directed edges b/w nodes.
     */
    edges: EdgeMatrix;

    /**
     * Node key of selected node. 
     */
    selectedNodeKey?: string;

    /**
     * A unique key per browser session to associate
     * telemetry details with the graph being drawn. 
     */
    telemetryKey?: string;
}

export interface INodeMidPoints {

    /**
     * The mid point on the left edge
     */
    left: IPoint;

    /**
     * Mid point on the right edge
     */
    right: IPoint;
}

/**
 * Internal interface for node data and layout information.
 */
export interface INodeDataForLayout extends INodeData {

    midPoints: INodeMidPoints;

    nodeRank: number;

    topLeftPosition?: IPoint;
}

export interface IEdgeDataForLayout {

    from: IPoint;

    to: IPoint;

    key: string;

    fromDepth: number;

    isCrossStage?: boolean;

    highlightEdge?: boolean;
}

export function depthScaleModifier(depthScale: number): number {
    return depthScale * Constants.depthScaleMultiplier + Constants.depthScaleOffset;
}

export interface IGraphSize {
    height: number;
    width: number;
}

export interface IGraphComponent {

    getStagingOrder(): INodeData[][];

    getGraphSize(): IGraphSize;

    getPositionOfIncomingNodes(): IPoint[];
}

export interface IGraphListComponent {
    getGraphComponents(): IGraphComponent[];
}





