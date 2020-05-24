// Copyright (c) Microsoft Corporation.  All rights reserved.

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentGatesViewStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentGatesViewStore";
import { PostDeploymentGatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesStore";

export class PostDeploymentGatesViewStore extends EnvironmentGatesViewStore {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinePostDeploymentGatesViewStoreKey;
    }

    public initialize(instanceId: string): void {
        this.initializeDataStoreAndState(PostDeploymentGatesStore, instanceId);
    }
}