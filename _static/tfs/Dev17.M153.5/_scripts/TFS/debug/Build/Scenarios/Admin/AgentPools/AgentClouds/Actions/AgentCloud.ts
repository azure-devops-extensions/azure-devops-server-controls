import { Action } from "VSS/Flux/Action";
import { TaskAgentCloudType, TaskAgentCloud, TaskAgentCloudRequest } from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";

export interface AgentCloudTypesPayload {
	agentCloudTypes: TaskAgentCloudType[];
}

export interface AgentCloudsPayload {
	agentClouds: TaskAgentCloud[];
}

export interface AgentCloudRequestsPayload {
	agentCloudRequests: TaskAgentCloudRequest[];
	agentCloudId: number;
}

export interface AgentCloudPayload {
	agentCloud: TaskAgentCloud;
	error: string;
}

export class AgentCloudActionHub {
	private _deletedAgentCloud: Action<AgentCloudPayload>;
	private _savedAgentCloud: Action<AgentCloudPayload>;
	private _fetchedAgentCloudRequests: Action<AgentCloudRequestsPayload>;
	private _fetchedAgentClouds: Action<AgentCloudsPayload>;
	private _fetchedAgentCloudTypes: Action<AgentCloudTypesPayload>;

	constructor() {
		this._deletedAgentCloud = new Action<AgentCloudPayload>();
		this._savedAgentCloud = new Action<AgentCloudPayload>();
		this._fetchedAgentCloudRequests = new Action<AgentCloudRequestsPayload>();
		this._fetchedAgentClouds = new Action<AgentCloudsPayload>();
		this._fetchedAgentCloudTypes = new Action<AgentCloudTypesPayload>();
	}

	public get deletedAgentCloud() {
		return this._deletedAgentCloud;
	}

	public get savedAgentCloud() {
		return this._savedAgentCloud;
	}

	public get fetchedAgentCloudRequests() {
		return this._fetchedAgentCloudRequests;
	}

	public get fetchedAgentClouds() {
		return this._fetchedAgentClouds;
	}

	public get fetchedAgentCloudTypes() {
		return this._fetchedAgentCloudTypes;
	}
}

export interface IAgentCloudActionCreatorProps {
	actionHub: AgentCloudActionHub;
	restClient: TaskAgentHttpClient;
}

export class AgentCloudActionCreator {
	private _actionHub: AgentCloudActionHub;
	private _restClient: TaskAgentHttpClient;

	public constructor(options: IAgentCloudActionCreatorProps) {
		this._actionHub = options.actionHub;
		this._restClient = options.restClient;
	}

	public getAgentCloudTypes(): IPromise<any> {
		return this._restClient.getAgentCloudTypes().then(result => {
			this._actionHub.fetchedAgentCloudTypes.invoke({
				agentCloudTypes: result
			});
		}, raiseTfsError);
	}

	public getAgentClouds(): IPromise<any> {
		return this._restClient.getAgentClouds().then(result => {
			this._actionHub.fetchedAgentClouds.invoke({
				agentClouds: result
			});
		}, raiseTfsError);
	}

	public getAgentCloudRequests(agentCloudId: number): IPromise<any> {
		return this._restClient.getAgentCloudRequests(agentCloudId).then(result => {
			this._actionHub.fetchedAgentCloudRequests.invoke({
				agentCloudRequests: result,
				agentCloudId: agentCloudId
			});
		}, raiseTfsError);
	}

	public deleteAgentCloud(agentCloudId: number): IPromise<any> {
		return this._restClient.deleteAgentCloud(agentCloudId).then(result => {
			this._actionHub.deletedAgentCloud.invoke({
				agentCloud: result,
				error: null
			});
		}, raiseTfsError);
	}

	public addAgentCloud(agentCloud: TaskAgentCloud): IPromise<any> {
		return this._restClient.addAgentCloud(agentCloud).then(
			result => {
				this._actionHub.savedAgentCloud.invoke({
					agentCloud: result,
					error: null
				});
			},
			error => {
				this._actionHub.savedAgentCloud.invoke({
					agentCloud: null,
					error: error.message
				});
			}
		);
	}
}
