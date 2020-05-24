// Copyright (c) Microsoft Corporation.  All rights reserved.
import * as Q from "q";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { PullRequestTriggerActions } from "PipelineWorkflow/Scripts/Editor/Artifact/PullRequestTriggerActions";
import { VSTSBuildArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/VSTSBuildArtifactSource";
import { WellKnownRepositoryTypes } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { WellKnownPullRequestVariables } from "ReleaseManagement/Core/Constants";
import {
    CodeRepositoryReference,
    PullRequestFilter,
    PullRequestSystemType,
    PullRequestTrigger,
} from "ReleaseManagement/Core/Contracts";
import { BuildDefinition } from "TFS/Build/Contracts";

/**
 * Raises actions related to definition schedule trigger
 */
export class PullRequestTriggerActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_PullRequestTriggerActionCreator;
    }

    public initialize(instanceId: string): void {
        this._pullRequestTriggerActionsHub = ActionsHubManager.GetActionsHub<PullRequestTriggerActions>(PullRequestTriggerActions, instanceId);
    }

    public toggleChanged(checked: boolean) {
        this._pullRequestTriggerActionsHub.toggleChanged.invoke(checked);
    }

    public updateTrigger(trigger: PullRequestTrigger) {
        this._pullRequestTriggerActionsHub.updateTrigger.invoke(trigger);
    }

    public addFilter(): void {
        this._pullRequestTriggerActionsHub.addFilter.invoke(null);
    }

    public deleteFilter(index: number): void {
        this._pullRequestTriggerActionsHub.deleteFilter.invoke(index);
    }

    public changeFilter(index: number, filter: PullRequestFilter): void {
        this._pullRequestTriggerActionsHub.changeFilter.invoke({
            index: index,
            filter: filter
        });
    }

    public updateCodeRepositoryReference(codeRepoRef: CodeRepositoryReference): void{
        this._pullRequestTriggerActionsHub.updateCodeRepositoryReference.invoke(codeRepoRef);
    }

    public initializeBuildProperties(projectId: string, buildDefinitionId: number): void{
        let buildDefinitionPromise = VSTSBuildArtifactSource.instance().getBuildDefinition(buildDefinitionId, projectId);
        let tagsPromise = VSTSBuildArtifactSource.instance().getProjectTags(projectId);

        Q.all([buildDefinitionPromise, tagsPromise]).spread((buildDefinition: BuildDefinition, tags: string[]) => {
            let repoType = this._getSystemType(buildDefinition.repository.type);
            let codeRepoRef: CodeRepositoryReference = null;

            if (repoType === PullRequestSystemType.TfsGit) {
                codeRepoRef = {
                    systemType: this._getSystemType(buildDefinition.repository.type),
                    repositoryReference: {
                        [WellKnownPullRequestVariables.TfsGitRepositoryId]: {
                            value: buildDefinition.repository.id,
                            displayValue: buildDefinition.repository.name,
                            data: null
                        },
                        [WellKnownPullRequestVariables.TfsGitProjectId]: {
                            value: buildDefinition.project.id,
                            displayValue: buildDefinition.project.name,
                            data: null
                        }
                    }
                };
            } 
            else if (repoType === PullRequestSystemType.GitHub) {
                let splittedUrl = buildDefinition.repository.properties[this._buildRepositoryApiUrl].split("/");
                let repoName = splittedUrl.splice(splittedUrl.length - 2, 2).join("/");
                codeRepoRef = {
                    systemType: this._getSystemType(buildDefinition.repository.type),
                    repositoryReference: {
                        [WellKnownPullRequestVariables.GitHubRepositoryName]: {
                            value: repoName,
                            displayValue: repoName,
                            data: null
                        },
                        [WellKnownPullRequestVariables.GitHubConnection]: {
                            value: buildDefinition.repository.properties[this._buildRepositoryConnectedServiceId],
                            displayValue: buildDefinition.repository.properties[this._buildRepositoryConnectedServiceId],
                            data: null
                        }
                    }
                };
            } 
            else {
                return;
            }

            this._pullRequestTriggerActionsHub.updatePullRequestTriggerSupported.invoke(true);
            this._pullRequestTriggerActionsHub.initializeBuildProperties.invoke({
                buildDefinition: buildDefinition,
                allTags: tags,
                codeRepositoryReference: codeRepoRef
            });
        });
    }

    public initializeTfsGitProperties(): void {
        this._pullRequestTriggerActionsHub.updateCodeRepositoryReference.invoke({
            systemType: PullRequestSystemType.TfsGit,
            repositoryReference: null
        });
        this._pullRequestTriggerActionsHub.updatePullRequestTriggerSupported.invoke(true);
        this._pullRequestTriggerActionsHub.updateUseArtifactReference.invoke(true);
    }

    private _getSystemType(repoType: string) {
        switch (repoType) {
            case WellKnownRepositoryTypes.GitHub:
                return PullRequestSystemType.GitHub;
            case WellKnownRepositoryTypes.TfsGit:
                return PullRequestSystemType.TfsGit;
            default:
                return PullRequestSystemType.None;
        }
    }

    private _buildRepositoryConnectedServiceId: string = "connectedServiceId";
    private _buildRepositoryApiUrl: string = "apiUrl";
    private _pullRequestTriggerActionsHub: PullRequestTriggerActions;
}