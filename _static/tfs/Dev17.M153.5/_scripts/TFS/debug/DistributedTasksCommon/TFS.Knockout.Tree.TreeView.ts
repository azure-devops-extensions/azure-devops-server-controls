import ko = require("knockout");

import { create } from "VSS/Controls";
import { MenuOptions } from "VSS/Controls/Menus";
import { ITreeOptions, TreeNode, TreeViewO } from "VSS/Controls/TreeView";

const TREENODE_ADDITIONAL_RENDER_CLASSNAME = "tfs-knockout-tree-view-tree-node-holder";

export class KnockoutTreeNode extends TreeNode {
    public templateName: string = "";
    public ariaLabel: string = "";

    constructor(id: string, text: string, className?: string, children?: KnockoutTreeNode[]) {
        // config (css/unselectable properties) for a node
        super(text, {
            css: className
        }, children, id);
    }

    public getContributionContext(): any {
        return super.getContributionContext();
    }
}

export interface IContextualMenuOptions {
    onMenuItemClick?: (commandId: string, node: KnockoutTreeNode) => void;
    getMenuOptions: (node: KnockoutTreeNode) => MenuOptions;
}

export interface ITreeViewOptions extends ITreeOptions {
    className?: string;
    onClick?: (node: KnockoutTreeNode, args: JQueryEventObject) => void;
    selectFirstNodeByDefault?: boolean;
    menuOptions?: IContextualMenuOptions;
}

export class TreeView extends TreeViewO<ITreeViewOptions> {
    public setNodes(nodes: KnockoutTreeNode[]) {
        if (nodes && nodes.length > 0) {
            this.rootNode.clear();
            this.rootNode.addRange(nodes);
            this._draw();
            this._initializeNode();
        }
    }

    public initializeOptions(options?: ITreeViewOptions) {
        let cssClass = "tfs-knockout-tree ";
        if (options && options.className) {
            cssClass += options.className;
        }

        let extendedOptions: ITreeViewOptions = {
            className: cssClass,
            useBowtieStyle: true,
            useArrowKeysForNavigation: true,
            setTitleOnlyOnOverflow: true,
            ...options
        };

        if (options.menuOptions) {
            extendedOptions.contextMenu = {
                executeAction: this._onMenuItemClick,
                "arguments": (contextInfo) => {
                    return {
                        node: contextInfo.item
                    };
                }
            };
        }

        super.initializeOptions(extendedOptions);
    }

    public initialize() {
        super.initialize();
        this._element.bind("selectionchanged", (eventObject: JQueryEventObject) => { this._onSelectionChanged(eventObject); });
        this._initializeNode();
    }

    public onShowPopupMenu(node: KnockoutTreeNode, options?) {
        let menuOptions = this._options.menuOptions.getMenuOptions(node);
        super.onShowPopupMenu(node, {
            ...options,
            ...menuOptions
        });
    }

    public _updateNode(li: JQuery, node: KnockoutTreeNode, level: number) {
        let nodeDiv = super._updateNode(li, node, level) as JQuery;
        if (node.ariaLabel) {
            nodeDiv.attr("aria-label", node.ariaLabel);
        }

        if (node.templateName) {
            let renderHolder = li.find("." + TREENODE_ADDITIONAL_RENDER_CLASSNAME);
            if (renderHolder.length == 0) {
                // create the holder
                renderHolder = $("<div />").addClass(TREENODE_ADDITIONAL_RENDER_CLASSNAME);
                renderHolder.attr("data-bind", `template: { name: "${node.templateName}" }`);
                li.append(renderHolder);
            }

            // apply the template, viewmodel will be the node's tag
            ko.cleanNode(renderHolder[0]);
            ko.applyBindings(node.tag, renderHolder[0]);
        }
    }

    private _onMenuItemClick = (commandEventArgs: any) => {
        if (this._options.menuOptions.onMenuItemClick) {
            let command = commandEventArgs.get_commandName() as string;
            let node = commandEventArgs.get_commandArgument().node as KnockoutTreeNode;
            this._options.menuOptions.onMenuItemClick(command, node);
        }
    }

    private _initializeNode() {
        // select the first node and toggle by default if selectFirstNodeByDefault is set
        if (this._options.selectFirstNodeByDefault && this._options.nodes && this._options.nodes[0]) {
            let firstNode = this._options.nodes[0];
            this.setSelectedNode(firstNode);
            if (firstNode.hasChildren() && !firstNode.expanded) {
                this._toggle(this._options.nodes[0], this._getNodeElement(firstNode));
            }
        }
    }

    private _onSelectionChanged(eventObject: JQueryEventObject) {
        let currentNode = this.getSelectedNode() as KnockoutTreeNode;
        if ($.isFunction(this._options.onClick)) {
            this._options.onClick(currentNode, eventObject);
        }
    }
}