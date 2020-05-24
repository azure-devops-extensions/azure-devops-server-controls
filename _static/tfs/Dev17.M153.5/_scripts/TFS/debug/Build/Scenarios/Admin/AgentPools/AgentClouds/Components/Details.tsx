import * as React from "react";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { autobind } from "OfficeFabric/Utilities";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { TaskAgentCloud } from "TFS/DistributedTask/Contracts";
import Utils_String = require("VSS/Utils/String");
import * as AgentCloudRequestStore from "Build/Scenarios/Admin/AgentPools/AgentClouds/Stores/AgentCloudRequest";
import * as AgentCloudStore from "Build/Scenarios/Admin/AgentPools/AgentClouds/Stores/AgentCloud";
import { RequestDetails } from "../Tabs/RequestDetails";
import { Info } from "../Tabs/Info";
import { DetailsTabKeys } from "Build/Scenarios/Admin/AgentPools/Constants";

export interface IProps extends React.Props<any> {
	agentCloudRequestStore: AgentCloudRequestStore.Store;
	agentCloudStore: AgentCloudStore.Store;
}

export interface IState {
	selectedView: string;
	additionalCommands: IPivotBarAction[];
	agentCloud: TaskAgentCloud;
}

export class Details extends React.Component<IProps, IState> {
	private static s_defaultView = DetailsTabKeys.Requests;

	private _hubViewState: IHubViewState;
	private _defaultHubCommands: IPivotBarAction[] = [];

	private _agentCloudRequestStore: AgentCloudRequestStore.Store = null;
	private _agentCloudStore: AgentCloudStore.Store = null;

	constructor(props: IProps) {
		super(props);

		this._agentCloudRequestStore = this.props.agentCloudRequestStore;
		this._agentCloudStore = this.props.agentCloudStore;

		this.state = {
			selectedView: Details.s_defaultView,
			additionalCommands: [],
			agentCloud: null
		};

		this._hubViewState = new HubViewState({
			defaultPivot: Details.s_defaultView
		});

		this._hubViewState.selectedPivot.subscribe(this._onPivotSelected);
	}

	public render() {
		if (this._agentCloudStore.getAgentClouds().length == 0 || this.state.agentCloud == null) {
			return <div> </div>;
		} else {
			var title = Utils_String.localeFormat(Resources.AgentCloudTitle, this.state.agentCloud.name);

			return (
				<Hub hubViewState={this._hubViewState} commands={this._getHubCommands()}>
					<HubHeader title={title} />
					<PivotBarItem itemKey={DetailsTabKeys.Requests} name={Resources.RequestsTitle}>
						<RequestDetails AgentCloudRequestStore={this._agentCloudRequestStore} />
					</PivotBarItem>
					<PivotBarItem itemKey={DetailsTabKeys.Info} name={Resources.InfoTitle}>
						<Info agentCloud={this.state.agentCloud} />
					</PivotBarItem>
				</Hub>
			);
		}
	}

	public componentWillUnmount() {
		this._hubViewState.selectedPivot.unsubscribe(this._onPivotSelected);
		this._agentCloudRequestStore.removeChangedListener(this._onStoresUpdated);
	}

	public componentDidMount() {
		// add changed listeners
		this._agentCloudRequestStore.addChangedListener(this._onStoresUpdated);
	}

	@autobind
	private _onStoresUpdated() {
		var agentCloudId = this._agentCloudRequestStore.getSelectedAgentCloudId();

		var agentCloud: TaskAgentCloud = this._agentCloudStore.getAgentCloud(agentCloudId);

		this.setState({
			agentCloud: agentCloud
		});
	}

	private _getHubCommands(): IPivotBarAction[] {
		return this._defaultHubCommands.concat(this.state.additionalCommands);
	}

	private _onPivotSelected = (view: string) => {
		this.setState({
			selectedView: view,
			additionalCommands: []
		});
	};
}
