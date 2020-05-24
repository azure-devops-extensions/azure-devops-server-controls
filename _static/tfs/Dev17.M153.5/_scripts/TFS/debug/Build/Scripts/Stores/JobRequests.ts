import {jobRequestsUpdated} from "Build/Scripts/Actions/Actions";
import {BuildJobRequestsSource} from "Build/Scripts/Sources/BuildJobRequests";

import {TaskAgentJobRequest} from "TFS/DistributedTask/Contracts";

import {Store} from "VSS/Flux/Store";

import {getCollectionService} from "VSS/Service";

export interface IJobRequestsStoreOptions {
}

export class JobRequestsStore extends Store {
    private _jobRequestsSource: BuildJobRequestsSource;

    // agentId should be unique across multiple pools
    private _agentIdToJobRequests: IDictionaryNumberTo<TaskAgentJobRequest[]> = {};

    constructor(options?: IJobRequestsStoreOptions) {
        super();

        this._jobRequestsSource = getCollectionService(BuildJobRequestsSource);

        jobRequestsUpdated.addListener((payload) => {
            this._updateJobRequests(payload);
        });
    }

    public getBuildIds(poolId: number, agentIds: number[]): number[] {
        let buildIds: number[] = [];

        (agentIds || []).forEach((agentId) => {
            if (this._agentIdToJobRequests[agentId]) {
                buildIds = buildIds.concat(this._agentIdToJobRequests[agentId].map((request) => {
                    return request.owner.id;
                }));
            }
        });

        return buildIds;
    }

    private _updateJobRequests(jobRequests: TaskAgentJobRequest[]) {
        (jobRequests || []).forEach((request) => {
            if (request.reservedAgent) {
                this._agentIdToJobRequests[request.reservedAgent.id] = this._agentIdToJobRequests[request.reservedAgent.id] || [];
                this._agentIdToJobRequests[request.reservedAgent.id].push(request);
            }
        });

        if (jobRequests.length > 0) {
            this.emitChanged();
        }
    }
}

var _store: JobRequestsStore = null;

export function getStore(options?: IJobRequestsStoreOptions): JobRequestsStore {
    if (!_store) {
        _store = new JobRequestsStore(options);
    }

    return _store;
}