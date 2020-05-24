import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { InnerFocusZone } from "DistributedTaskControls/Components/InnerFocusZone";
import { Item } from "DistributedTaskControls/Common/Item";

import { PipelineReleaseApproval, ComputedDeploymentStatus } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseEnvironmentSummaryCanvasConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { ReleasesViewCanvasConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseEnvironmentNodeActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeActions";
import { IReleaseEnvironmentNodeViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeViewStore";
import { ReleaseEnvironmentNodeBase, IReleaseEnvironmentNodeBaseProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeBase";
import { ReleaseEnvironmentPropertiesItem } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesItem";
import { ReleaseProgressCanvasTelemetryHelper, CanvasClickTargets } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { EnvironmentSummaryNode, IEnvironmentSummaryNodeProps } from "PipelineWorkflow/Scripts/Shared/Canvas/EnvironmentSummaryNode";
import { ReleaseEnvironmentStatusHelper } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentStatusHelper";

import { localeFormat } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentSummaryNode";

export interface IReleaseEnvironmentSummaryNodeContentProps extends IEnvironmentSummaryNodeProps {
    getItem: () => Item;
    ariaLabel: string;
}

export class ReleaseEnvironmentSummaryNode extends ReleaseEnvironmentNodeBase<IReleaseEnvironmentNodeBaseProps, IReleaseEnvironmentNodeViewState>{
    render(): JSX.Element {
        let statusInfo = this.state.statusInfo;
        let statusText, statusIndicator, computedStatus, nodeDetailsInfo, environment;
        let pendingApprovals: PipelineReleaseApproval[] = [];
        const ariaLabelCandidates: string[] = [this.state.name];

        if (statusInfo) {
            statusText = statusInfo.statusText;
            ariaLabelCandidates.push(statusText);
            statusIndicator = statusInfo.statusIndicator;
            computedStatus = statusInfo.status;
            pendingApprovals = ReleaseEnvironmentStatusHelper.getPendingApprovals(statusInfo);
            nodeDetailsInfo = statusInfo.nodeDetailsInfo;
            if (computedStatus === ComputedDeploymentStatus.ManualInterventionPending) {
                const environmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, this.props.releaseEnvironment.id.toString());
                environment = environmentStore.getEnvironment() || this.props.releaseEnvironment;
            } else {
                environment = this.props.releaseEnvironment;
            }
        }

        if (this.state.showArtifactConditionsNotMetMessage) {
            ariaLabelCandidates.push(Resources.ArtifactConditionsNotMetText);
        }

        const ariaLabel = ariaLabelCandidates.join(" ");

        return (
            <div className="release-env-summary-node-container">
                <InnerFocusZone ariaLabel={localeFormat(Resources.EnvironmentNodeAriaLabel, this.state.name)} ref={this._resolveRef("_releaseEnvironmentNode")}>
                    <div className="release-env-summary-node-content-container">
                        <ReleaseEnvironmentSummaryNodeContent
                            ariaLabel={ariaLabel}
                            getItem={this._getItem}
                            environment={environment}
                            nodeHeight={ReleasesViewCanvasConstants.EnvironmentNodeHeight}
                            nodeWidth={ReleaseEnvironmentSummaryCanvasConstants.nodeWidth}
                            cssClass="release-env-summary-node"
                            contentClass="release-env-summary-node-content"
                            statusText={statusText}
                            statusIndicator={statusIndicator}
                            computedStatus={computedStatus}
                            pendingApprovals={pendingApprovals}
                            nodeDetailsInfo={nodeDetailsInfo}
                            showArtifactConditionsNotMetMessage={this.state.showArtifactConditionsNotMetMessage}
                            hideActionButtons={true} />
                    </div>
                </InnerFocusZone>
                <ReleaseEnvironmentNodeActions
                    instanceId={this.props.instanceId}
                    onDeploymentCancelCompleted={this._setFocus}
                    hideEnvironmentActions={true}
                    environmentName={this.state.name} />
            </div>
        );
    }

    private _getItem = (): ReleaseEnvironmentPropertiesItem => {
        if (!this.props.isEditMode) {
            return new ReleaseEnvironmentPropertiesItem(
                this.props.instanceId,
                this.state.id,
                this.state.definitionEnvironmentId,
                this.state.name);
        }
    }

}

export class ReleaseEnvironmentSummaryNodeContent extends EnvironmentSummaryNode<IReleaseEnvironmentSummaryNodeContentProps> {

    render(): JSX.Element {
        return (
            <OverlayPanelSelectable
                getItem={this.props.getItem}
                instanceId={CanvasSelectorConstants.ReleaseCanvasSelectorInstance}
                ariaLabel={this.props.ariaLabel}
                ariaLive="polite"
                onShowOverlayPanel={this._publishClickActionTelemetry}
                tooltipProps={this._getTooltipProps()}
            >
                {this._getNodeContent()}
            </OverlayPanelSelectable>
        );
    }

    private _publishClickActionTelemetry = (): void => {
        ReleaseProgressCanvasTelemetryHelper.publishClickActionTelemetry(CanvasClickTargets.environmentNode);
    }
}