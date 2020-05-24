import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { PlanGroupStatus, TaskOrchestrationQueuedPlanGroup } from "TFS/DistributedTask/Contracts";
import { TaskHttpClient } from "TFS/DistributedTask/TaskRestClient";

import PlatformContracts = require("VSS/Common/Contracts/Platform");
import VSSContext = require("VSS/Context");
import Service = require("VSS/Service");


export class PlanGroupsSource extends SourceBase {

    constructor() {
        super();
        this._taskHttpClient = this._getTaskHttpClient();
    }

    public static getKey(): string {
        return "PlanGroupsSource";
    }

    public static instance(): PlanGroupsSource {
        return SourceManager.getSource(PlanGroupsSource);
    }

    public getQueuedPlanGroups(hubName: string, status: PlanGroupStatus): IPromise<TaskOrchestrationQueuedPlanGroup[]> {
        return this._taskHttpClient.getQueuedPlanGroups(null, hubName, status);
    }

    private _getTaskHttpClient(): TaskHttpClient {
        let webContext: PlatformContracts.WebContext = VSSContext.getDefaultWebContext();
        let vssConnection: Service.VssConnection = new Service.VssConnection(webContext, PlatformContracts.ContextHostType.ProjectCollection);
        return vssConnection.getHttpClient<TaskHttpClient>(TaskHttpClient);
    }

    private _taskHttpClient: TaskHttpClient;
}
