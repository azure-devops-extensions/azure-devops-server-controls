import { INode, INodeStructureType} from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WorkItemClassificationNode, TreeNodeStructureType } from "TFS/WorkItemTracking/Contracts";

export namespace NodeHelpers {

    export function link(parentNode: INode): INode {
        if (parentNode.children) {

            for (const node of parentNode.children) {
                node.parent = parentNode;
                NodeHelpers.link(node);
            }
        }

        return parentNode;
    }

    export function findChildByStructure(node: INode, structure: number): INode {
        const children = node.children;

        if (children) {
            for (const child of children) {
                if (child.structure === structure) {
                    return child;
                }
            }
        }

        return null;
    }

    export function findById(parentNode: INode, nodeId: number): INode {
        if (parentNode) {
            if (parentNode.id === nodeId) {
                return parentNode;
            }

            if (parentNode.children) {
                for (const child of parentNode.children) {
                    const node = NodeHelpers.findById(child, nodeId);

                    if (node) {
                        return node;
                    }
                }
            }
        }

        return null;
    }

    export function findByGuid(parentNode: INode, nodeGuid: string): INode {
        if (parentNode) {
            if (parentNode.guid === nodeGuid) {
                return parentNode;
            }

            if (parentNode.children) {
                for (const child of parentNode.children) {
                    const node = NodeHelpers.findByGuid(child, nodeGuid);

                    if (node) {
                        return node;
                    }
                }
            }
        }

        return null;
    }

    /** Finds a node by path in the given subtree, optionally handling an intermediate structure level ('Areas', 'Iterations', etc.).
     *  @param {string} parentNode     The node from which to start the search.
     *  @param {string} nodePath       The path to the desired node, EXCLUDING the structure node; e.g. "MyProject\MyArea" (not "MyProject\Areas\MyArea").
     *  @param {number} structureLevel The level at which the structure nodes exist, relative to the parent node (which is L0). Pass only if structure nodes exist
     *  @param {number} structureType  The type of structure node (Area, Iteration, etc.) to select at the structure level. Pass only if structure nodes exist
     *  @returns {INode} The node if found; null if not.
     */
    export function findByPath(parentNode: INode, nodePath: string, structureLevel?: number, structureType?: number): INode {
        let i = 0;
        let j: number;
        let k: number;
        let level = 0;          // Relative to parent node.
        let nodes: INode[];     // Nodes in this level to consider.
        let newNodes: INode[];  // Temporary holding for next level of nodes to consider.
        let foundNode: INode;   // Latest found node.
        let pathSegments: string[];

        if (structureLevel != null && structureType == null) {
            throw new Error("ArgumentNullError: stuctureType must be provided if structureLevel is provided");
        }

        if (!parentNode || !nodePath) {
            return null;
        }

        // Normalize & split the path.
        nodePath = nodePath.replace(/^(\s|\u00A0|\\)+|(\s|\u00A0|\\)+$/g, "");  // Trim space & '\'.
        pathSegments = nodePath.toUpperCase().split("\\");

        // Starting with the parent node, traverse each level.
        // As long as we have nodes to consider and path segments to find...
        nodes = [parentNode];
        while (nodes && nodes.length > 0 && i < pathSegments.length) {
            foundNode = null;

            // (A) Special case: If a structure level was provided and if we've reached the structure level, find & enter the requested structure type.
            if (structureLevel != null && level++ === structureLevel) {
                newNodes = [];
                for (j = 0, k = nodes.length; j < k; j++) {
                    if (nodes[j].structure === structureType) {
                        newNodes = nodes[j].children || [];
                        break;
                    }
                }

                nodes = newNodes;
                continue;
            }

            // (B) Otherwise, find the next path segment node.
            newNodes = null;
            for (j = 0, k = nodes.length; j < k; j++) {
                if (nodes[j].name.toUpperCase() === pathSegments[i]) {
                    foundNode = nodes[j];
                    newNodes = foundNode.children;
                    i++;
                    break;
                }
            }

            nodes = newNodes;
        }

        // As long as we found all the segments, return the last found node.
        if (i === pathSegments.length) {
            return foundNode;
        } else {
            return null;
        }
    }

    export function getNodeSegments(node: INode, skipLevel?: number): string[] {
        /// <param name="skipLevel" type="number" optional="true" />

        const nodes: string[] = [];

        while (node) {
            nodes.unshift(node.name);
            node = node.parent;
        }

        if (typeof skipLevel === "number") {
            nodes.splice(skipLevel, 1);
        }

        return nodes;
    }

    /**
     * getNodesSegements for IReferencedNodes
     * @param path
     * @return the array of nodes values up to the root of the current node.
     */
    export function getReferencedNodeSegmenets(path: string): string[] {
        const segments = path.split("\\");
        segments.unshift(segments[0]);
        return segments;
    }

    export function getPath(node: INode, skipLevel: number): string {
        const nodes = NodeHelpers.getNodeSegments(node, skipLevel);

        return nodes.join("\\");
    }

    /**
     * Get a path relative to the root node, as the API expects it
     * ex. Project/Sprints/Sprint 133 => Sprints/Sprint 133
     * @param path The path to modify
     */
    export function getRelativePath(path: string): string {
        return path.split("\\").slice(1).join("\\");
    }

    export function mapClassificationNodesToLegacyNode(node: WorkItemClassificationNode): INode {
        var legacyNode: INode = {
            id: node.id,
            structure: null,
            startDate: node.attributes ? node.attributes["startDate"] : null,
            children: [],
            finishDate: node.attributes ? node.attributes["finishDate"] : null,
            guid: node.identifier,
            name: node.name,
            parent: null,
            type: null
        };

        if (node.structureType === TreeNodeStructureType.Area) {
            legacyNode.structure = INodeStructureType.Area;
            legacyNode.type = ClassificationNodeTypeConstants.AreaType;
        }
        else if (node.structureType === TreeNodeStructureType.Iteration) {
            legacyNode.structure = INodeStructureType.Iteration;
            legacyNode.type = ClassificationNodeTypeConstants.IterationType;
        }

        if (node.children) {
            for (var childNode of node.children) {
                legacyNode.children.push(mapClassificationNodesToLegacyNode(childNode));
            }
        }


        return legacyNode;
    }
}

export enum ClassificationNodeTypeConstants {
    ProjectType = -42,
    AreaType = -43,
    IterationType = -44
}