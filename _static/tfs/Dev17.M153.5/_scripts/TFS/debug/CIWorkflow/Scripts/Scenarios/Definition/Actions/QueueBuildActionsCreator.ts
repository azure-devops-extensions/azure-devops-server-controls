import {BuildLinks} from "Build.Common/Scripts/Linking";

import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/QueueBuildActions";
import { QueueBuildValidationResultHelper } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/QueueBuildValidationResultHelper";
import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { BuildDefinitionSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource";
import { BuildSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildSource";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { Build, BuildDefinition, BuildReason, BuildRequestValidationResult } from "TFS/Build/Contracts";

export class QueueBuildActionsCreator extends ActionsBase.ActionCreatorBase {
    private _actions: Actions.QueueBuildActions;

    public static getKey(): string {
        return ActionCreatorKeys.QueueBuild_ActionCreator;
    }

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<Actions.QueueBuildActions>(Actions.QueueBuildActions);
    }

    public updateTaskAgentQueue(agentQueueId: number): void {
        this._actions.updateAgentQueue.invoke(agentQueueId);
    }

    public updateSourceBranch(sourceBranch: string): void {
        this._actions.updateSourceBranch.invoke(sourceBranch);
    }

    public updateSourceVersion(sourceVersion: string): void {
        this._actions.updateSourceVersion.invoke(sourceVersion);
    }

    public updateSaveComment(saveComment: string): void {
        this._actions.updateSaveComment.invoke(saveComment);
    }

    public dismissSuccessMessage(): void {
        this._actions.dismissSuccessMessage.invoke(null);
    }

    public saveAndQueueBuild(payload: Actions.IQueueBuildPayload): IPromise<void> {
        if (payload.enableSaveBeforeQueue) {
            this._actions.saveBuildDefinition.invoke(null);
            let savePromise = BuildDefinitionSource.instance().save(payload.definition, payload.cloneId, payload.cloneRevision);
            return savePromise.then( 
                (buildDefinition: BuildDefinition) => { 
                    this._actions.buildDefinitionSaved.invoke(buildDefinition);
                    if (payload.onBuildSaved) {
                        payload.onBuildSaved(buildDefinition);
                    }
                    payload.definition = buildDefinition;
                    payload.definitionId = buildDefinition.id;
                    return this._queueBuild(payload); 
                },
                (error) => {
                    let errorMessage = error && error.message ? error.message : error;
                    this._actions.buildDefinitionSaveFailed.invoke(errorMessage);
                    throw error;
                }
            );
        } 
        else {
            return this._queueBuild(payload);
        }     
    }
    
    private _queueBuild(payload: Actions.IQueueBuildPayload): IPromise<void> {
        let build: Build = {
            queue: {
                id: payload.agentQueueId
            },
            definition: {
                id: payload.definitionId
            },
            project: {
                id: payload.projectId
            },
            sourceBranch: payload.sourceBranch,
            sourceVersion: payload.sourceVersion,
            reason: BuildReason.Manual,
            demands: payload.demands,
            parameters: payload.parameters
        } as Build;

        this._actions.queueBuild.invoke(payload);

        return BuildSource.instance().queueBuild(build, payload.ignoreWarnings).then(
            (build: Build) => {
                this._actions.buildQueued.invoke({
                    build: build
                });

                let webLink = BuildLinks.getBuildDetailLink(build.id);
                if (webLink && payload.onSuccess) {
                    payload.onSuccess(webLink, build.buildNumber, build);
                }
            },
            (validationResults: BuildRequestValidationResult[]) => {
                let errorAndWarningMessage = QueueBuildValidationResultHelper.getErrorAndWarningMessage(validationResults);
                this._actions.buildQueued.invoke({
                    build: null,
                    error: errorAndWarningMessage.errorMessage,
                    warning: errorAndWarningMessage.warningMessage
                });
                throw validationResults;
            });
    }
}
