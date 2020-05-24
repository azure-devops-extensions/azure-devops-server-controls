// Copyright (c) Microsoft Corporation.  All rights reserved.

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { GatesStore } from "PipelineWorkflow/Scripts/Editor/Environment/GatesStore";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { PostDeploymentGatesActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesActionsHub";

export class PostDeploymentGatesStore extends GatesStore {
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinePostDeploymentGatesStoreKey;
    }

    public initialize(instanceId: string): void {
        this.initializeActionsAndActionListeners(PostDeploymentGatesActionsHub, PostDeploymentGatesStore.getKey(), instanceId);
    }

    public updateVisitor(visitor: PipelineDefinitionEnvironment): void {
        if (visitor && this.getState()) {
            if (!visitor.postDeploymentGates) {
                visitor.postDeploymentGates = JQueryWrapper.extendDeep({}, null);
            }

            if (!visitor.postDeployApprovals) {
                visitor.postDeployApprovals = JQueryWrapper.extendDeep({}, null);
            }

            this.updateVisitorGatesData(visitor.postDeploymentGates, visitor.postDeployApprovals);
        }
    }
}