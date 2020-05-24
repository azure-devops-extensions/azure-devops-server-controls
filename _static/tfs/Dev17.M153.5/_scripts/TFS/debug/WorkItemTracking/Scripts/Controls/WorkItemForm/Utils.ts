import { TreeNode } from "VSS/Controls/TreeView";

export function populateUINodes(node, uiNode, level) {
    var i, l, nodes = node.children, newUINode, nodeName;

    level = level || 1;
    nodeName = node.name ? node.name : node.text;

    if (uiNode) {
        newUINode = TreeNode.create(nodeName);
        uiNode.add(newUINode);
        uiNode = newUINode;
    } else {
        uiNode = TreeNode.create(nodeName);
    }

    uiNode.expanded = level < 2;

    if (nodes) {
        for (i = 0, l = nodes.length; i < l; i++) {
            node = nodes[i];
            populateUINodes(node, uiNode, level + 1);
        }
    }

    return uiNode;
}
