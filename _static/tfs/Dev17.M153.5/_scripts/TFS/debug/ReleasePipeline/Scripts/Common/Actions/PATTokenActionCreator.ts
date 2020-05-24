// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as Events_Services from "VSS/Events/Services";
import * as Context from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Context";
import * as PATTokenActions from "ReleasePipeline/Scripts/Common/Actions/PATTokenActions";
import * as DGUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";

export class PATTokenActionCreator {
    public createDeploymentGroupPersonalAccessToken(deploymentGroupId: number) {
        Context.serviceContext.machineGroupManager().beginCreatePersonalAccessTokenForMachineGroup(deploymentGroupId)
            .then((token: any) => {
                PATTokenActions.patTokenCreated.invoke(token.value);
            }, (error) => {
                Events_Services.getService().fire(DGUtils.AddTargetGuidanceErrorActions.UpdatePATTokenErrorMessage, this, error);
            });
    }

    public createDeploymentPoolPersonalAccessToken(deploymentPoolId: number) {
        Context.serviceContext.agentPoolManager().beginCreatePersonalAccessTokenForDeploymentPool(deploymentPoolId)
            .then((token: any) => {
                PATTokenActions.patTokenCreated.invoke(token.value);
            }, (error) => {
                Events_Services.getService().fire(DGUtils.AddTargetGuidanceErrorActions.UpdatePATTokenErrorMessage, this, error);
            });
    }
}

export var ActionCreator = new PATTokenActionCreator();