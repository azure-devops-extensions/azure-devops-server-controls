import { jobRequestsUpdated } from "Build/Scripts/Actions/Actions";
import { getBuildsUpdatedActionHub } from "Build/Scripts/Actions/BuildsUpdated";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";

import { IBuildFilter } from "Build.Common/Scripts/ClientContracts";
import { BuildClientService } from "Build.Common/Scripts/ClientServices";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { TaskAgentJobRequest } from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";

import { VssConnection } from "VSS/Service";
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

export class BuildJobRequestsSource extends TfsService {
    private _buildService: BuildClientService;
    private _taskAgentClient: TaskAgentHttpClient;

    // agentId is unique across pools
    private _getOperationsByAgentId: IDictionaryNumberTo<boolean> = {};

    public initializeConnection(connection: VssConnection) {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClientService);
        this._taskAgentClient = this.getConnection().getHttpClient(TaskAgentHttpClient);
    }

    public getJobRequests(poolId: number, agentIds: number[]): void {
        let toRetrieve = (agentIds || []).filter((agentId) => {
            let exists = !!this._getOperationsByAgentId[agentId];
            if (!exists) {
                this._getOperationsByAgentId[agentId] = true;
            }
            return !exists;
        });

        if (toRetrieve.length > 0) {
            this._taskAgentClient.getAgentRequestsForAgents(poolId, toRetrieve, 10)
                .then((jobRequests) => {
                    toRetrieve.forEach((agentId) => {
                        delete this._getOperationsByAgentId[agentId];
                    });

                    // this is build, we only care about Build job requests. discard anything else
                    jobRequests = jobRequests.filter((jobRequest) => {
                        return Utils_String.equals(jobRequest.planType, "build", true);
                    });

                    if (jobRequests.length > 0) {
                        // get any builds associated with the requests
                        let buildIds = Utils_Array.unique(jobRequests.map((jobRequest) => {
                            return jobRequest.owner.id;
                        }));

                        let filter: IBuildFilter = {
                            buildIds: buildIds.join(",")
                        };

                        this._buildService.getBuilds(filter)
                            .then((result) => {
                                getBuildsUpdatedActionHub().buildsUpdated.invoke({
                                    builds: result.builds
                                });
                            }, raiseTfsError);

                        jobRequestsUpdated.invoke(jobRequests);
                    }
                }, (err) => {
                    toRetrieve.forEach((agentId) => {
                        delete this._getOperationsByAgentId[agentId];
                    });
                    raiseTfsError(err);
                });
        }
    }
}