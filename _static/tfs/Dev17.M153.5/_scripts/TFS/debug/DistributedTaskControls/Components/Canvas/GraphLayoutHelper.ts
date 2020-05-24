import { IPoint, Constants, IGraphProps, INodeData, INodeDataForLayout, INodeMidPoints, EdgeMatrix, IEdgeDataForLayout, IGraphDimensions, IGraphComponent } from "DistributedTaskControls/Components/Canvas/Types";
import * as Common from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Diag from "VSS/Diag";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as StringUtils from "VSS/Utils/String";
import * as ArrayUtils from "VSS/Utils/Array";

export interface IStagingOrderAndDependencies {

    stagingOrder: INodeDataForLayout[][];

    dependencies: IDictionaryStringTo<string[]>;

    layoutError?: string;
}

export interface IGraph {

    nodes: INodeData[];

    edges: EdgeMatrix;
}

/**
 * Static helper that encapsulates logic to create staging order for the graph nodes. This is separated for 
 * unit testing. 
 */
export class GraphLayoutHelper {

    public static validateNodesAndEdges(nodes: INodeData[], edges: EdgeMatrix): void {
        let nodeKeyToNodeMap = this._createNodeKeyToNodeMap(nodes as INodeDataForLayout[]);
        let firstInvalidEdgeKey = StringUtils.empty;

        for (let from in edges) {
            if (edges.hasOwnProperty(from)) {
                if (!nodeKeyToNodeMap[from]) {
                    firstInvalidEdgeKey = from;
                    if (firstInvalidEdgeKey) {
                        break;
                    }
                }

                for (let to in edges[from]) {
                    if (edges[from].hasOwnProperty(to)) {
                        if (!nodeKeyToNodeMap[to]) {
                            firstInvalidEdgeKey = to;
                            if (firstInvalidEdgeKey) {
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (firstInvalidEdgeKey) {
            throw new Error(StringUtils.format("Graph does not have node corresponding to edge end {0}. Please ensure that node and edge inputs to graph is proper", firstInvalidEdgeKey));
        }
    }

    public static createStagingOrderAndDependencies(nodes: INodeData[], edges: EdgeMatrix): IStagingOrderAndDependencies {

        let nodesForLayout = this._createAndInitializeNodesForLayout(nodes);

        let nodeKeyToNodeMap = this._createNodeKeyToNodeMap(nodesForLayout);

        let dependencies = this._extractDependencies(nodesForLayout, edges, nodeKeyToNodeMap);

        let { stagingOrder, layoutError } = this._getStagingOrder(nodesForLayout, dependencies, nodeKeyToNodeMap);

        return {
            stagingOrder: stagingOrder,
            dependencies: dependencies,
            layoutError: layoutError
        };
    }

    public static splitGraph(nodes: INodeData[], edges: EdgeMatrix): IGraph[] {

        let nodeKeyToNodeMap = this._createNodeKeyToNodeMap(nodes);
        let dependencies = this._extractDependencies(nodes, edges, nodeKeyToNodeMap);

        // Create disjoint graphs. 
        let graphs = this.getDisjointTreeFromEdges(dependencies);

        // Create a dictionary which maps each node to the graph index in which it exists. This is done for efficient lookup. 
        let nodeToGraphIndexMap = this._createNodeToGraphIndexMap(graphs);

        // In each disjoint graph, find the node with min rank in the first stage.
        let minRankNodes: string[] = [];
        let hasCycleDependencyError = false;
        for (const graph of graphs) {

            const minRankNode = this._getMinRankNodeKeyInFirstStage(graph, dependencies, nodeKeyToNodeMap);

            if (minRankNode) {
                minRankNodes.push(minRankNode);
            }
            else {

                // Any graph that has nodes (which is the case here) should have a min rank
                // node in the first stage. However, there is a scenario where if there is only one
                // node in the first stage and a dependency is added on that node to a node that is already
                // dependent on it, then no node in first stage is detected as all nodes have dependencies.
                // This can only happen when there is at least one cyclic dependency in the graph.
                // 
                // Simple case:
                // A --> B. B is dependent on A
                //
                // User tries to make A dependent on B.
                //
                // This will end up with both A and B having dependents and the logic will not
                // detect any node in first stage.
                hasCycleDependencyError = true;
                break;
            }
        }

        if (!hasCycleDependencyError) {
            // Sort the root nodes in order of their ranks. 
            this._sortNodes(minRankNodes, nodeKeyToNodeMap);

            // Create the list of disjoint graphs.
            let graphsToReturn: IGraph[] = [];

            // Add all the graphs in the order of ranks of nodes in their first stage.
            for (const node of minRankNodes) {
                // Find the graph index of the graph which this node is part of.
                const graphIndex = nodeToGraphIndexMap[node];
                graphsToReturn.push(this._createGraph(graphs[graphIndex], nodeKeyToNodeMap, edges));
            }

            return graphsToReturn;
        }
        else {
            // Just return all nodes and edges so that the
            // layout algorithm can deal with the cyclic dependency error
            return [{
                nodes: nodes,
                edges: edges
            }];
        }
    }

    public static getDependencies(nodes: INodeData[], edges: EdgeMatrix): IDictionaryStringTo<string[]> {
        const nodeKeyToNodeMap = this._createNodeKeyToNodeMap(nodes);
        const dependencies = this._extractDependencies(nodes, edges, nodeKeyToNodeMap);
        return dependencies;
    }

    public static getIncomingEdgeLayouts(graphDimensions: IGraphDimensions, graphComponents: IGraphComponent[]): IEdgeDataForLayout[] {

        let cumulativeGraphHeight = 0;
        let edgeDataForLayout: IEdgeDataForLayout[] = [];

        // Start position aligns with the left midpoint of the first node. 
        const startPosition = {
            x: 0,
            y: graphDimensions.nodeHeight / 2
        };

        const leftMargin = GraphLayoutHelper.resolveGraphLeftMargin(graphDimensions.leftMargin);

        for (const graph of graphComponents) {
            const incomingNodePositions = graph.getPositionOfIncomingNodes();
            for (const nodePosition of incomingNodePositions) {
                const endPosition = {
                    x: nodePosition.x + leftMargin,
                    y: nodePosition.y + cumulativeGraphHeight
                };

                edgeDataForLayout.push({
                    from: startPosition,
                    to: endPosition,
                    fromDepth: 0,
                    key: endPosition.y.toString()
                });
            }

            // As we move across graph, track the cumulative height. This ensures that the edge
            // sweeps across all graphs. 
            cumulativeGraphHeight = cumulativeGraphHeight + graph.getGraphSize().height;
        }

        return edgeDataForLayout;
    }

    private static _getMinRankNodeKeyInFirstStage(nodes: string[], dependencies: IDictionaryStringTo<string[]>, nodeKeyToNodeMap: IDictionaryStringTo<INodeData>): string {
        let minRank = Infinity;
        let nodeWithMinRank: string;
        nodes.forEach((nodeKey) => {
            if (!dependencies[nodeKey] || dependencies[nodeKey].length === 0) {
                const node = nodeKeyToNodeMap[nodeKey];
                const rank = node.nodeRankHint;
                if (rank < minRank) {
                    minRank = rank;
                    nodeWithMinRank = node.key;
                }
            }
        });

        return nodeWithMinRank;
    }

    private static _createGraph(nodeKeys: string[], nodeKeyToNodeMap: IDictionaryStringTo<INodeData>, allEdges: EdgeMatrix): IGraph {
        return {
            nodes: nodeKeys.map(nodeKey => nodeKeyToNodeMap[nodeKey]),
            edges: this._filterEdges(nodeKeys, allEdges)
        };
    }

    private static _sortNodes(rootNodeKeys: string[], nodeKeyToNodeMap: IDictionaryStringTo<INodeData>) {
        rootNodeKeys.sort((node1Key: string, node2Key: string) => {
            const node1 = nodeKeyToNodeMap[node1Key];
            const node2 = nodeKeyToNodeMap[node2Key];
            return node1.nodeRankHint - node2.nodeRankHint;
        });
    }

    private static _createNodeToGraphIndexMap(graphs: string[][]): IDictionaryStringTo<number> {
        let nodeToGraphIndexMap: IDictionaryStringTo<number> = {};
        graphs.forEach((graph, index) => {
            graph.forEach((node) => nodeToGraphIndexMap[node] = index);
        });

        return nodeToGraphIndexMap;
    }

    private static _filterEdges(nodeKeys: string[], allEdges: EdgeMatrix): EdgeMatrix {
        let filteredEdges: EdgeMatrix = {};
        let nodeKeyMap: IDictionaryStringTo<boolean> = {};
        nodeKeys.forEach(nodeKey => nodeKeyMap[nodeKey] = true);

        for (let from in allEdges) {
            if (allEdges.hasOwnProperty(from)) {
                for (let to in allEdges[from]) {
                    if (allEdges[from].hasOwnProperty(to)) {
                        // Empty string check for "from" is to consider incoming edges into the graph. 
                        // For incoming edges, "from" is empty.
                        if ((nodeKeyMap[from] || from === StringUtils.empty) && nodeKeyMap[to]) {
                            if (!filteredEdges[from]) {
                                filteredEdges[from] = {};
                            }

                            filteredEdges[from][to] = true;
                        }
                    }
                }
            }
        }

        return filteredEdges;
    }

    public static isFromNodeNotParentButAncestorOfToNode(fromNode: string, toNode: string, dependencies: IDictionaryStringTo<string[]>, identifiedAncestors: IDictionaryStringTo<string[]>): boolean {

        let ancestors = [];
        let dependents = dependencies[toNode];
        if (dependents && dependents.length > 0) {
            dependents.forEach((dependent: string) => {

                // We already know that fromNode is a direct parent of toNode. However, we want to know if
                // fromNode is also an ancestor connected to toNode via. the other dependents. 
                if (dependent !== fromNode) {
                    ancestors = ancestors.concat(this._getAncestors(dependent, dependencies, identifiedAncestors));
                    ancestors = ArrayUtils.uniqueSort(ancestors);
                }
            });
        }

        return ancestors.filter((ancestor: string) => {
            return ancestor === fromNode;
        }).length > 0;
    }

    public static getNodeDataForLayout(
        stagingOrder: INodeDataForLayout[][],
        graphDimensions: IGraphDimensions,
        graphLeftMarginForNodes: number,
        maxBottomRight: IPoint /* out */
    ): INodeDataForLayout[] {

        let maxRows = this._getMaxRowsInStagingOrder(stagingOrder);
        let nodeListForLayout: INodeDataForLayout[] = [];
        let cumulativeNodeHeight = 0;

        // Draw the stages row by row.
        for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
            const numStages = stagingOrder.length;
            let maxNodeHeightInTheRow = 0;

            for (let stageIndex = 0; stageIndex < numStages; stageIndex++) {
                let node = stagingOrder[stageIndex][rowIndex];
                if (node) {

                    // If node height is not set, then default it from graph dimensions.
                    if (!node.nodeHeightHint || node.nodeHeightHint < 0) {
                        node.nodeHeightHint = graphDimensions.nodeHeight;
                    }

                    node.topLeftPosition = {
                        x: stageIndex * (graphDimensions.nodeWidth + graphDimensions.horizontalMargin) + graphLeftMarginForNodes,
                        y: rowIndex * graphDimensions.verticalMargin + cumulativeNodeHeight
                    };

                    // Store left and right mid points of the nodes. This will be used to draw edges between nodes.
                    node.midPoints = this._getNodeMidPoints(node.topLeftPosition, graphDimensions.nodeHeight, graphDimensions.nodeWidth);

                    nodeListForLayout.push(node);

                    maxBottomRight.x = Math.max(maxBottomRight.x, node.topLeftPosition.x + graphDimensions.nodeWidth);
                    maxBottomRight.y = Math.max(maxBottomRight.y, node.topLeftPosition.y + node.nodeHeightHint);

                    // For each row, track the height of the maximum node that is drawn.
                    if (node.nodeHeightHint > maxNodeHeightInTheRow) {
                        maxNodeHeightInTheRow = node.nodeHeightHint;
                    }
                }
            }

            if (!maxNodeHeightInTheRow) {
                maxNodeHeightInTheRow = graphDimensions.nodeHeight;
            }

            // Track cumulative node height drawn till now so that when the next row is drawn, it 
            // includes are variable row heights before it.
            cumulativeNodeHeight += maxNodeHeightInTheRow;
        }

        return nodeListForLayout;
    }

    private static _getMaxRowsInStagingOrder(stagingOrder: INodeData[][]): number {
        let maxRows = 0;
        for (const stage of stagingOrder) {
            if (stage.length > maxRows) {
                maxRows = stage.length;
            }
        }

        return maxRows;
    }

    public static getEdgeDataForLayout(
        stagingOrder: INodeDataForLayout[][],
        dependencies: IDictionaryStringTo<string[]>,
        edges: EdgeMatrix,
        graphDimensions: IGraphDimensions,
        selectedNodeKey?: string,
        identifiedAncestors: IDictionaryStringTo<string[]> = {}
    ): IEdgeDataForLayout[] {

        const numColumns = stagingOrder.length;
        let edgeListForLayout: IEdgeDataForLayout[] = [];
        let highlightedEdgesForLayout: IEdgeDataForLayout[] = [];
        let nodeKeyToNodeMap: IDictionaryStringTo<INodeDataForLayout> = {};

        let edgeLayoutTracker: EdgeMatrix = JQueryWrapper.extendDeep({}, edges) as EdgeMatrix;

        for (let i = 0; i < numColumns - 1; i++) {

            let currentColumnNodes = stagingOrder[i];
            let nextColumnNodes = stagingOrder[i + 1];

            let fromDepth = 0;

            // Draw edges between nodes in consecutive stages, if the nodes are connected. 
            currentColumnNodes.forEach((fromNode: INodeDataForLayout) => {

                nodeKeyToNodeMap[fromNode.key] = fromNode;
                nextColumnNodes.forEach((toNode: INodeDataForLayout) => {

                    nodeKeyToNodeMap[toNode.key] = toNode;
                    if (edgeLayoutTracker[fromNode.key] && edgeLayoutTracker[fromNode.key][toNode.key]) {

                        const from = fromNode.midPoints.right;
                        const to = toNode.midPoints.left;
                        const highlightEdge = this._shouldHighlightEdge(fromNode.key, toNode.key, selectedNodeKey);

                        const edge = {
                            from: from,
                            to: to,
                            key: fromNode.key + "." + toNode.key,
                            fromDepth: fromDepth,
                            highlightEdge: highlightEdge
                        };

                        if (!highlightEdge) {
                            edgeListForLayout.push(edge);
                        }
                        else {
                            highlightedEdgesForLayout.push(edge);
                        }

                        edgeLayoutTracker[fromNode.key][toNode.key] = false;
                    }
                });

                fromDepth++;
            });
        }

        // Append highlighted edge at the end so that they are drawn on top of normal edges.
        edgeListForLayout.push(...highlightedEdgesForLayout);

        const firstColumnNodes = stagingOrder[0];
        if (firstColumnNodes) {
            firstColumnNodes.forEach(node => nodeKeyToNodeMap[node.key] = node);
        }

        this._populateCrossStageEdges(edgeListForLayout, edgeLayoutTracker, nodeKeyToNodeMap, dependencies, graphDimensions, identifiedAncestors, selectedNodeKey);

        if (GraphLayoutHelper.resolveGraphLeftMargin(graphDimensions.leftMargin)) {
            // Populate input edges only if there is enough margin on the left.
            this._populateInputEdgesOfGraph(edgeListForLayout, edgeLayoutTracker, nodeKeyToNodeMap, graphDimensions);
        }

        return edgeListForLayout;
    }

    /**
     * Get disjoint tree from the list of connecting edges for a layout
     * @param edgeList
     */
    public static getDisjointTreeFromEdges(edgeList: IDictionaryStringTo<string[]>): string[][] {
        const adjList = this._getAdjacencyList(edgeList);
        let visited: IDictionaryStringTo<boolean> = {};
        let groups: string[][] = [];
        if (adjList) {
            for (const vertex in adjList) {
                if (adjList.hasOwnProperty(vertex) && !visited[vertex]) {
                    const bfsTree = this._breadthFirstTraversal(vertex, adjList, visited);
                    groups.push(bfsTree);
                }
            }
        }

        return groups;
    }

    public static resolveGraphLeftMargin(leftMarginFromProps: number) {
        return leftMarginFromProps === undefined || leftMarginFromProps === null ? Constants.graphLeftMargin : leftMarginFromProps;
    }

    // Converts an edge list to an adjacency list representation
    // We use a dictionary as an adjacency list, where each key is a vertex
    // and each value is a list of all vertices adjacent to that vertex
    private static _getAdjacencyList(list: IDictionaryStringTo<string[]>): IDictionaryStringTo<string[]> {
        let edgeList: IDictionaryStringTo<string[]> = JQueryWrapper.extendDeep({}, list);

        let adjList: IDictionaryStringTo<string[]> = {};
        if (edgeList) {
            for (const vertex in edgeList) {
                if (edgeList.hasOwnProperty(vertex)) {
                    const vertices = edgeList[vertex];
                    if (adjList[vertex]) {
                        // append all vertices of vertex present in edgeList
                        vertices.forEach((v) => {
                            adjList[vertex].push(v);
                        });
                    } else {
                        // vertex is not in adjList, create new adjacency list for it
                        adjList[vertex] = vertices;
                    }

                    vertices.forEach((v) => {
                        if (adjList[v]) {
                            adjList[v].push(vertex);
                        } else {
                            adjList[v] = [vertex];
                        }
                    });
                }
            }
        }

        return adjList;
    }

    private static _breadthFirstTraversal(vertex: string, adjList: IDictionaryStringTo<string[]>, visited: IDictionaryStringTo<boolean>): string[] {
        let groups: string[] = [];
        let q: string[] = [];
        q.push(vertex);
        visited[vertex] = true;
        while (q.length > 0) {
            vertex = q.shift();
            groups.push(vertex);
            // Go through adjacency list of vertex and push any unvisited vertex onto the queue.
            const adjVertices: string[] = adjList[vertex];
            adjVertices.forEach((vertex) => {
                if (!visited[vertex]) {
                    q.push(vertex);
                    visited[vertex] = true;
                }
            });
        }

        return groups;
    }

    private static _populateCrossStageEdges(
        edgeListForLayout: IEdgeDataForLayout[],
        edgeLayoutTracker: EdgeMatrix,
        nodeKeyToNodeMap: IDictionaryStringTo<INodeDataForLayout>,
        dependencies: IDictionaryStringTo<string[]>,
        graphDimensions: IGraphDimensions,
        identifiedAncestors: IDictionaryStringTo<string[]>,
        selectedNodeKey?: string): void {

        // All remaining edges are between nodes that span across stages. Draw edges connecting those nodes.
        // If there are edges that connect nodes that are indirectly connected through stages, then do not draw edges b/w them. 
        // For instance, if C (dependsOn) B (dependsOn) A and C (dependsOn) A, then the edges will be like below
        //
        // A -> B -> C, and A -> C. There is no need to draw an edge b/ w A -> C
        //
        // The logic to find if a node is not directly dependent, but is indirectly dependent is not optimal. There is scope
        // for optimization here.

        let displacementOffsetMap: IDictionaryStringTo<IPoint>;

        for (let fromNodeKey in edgeLayoutTracker) {

            if (fromNodeKey && edgeLayoutTracker.hasOwnProperty(fromNodeKey)) {

                // Get all nodes connected to fromNode
                let toNodes = edgeLayoutTracker[fromNodeKey];
                for (let toNodeKey in toNodes) {

                    if (toNodes.hasOwnProperty(toNodeKey) && toNodes[toNodeKey]) {

                        if (!GraphLayoutHelper.isFromNodeNotParentButAncestorOfToNode(fromNodeKey, toNodeKey, dependencies, identifiedAncestors)) {

                            if (nodeKeyToNodeMap[fromNodeKey] && nodeKeyToNodeMap[toNodeKey]) {

                                if (!displacementOffsetMap) {
                                    displacementOffsetMap = this._getDisplacementOffsetMap(nodeKeyToNodeMap);
                                }

                                // Cross stage edges are drawn in 3 parts.
                                // Part1: Edge from the right midpoint of "from" node to a point below the node (called intermediatePoint1)
                                // Part2: Edge from intermediatePoint1 to just before the destination (called intermediatePoint2) node at the same level (a straight line)
                                // Part3: Edge from intermediatePoint2 to left midpoint of "to" node
                                // Please refer the link below on this:
                                // https://microsoft.sharepoint.com/teams/VSinCIExperience/_layouts/OneNote.aspx?id=%2Fteams%2FVSinCIExperience%2FSiteAssets%2FVS.in%20CI%20Experience%20Notebook&wd=target%28OnePagers.one%7CA952CC07-334F-4820-A7BB-478940FBDFE8%2FHow%20are%20cross%20stage%20edges%20drawn%7C24BE6A0E-3F4D-4C6E-A197-C9EDF894A4DA%2F%29


                                let from = nodeKeyToNodeMap[fromNodeKey].midPoints.right;
                                let to = nodeKeyToNodeMap[toNodeKey].midPoints.left;

                                let verticalDisplacement = 0;
                                if (this._doesAnyNodeExistInPath(from, to, nodeKeyToNodeMap)) {
                                    verticalDisplacement = graphDimensions.verticalMargin / 2 + graphDimensions.nodeHeight / 2 + displacementOffsetMap[fromNodeKey].y;
                                }

                                // Do not let the x co-ordinate of the first intermediate point fall before "from" point.
                                const intermediatePoint1_x = Math.max(from.x + graphDimensions.horizontalMargin - displacementOffsetMap[fromNodeKey].x, from.x);
                                let intermediatePoint1: IPoint = { x: intermediatePoint1_x, y: from.y + verticalDisplacement };

                                // Do not let the x co-ordinate of the second intermediate point fall after "to" point.
                                const intermediatePoint2_x = Math.min(to.x - graphDimensions.horizontalMargin + displacementOffsetMap[fromNodeKey].x, to.x);
                                let intermediatePoint2: IPoint = { x: intermediatePoint2_x, y: intermediatePoint1.y };

                                const highlightEdge = this._shouldHighlightEdge(fromNodeKey, toNodeKey, selectedNodeKey);

                                let crossStageEdges = this._getCrossStageEdges(fromNodeKey + "." + toNodeKey, highlightEdge, from, intermediatePoint1, intermediatePoint2, to);
                                crossStageEdges.forEach((crossStageEdge: IEdgeDataForLayout) => {
                                    edgeListForLayout.push(crossStageEdge);
                                });
                            }
                        }

                        edgeLayoutTracker[fromNodeKey][toNodeKey] = false;
                    }
                }
            }
        }
    }

    private static _shouldHighlightEdge(from: string, to: string, selectedNodeKey: string): boolean {
        return selectedNodeKey && (
            StringUtils.equals(from, selectedNodeKey, true) ||
            StringUtils.equals(to, selectedNodeKey, true)
        );
    }

    private static _populateInputEdgesOfGraph(
        edgeListForLayout: IEdgeDataForLayout[],
        edgeLayoutTracker: EdgeMatrix,
        nodeKeyToNodeMap: IDictionaryStringTo<INodeDataForLayout>,
        graphDimensions: IGraphDimensions): void {

        // Get all the edges from empty nodes to a proper node. 
        let toNodes = edgeLayoutTracker[StringUtils.empty];
        if (toNodes) {

            let minYPosition = graphDimensions.nodeHeight / 2;
            for (let node in toNodes) {
                if (toNodes.hasOwnProperty(node)) {
                    const nodeDataForLayout = nodeKeyToNodeMap[node];
                    const from: IPoint = { x: 0, y: minYPosition };
                    const to: IPoint = { x: nodeDataForLayout.midPoints.left.x, y: nodeDataForLayout.midPoints.left.y };

                    edgeListForLayout.push({
                        from: from,
                        to: to,
                        key: "entry." + node,
                        fromDepth: 0
                    });
                }
            }
        }
    }

    private static _doesAnyNodeExistInPath(from: IPoint, to: IPoint, nodeKeyToNodeNodeMap: IDictionaryStringTo<INodeDataForLayout>): boolean {

        let nodes = this._getNodeListFromNodeKeyToNodeNameMap(nodeKeyToNodeNodeMap);

        function isNodeAtSameHeightAsFromPoint(node: INodeDataForLayout): boolean {
            return node.midPoints.left.y === from.y;
        }

        function isNodeAfterFromPoint(node: INodeDataForLayout): boolean {
            return node.midPoints.left.x > from.x;
        }

        function isNodeBeforeToPoint(node: INodeDataForLayout): boolean {
            return node.midPoints.left.x < to.x;
        }

        let filteredNodes = nodes.filter((node) => isNodeAtSameHeightAsFromPoint(node) && isNodeAfterFromPoint(node) && isNodeBeforeToPoint(node));
        return filteredNodes && filteredNodes.length > 0;
    }


    /**
     * Calculate the displacement offset for the node based on how left they appear on the graph.
     * Please view the one pager at the link below to understand why we need the offset
     * https://microsoft.sharepoint.com/teams/VSinCIExperience/_layouts/OneNote.aspx?id=%2Fteams%2FVSinCIExperience%2FSiteAssets%2FVS.in%20CI%20Experience%20Notebook&wd=target%28OnePagers.one%7CA952CC07-334F-4820-A7BB-478940FBDFE8%2FWhy%20is%20vertical%20displacement%20offset%20needed%20for%20Cross%20stage%20edges%7C303B51E3-1CFE-4C02-8747-C18CB5990934%2F%29
     */
    private static _getDisplacementOffsetMap(nodeKeyToNodeMap: IDictionaryStringTo<INodeDataForLayout>): IDictionaryStringTo<IPoint> {

        let nodesForLayout = this._getNodeListFromNodeKeyToNodeNameMap(nodeKeyToNodeMap);
        nodesForLayout.sort((node1: INodeDataForLayout, node2: INodeDataForLayout): number => {
            return node1.topLeftPosition.x - node2.topLeftPosition.x;
        });

        let nodeKeyToDisplacementOffsetMap: IDictionaryStringTo<IPoint> = {};

        // Sort nodes based on the top left "x" position and calculate
        // vertical displacements. 
        let offset = 0;
        let prevPosition = -1;
        nodesForLayout.forEach((node: INodeDataForLayout) => {
            if (node.topLeftPosition.x !== prevPosition) {
                offset += Constants.verticalDisplacementOffsetIncrementForCrossStageEdges;
                prevPosition = node.topLeftPosition.x;
            }

            if (!nodeKeyToDisplacementOffsetMap[node.key]) {
                nodeKeyToDisplacementOffsetMap[node.key] = { x: 0, y: 0 };
            }

            nodeKeyToDisplacementOffsetMap[node.key].y = offset;
        });

        // Sort nodes based on top left "y" position and calculate
        // horizontal displacements.
        offset = 0;
        prevPosition = -1;
        nodesForLayout.sort((node1: INodeDataForLayout, node2: INodeDataForLayout): number => {
            return node1.topLeftPosition.y - node2.topLeftPosition.y;
        });

        nodesForLayout.forEach((node: INodeDataForLayout) => {
            if (node.topLeftPosition.y !== prevPosition) {
                offset += Constants.horizontalDisplacementOffsetIncrementForCrossStageEdges;
                prevPosition = node.topLeftPosition.y;
            }

            nodeKeyToDisplacementOffsetMap[node.key].x = offset;
        });

        return nodeKeyToDisplacementOffsetMap;
    }

    private static _getNodeListFromNodeKeyToNodeNameMap(nodeKeyToNodeMap: IDictionaryStringTo<INodeDataForLayout>): INodeDataForLayout[] {
        let nodesForLayout: INodeDataForLayout[] = [];
        for (let key in nodeKeyToNodeMap) {
            if (nodeKeyToNodeMap.hasOwnProperty(key)) {
                nodesForLayout.push(nodeKeyToNodeMap[key]);
            }
        }

        return nodesForLayout;
    }

    private static _getCrossStageEdges(keyPrefix: string, highlightEdge: boolean, ...points: IPoint[]): IEdgeDataForLayout[] {
        let edges: IEdgeDataForLayout[] = [];
        for (let i = 0, len = points.length; i < len - 1; i++) {
            edges.push({
                from: points[i],
                to: points[i + 1],
                key: keyPrefix + "-part" + (i + 1).toString(),
                isCrossStage: true,
                fromDepth: 0,
                highlightEdge: highlightEdge
            });
        }

        return edges;
    }

    private static _getNodeMidPoints(topLeft: IPoint, height: number, width: number): INodeMidPoints {
        let midPoints: INodeMidPoints = {} as INodeMidPoints;
        midPoints.left = { x: topLeft.x, y: topLeft.y + height / 2 };
        midPoints.right = { x: topLeft.x + width, y: topLeft.y + height / 2 };
        return midPoints;
    }

    private static _getAncestors(node: string, dependencies: IDictionaryStringTo<string[]>, identifiedAncestors: IDictionaryStringTo<string[]>): string[] {

        let ancestors: string[] = [];
        let dependents = dependencies[node];

        // Calling function only when this node's ancestors are not resolved
        // Going via non-dynamic programming way when FF is turned off
        if (FeatureAvailabilityService.isFeatureEnabled(Common.FeatureFlag_CanvasGraphPerformanceImprovement, false) && identifiedAncestors[node]) {
            return identifiedAncestors[node];
        }

        if (dependents && dependents.length > 0) {
            dependents.forEach((dependent: string) => {
                // Recursively get the ancestors of dependents. 
                ancestors = ancestors.concat(dependent, this._getAncestors(dependent, dependencies, identifiedAncestors));
                ancestors = ArrayUtils.uniqueSort(ancestors);
            });
        }

        identifiedAncestors[node] = ancestors;

        return ancestors;
    }

    private static _getStagingOrder(
        nodesForLayout: INodeDataForLayout[],
        dependencies: IDictionaryStringTo<string[]>,
        nodeKeyToNodeMap: IDictionaryStringTo<INodeData>): { stagingOrder: INodeDataForLayout[][], layoutError?: string } {

        let stagingOrder: INodeDataForLayout[][] = [];
        let stagingStatus: IDictionaryStringTo<boolean> = {};
        let iterationCount = 0;

        /* tslint:disable:no-constant-condition */
        while (true) {

            nodesForLayout.forEach((node: INodeDataForLayout) => {
                if (!stagingStatus[node.key]) {

                    let areAllDependenciesStaged = this._areAllDependenciesStaged(node.key, dependencies, stagingStatus);
                    if (areAllDependenciesStaged) {

                        if (!stagingOrder[iterationCount]) {
                            stagingOrder[iterationCount] = [];
                        }

                        // Track all nodes that can be staged in the current iteration.
                        stagingOrder[iterationCount].push(node);
                    }
                }
            });

            if (stagingOrder[iterationCount]) {

                // Update staging status for all nodes that were staged in current iteration. 
                stagingOrder[iterationCount].forEach((stage: INodeDataForLayout) => {
                    stagingStatus[stage.key] = true;
                });

                iterationCount++;
            }
            else {
                // Nothing was staged in this iteration, which means that either all nodes are staged or
                // the remaining nodes can no longer be staged due to cycling dependencies. Break the loop.
                break;
            }

            // Fail-safe to prevent browser from freezing if there is a bug in layout logic.
            if (iterationCount > this.c_maxIterationCount) {
                throw new Error(StringUtils.format("Could not layout graph in {0} iterations. There is a bug in the layout logic", this.c_maxIterationCount));
            }
        }
        /* tslint:enable:no-constant-condition */

        // If some nodes are not staged, this means there are cycles in the dependency graph. 
        let nodesNotStaged = this._getNodesThatAreNotStaged(nodesForLayout, stagingStatus);
        let layoutError = StringUtils.empty;
        if (nodesNotStaged && nodesNotStaged.length > 0) {
            // Get the error message.
            layoutError = this._getCyclicDependencyError(nodesNotStaged);

            if (!stagingOrder[0]) {
                stagingOrder[0] = [];
            }

            nodesNotStaged.forEach((nodeNotStaged: INodeDataForLayout) => {
                // Add all these nodes to the first stage to ensure that they are shown in the first column. 
                stagingOrder[0].push(nodeNotStaged);
            });
        }

        this._sortNodesInStages(stagingOrder);
        return {
            stagingOrder: stagingOrder, layoutError: layoutError
        };
    }

    private static _getNodesThatAreNotStaged(nodesForLayout: INodeDataForLayout[], stagingStatus: IDictionaryStringTo<boolean>): INodeDataForLayout[] {

        return nodesForLayout.filter((node: INodeDataForLayout) => {
            return !stagingStatus[node.key];
        });
    }

    private static _getCyclicDependencyError(nodesNotStaged: INodeDataForLayout[]): string {

        if (nodesNotStaged.length > 0) {
            let nodeNotStagedNames = nodesNotStaged.map((node: INodeDataForLayout) => {
                return node.friendlyName || node.key;
            });

            return StringUtils.localeFormat(Resources.CyclicDependencyErrorMessage, nodeNotStagedNames.join(Resources.CyclicDependencyErrorMessageNodeSeparator));
        }
        else {
            return StringUtils.empty;
        }
    }

    private static _sortNodesInStages(stagingOrder: INodeDataForLayout[][]): void {

        // Sort each stage based on their ranks
        for (let stageIndex = stagingOrder.length - 1; stageIndex >= 0; stageIndex--) {
            stagingOrder[stageIndex].sort((node1: INodeDataForLayout, node2: INodeDataForLayout) => {
                return node1.nodeRank - node2.nodeRank;
            });
        }
    }

    private static _areAllDependenciesStaged(nodeKey: string, dependencies: IDictionaryStringTo<string[]>, stagingStatus: IDictionaryStringTo<boolean>): boolean {
        let areAllDependenciesStaged = true;

        if (dependencies[nodeKey]) {
            dependencies[nodeKey].forEach((dependentNodeKey) => {
                if (!stagingStatus[dependentNodeKey]) {
                    areAllDependenciesStaged = false;
                    return;
                }
            });
        }

        return areAllDependenciesStaged;
    }

    private static _createAndInitializeNodesForLayout(nodes: INodeData[]): INodeDataForLayout[] {
        return nodes.map((node: INodeData) => {
            let nodeForLayout = JQueryWrapper.extendDeep({}, node) as INodeDataForLayout;
            if (node.nodeRankHint !== undefined) {
                nodeForLayout.nodeRank = node.nodeRankHint;
            }
            else {
                Diag.logError("Node should have a rank hint");
                nodeForLayout.nodeRank = 0;
            }

            return nodeForLayout;
        });
    }

    private static _createNodeKeyToNodeMap(nodesForLayout: INodeData[]): IDictionaryStringTo<INodeData> {
        let nodeKeyToNodeMap: IDictionaryStringTo<INodeData> = {};
        nodesForLayout.forEach((node: INodeData) => {
            nodeKeyToNodeMap[node.key] = node;
        });

        return nodeKeyToNodeMap;
    }

    private static _extractDependencies(
        nodesForLayout: INodeData[],
        edges: EdgeMatrix,
        nodeKeyToNodeMap: IDictionaryStringTo<INodeData>): IDictionaryStringTo<string[]> {

        let dependencies: IDictionaryStringTo<string[]> = {};

        nodesForLayout.forEach((from: INodeData) => {
            if (!dependencies[from.key]) {
                dependencies[from.key] = [];
            }

            nodesForLayout.forEach((to: INodeData) => {

                if (edges[from.key] && edges[from.key][to.key]) {

                    if (!dependencies[to.key]) {
                        dependencies[to.key] = [];
                    }

                    dependencies[to.key].push(from.key);
                }
            });
        });

        return dependencies;
    }

    private static c_maxIterationCount = 10000;
}

