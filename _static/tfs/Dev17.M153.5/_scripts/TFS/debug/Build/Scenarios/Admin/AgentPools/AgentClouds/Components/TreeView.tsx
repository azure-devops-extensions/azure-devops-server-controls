import { ITfsComponentProps, TfsComponent, IState } from "Presentation/Scripts/TFS/TFS.React";
import { autobind } from "OfficeFabric/Utilities";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import { create } from "VSS/Controls";
import { ITreeOptions, TreeNode, TreeViewO } from "VSS/Controls/TreeView";
import { AgentCloudActionCreator } from "../Actions/AgentCloud";
import Utils_String = require("VSS/Utils/String");

export class AgentCloudTreeNode extends TreeNode {
	constructor(id: number, text: string, children?: AgentCloudTreeNode[]) {
		// we don't need any config (css/unselectable properties) for a node
		super(text, null, children, String(id));
	}
}

export interface IAgentCloudTreeViewProps extends ITfsComponentProps {
	nodes: AgentCloudTreeNode[];
	newNodeId: number;
	selectionChangedCallBack?: (node: AgentCloudTreeNode) => void;
	toggleNodeCallBack?: (node: AgentCloudTreeNode) => void;
	agentCloudActionCreator: AgentCloudActionCreator;
}

export class AgentCloudTreeView extends TfsComponent<IAgentCloudTreeViewProps, IState> {
	private _treeView: AgentCloudTreeViewControl;
	private _agentCloudActionCreator: AgentCloudActionCreator = null;

	constructor(props: IAgentCloudTreeViewProps) {
		super(props);

		this._agentCloudActionCreator = this.props.agentCloudActionCreator;
	}

	@autobind
	private _deleteAgentCloud(agentCloudId: number) {
		this._agentCloudActionCreator.deleteAgentCloud(agentCloudId);
	}

	@autobind
	private _menuItemClick(args) {
		// Get the item associated with the context menu
		var node = args.get_commandArgument().item;
		switch (args.get_commandName()) {
			case "delete":
				if (confirm(Utils_String.localeFormat(Resources.ConfirmDeleteAgentCloud, node.text))) {
					this._deleteAgentCloud(node.id);
				}
				break;
		}
	}

	private _getContextMenuItems() {
		return [
			{
				id: "delete",
				text: Resources.DeleteBtnLabel,
				icon: "icon-delete"
			}
		];
	}

	protected onRender(element: HTMLElement) {
		let options: IAgentCloudTreeViewOptions = {
			nodes: this.props.nodes,
			selectionChangedCallBack: this.props.selectionChangedCallBack,
			toggleNodeCallBack: this.props.toggleNodeCallBack,
			newNodeId: this.props.newNodeId,

			contextMenu: {
				items: this._getContextMenuItems(),
				executeAction: this._menuItemClick,
				arguments: function(contextInfo) {
					return { item: contextInfo.item };
				}
			}
		};

		if (!this._treeView) {
			this._treeView = create(AgentCloudTreeViewControl, $(element), options);
		} else {
			this._treeView.initializeOptions(options);
			this._treeView.setNodes(this.props.nodes);
		}
	}
}

export interface IAgentCloudTreeViewOptions extends ITreeOptions {
	cssClass?: string;
	newNodeId: number;
	selectionChangedCallBack?: (node: AgentCloudTreeNode) => void;
	toggleNodeCallBack?: (node: AgentCloudTreeNode) => void;
}

class AgentCloudTreeViewControl extends TreeViewO<IAgentCloudTreeViewOptions> {
	constructor(options?: IAgentCloudTreeViewOptions) {
		super(options);
	}

	public initializeOptions(options?: IAgentCloudTreeViewOptions) {
		let extendedOptions: IAgentCloudTreeViewOptions = {
			cssClass: "build-folder-view-tree build-hoverable",
			clickToggles: true,
			useBowtieStyle: true,
			useArrowKeysForNavigation: true,
			setTitleOnlyOnOverflow: true,
			newNodeId: -1
		};
		super.initializeOptions($.extend(extendedOptions, options));
	}

	public initialize() {
		super.initialize();
		this._element.bind("selectionchanged", (eventObject: JQueryEventObject) => {
			this._onSelectionChanged(eventObject);
		});
		this._initializeNode();
	}

	public onItemClick(node: AgentCloudTreeNode, nodeElement: HTMLElement, e?: JQueryEventObject) {
		// select the current node (we toggle on click as well, so let's select the node and then call base class method)
		super.onItemClick(node, nodeElement, e);
		return false;
	}

	public setNodes(nodes: AgentCloudTreeNode[]) {
		if (nodes && nodes.length > 0) {
			this.rootNode.clear();
			this.rootNode.addRange(nodes);
			this._draw();
			this._initializeNode();
		}
	}

	private _initializeNode() {
		// select the node which is added now or select the first node
		if (this._options.nodes && this._options.nodes[0] && this._options.nodes[0].children) {
			var selectedNode = null;
			for (var i = 0; i < this._options.nodes[0].children.length; i++) {
				if (i == 0 || this._options.nodes[0].children[i].id == this._options.newNodeId) {
					selectedNode = this._options.nodes[0].children[i];
				}
			}
			this.setSelectedNode(selectedNode);
		}
	}

	private _onSelectionChanged(eventObject: JQueryEventObject) {
		var currentNode: AgentCloudTreeNode = this.getSelectedNode();
		if ($.isFunction(this._options.selectionChangedCallBack)) {
			this._options.selectionChangedCallBack(currentNode);
		}
	}
}
