
import { Initializable as IInitializable } from "DistributedTaskControls/Common/Factory";

import { GraphService } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.WebApiServices";

import { GraphGroup, GraphUser, GraphStorageKeyResult } from "VSS/Graph/Contracts";
import { VssConnection } from "VSS/Service";

import * as Context from "VSS/Context";

export class GraphServiceClient implements IInitializable {

    public static getKey(): string {
        return "SERVICE_CLIENT_KEY_GRAPH_SERVICE_CLIENT";
    }

    public initialize(instanceId?: string): void {
        let webContext = Context.getDefaultWebContext();
        let connection = new VssConnection(webContext);
        this._service = connection.getService<GraphService>(GraphService);
    }

    public beginCreateGroup(originId: string): IPromise<GraphGroup> {
        return this._service.beginCreateGroup(originId);
    }

    public beginCreateUser(originId: string): IPromise<GraphUser> {
        return this._service.beginCreateUser(originId);
    }

    public beginGetStorageKey(descriptor: string): IPromise<GraphStorageKeyResult> {
        return this._service.beginGetStorageKey(descriptor);
    }

    private _service: GraphService;
}