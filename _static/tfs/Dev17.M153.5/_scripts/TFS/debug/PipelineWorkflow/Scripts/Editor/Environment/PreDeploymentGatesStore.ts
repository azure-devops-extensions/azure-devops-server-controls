// Copyright (c) Microsoft Corporation.  All rights reserved.

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { GatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/GatesStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { PreDeploymentGatesActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesActionsHub";

export class PreDeploymentGatesStore extends GatesStore {
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinePreDeploymentGatesStoreKey;
    }

    public initialize(instanceId: string): void {
        this.initializeActionsAndActionListeners(PreDeploymentGatesActionsHub, PreDeploymentGatesStore.getKey(), instanceId);
    }

    public updateVisitor(visitor: PipelineDefinitionEnvironment): void {
        if (visitor && this.getState()) {
            if (!visitor.preDeploymentGates) {
                visitor.preDeploymentGates = JQueryWrapper.extendDeep({}, null);
            }

            if (!visitor.preDeployApprovals) {
                visitor.preDeployApprovals = JQueryWrapper.extendDeep({}, null);
            }

            this.updateVisitorGatesData(visitor.preDeploymentGates, visitor.preDeployApprovals);
        }
    }
}