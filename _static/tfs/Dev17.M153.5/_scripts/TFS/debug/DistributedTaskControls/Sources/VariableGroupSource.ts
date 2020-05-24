import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import * as Contracts from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";

import * as VSSContext from "VSS/Context";
import { getCollectionClient } from "VSS/Service";

export class VariableGroupSource extends SourceBase {

    constructor() {
        super();
        this._dtAgentClient = getCollectionClient(TaskAgentHttpClient);
    }

    public static getKey(): string {
        return "VariableGroupSource";
    }

    public beginGetVariableGroups(groupName?: string, actionFilter?: Contracts.VariableGroupActionFilter): IPromise<Contracts.VariableGroup[]> {
        let projectId: string = VSSContext.getDefaultWebContext().project.id;
        return this._dtAgentClient.getVariableGroups(projectId, groupName, actionFilter);
    }

    public beginGetVariableGroupsByIds(groupIds: number[]): IPromise<Contracts.VariableGroup[]> {
        let projectId: string = VSSContext.getDefaultWebContext().project.id;
        return this._dtAgentClient.getVariableGroupsById(projectId, groupIds);
    }

    public static instance(): VariableGroupSource {
        return SourceManager.getSource(VariableGroupSource);
    }

    private _dtAgentClient: TaskAgentHttpClient;
}