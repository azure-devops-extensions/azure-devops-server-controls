// Copyright (c) Microsoft Corporation.  All rights reserved.

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { GatesActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/GatesActionCreator";
import { PreDeploymentGatesActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesActionsHub";
import { PreDeploymentGatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesStore";

export class PreDeploymentGatesActionCreator extends GatesActionCreator {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_PreDeploymentGatesActionCreator;
    }

    public initialize(instanceId: string): void {
        this.initializeActions(PreDeploymentGatesStore, PreDeploymentGatesActionsHub, instanceId);
    }
}