import AgentPoolsStore = require("Build/Scripts/Stores/AgentPools");
import Build_Actions = require("Build/Scripts/Actions/Actions");
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import {TaskAgentHttpClient} from "TFS/DistributedTask/TaskAgentRestClient";

import {Application} from "Presentation/Scripts/TFS/TFS.OM.Common";

import {Action} from "VSS/Flux/Action";
import {Store} from "VSS/Flux/Store";

import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export interface IAgentsStoreOptions {
    taskAgentClient?: TaskAgentHttpClient;
}

export interface IAgentsStoreInitialized {
    initialized: boolean;
}

interface ITaskAgent {
    agent: DistributedTaskContracts.TaskAgent;
    poolId: number;
}

export class AgentsStore extends Store {
    private _agents: IDictionaryNumberTo<ITaskAgent> = {};
    private _initializedAgentsForPools: IDictionaryNumberTo<boolean> = {};

    private _distributedTaskClient: TaskAgentHttpClient;

    constructor(options?: IAgentsStoreOptions) {
        super();

        this._distributedTaskClient = (options && options.taskAgentClient) ? options.taskAgentClient : Application.getDefaultConnection().getHttpClient(TaskAgentHttpClient);

        Build_Actions.agentsUpdated.addListener((payload: Build_Actions.AgentsForPoolUpdatedPayload) => {
            // TODO: agents that are updated through signalR or TaskAgent contract for that matter, doesn't have any pool reference to it
            // in such cases, we won't have those agents updated in this store unless refreshed, include pool reference in agent contract as well?
            // so.. signalr for agents doesn't help this store
            if (payload.poolId) {
                this._updateAgents(payload.agents.map((data) => {
                    return {
                        agent: data,
                        poolId: payload.poolId
                    };
                }));
            }
        });

        Build_Actions.agentDeleted.addListener((agentId: number) => {
            delete this._agents[agentId];
            this.emitChanged();
        });
    }

    public getAgents(poolId?: number): DistributedTaskContracts.TaskAgent[] {
        if (poolId && this._initializedAgentsForPools[poolId] === undefined) {
            this._initializedAgentsForPools[poolId] = false;
            this._refreshAgents(poolId);
        }

        let agents: DistributedTaskContracts.TaskAgent[] = [];
        Object.keys(this._agents).forEach((key) => {
            let matchedAgent = this._agents[key].agent;
            if (poolId && this._agents[key].poolId != poolId) {
                matchedAgent = null;
            }

            if (matchedAgent) {
                agents.push(matchedAgent);
            }
        });

        return agents.sort((a, b) => {
            return Utils_String.ignoreCaseComparer(a.name, b.name);
        });
    }

    private _refreshAgents(poolId: number) {
        let progressId = VSS.globalProgressIndicator.actionStarted("AgentStore.getStore for pool " + poolId, true);
        this._distributedTaskClient.getAgents(poolId).then((agents: DistributedTaskContracts.TaskAgent[]) => {
            VSS.globalProgressIndicator.actionCompleted(progressId);

            this._initializedAgentsForPools[poolId] = true;

            Build_Actions.agentsUpdated.invoke({
                agents: agents,
                poolId: poolId
            });
        }, (err: any) => {
            raiseTfsError(err);
            this._initializedAgentsForPools[poolId] = undefined;
            VSS.globalProgressIndicator.actionCompleted(progressId);
        });
    }

    private _updateAgents(agents: ITaskAgent[]) {
        for (let currentAgent of agents) {
            this._agents[currentAgent.agent.id] = currentAgent;
        }

        this.emitChanged();
    }
}
var _store: AgentsStore = null;

export function getStore(options?: IAgentsStoreOptions): AgentsStore {
    if (!_store) {
        _store = new AgentsStore(options);
    }

    return _store;
}