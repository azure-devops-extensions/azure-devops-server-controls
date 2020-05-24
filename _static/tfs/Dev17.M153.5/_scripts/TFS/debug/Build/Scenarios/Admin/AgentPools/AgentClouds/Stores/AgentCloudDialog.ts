import * as BaseStore from "VSS/Flux/Store";
import { AgentCloudActionHub } from "../Actions/AgentCloud";
import { TaskAgentCloud } from "TFS/DistributedTask/Contracts";
import { IStoreOptions } from "./Types";

export class Store extends BaseStore.Store {
	private _agentCloud: TaskAgentCloud = null;
	private _errorMessage: string;
	private _agentCloudActionHub: AgentCloudActionHub = null;

	constructor(options: IStoreOptions) {
		super();

		this._agentCloudActionHub = options.actionHub;

		this._agentCloudActionHub.savedAgentCloud.addListener(payload => {
			this._agentCloud = payload.agentCloud;
			this._errorMessage = payload.error;

			this.emitChanged();
		});
	}

	public getAgentCloud() {
		return this._agentCloud;
	}

	public getErrorMessage() {
		return this._errorMessage;
	}
}
