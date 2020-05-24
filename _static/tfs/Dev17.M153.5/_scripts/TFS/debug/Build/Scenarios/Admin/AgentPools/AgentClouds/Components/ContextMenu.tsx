import * as React from "react";
import { DefaultButton } from "OfficeFabric/Button";
import { autobind } from "OfficeFabric/Utilities";
import { VssContextualMenu } from "VSSUI/VssContextualMenu";
import * as Serialization from "VSS/Serialization";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import { TypeInfo, TaskAgentCloudType, TaskAgentCloud } from "TFS/DistributedTask/Contracts";
import * as AgentCloudTypes from "../Stores/AgentCloudTypes";
import { AgentCloudActionCreator, AgentCloudActionHub } from "../Actions/AgentCloud";
import { AgentCloudDialog } from "./AgentCloudDialog";

export interface IProps extends React.Props<any> {
	agentCloudActionCreator: AgentCloudActionCreator;
	agentCloudActionHub: AgentCloudActionHub;
}

export class ContextMenu extends React.Component<IProps, any> {
	private _agentCloudTypesStore: AgentCloudTypes.Store = null;
	private _agentCloudActionCreator: AgentCloudActionCreator = null;
	private __agentCloudActionHub: AgentCloudActionHub = null;

	constructor(props: IProps) {
		super(props);

		this._agentCloudActionCreator = this.props.agentCloudActionCreator;
		this.__agentCloudActionHub = this.props.agentCloudActionHub;

		this._agentCloudTypesStore = new AgentCloudTypes.Store({
			actionHub: this.__agentCloudActionHub
		});

		this.state = {
			isContextMenuVisible: false,
			showCallout: false,
			items: null,
			hideDialog: true
		};
	}

	public render(): JSX.Element {
		return (
			<div>
				<DefaultButton onClick={this._onClick} id="new-agentcloud-btn" text={Resources.NewAgentCloud} />
				{this.state.isContextMenuVisible ? (
					<VssContextualMenu
						shouldFocusOnMount={true}
						target={this.state.target}
						onDismiss={this._onDismiss}
						items={this.state.items}
					/>
				) : null}

				{this.renderAgentCloudDialog()}
			</div>
		);
	}

	public renderAgentCloudDialog(): JSX.Element {
		return (
			<AgentCloudDialog
				agentCloudActionHub={this.__agentCloudActionHub}
				agentCloudActionCreator={this._agentCloudActionCreator}
				dismissDialog={this.dismissDialog}
				type="Generic"
				hidden={this.state.hideDialog}
			/>
		);
	}

	public componentDidMount() {
		// add changed listeners
		this._agentCloudTypesStore.addChangedListener(this._onStoresUpdated);
		this._agentCloudActionCreator.getAgentCloudTypes();
	}

	public componentWillUnmount() {
		// remove changed listeners
		this._agentCloudTypesStore.removeChangedListener(this._onStoresUpdated);
	}

	private _onStoresUpdated = () => {
		this.setState(this._getState());
	};

	private _getState() {
		return {
			items: this.getMenuItems(this._agentCloudTypesStore.getAgentCloudTypes())
		};
	}

	private getMenuItems(agentCloudTypes: any[]) {
		var menuItems: any[] = [];

		for (var i = 0; i < agentCloudTypes.length; i++) {
			var agentCloudType = Serialization.ContractSerializer.deserialize(
				agentCloudTypes[i],
				TypeInfo.TaskAgentCloudType
			);

			menuItems.push({
				key: agentCloudType.name,
				name: agentCloudType.name,
				agentCloudType: agentCloudType,
				onClick: this._onClickItem
			});
		}

		return menuItems;
	}

	@autobind
	private _onClickItem(event, obj) {
		const agentCloudType: TaskAgentCloudType = obj.agentCloudType;
		this.setState({
			type: agentCloudType.name,
			hideDialog: false
		});
	}

	@autobind
	dismissDialog() {
		this.setState({
			hideDialog: true
		});
	}

	@autobind
	private _onClick(event: React.MouseEvent<any>): void {
		this.setState({ target: event.currentTarget, isContextMenuVisible: true });
	}

	@autobind
	private _onDismiss(event: any): void {
		this.setState({ isContextMenuVisible: false });
	}
}
