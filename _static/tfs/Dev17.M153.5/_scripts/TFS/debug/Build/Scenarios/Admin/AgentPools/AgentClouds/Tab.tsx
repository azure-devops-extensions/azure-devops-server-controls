import * as React from "react";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Service from "VSS/Service";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";
import { TaskAgentCloud } from "TFS/DistributedTask/Contracts";
import { SplitterElementPosition, Splitter } from "VSSUI/Splitter";
import { AgentCloudTreeView, AgentCloudTreeNode } from "./Components/TreeView";
import { ContextMenu } from "./Components/ContextMenu";
import { Details } from "./Components/Details";
import "Build/Scripts/AdminView";
import { AgentCloudActionHub, AgentCloudActionCreator, IAgentCloudActionCreatorProps } from "./Actions/AgentCloud";
import * as AgentCloudStore from "./Stores/AgentCloud";
import * as AgentCloudRequestStore from "./Stores/AgentCloudRequest";

export interface IAgentCloudsTabState {
	nodes: AgentCloudTreeNode[];
}

export class AgentCloudsTab extends React.Component<any, IAgentCloudsTabState> {
	private _agentCloudStore: AgentCloudStore.Store = null;
	private _agentCloudRequestStore: AgentCloudRequestStore.Store = null;
	private _agentCloudActionCreator: AgentCloudActionCreator = null;
	private _agentCloudActionHub: AgentCloudActionHub = null;

	constructor(props: any) {
		super(props);

		var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
		var tfsConnection = new Service.VssConnection(tfsContext.contextData);
		var restClient: TaskAgentHttpClient = tfsConnection.getHttpClient(TaskAgentHttpClient);
		this._agentCloudActionHub = new AgentCloudActionHub();

		var options: IAgentCloudActionCreatorProps = {
			restClient: restClient,
			actionHub: this._agentCloudActionHub
		};

		this._agentCloudActionCreator = new AgentCloudActionCreator(options);

		this._agentCloudStore = new AgentCloudStore.Store({
			actionHub: this._agentCloudActionHub
		});
		this._agentCloudRequestStore = new AgentCloudRequestStore.Store({
			actionHub: this._agentCloudActionHub
		});

		this.state = {
			nodes: []
		};
	}

	public render(): JSX.Element {
		return (
			<div className="flex flex-grow flex-column ac-splitter">
				<Splitter
					fixedElement={SplitterElementPosition.Near}
					splitterDirection={this.props.splitterDirection}
					minFixedSize={100}
					maxFixedSize={500}
					initialFixedSize={250}
					nearElementClassName="flex flex-column"
					onRenderNearElement={() => {
						return (
							<div>
								<div className="left-pane-toolbar toolbar">
									<ContextMenu
										agentCloudActionHub={this._agentCloudActionHub}
										agentCloudActionCreator={this._agentCloudActionCreator}
									/>
								</div>

								<div className="ac-treeview">
									<AgentCloudTreeView
										nodes={this.state.nodes}
										selectionChangedCallBack={(node: AgentCloudTreeNode) => {
											this._agentCloudActionCreator.getAgentCloudRequests(node.id);
										}}
										newNodeId={
											this._agentCloudStore.getNewAgentCloud()
												? this._agentCloudStore.getNewAgentCloud().agentCloudId
												: -1
										}
										agentCloudActionCreator={this._agentCloudActionCreator}
									/>
								</div>
							</div>
						);
					}}
					farElementClassName="flex flex-column"
					onRenderFarElement={() => {
						return (
							<div id="ac-details">
								<Details
									agentCloudRequestStore={this._agentCloudRequestStore}
									agentCloudStore={this._agentCloudStore}
								/>
							</div>
						);
					}}
				/>
			</div>
		);
	}

	private fetchAgentClouds() {
		this._agentCloudActionCreator.getAgentClouds();
	}

	public componentDidMount() {
		// add changed listeners
		this._agentCloudStore.addChangedListener(this._onStoresUpdated);
		this.fetchAgentClouds();
	}

	public componentWillUnmount() {
		// remove changed listeners
		this._agentCloudStore.removeChangedListener(this._onStoresUpdated);
	}

	private _onStoresUpdated = () => {
		this.setState(this._getState());
	};

	private _getState() {
		return {
			nodes: this._getAgentCloudNodes(this._agentCloudStore.getAgentClouds())
		};
	}

	// sort by name of AgentCloud
	private _compare(a: AgentCloudTreeNode, b: AgentCloudTreeNode) {
		const nameA = a.text.toUpperCase();
		const nameB = b.text.toUpperCase();

		if (nameA < nameB) {
			return -1;
		} else if (nameA > nameB) {
			return 1;
		}

		return 0;
	}

	private _getAgentCloudNodes(agentClouds: TaskAgentCloud[]) {
		let nodes: AgentCloudTreeNode[] = [];

		for (let i = 0; i < agentClouds.length; i++) {
			let treeNode = new AgentCloudTreeNode(agentClouds[i].agentCloudId, agentClouds[i].name);
			treeNode.icon = "icon icon-tfs-query-flat";
			nodes.push(treeNode);
		}

		// sort by name of AgentCloud
		nodes.sort(this._compare);

		let rootNode = new AgentCloudTreeNode(0, Resources.AllAgentClouds, nodes);

		rootNode.noContextMenu = true;
		rootNode.hasExpanded = true;
		rootNode.expanded = true;
		rootNode.folder = false;

		return [rootNode];
	}
}
