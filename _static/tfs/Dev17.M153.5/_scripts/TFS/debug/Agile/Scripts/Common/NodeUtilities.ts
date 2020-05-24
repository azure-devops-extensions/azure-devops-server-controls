import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { TreeNode } from "VSS/Controls/TreeView";

export namespace NodeUtilities {

    /**
     * Check if a node is a descendant of another
     * @param node The parent node
     * @param childNode The child node
     */
    export function isDescendant(node: INode, childNode: INode): boolean {
        let currentNode = childNode.parent;
        while (currentNode) {
            if (node.guid === currentNode.guid) {
                break;
            }

            currentNode = currentNode.parent;
        }

        return !!currentNode;
    }

    /**
     * Given an iteration node, generate an equivalent tree of TreeNodes, used for a TreeView
     * @param rootNode 
     */
    export function computeDisplayHierarchy(rootNode: INode): TreeNode {
        if (rootNode) {
            let rootDisplayNode: TreeNode = TreeNode.create(rootNode.name);
            _computeDisplayHierarchyHelper(rootNode, rootDisplayNode);

            return rootDisplayNode;
        }
        return null;
    }

    /**
     * Given an iteration node and a tree node, copy all of the information over to the tree node
     * @param node The iteration node
     * @param displayNode The display node
     */
    function _computeDisplayHierarchyHelper(node: INode, displayNode: TreeNode): void {
        if (node.children) {
            for (let child of node.children) {
                if (child) {
                    let childDisplayNode = TreeNode.create(child.name);
                    displayNode.children.push(childDisplayNode);
                    childDisplayNode.parent = displayNode;

                    _computeDisplayHierarchyHelper(child, childDisplayNode);
                }
            }
        }
    }
}