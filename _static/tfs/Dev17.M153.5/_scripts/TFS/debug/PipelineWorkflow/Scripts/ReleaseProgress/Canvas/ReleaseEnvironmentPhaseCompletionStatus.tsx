import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { ReleaseEnvironmentCanvasViewUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentCanvasViewUtils";
import { IPhaseStatus, IInprogressPhaseStatus, IDeploymentIssues } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { LogsTabActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActionsCreator";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import { empty, localeFormat } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

export interface IReleaseEnvironmentPhaseCompletionStatusProps extends Base.IProps {
    environmentId: number;
    phaseStatusList: IPhaseStatus[];
    phasesCount: number;
    disabled?: boolean;
    deploymentIssues?: IDeploymentIssues;
}

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPhaseCompletionStatus";

export class ReleaseEnvironmentPhaseCompletionStatus extends Base.Component<IReleaseEnvironmentPhaseCompletionStatusProps, Base.IStateless> {

    public render(): JSX.Element {

        const completedPhasesCount = ReleaseEnvironmentCanvasViewUtils.getCompletedPhasesCount(this.props.phaseStatusList, this.props.phasesCount);
        const errorsLinkClassName = "cd-environment-completed-phases-errors";

        if (completedPhasesCount > 0) {
            let errorCount = 0;
            if (this.props.deploymentIssues) {
                const issuesCount = ReleaseEnvironmentIssuesHelper.combineIssuesCount(this.props.deploymentIssues.deploymentLevelIssues, this.props.deploymentIssues.phaseLevelIssues.completedPhaseIssues);
                errorCount = issuesCount.errorsCount + issuesCount.warningsCount;
            }

            if (errorCount > 0) {

                const errorText = errorCount > 1 ?
                    localeFormat(Resources.MultipleIssuesFormat, errorCount) : localeFormat(Resources.SingleIssueFormat, 1);

                const completedPhasesHeader = (completedPhasesCount === 1 ?
                    localeFormat(Resources.PhaseHeaderText, 1) : localeFormat(Resources.CompletedPhasesHeader, completedPhasesCount));

                const phaseHeaderLabel = (completedPhasesCount === 1 ?
                    (
                        errorCount > 1 ?
                            localeFormat(Resources.SinglePhaseMutlipleErrorsLable, errorText, 1) :
                            localeFormat(Resources.SinglePhaseSingleIssueLabel, 1)
                    )
                    :
                    (
                        errorCount > 1 ?
                            localeFormat(Resources.MultiPhaseMultipleErrorsLabel, errorText, 1, completedPhasesCount) :
                            localeFormat(Resources.MultiPhaseSingleIssueLabel, 1, completedPhasesCount)
                    )
                );

                const errorsLinkLabel = localeFormat("{0} {1}", errorText, Resources.PhaseErrorsLabel);

                const errorTooltip: string = errorCount === 1 ? Resources.SingularErrorInPhase : localeFormat(Resources.ErrorsInPhase, errorCount);
                return (
                    <div className="cd-environment-phase-completion-text" aria-label={phaseHeaderLabel}>
                        <TooltipHost
                            content={completedPhasesHeader}
                            overflowMode={TooltipOverflowMode.Self}
                            hostClassName="cd-environment-completed-phases-header">
                            <span>
                                {
                                    completedPhasesHeader
                                }
                            </span>
                        </TooltipHost>
                        <span className="cd-environment-completed-phases-separator">:</span>
                        <TooltipIfOverflow
                            tooltip={errorTooltip}
                            targetElementClassName={errorsLinkClassName}
                            cssClass="cd-environment-completed-phases-errors-section">
                            <SafeLink
                                disabled={this.props.disabled}
                                href={empty}
                                className={errorsLinkClassName}
                                onClick={this._navigateToEnvironmentView}
                                onKeyDown={this._handleKeyDownOnErrorsLink}
                                ariaProps={{ "aria-label": errorsLinkLabel } as React.HTMLAttributes<HTMLElement>}>
                                {
                                    errorText
                                }
                            </SafeLink>
                        </TooltipIfOverflow>
                    </div>
                );
            }
            else {
                return null;
            }

        } else {
            return null;

        }

    }

    private _navigateToEnvironmentView = (e: React.SyntheticEvent<HTMLElement>) => {
        if (!this.props.disabled) {

            const environmentId = this.props.environmentId;
            ReleaseEnvironmentCanvasViewUtils.navigateToEnvironmentsView(environmentId, { environmentId: environmentId, selectFirstError: true });

            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _handleKeyDownOnErrorsLink = (e: React.KeyboardEvent<HTMLElement>) => {
        this._navigateToEnvironmentView(e);
    }

}