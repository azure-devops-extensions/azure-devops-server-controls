// Copyright (c) Microsoft Corporation.  All rights reserved.

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentGatesViewStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentGatesViewStore";
import { PreDeploymentGatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesStore";

export class PreDeploymentGatesViewStore extends EnvironmentGatesViewStore {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinePreDeploymentGatesViewStoreKey;
    }

    public initialize(instanceId: string): void {
        this.initializeDataStoreAndState(PreDeploymentGatesStore, instanceId);
    }
}