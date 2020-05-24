/// <reference types="react" />

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { RetentionPolicyActionsHub } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyActions";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

import RMContracts = require("ReleaseManagement/Core/Contracts");

export class RetentionPolicyActionsCreator extends ActionBase.ActionCreatorBase {

    public initialize(instanceId?: string): void {
        this._retentionPolicyActionsHub = ActionsHubManager.GetActionsHub<RetentionPolicyActionsHub>(RetentionPolicyActionsHub, instanceId);
    }

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_RetentionPolicyActionCreator;
    }

    public updateDaysToKeep(newValue: string) {
        this._retentionPolicyActionsHub.updateDaysToKeepAction.invoke(newValue);
    }

    public updateReleasesToKeep(newValue: string) {
        this._retentionPolicyActionsHub.updateReleasesToKeepAction.invoke(newValue);
    }

    public updateRetainBuild(newValue: boolean) {
        this._retentionPolicyActionsHub.updateRetainBuildAction.invoke(newValue);
    }

    public updateRetentionPolicy(retentionPolicy: RMContracts.EnvironmentRetentionPolicy) {
        this._retentionPolicyActionsHub.updateRetentionPolicy.invoke(retentionPolicy);
    }

    private _retentionPolicyActionsHub: RetentionPolicyActionsHub;
}
