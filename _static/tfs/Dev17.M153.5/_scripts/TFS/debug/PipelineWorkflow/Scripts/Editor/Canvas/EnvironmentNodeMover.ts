import { INodeData, IGraphComponent, IGraphListComponent } from "DistributedTaskControls/Components/Canvas/Types";

export interface IStageIndex {
    columnIndex: number;
    rowIndex: number;
}

export enum MoveDirection {
    up = 1,
    down = 2
}

export type MoveAcrossSingleNodeDelegateType = (moveDirection: MoveDirection, selectedNodeKey: string, stagingOrder: INodeData[][]) => void;
export type MoveAcrossMultipleNodesDelegateType = (moveDirection: MoveDirection, sourceNodeList: INodeData[], targetNodeList: INodeData[]) => void;

export class EnvironmentNodeMover {

    constructor(private _graphComponent: IGraphComponent, private _graphListComponent: IGraphListComponent) {
        this._createNodeToStagingOrderMap();
    }

    public evaluateMove(selectedNodeKey: string): { canMoveAbove: boolean, canMoveBelow: boolean} {
        // If node is not selected, then move up and move down operations are not enabled. 
        if (!selectedNodeKey) {
            return {
                canMoveAbove: false,
                canMoveBelow: false
            };
        }

        let stagingOrder: INodeData[][] = null;
        if (this._graphComponent) {
            // Get the staging order for nodes.
            stagingOrder = this._graphComponent.getStagingOrder();
        }
        else if (this._graphListComponent && this._nodeKeyToStagingOrderMap) {
            stagingOrder = this._nodeKeyToStagingOrderMap[selectedNodeKey];
        }

        if (stagingOrder) {
            const { above, below } = this._areThereNodesAboveAndBelowSelectedNodeInAStage(selectedNodeKey, stagingOrder);
            
            // Allow move up if there are any elements above and move down if there are any elements below in the stage.
            return {
                canMoveAbove: above,
                canMoveBelow: below
            };
        }
        else {
            return {
                canMoveAbove: false,
                canMoveBelow: false
            };
        }
    }

    public move(
        moveDirection: MoveDirection, 
        selectedNodeKey: string,
        moveAcrossSingleNode: MoveAcrossSingleNodeDelegateType,
        moveAcrossMultipleNodes: MoveAcrossMultipleNodesDelegateType): void {

        if (!selectedNodeKey) {
            return;
        }

        let stagingOrder: INodeData[][] = null;
        if (this._graphComponent) {
            stagingOrder = this._graphComponent.getStagingOrder();
            moveAcrossSingleNode(moveDirection, selectedNodeKey, stagingOrder);
        }
        else if (this._graphListComponent && this._nodeKeyToStagingOrderMap) {
            stagingOrder = this._nodeKeyToStagingOrderMap[selectedNodeKey];

            // Get the graph for the selected node.
            const graphWithSelectedNode = this._nodeToGraphMap[selectedNodeKey];
            
            const nextSibling = moveDirection === MoveDirection.down;
            const siblingNode = EnvironmentNodeMover.getSiblingNodeInAStage(selectedNodeKey, nextSibling, stagingOrder);
            if (siblingNode) {
                // Get the graph for the sibling node.
                const siblingNodeKey = siblingNode.key;
                const graphWithSiblingNode = this._nodeToGraphMap[siblingNodeKey];

                const firstStageOfGraphWithSelectedNode = graphWithSelectedNode.getStagingOrder()[0];
                const firstStageOfGraphWithSiblingNode = graphWithSiblingNode.getStagingOrder()[0];
                if (graphWithSelectedNode === graphWithSiblingNode || 
                    (firstStageOfGraphWithSelectedNode.length === 1 && firstStageOfGraphWithSiblingNode.length === 1)) {

                    // If the selected node and the sibling node are in the same graph
                    // Or If the graph of selected node AND graph of sibling node have one node in first stage,
                    // it is a simple move across a single node.
                    moveAcrossSingleNode(moveDirection, selectedNodeKey, stagingOrder);
                }
                else {
                    // This is a move across multiple nodes.
                    if (firstStageOfGraphWithSelectedNode.length <= firstStageOfGraphWithSiblingNode.length) {
                        moveAcrossMultipleNodes(moveDirection, firstStageOfGraphWithSelectedNode, firstStageOfGraphWithSiblingNode);
                    }
                    else {
                        const reverseDirection = moveDirection === MoveDirection.up ? MoveDirection.down : MoveDirection.up;
                        moveAcrossMultipleNodes(reverseDirection, firstStageOfGraphWithSiblingNode, firstStageOfGraphWithSelectedNode);
                    }
                }
            }
        }
    }

