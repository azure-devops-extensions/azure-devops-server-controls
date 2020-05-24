// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { TemplateActionsCreator } from "DistributedTaskControls/Actions/TemplateActionsCreator";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { SaveAsTemplateDialogActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/SaveAsTemplateDialogActionsHub";
import { EnvironmentTemplateSource } from "PipelineWorkflow/Scripts/Editor/Sources/EnvironmentTemplateSource";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as RMConstants from "ReleaseManagement/Core/Constants";
import * as Utils_String from "VSS/Utils/String";

import { serviceContext } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Context";

/**
 * Raises actions related to environment save as template
 */
export class SaveAsTemplateDialogActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_SaveAsTemplateDialogActionCreator;
    }

    public initialize(): void {
        this._saveAsTemplateDialogActionsHub = ActionsHubManager.GetActionsHub<SaveAsTemplateDialogActionsHub>(SaveAsTemplateDialogActionsHub);
    }

    /**
     * Change name in save as template dialog
     * @param name
     */
    public changeName(name: string) {
        this._saveAsTemplateDialogActionsHub.changeName.invoke(name);
    }

    /**
    * Change description in save as template dialog
    * @param description
    */
    public changeDescription(description: string) {
        this._saveAsTemplateDialogActionsHub.changeDescription.invoke(description);
    }

    /**
    * Save as template on create click
    * @param description
    */
    public onCreateClick(name: string, description: string, environment: PipelineDefinitionEnvironment) {
        let template = {
            name: name,
            description: description,
            environment: SaveAsTemplateDialogActionCreator._getNormalizedEnvironment(environment)
        } as RMContracts.ReleaseDefinitionEnvironmentTemplate;

        EnvironmentTemplateSource.instance().saveEnvironmentAsTemplate(template).then(() => {
            ActionCreatorManager.GetActionCreator<TemplateActionsCreator>(TemplateActionsCreator).updateTemplateList(EnvironmentTemplateSource.instance(), true, true);
            this._saveAsTemplateDialogActionsHub.onSaveCompletion.invoke(null);
        }, (error) => {
            this._saveAsTemplateDialogActionsHub.showErrorMessage.invoke(error.message);
        });
    }

    /**
    * Hide dialog on cancel click
    * @param description
    */
    public onCancelClick() {
        this._saveAsTemplateDialogActionsHub.onCancelClick.invoke(null);
    }

    public onDismissErrorMessage() {
        this._saveAsTemplateDialogActionsHub.onDismissErrorMessage.invoke(null);
    }

    public showDialog() {
        this._saveAsTemplateDialogActionsHub.showDialog.invoke(null);
    }

    private static _getNormalizedEnvironment(environment: PipelineDefinitionEnvironment): PipelineDefinitionEnvironment {
        let clonedEnvironment: PipelineDefinitionEnvironment = JQueryWrapper.extendDeep({}, environment);
        if (clonedEnvironment && clonedEnvironment.deployPhases) {
            clonedEnvironment.deployPhases.forEach((phase: RMContracts.DeployPhase) => {
                if (phase.phaseType === RMContracts.DeployPhaseTypes.AgentBasedDeployment) {
                    let deploymentInput: RMContracts.AgentDeploymentInput = (phase as RMContracts.AgentBasedDeployPhase).deploymentInput;
                    SaveAsTemplateDialogActionCreator._normalizeArtifactsDownloadInput(deploymentInput);
                }
                else {
                    let deploymentInput: RMContracts.MachineGroupDeploymentInput = (phase as RMContracts.MachineGroupBasedDeployPhase).deploymentInput;
                    SaveAsTemplateDialogActionCreator._normalizeArtifactsDownloadInput(deploymentInput);
                }
            });
        }

        return clonedEnvironment;
    }

    private static _normalizeArtifactsDownloadInput(deploymentInput: RMContracts.DeploymentInput): RMContracts.DeploymentInput {
        if (deploymentInput 
            && deploymentInput.artifactsDownloadInput 
            && deploymentInput.artifactsDownloadInput.downloadInputs
            && deploymentInput.artifactsDownloadInput.downloadInputs.length > 0) {
                
            let skipArtifactsDownload = true;

            deploymentInput.artifactsDownloadInput.downloadInputs.forEach((input: RMContracts.ArtifactDownloadInputBase) => {
                if (!Utils_String.equals(input.artifactDownloadMode, RMConstants.ArtifactDownloadInputConstants.Skip, true)) {
                    skipArtifactsDownload = false;
                }
            });

            deploymentInput.skipArtifactsDownload = skipArtifactsDownload;
        }

        deploymentInput.artifactsDownloadInput = null;
        return deploymentInput;
    }
    
    private _saveAsTemplateDialogActionsHub: SaveAsTemplateDialogActionsHub;
}


