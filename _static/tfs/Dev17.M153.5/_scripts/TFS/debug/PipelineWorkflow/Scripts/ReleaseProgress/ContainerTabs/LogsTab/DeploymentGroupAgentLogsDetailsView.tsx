import * as React from "react";

import { IAgentPhaseJobItem, IPhaseJobItem, JobStates } from "DistributedTaskUI/Logs/Logs.Types";
import { PhaseLogsDetailsView, IPhaseLogsDetailsViewProps } from "DistributedTaskUI/Logs/PhaseLogsDetailsView";
import { IPhaseSummaryViewProps } from "DistributedTaskUI/Logs/PhaseSummaryView";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { StepComponent } from "DistributedTaskUI/Logs/StepComponent";
import { DeployPhaseUtilities } from "DistributedTaskControls/Phase/DeployPhaseUtilities";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { css } from "OfficeFabric/Utilities";

import { VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentGroupAgentLogsDetailsView";

export interface IDeploymentGroupAgentLogsDetailsViewProps extends IPhaseLogsDetailsViewProps {
    machineGroupId?: number;
}

export class DeploymentGroupAgentLogsDetailsView extends PhaseLogsDetailsView<IDeploymentGroupAgentLogsDetailsViewProps> {

    protected _renderIssuesComponent(): React.ReactNode {
        if (this._isItemStateSkipped(this.props.item)) {
            return this._renderIssuesForSkippedJobItem();
        }
        else {
            return super._renderIssuesComponent();
        }
    }

    private _renderIssuesForSkippedJobItem(): JSX.Element {

        let issuesText = this.props.issues.map(issue => issue.message).join();
        return (
            <div className="deployment-group-logs-skipped-job" data-is-focusable={true} role="status" aria-live={"assertive"}>
                <StepComponent
                    isTitleClickable={false}
                    title={issuesText}
                    iconProps={{ className: css("logs-phase-error-step-status-icon", "state-skipped"), iconName: "Blocked", iconType: VssIconType.fabric }}
                    cssClass={"logs-phase-error-step-component-content"}
                    ariaLabel={issuesText}>
                </StepComponent>
            </div>);
    }

    protected _getPhaseSummaryProperties(): IPhaseSummaryViewProps {
        const agentPhaseJobItem = this.props.item as IAgentPhaseJobItem;

        if (agentPhaseJobItem) {
            return {
                name: agentPhaseJobItem.name,
                startTime: this._isItemStateSkipped(agentPhaseJobItem) ? null : agentPhaseJobItem.startTime,
                finishTime: this._isItemStateSkipped(agentPhaseJobItem) ? null : agentPhaseJobItem.finishTime,
                queueTime: agentPhaseJobItem.queueTime,
                logUrl: agentPhaseJobItem.logUrl,
                agentName: agentPhaseJobItem.agentName,
                queueId: agentPhaseJobItem.queueId,
                onRenderSecondaryDetailsLeftSection: this._getTargetSection,
                pageContext: this.props.pageContext
            } as IPhaseSummaryViewProps;
        }
        else {
            return null;
        }
    }

    private _getTargetSection = (): JSX.Element => {
        const agentPhaseJobItem = this.props.item as IAgentPhaseJobItem;
        const targetName: string = agentPhaseJobItem.agentName;
        let machineGroupId: number = this.props.machineGroupId;
        let machineId: number = agentPhaseJobItem.agentId;

        if (targetName) {
            return (
                <div className="target-details-section">
                    <div className="target-name-title">{Resources.TargetNameLabel}</div>
                    <SafeLink
                        className={"target-name-link"}
                        href={DeployPhaseUtilities.getMachinePageUrl(machineGroupId, machineId)}
                        target="_blank"
                        allowRelative={true}
                        aria-label={targetName}
                        aria-describedby="target-description">
                        <div id="target-description" className="hidden">{Resources.TargetLinkDescription}</div>
                        {targetName}
                    </SafeLink>
                </div>
            );
        } else {
            return null;
        }
    }

    private _isItemStateSkipped(item: IPhaseJobItem) {
        return item && item.jobState === JobStates.Skipped;
    }

    protected _containerClassName: string = "deployment-phase-agent-logs-details-view";
}