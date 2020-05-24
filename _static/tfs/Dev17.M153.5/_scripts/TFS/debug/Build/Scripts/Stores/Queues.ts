import { queuesRetrieved, QueuesRetrievedPayload } from "Build/Scripts/Actions/Actions";
import { StoreChangedEvents } from "Build/Scripts/Constants";
import { OneTimeActionCreator } from "Build/Scripts/OneTimeActionCreator";
import { QueryResult } from "Build/Scripts/QueryResult";
import { QueuesSource } from "Build/Scripts/Sources/Queues";

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import { TaskAgentQueue, TaskAgentQueueActionFilter } from "TFS/DistributedTask/Contracts";

import { Action } from "VSS/Flux/Action";

import { getCollectionService } from "VSS/Service";
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export interface IQueuesStoreOptions extends TFS_React.IStoreOptions {
    queuesSource?: QueuesSource;
}

export interface InitializeQueuesStorePayload {
    queues: QueuesRetrievedPayload[];
}
export var _initializeQueuesStore = new Action<InitializeQueuesStorePayload>();
export var initializeQueuesStore = new OneTimeActionCreator(_initializeQueuesStore);

export class QueuesStore extends TFS_React.Store {
    private _queuesSource: QueuesSource;
    private _queuesByPermission: IDictionaryNumberTo<QueryResult<TaskAgentQueue[]>> = {};
    private _queuesById: IDictionaryNumberTo<TaskAgentQueue> = {};

    constructor(options?: IQueuesStoreOptions) {
        super(StoreChangedEvents.QueuesStoreUpdated, options);

        this._queuesSource = (options && options.queuesSource) ? options.queuesSource : getCollectionService(QueuesSource);

        _initializeQueuesStore.addListener((payload: InitializeQueuesStorePayload) => {
            // clear
            this._queuesByPermission = {};
            this._queuesById = {};

            if (payload.queues) {
                payload.queues.forEach((queues) => {
                    this._storeQueues(queues.filter, queues.queues);
                });
            }
        });

        queuesRetrieved.addListener((payload) => {
            this._storeQueues(payload.filter, payload.queues);
        });
    }

    public getQueues(filter: TaskAgentQueueActionFilter): TaskAgentQueue[] {
        let queues: TaskAgentQueue[] = [];
        const queuesResult = this.getQueuesResult(filter);
        if (queuesResult.result) {
            queuesResult.result.sort((a, b) => {
                return Utils_String.ignoreCaseComparer(a.name, b.name);
            });

            queuesResult.result.forEach((queue) => {
                queues.push(queue);
            });
        }

        return queues;
    }

    public getQueuesResult(filter: TaskAgentQueueActionFilter): QueryResult<TaskAgentQueue[]> {
        let pendingResult = this._queuesByPermission[filter];

        if (!pendingResult) {
            pendingResult = {
                pending: true,
                result: []
            };

            this._queuesByPermission[filter] = pendingResult;

            // retrieve the queues lazily
            this._queuesSource.getQueues(filter);
        }

        // return a copy of the stored result. we don't want anything changing it.
        return {
            pending: pendingResult.pending,
            result: pendingResult.result.slice()
        };
    }

    public getQueue(queueId: number): TaskAgentQueue {
        return this._queuesById[queueId];
    }

    private _storeQueues(filter: TaskAgentQueueActionFilter, queues: TaskAgentQueue[]) {
        this._queuesByPermission[filter] = {
            pending: false,
            result: queues.sort((a, b) => {
                return Utils_String.ignoreCaseComparer(a.name, b.name);
            })
        }

        queues.forEach((queue) => {
            this._queuesById[queue.id] = queue;
        });

        this.emitChanged();
    }
}
var _queuesStore: QueuesStore = null;

export function getQueuesStore(options?: IQueuesStoreOptions): QueuesStore {
    if (!_queuesStore) {
        _queuesStore = new QueuesStore(options);
    }
    return _queuesStore;
}
