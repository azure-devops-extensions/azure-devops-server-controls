import * as BaseStore from "VSS/Flux/Store";
import { AgentCloudActionHub } from "../Actions/AgentCloud";
import { TaskAgentCloudRequest, TaskAgentCloud } from "TFS/DistributedTask/Contracts";
import { IStoreOptions } from "./Types";

export class Store extends BaseStore.Store {
	private _agentCloudRequests: TaskAgentCloudRequest[] = [];
	private _selectedAgentCloudId: number = null;
	private _agentCloudActionHub: AgentCloudActionHub = null;

	constructor(options: IStoreOptions) {
		super();

		this._agentCloudActionHub = options.actionHub;

		this._agentCloudActionHub.fetchedAgentCloudRequests.addListener(payload => {
			this._agentCloudRequests = payload.agentCloudRequests;
			this._selectedAgentCloudId = payload.agentCloudId;
			this.emitChanged();
		});
	}

	public getSelectedAgentCloudId(): number {
		return this._selectedAgentCloudId;
	}

	public getAgentCloudRequests(): TaskAgentCloudRequest[] {
		return this._agentCloudRequests;
	}
}
