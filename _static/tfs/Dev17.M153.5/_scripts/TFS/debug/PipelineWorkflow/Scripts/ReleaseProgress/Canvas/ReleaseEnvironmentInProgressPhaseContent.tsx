import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { IInprogressStatus, IInprogressPhaseStatus, IPhaseStatus, IDeploymentIssues } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";

import { ReleaseEnvironmentAgentPhaseInProgressContent, IReleaseEnvironmentAgentPhaseInProgressContentProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentAgentPhaseInProgressContent";
import { ReleaseEnvironmentPhaseCompletionStatus } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPhaseCompletionStatus";
import { DeploymentGroupInProgressPhaseContent, IDeploymentGroupInProgressPhaseContentProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentGroupInProgressPhaseContent";
import { ReleaseEnvironmentHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentHelper";
import { PhaseIndexWithCountLabel } from "PipelineWorkflow/Scripts/SharedComponents/Environment/PhaseIndexWithCountLabel";

import { css } from "OfficeFabric/Utilities";

import { DeploymentMachine } from "TFS/DistributedTask/Contracts";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentInProgressPhaseContent";

export interface IReleaseEnvironmentInProgressPhaseContentProps extends Base.IProps {
    isDeploymentGroupPhase?: boolean;
    environmentName: string;
    environmentId: number;
    inprogressStatus: IInprogressStatus;
    taskName: string;
    disabled?: boolean;
    deploymentGroupPhaseMachinesPromise?: IPromise<DeploymentMachine[]>;
    isManualInterventionPending?: boolean;
    deploymentIssues?: IDeploymentIssues;
}

export class ReleaseEnvironmentInProgressPhaseContent extends Base.Component<IReleaseEnvironmentInProgressPhaseContentProps, Base.IStateless>{

    public render(): JSX.Element {

        const phaseList: IPhaseStatus[] = this.props.inprogressStatus.phaseStatusList;
        const phaseCount = this.props.inprogressStatus.phaseCount;
        const showPhaseHeader: boolean = (phaseCount > 1);

        let inProgressPhaseStatus = ReleaseEnvironmentHelper.getInProgressPhase(this.props.inprogressStatus);

        return (
            <div
                className={css("cd-release-environment-inprogress-details-container", {
                    "cd-environment-in-progress-single-phase-details": !showPhaseHeader
                })}>
                {
                    showPhaseHeader &&
                    <ReleaseEnvironmentPhaseCompletionStatus
                        environmentId={this.props.environmentId}
                        phaseStatusList={phaseList}
                        phasesCount={phaseCount}
                        disabled={this.props.disabled}
                        deploymentIssues={this.props.deploymentIssues} />
                }
                {
                    inProgressPhaseStatus &&
                    this._getInProgressPhaseContent(inProgressPhaseStatus.phaseStatus, inProgressPhaseStatus.phaseIndex, showPhaseHeader)
                }
            </div>
        );

    }

    private _getInProgressPhaseContent(inProgressPhaseStatus: IInprogressPhaseStatus, phaseIndex: number, showPhaseHeader: boolean): JSX.Element {
        let inProgressContent: JSX.Element;
        if (this.props.isDeploymentGroupPhase) {
            let inProgressProps = { ...this.props, inProgressPhaseStatus: inProgressPhaseStatus, phaseIndex: phaseIndex } as IDeploymentGroupInProgressPhaseContentProps;
            inProgressContent = <DeploymentGroupInProgressPhaseContent {...inProgressProps} />;
        } else {
            let inProgressProps = { ...this.props, inProgressPhaseStatus: inProgressPhaseStatus, phaseIndex: phaseIndex } as IReleaseEnvironmentAgentPhaseInProgressContentProps;
            inProgressContent = <ReleaseEnvironmentAgentPhaseInProgressContent {...inProgressProps} />;
        }

        return (
            <div>
                {
                    showPhaseHeader &&
                    <PhaseIndexWithCountLabel
                        phaseIndex={phaseIndex}
                        phaseCount={this.props.inprogressStatus.phaseCount}
                    />
                }
                {
                    inProgressContent
                }
            </div>
        );
    }
}