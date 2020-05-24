import * as React from "react";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import * as AgentPoolsAsync from "Build/Scenarios/Admin/AgentPools/AgentPools/Tab";
import * as AgentCloudsAsync from "Build/Scenarios/Admin/AgentPools/AgentClouds/Tab";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { IHubViewState, HubViewState } from "VSSUI/Utilities/HubViewState";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { ITabProps } from "./Types";
import { AgentPoolTabKeys } from "./Constants";

const LoadingSpinner = () => <Spinner type={SpinnerType.large} label={Resources.Loading} />;

const AsyncAgentPools = getAsyncLoadedComponent(
	["Build/Scenarios/Admin/AgentPools/AgentPools/Tab"],
	(m: typeof AgentPoolsAsync) => m.AgentPoolsTab,
	LoadingSpinner
);

const AsyncAgentClouds = getAsyncLoadedComponent(
	["Build/Scenarios/Admin/AgentPools/AgentClouds/Tab"],
	(m: typeof AgentCloudsAsync) => m.AgentCloudsTab,
	LoadingSpinner
);

export interface ViewState {
	selectedView: string;
	additionalCommands: IPivotBarAction[];
}

export interface ViewProps extends ITabProps {}

export class ViewContent extends React.Component<ViewProps, ViewState> {
	private static s_defaultView = AgentPoolTabKeys.AgentPools;

	private _hubViewState: IHubViewState;
	private _defaultHubCommands: IPivotBarAction[] = [];

	constructor(props: ViewProps) {
		super(props);

		this.state = {
			selectedView: ViewContent.s_defaultView,
			additionalCommands: []
		};

		this._hubViewState = new HubViewState({
			defaultPivot: ViewContent.s_defaultView
		});

		this._hubViewState.selectedPivot.subscribe(this._onPivotSelected);
	}

	public render() {
		return (
			<Hub hubViewState={this._hubViewState} commands={this._getHubCommands()}>
				<HubHeader title={Resources.AgentPools} />
				<PivotBarItem itemKey={AgentPoolTabKeys.AgentPools} name={Resources.AgentPools}>
					<AsyncAgentPools
						jQuerySignalrUrl={this.props.jQuerySignalrUrl}
						signalrHubUrl={this.props.signalrHubUrl}
						timeZoneData={this.props.timeZoneData}
					/>
				</PivotBarItem>
				<PivotBarItem itemKey={AgentPoolTabKeys.AgentClouds} name={Resources.AgentClouds} className="ac-pivot-item">
					<AsyncAgentClouds />
				</PivotBarItem>
			</Hub>
		);
	}

	public componentWillUnmount() {
		this._hubViewState.selectedPivot.unsubscribe(this._onPivotSelected);
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
