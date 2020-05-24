import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentGroupInProgressSummary";

export interface IDeploymentGroupInProgressSummaryProps extends Base.IProps {
    phaseCounts: IPhaseStatusCounts;
}

export interface IPhaseStatusCounts {
    completedCount: number;
    partiallySucceededCount: number;
    runningCount: number;
    failedCount: number;
}

export class DeploymentGroupInProgressSummary extends Base.Component<IDeploymentGroupInProgressSummaryProps, Base.IStateless>{

    public render(): JSX.Element {
        const phaseCounts = this.props.phaseCounts;

        return <div className="detailed-status-container">
            <div className="running-machines-status status-text-container">
                <div className="status-count status-text">{phaseCounts.runningCount}</div>
                <div className="status-label status-text">{Resources.DeploymentGroupsProgressRunningText}</div>
            </div>

            <div className="successful-machines-status status-text-container">
                <div className="status-count status-text">{phaseCounts.completedCount + phaseCounts.partiallySucceededCount}</div>
                <div className="status-label status-text">{Resources.DeploymentGroupsProgressSuccessfulText}</div>
            </div>

            <div className="failed-machines-status status-text-container">
                <div className="status-count status-text">{phaseCounts.failedCount}</div>
                <div className="status-label status-text">{Resources.DeploymentGroupsProgressFailedText}</div>
            </div>
        </div>;
    }
}