
import * as Q from "q";

import { Initializable as IInitializable } from "DistributedTaskControls/Common/Factory";
import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");

import { VstsAadAuthorizerService } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.WebApiServices";

import { VssConnection } from "VSS/Service";
import * as Context from "VSS/Context";

export class VstsAadAuthorizerServiceClient implements IInitializable {

    public static getKey(): string {
        return "SERVICE_CLIENT_KEY_VSTS_AAD_AUTHORIZER_SERVICE_CLIENT";
    }

    public initialize(instanceId?: string): void {
        let webContext = Context.getDefaultWebContext();
        let connection = new VssConnection(webContext);
        this._service = connection.getService<VstsAadAuthorizerService>(VstsAadAuthorizerService);
    }

    public authorize(tenantId: string, redirectUri: string, aadLoginOption: DistributedTaskContracts.AadLoginPromptOption = DistributedTaskContracts.AadLoginPromptOption.FreshLogin): IPromise<string> {
        return this._service.authorize(tenantId, redirectUri, aadLoginOption);
    }

    private _service: VstsAadAuthorizerService;
}