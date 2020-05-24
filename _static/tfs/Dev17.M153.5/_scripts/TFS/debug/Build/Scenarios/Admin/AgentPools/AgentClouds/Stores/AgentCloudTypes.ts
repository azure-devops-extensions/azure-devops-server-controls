import * as BaseStore from "VSS/Flux/Store";
import { TaskAgentCloudType } from "TFS/DistributedTask/Contracts";
import { AgentCloudActionHub } from "../Actions/AgentCloud";
import { IStoreOptions } from "./Types";

export class Store extends BaseStore.Store {
	private _agentCloudTypes: TaskAgentCloudType[] = [];
	private _agentCloudTypesHashmap = {};
	private _agentCloudActionHub: AgentCloudActionHub = null;

	constructor(options: IStoreOptions) {
		super();

		this._agentCloudActionHub = options.actionHub;

		this._agentCloudActionHub.fetchedAgentCloudTypes.addListener(payload => {
			this._agentCloudTypes = payload.agentCloudTypes;

			for (var agentCloudType of this._agentCloudTypes) {
				this._agentCloudTypesHashmap[agentCloudType.name] = agentCloudType;
			}

			this.emitChanged();
		});
	}

	public getAgentCloudTypes(): any[] {
		return this._agentCloudTypes;
	}

	public getAgentCloudType(type: string) {
		return this._agentCloudTypesHashmap[type];
	}
}
