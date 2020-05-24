import * as BaseStore from "VSS/Flux/Store";
import { TaskAgentCloud } from "TFS/DistributedTask/Contracts";
import { AgentCloudActionHub } from "../Actions/AgentCloud";
import { IStoreOptions } from "./Types";

export class Store extends BaseStore.Store {
	private _agentClouds: TaskAgentCloud[] = [];
	private _agentCloudHashmap = {};
	private _newAgentCloud: TaskAgentCloud = null;
	private _agentCloudActionHub: AgentCloudActionHub = null;

	constructor(options: IStoreOptions) {
		super();

		this._agentCloudActionHub = options.actionHub;

		this._agentCloudActionHub.fetchedAgentClouds.addListener(payload => {
			this._newAgentCloud = null;

			this._agentClouds = payload.agentClouds.slice(0);

			for (var agentCloud of this._agentClouds) {
				this._agentCloudHashmap[agentCloud.agentCloudId] = agentCloud;
			}

			this.emitChanged();
		});

		this._agentCloudActionHub.deletedAgentCloud.addListener(payload => {
			this._newAgentCloud = null;

			if (payload.agentCloud) {
				delete this._agentCloudHashmap[payload.agentCloud.agentCloudId];

				this._agentClouds = this._agentClouds.filter(function(obj) {
					return obj.agentCloudId !== payload.agentCloud.agentCloudId;
				});

				this.emitChanged();
			}
		});

		this._agentCloudActionHub.savedAgentCloud.addListener(payload => {
			this._newAgentCloud = payload.agentCloud;

			if (this._newAgentCloud && !this._agentCloudHashmap[this._newAgentCloud.agentCloudId]) {
				this._agentCloudHashmap[this._newAgentCloud.agentCloudId] = this._newAgentCloud;

				this._agentClouds.push(this._newAgentCloud);

				this.emitChanged();
			}
		});
	}

	public getAgentClouds(): any[] {
		return this._agentClouds;
	}

	public getAgentCloud(agentCloudId: number) {
		return this._agentCloudHashmap[agentCloudId];
	}

	public getNewAgentCloud(): TaskAgentCloud {
		return this._newAgentCloud;
	}
}