    public static getSiblingNodeInAStage(
        selectedNodeInstanceId: string, 
        nextSibling: boolean,
        stagingOrder: INodeData[][]): INodeData {

        // Get the staging order and find the stage index for the selected node.
        const instanceIdToStageIndexMap = this._createInstanceIdToStagingOrderIndexMap(stagingOrder);
        const stageIndexForSelectedInstance = instanceIdToStageIndexMap[selectedNodeInstanceId];
        const incrementIndex = nextSibling ? 1 : -1;
        let siblingNode = null;
        let key: string;
        if (stageIndexForSelectedInstance) {
            const rowIndex = stageIndexForSelectedInstance.rowIndex;
            const columnIndex = stageIndexForSelectedInstance.columnIndex; 
            const stage = stagingOrder[columnIndex];
            if (stage) {
                // Find the next or previous sibling based on increment index (-1 for up and +1 for down)
                siblingNode = stage[rowIndex + incrementIndex];
            }
        }

        return siblingNode;
    }

    private _areThereNodesAboveAndBelowSelectedNodeInAStage(
        selectedNodeInstanceId: string, 
        stagingOrder: INodeData[][]): { above: boolean, below: boolean } {

        // Create a map from node instance id to the stage index i.e. so that the stage node
        // can be efficiently accessed 
        const instanceIdToStageIndexMap = EnvironmentNodeMover._createInstanceIdToStagingOrderIndexMap(stagingOrder);
        
        // Get the stage index for the selected node instance id
        const stageIndexForSelectedInstance = instanceIdToStageIndexMap[selectedNodeInstanceId];
        if (stageIndexForSelectedInstance) {
            const stage = stagingOrder[stageIndexForSelectedInstance.columnIndex];

            // Allow move up if there are any elements above and move down if there are any elements below in the stage.
            return({
                above: stageIndexForSelectedInstance.rowIndex > 0,
                below: stageIndexForSelectedInstance.rowIndex < (stage.length - 1)
            });
        }
        else {
            return {
                above: false,
                below: false
            };
        }
    }

    private static _createInstanceIdToStagingOrderIndexMap(stagingOrder: INodeData[][]): IDictionaryStringTo<IStageIndex> {
        let instanceIdToIndexMap: IDictionaryStringTo<IStageIndex> = {};
        stagingOrder.forEach((columns: INodeData[], columnIndex: number) => {
            columns.forEach((node: INodeData, rowIndex: number) => {
                instanceIdToIndexMap[node.key] = { columnIndex: columnIndex, rowIndex: rowIndex };
            });
        });

        return instanceIdToIndexMap;
    }

    private _createNodeToStagingOrderMap(): void {
        if (this._graphListComponent) {
            this._nodeKeyToStagingOrderMap = {};
            this._nodeToGraphMap = {};
            let stagingOrderForRootNodes: INodeData[][] = [];
            const graphs = this._graphListComponent.getGraphComponents();
            graphs.forEach((graph, index) => {
                const stagingOrder = graph.getStagingOrder();
                stagingOrder.forEach((stage, index) => {
                    if (index === 0) {
                        // Push the first stage into a separate staging order to allow
                        // evaluation of movement of entire graph across each other. 
                        for (const node of stage) {
                            this._nodeKeyToStagingOrderMap[node.key] = stagingOrderForRootNodes;
                            if (!stagingOrderForRootNodes[0]) {
                                stagingOrderForRootNodes[0] = [];
                            }

                            stagingOrderForRootNodes[0].push(node);
                            this._nodeToGraphMap[node.key] = graph;
                        }
                    }
                    else {
                        for (const node of stage) {
                            this._nodeKeyToStagingOrderMap[node.key] = graph.getStagingOrder();
                            this._nodeToGraphMap[node.key] = graph;
                        }
                    } 
                });
            });
        }
    }

    private _nodeKeyToStagingOrderMap: IDictionaryStringTo<INodeData[][]> = null;
    private _nodeToGraphMap: IDictionaryStringTo<IGraphComponent> = null;
}