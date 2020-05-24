/// <reference types="jquery" />
/// <reference types="react" />

import * as React from "react";

import { ITfsComponentProps, TfsComponent, IState } from "Presentation/Scripts/TFS/TFS.React";

import { create } from "VSS/Controls";
import { ITreeOptions, TreeNode, TreeViewO } from "VSS/Controls/TreeView";

import { arrayEquals } from "VSS/Utils/Array";

export class BuildTreeNode extends TreeNode {
    constructor(id: string, text: string, children?: BuildTreeNode[]) {
        // we don't need any config (css/unselectable properties) for a node
        super(text, null, children, id);
    }
}

export interface IBuildTreeViewProps extends ITfsComponentProps {
    nodes: BuildTreeNode[];
    selectionChangedCallBack?: (node: BuildTreeNode) => void;
    toggleNodeCallBack?: (node: BuildTreeNode) => void;
    defaultPath?: string;
}

export class BuildTreeView extends TfsComponent<IBuildTreeViewProps, IState> {
    private _treeView: BuildTreeViewControl;
    private _onStoresUpdated: () => void;
    private _pathToNodes: IDictionaryStringTo<BuildTreeNode> = {};

    constructor(props: IBuildTreeViewProps) {
        super(props);
    }

    public shouldComponentUpdate(nextProps: IBuildTreeViewProps, nextState: IState): boolean {
        return this.props.defaultPath != nextProps.defaultPath
            || !this._areNodesEqual(this.props.nodes, nextProps.nodes);
    }

    private _areNodesEqual(nodesA: BuildTreeNode[], nodesB: BuildTreeNode[]) {
        return nodesA.length == nodesB.length && arrayEquals(nodesA, nodesB, (a, b) => {
            let nodeResult = a && b && a.tag && b.tag && a.tag.path == b.tag.path && a.children.length === b.children.length;
            if (nodeResult) {
                // do further check to match children nodes recursively
                return this._areNodesEqual(a.children, b.children);
            }
            return nodeResult;
        });
    }

    private _storeNodes(nodes: BuildTreeNode[]) {
        (nodes || []).forEach((node) => {
            this._pathToNodes[node.tag.path] = node;
            if (node.hasChildren()) {
                this._storeNodes(node.children);
            }
        });
    }

    private _setDefaultPath() {
        if (this.props.defaultPath && this._treeView) {
            let node = this._pathToNodes[this.props.defaultPath];
            this._treeView.setSelectedNode(node);
        }
    }

    protected onRender(element: HTMLElement) {
        let options: IBuildTreeViewOptions = {
            nodes: this.props.nodes,
            selectionChangedCallBack: this.props.selectionChangedCallBack,
            toggleNodeCallBack: this.props.toggleNodeCallBack
        };

        this._storeNodes(this.props.nodes);

        if (!this._treeView) {
            this._treeView = create(BuildTreeViewControl, $(element), options);
        }
        else {
            this._treeView.initializeOptions(options);
            this._treeView.setNodes(this.props.nodes);
        }

        this._setDefaultPath();
    }
}

export interface IBuildTreeViewOptions extends ITreeOptions {
    cssClass?: string;
    selectionChangedCallBack?: (node: BuildTreeNode) => void;
    toggleNodeCallBack?: (node: BuildTreeNode) => void;
}

class BuildTreeViewControl extends TreeViewO<IBuildTreeViewOptions> {

    constructor(options?: IBuildTreeViewOptions) {
        super(options);
    }

    public initializeOptions(options?: IBuildTreeViewOptions) {
        let extendedOptions: IBuildTreeViewOptions = {
            cssClass: "build-folder-view-tree build-hoverable",
            clickToggles: true,
            useBowtieStyle: true,
            useArrowKeysForNavigation: true,
            setTitleOnlyOnOverflow: true
        };
        super.initializeOptions($.extend(extendedOptions, options));
    }

    public initialize() {
        super.initialize();
        this._element.bind("selectionchanged", (eventObject: JQueryEventObject) => { this._onSelectionChanged(eventObject); });
        this._initializeNode();
    }

    public onItemClick(node: BuildTreeNode, nodeElement: HTMLElement, e?: JQueryEventObject) {
        // select the current node (we toggle on click as well, so let's select the node and then call base class method)
        this.setSelectedNode(node);
        super.onItemClick(node, nodeElement, e);
        return false;
    }

    public setNodes(nodes: BuildTreeNode[]) {
        if (nodes && nodes.length > 0) {
            this.rootNode.clear();
            this.rootNode.addRange(nodes);
            this._draw();
            this._initializeNode();
        }
    }

    public _toggle(node: BuildTreeNode, nodeElement: JQuery, suppressChangeEvent?: boolean) {
        super._toggle(node, nodeElement, suppressChangeEvent);
        if (this._options.toggleNodeCallBack) {
            this._options.toggleNodeCallBack(node);
        }
    }

    private _initializeNode() {
        // select the first node and toggle by default
        if (this._options.nodes && this._options.nodes[0]) {
            let firstNode = this._options.nodes[0];
            this.setSelectedNode(firstNode);
            if (firstNode.hasChildren() && !firstNode.expanded) {
                this._toggle(this._options.nodes[0], this._getNodeElement(firstNode));
            }
        }
    }

    private _onSelectionChanged(eventObject: JQueryEventObject) {
        var currentNode: BuildTreeNode = this.getSelectedNode();
        if ($.isFunction(this._options.selectionChangedCallBack)) {
            this._options.selectionChangedCallBack(currentNode);
        }
    }
}
