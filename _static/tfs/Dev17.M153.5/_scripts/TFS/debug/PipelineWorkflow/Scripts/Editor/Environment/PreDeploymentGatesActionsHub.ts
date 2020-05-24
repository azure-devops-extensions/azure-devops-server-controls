// Copyright (c) Microsoft Corporation.  All rights reserved.

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { GatesActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/GatesActionsHub";

export class PreDeploymentGatesActionsHub extends GatesActionsHub {
    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_PreDeploymentGatesActionHub;
    }
}