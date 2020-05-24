/// <reference types="react" />

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { EnvironmentCheckListActionsHub, IEnvironmentReferencePayload } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListActions";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentCheckListStore, IEnvironmentReference } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListStore";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";

export class EnvironmentCheckListActionCreator extends ActionBase.ActionCreatorBase {

    public initialize(instanceId?: string): void {
        this._environmentListActionsHub = ActionsHubManager.GetActionsHub<EnvironmentCheckListActionsHub>(EnvironmentCheckListActionsHub, instanceId);
    }

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_EnvironmentCheckListActionCreator;
    }

    public updateMasterCheckBoxStatus(newValue: boolean) {
        this._environmentListActionsHub.updateMasterCheckBoxStatus.invoke(newValue);
    }

    public updateEnvironmentStatus(environmentId: number, newValue: boolean): void {
        this._environmentListActionsHub.updateEnvironmentStatus.invoke({
            environmentId: environmentId,
            status: newValue
        } as IEnvironmentReferencePayload);
    }

    public updateEnvironments(environments: IEnvironmentReference[]): void {
        this._environmentListActionsHub.updateEnvironments.invoke(environments);
    }

    private _environmentListActionsHub: EnvironmentCheckListActionsHub;
}