import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import * as Q from "q";

import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { PipelineDeploymentAuthorizationInfo } from "PipelineWorkflow/Scripts/Common/Types";
import { VstsAadAuthorizerServiceClient } from "PipelineWorkflow/Scripts/Editor/Service/VstsAadAuthorizerServiceClient";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import { AadLoginPromptOption } from "TFS/DistributedTask/Contracts";

import * as VssContext from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";

export class AadAuthorizerSource extends SourceBase {

    constructor() {
        super();
        this._authorizerClient = ServiceClientManager.GetServiceClient<VstsAadAuthorizerServiceClient>(VstsAadAuthorizerServiceClient);
    }

    public static getKey(): string {
        return "AadAuthorizerSource";
    }

    public static instance(): AadAuthorizerSource {
        return SourceManager.getSource(AadAuthorizerSource);
    }

    public authorize(authInfo: PipelineDeploymentAuthorizationInfo): IPromise<PipelineDeploymentAuthorizationInfo> {
        let context = VssContext.getDefaultWebContext();
        let uri = context.collection.uri; // This ends with a /, so no need to append one more
        let projectId = context.project.id;
        let redirectUri = `${uri}${projectId}/_admin/_services/completecallback`;
        let tenantId = authInfo ? authInfo.tenantId : Utils_String.empty;

        let aadLoginPromptOption = AadLoginPromptOption.FreshLogin;

        if (FeatureFlagUtils.isDistributedTaskRevalidateIdentityFeatureEnabled()) {
            aadLoginPromptOption = AadLoginPromptOption.FreshLoginWithMfa;
        }

        return this._authorizerClient.authorize(tenantId, redirectUri, aadLoginPromptOption).then((accessTokenKey: string) => {
            authInfo.vstsAccessTokenKey = accessTokenKey;
            return Q.resolve(authInfo);
        });
    }

    private _authorizerClient: VstsAadAuthorizerServiceClient;
}
