/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { ReleaseSummaryViewHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewHelper";
import { IReleaseSummaryArtifact } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseSummaryViewStore";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { IReleaseEnvironmentActionInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ArtifactNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/ArtifactNodeProvider";
import { EnvironmentDeploymentAttemptTimeline } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/EnvironmentDeploymentAttemptTimeline";
import { NowAtNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/NowAtNodeProvider";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import { TriggerDefinitionNodeProvider } from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/TriggerDefinitionNodeProvider";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

export class EnvironmentTimeline extends Base.Component<Types.IEnvironmentOverviewProps, Base.IStateless> {

    public render(): JSX.Element {

        const environment = this.props.environment;

        if (!environment) {
            return null;
        }

        // currently we are showing timeline only for latest deployment attempt
        let deploymentAttemptHelper: ReleaseDeploymentAttemptHelper = null;

        const deploySteps = environment.deploySteps;
        const latestDeployment = ReleaseDeploymentAttemptHelper.getLatestDeploymentAttempt(deploySteps);

        const artifactSummaryList: IReleaseSummaryArtifact[] = ReleaseSummaryViewHelper.getReleaseSummaryArtifacts(this.props.artifacts);

        let triggerDefinitionNodeProvider: TriggerDefinitionNodeProvider = null;

        if (latestDeployment) {
            deploymentAttemptHelper = ReleaseDeploymentAttemptHelper.createReleaseDeploymentAttemptHelper(environment, latestDeployment);
        }
        else {
            triggerDefinitionNodeProvider = this._getTriggerDefinitionNodeProvider(environment, this.props.deploymentActionsMap, artifactSummaryList, this.props.releaseReason);
        }

        // if environment has not been deployed yet, now at should be last node, artifact should be second last
        // if environment has been deployed, now at should be first node, artifact should be last
        const artifactNodeSnapshotMarkerDate = new Date(1800, 1, 1);
        const nowAtNodeSnapshotMarkerDate = deploymentAttemptHelper ? new Date() : new Date(1700, 1, 1);

        const artifactNodeProvider: ArtifactNodeProvider = this._getArtifactNodeProvider(artifactNodeSnapshotMarkerDate, artifactSummaryList, this.props.showCommitsDelegate, this.props.showWorkItemsDelegate);

        const nowAtNodeProvider: NowAtNodeProvider = this._getNowAtNodeProvider(
            nowAtNodeSnapshotMarkerDate,
            this.props.releaseId,
            this.props.releaseDefinitionId,
            this.props.environment.definitionEnvironmentId,
            this.props.nowAtReleaseId,
            this.props.nowAtReleaseName,
            this.props.nowAtReleaseError,
            this.props.isEnvironmentInEndState
        );

        return (
            <EnvironmentDeploymentAttemptTimeline
                instanceId={this.props.instanceId}
                deploymentAttemptHelper={deploymentAttemptHelper}
                deploymentActionsMap={this.props.deploymentActionsMap}
                nowAtNodeProvider={nowAtNodeProvider}
                artifactNodeProvider={artifactNodeProvider}
                triggerDefinitionNodeProvider={triggerDefinitionNodeProvider}
                environmentExecutionPolicy={this.props.environmentExecutionPolicy}
            />
        );
    }

    private _getNowAtNodeProvider(
        snapshotMarkerDate: Date,
        releaseId: number,
        releaseDefinitionId: number,
        environmentDefinitionId: number,
        nowAtReleaseId: number,
        nowAtReleaseName: string,
        nowAtReleaseError: string,
        isEnvironmentInEndState?: boolean
    ): NowAtNodeProvider {
        if (!(isEnvironmentInEndState &&
            releaseId && releaseId > 0
            && releaseDefinitionId && releaseDefinitionId > 0
            && environmentDefinitionId && environmentDefinitionId > 0
        )) {
            return null;
        }
        return new NowAtNodeProvider(snapshotMarkerDate, releaseId, releaseDefinitionId, environmentDefinitionId, nowAtReleaseId, nowAtReleaseName, nowAtReleaseError);
    }

    private _getArtifactNodeProvider(
        snapshotMarkerDate: Date,
        artifactSummaryList: IReleaseSummaryArtifact[],
        showCommitsDelegate: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void,
        showWorkItemsDelegate: (ev: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void
    ): ArtifactNodeProvider {
        if (!(artifactSummaryList && artifactSummaryList.length > 0)) {
            return null;
        }

        return new ArtifactNodeProvider(snapshotMarkerDate, artifactSummaryList, showCommitsDelegate, showWorkItemsDelegate);
    }

    private _getTriggerDefinitionNodeProvider(
        environment: RMContracts.ReleaseEnvironment,
        deploymentActionsMap: IDictionaryStringTo<IReleaseEnvironmentActionInfo>,
        artifactSummaryList: IReleaseSummaryArtifact[],
        releaseReason: RMContracts.ReleaseReason): TriggerDefinitionNodeProvider {
        return new TriggerDefinitionNodeProvider(environment, deploymentActionsMap, artifactSummaryList, releaseReason);
    }
}