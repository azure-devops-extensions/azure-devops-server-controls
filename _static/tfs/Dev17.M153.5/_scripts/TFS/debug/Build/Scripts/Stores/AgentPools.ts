import Build_Actions = require("Build/Scripts/Actions/Actions");
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { loadSignalR } from "Build/Scripts/SignalR";
import DistributedTaskRealtime = require("Build/Scripts/TFS.DistributedTask.AgentPool.Realtime");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";

import { Application } from "Presentation/Scripts/TFS/TFS.OM.Common";

import { Action } from "VSS/Flux/Action";
import { Store } from "VSS/Flux/Store";

import Utils_Core = require("VSS/Utils/Core");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export interface IAgentPoolStoreOptions {
    taskAgentClient?: TaskAgentHttpClient;
}

export class AgentPoolStore extends Store {
    private _pools: IDictionaryNumberTo<DistributedTaskContracts.TaskAgentPool> = {};
    private _distributedTaskhub: DistributedTaskRealtime.TaskAgentPoolHub | undefined;

    constructor(options?: IAgentPoolStoreOptions) {
        super();

        loadSignalR().then(() => {
            this._distributedTaskhub = new DistributedTaskRealtime.TaskAgentPoolHub(null);
        });

        Build_Actions.poolsUpdated.addListener((payload) => {
            this._updatePools(payload);
        });
    }

    public getPools(): DistributedTaskContracts.TaskAgentPool[] {
        let agentPools: DistributedTaskContracts.TaskAgentPool[] = [];
        $.each(this._pools, (id: number, pool: DistributedTaskContracts.TaskAgentPool) => {
            agentPools.push(pool);
        });
        return agentPools.sort((a, b) => {
            return Utils_String.ignoreCaseComparer(a.name, b.name);
        });
    }

    private _updatePools(pools: DistributedTaskContracts.TaskAgentPool[]) {
        let poolCount = 0;
        for (let currentPool of pools) {
            this._pools[currentPool.id] = currentPool;
            poolCount++;
            // we are subscribing to all pools, delay them to spread the signalr load
            // hub handles duplicate calls if any
            // let's stop subscribing to more than 10 pools max, this is to prevent unintendend performance issues
            // ideally we should subscribe to all pools at one go
            if (this._distributedTaskhub && poolCount <= 10) {
                Utils_Core.delay(this, 3000, () => {
                    this._distributedTaskhub.subscribe(currentPool.id, false);
                });
            }

        }

        this.emitChanged();
    }
}
var _store: AgentPoolStore = null;

export function getStore(options?: IAgentPoolStoreOptions): AgentPoolStore {
    if (!_store) {
        _store = new AgentPoolStore(options);

        let progressId = VSS.globalProgressIndicator.actionStarted("AgentPool.getStore", true);
        let distributedTaskClient = (options && options.taskAgentClient) ? options.taskAgentClient : Application.getDefaultConnection().getHttpClient(TaskAgentHttpClient);

        distributedTaskClient.getAgentPools().then((pools: DistributedTaskContracts.TaskAgentPool[]) => {
            VSS.globalProgressIndicator.actionCompleted(progressId);
            Build_Actions.poolsUpdated.invoke(pools);
        }, (err: any) => {
            raiseTfsError(err);
            VSS.globalProgressIndicator.actionCompleted(progressId);
            Build_Actions.poolsUpdated.invoke([]);
        });
    }

    return _store;
}