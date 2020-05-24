// Copyright (c) Microsoft Corporation.  All rights reserved.

import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { GatesActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/GatesActionCreator";
import { PostDeploymentGatesActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesActionsHub";
import { PostDeploymentGatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesStore";

export class PostDeploymentGatesActionCreator extends GatesActionCreator {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_PostDeploymentGatesActionCreator;
    }

    public initialize(instanceId: string): void {
        this.initializeActions(PostDeploymentGatesStore, PostDeploymentGatesActionsHub, instanceId);
    }
}