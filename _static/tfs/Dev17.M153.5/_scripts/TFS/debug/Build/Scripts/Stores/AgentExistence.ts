import Build_Actions = require("Build/Scripts/Actions/Actions");
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import * as AgentPoolsStore from "Build/Scripts/Stores/AgentPools";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import {TaskAgentHttpClient} from "TFS/DistributedTask/TaskAgentRestClient";

import {Application} from "Presentation/Scripts/TFS/TFS.OM.Common";

import {Action} from "VSS/Flux/Action";
import {Store} from "VSS/Flux/Store";

import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export interface InitializeAgentExistenceStorePayload {
    agents: DistributedTaskContracts.TaskAgent[];
}

var initializeAgentExistenceStore = new Action<InitializeAgentExistenceStorePayload>();

export interface IAgentExistenceStoreOptions {
    taskAgentClient?: TaskAgentHttpClient;
    agentPoolsStore?: AgentPoolsStore.AgentPoolStore;
}

export interface IAgentExistenceStoreInitialized {
    initialized: boolean;
}

export interface IAgents extends IAgentExistenceStoreInitialized {
    exists: boolean;
}

export class AgentExistenceStore extends Store {
    private _agents: IDictionaryNumberTo<DistributedTaskContracts.TaskAgent> = {};
    private _hasAgents: boolean = false;
    private _initialized: boolean = false;

    private _agentPoolStore: AgentPoolsStore.AgentPoolStore;
    private _distributedTaskClient: TaskAgentHttpClient;

    constructor(options?: IAgentExistenceStoreOptions) {
        super();

        this._agentPoolStore = (options && options.agentPoolsStore) ? options.agentPoolsStore : AgentPoolsStore.getStore(null);
        this._distributedTaskClient = (options && options.taskAgentClient) ? options.taskAgentClient : Application.getDefaultConnection().getHttpClient(TaskAgentHttpClient);

        this._agentPoolStore.addChangedListener(() => {
            let pools = this._agentPoolStore.getPools();

            // agentpoolstore initiates getPools on store creation, so we should hit here
            // when pools are updated, we decide whether we need to refresh agents and then intiialize or
            // just initialize if there are no pools (or user has no permissions to view any of them)
            // this way, we would be avoiding ugly "flash" in the UI (to begin with there will be no pools, so we need to wait for pools to get updated)
            if (pools.length > 0) {
                this._initialize();
            }
            else {
                this._initialized = true;
                this.emitChanged();
            }

        });

        initializeAgentExistenceStore.addListener((payload: InitializeAgentExistenceStorePayload) => {
            this._initialized = true;
            this._updateAgents(payload.agents);
        });

        Build_Actions.agentsUpdated.addListener((payload: Build_Actions.AgentsForPoolUpdatedPayload) => {
            this._updateAgents(payload.agents);
        });

        Build_Actions.agentDeleted.addListener((agentId: number) => {
            delete this._agents[agentId];
            if (this.getAgents().length == 0) {
                this._hasAgents = false;
            }
            this.emitChanged();
        });
    }

    public getAgents(): DistributedTaskContracts.TaskAgent[] {
        let agents: DistributedTaskContracts.TaskAgent[] = [];
        $.each(this._agents, (id: number, agent: DistributedTaskContracts.TaskAgent) => {
            agents.push(agent);
        });
        return agents;
    }

    public agents(): IAgents {
        return {
            exists: this._hasAgents,
            initialized: this._initialized
        };
    }

    private _initialize() {
        if (!this._initialized || !this._hasAgents) {
            let pools = this._agentPoolStore.getPools();
            this._refreshAgents(pools);
        }
    }

    private _refreshAgents(pools: DistributedTaskContracts.TaskAgentPool[]) {
        pools.every((pool, index) => {
            if (this._hasAgents) {
                // we stop if we find agents
                return false;
            }
            let progressId = VSS.globalProgressIndicator.actionStarted("AgentStore.getStore for pool " + pool.id, true);
            this._distributedTaskClient.getAgents(pool.id).then((agents: DistributedTaskContracts.TaskAgent[]) => {
                VSS.globalProgressIndicator.actionCompleted(progressId);
                // initialize if agents are found or this is the last call ( which handles no agents in all pools case )
                if ((agents && agents.length > 0) || index === pools.length - 1) {
                    initializeAgentExistenceStore.invoke({
                        agents: agents
                    });
                }
            }, (err: any) => {
                raiseTfsError(err);
                VSS.globalProgressIndicator.actionCompleted(progressId);
                initializeAgentExistenceStore.invoke({
                    agents: []
                });
            });
            return true;
        });
    }

    private _updateAgents(agents: DistributedTaskContracts.TaskAgent[]) {
        for (let currentAgent of agents) {
            this._agents[currentAgent.id] = currentAgent;
            this._hasAgents = true;
        }

        this.emitChanged();
    }
}
var _store: AgentExistenceStore = null;

export function getStore(options?: IAgentExistenceStoreOptions): AgentExistenceStore {
    if (!_store) {
        _store = new AgentExistenceStore(options);
    }

    return _store;
}