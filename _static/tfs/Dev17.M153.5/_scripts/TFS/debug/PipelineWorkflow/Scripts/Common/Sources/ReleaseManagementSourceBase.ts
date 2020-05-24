import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";

import { DeployServiceClient } from "PipelineWorkflow/Scripts/ServiceClients/DeployServiceClient";
import { IDeployServiceClient } from "PipelineWorkflow/Scripts/ServiceClients/IDeployServiceClient";

export abstract class ReleaseManagementSourceBase extends SourceBase {

    constructor() {
        super();
        this._deployPipelineClient = ServiceClientManager.GetServiceClient<DeployServiceClient>(DeployServiceClient);
    }

    protected getClient(): IDeployServiceClient {
        return this._deployPipelineClient;
    }

    private _deployPipelineClient: DeployServiceClient;
}
