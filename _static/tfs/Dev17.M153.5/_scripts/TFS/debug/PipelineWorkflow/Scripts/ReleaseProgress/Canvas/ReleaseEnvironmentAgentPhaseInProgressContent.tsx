import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { CircularProgressBar, ICircularProgressBarProps } from "DistributedTaskControls/Components/CircularProgressBar";
import { ClockComponent, IClockComponentProps } from "DistributedTaskControls/Components/ClockComponent";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { IInprogressStatus, ITaskStatus, IInprogressPhaseStatus, IPhaseStatus, IDeploymentIssues } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseEnvironmentCanvasViewUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentCanvasViewUtils";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { DeployPhaseStatus, TaskStatus } from "ReleaseManagement/Core/Contracts";

import { css } from "OfficeFabric/Utilities";

import { HtmlNormalizer } from "VSS/Utils/Html";
import { empty, format, localeFormat, generateUID } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentAgentPhaseInProgressContent";

export interface IReleaseEnvironmentAgentPhaseInProgressContentProps extends Base.IProps {
    environmentName: string;
    environmentId: number;
    inprogressStatus: IInprogressStatus;
    taskName: string;
    inProgressPhaseStatus: IInprogressPhaseStatus;
    phaseIndex: number;
    disabled?: boolean;
    isManualInterventionPending?: boolean;
    deploymentIssues?: IDeploymentIssues;
}

export class ReleaseEnvironmentAgentPhaseInProgressContent extends Base.Component<IReleaseEnvironmentAgentPhaseInProgressContentProps, Base.IStateless>{

    public render(): JSX.Element {

        const currentPhase = localeFormat(Resources.PhaseHeaderText, (this.props.inProgressPhaseStatus.rank));

        return (
            <div className="cd-environment-agent-phase-in-progress-details-container">
                {
                    this._getInProgressPhaseContent(currentPhase)
                }
            </div>
        );
    }

    private _getInProgressPhaseContent(phaseHeader: string): JSX.Element {

        const phaseInfo = this.props.inProgressPhaseStatus;

        let currentTaskStatus: TaskStatus = this.props.isManualInterventionPending ? TaskStatus.Pending : TaskStatus.InProgress;

        const currentTask: ITaskStatus = ReleaseEnvironmentCanvasViewUtils.getFirstTaskWithStatusFromPhaseInfo(phaseInfo as IInprogressPhaseStatus, [currentTaskStatus]);

        const inProgressPhaseIssues = this.props.deploymentIssues ? this.props.deploymentIssues.phaseLevelIssues.inProgressPhaseIssues : null;
        
        const errorsCount = inProgressPhaseIssues ? inProgressPhaseIssues.errorsCount : 0;
        const warningsCount = inProgressPhaseIssues ? inProgressPhaseIssues.warningsCount : 0;

        const phaseIndex = this.props.inProgressPhaseStatus.rank;
        let errorsSummary, errorsLinkAriaLabel;

        let issueIcon: string = "";
        let inProgressPhaseIssuesCss: string = "";
        let issuesCount: number = 0;
        if (errorsCount > 0) {
            errorsSummary = errorsCount > 1 ?
                (localeFormat(Resources.SinglePhaseMutlipleErrorsLable, localeFormat(Resources.MultipleErrorsText, errorsCount), phaseIndex))
                : (localeFormat(Resources.SinglePhaseSingleIssueLabel, phaseIndex));

            errorsLinkAriaLabel = localeFormat("{0} {1}", errorsSummary, Resources.PhaseErrorsLabel);
            issueIcon = "ErrorBadge";
            inProgressPhaseIssuesCss = "cd-environment-in-progress-phase-errors";
            issuesCount = errorsCount;
        }
        else if (warningsCount > 0) {
            errorsSummary = warningsCount > 1 ?
            (localeFormat(Resources.SinglePhaseMutlipleErrorsLable, localeFormat(Resources.MultipleWarningsText, warningsCount), phaseIndex))
            : (localeFormat(Resources.SinglePhaseSingleIssueLabel, phaseIndex));

            errorsLinkAriaLabel = localeFormat("{0} {1}", errorsSummary, Resources.PhaseWarningsLabel);
            issueIcon = "Warning";
            inProgressPhaseIssuesCss = "cd-environment-in-progress-phase-warnings";
            issuesCount = warningsCount;
        }

        return (
            <div className="cd-environment-in-progress-phase-content">
                {
                    this._getCircularProgressBar(phaseInfo as IInprogressPhaseStatus, currentTask, phaseHeader)
                }
                <div className="cd-environment-in-progress-phase-current-task-details">
                    {
                        currentTask && this._getCurrentTaskName(currentTask)
                    }
                    {
                        currentTask && this._getTaskDuration(currentTask)
                    }
                    {
                        issuesCount > 0 && currentTask && (
                            <SafeLink
                                disabled={this.props.disabled}
                                href={empty}
                                onClick={this._navigateToEnvironmentView}
                                onKeyDown={this._handleKeyDownOnEnvironmentName}
                                className={inProgressPhaseIssuesCss}
                                ariaProps={{ "aria-label": errorsLinkAriaLabel } as React.HTMLAttributes<HTMLElement>}>
                                <VssIcon
                                    iconName={issueIcon}
                                    iconType={VssIconType.fabric}
                                    className="cd-environment-in-progress-error-icon" />
                                <span className="cd-environment-in-progress-phase-error-count">{issuesCount}</span>
                            </SafeLink>
                        )
                    }
                </div>
            </div>
        );
    }

    private _getCurrentTaskName(currentTask: ITaskStatus): JSX.Element {
        if (currentTask && currentTask.name) {
            const taskName: string = currentTask.name;
            const tooltip = this.props.isManualInterventionPending ? format(Resources.WaitingOnTaskNameTooltipFormat, taskName) : taskName;
            const taskNameClass = "cd-environment-in-progress-phase-current-task-name";
            return (
                <TooltipIfOverflow key={this.props.instanceId + "_tooltip" + taskNameClass} tooltip={tooltip} targetElementClassName={taskNameClass} cssClass={taskNameClass + "-tooltip"}>
                    {this.props.isManualInterventionPending && <div className="cd-environment-in-progress-phase-waiting-on-section">{Resources.WaitingOnText}</div>}
                    <div key={this.props.instanceId + "_substatus"} className={taskNameClass}>{taskName}</div>
                    <span className="fade-out-element"></span>
                </TooltipIfOverflow>
            );
        }
        else {
            return null;
        }
    }

    private _getTaskDuration(currentTask: ITaskStatus): JSX.Element {
        const clockComponentProps: IClockComponentProps = {
            startTime: currentTask.startTime,
            autoRefresh: true,
            refreshIntervalInSeconds: 1,
            cssClass: "cd-environment-in-progress-phase-current-task-time",
        };
        return <ClockComponent {...clockComponentProps} />;
    }

    private _getCircularProgressBar(phaseInfo: IInprogressPhaseStatus, currentTask: ITaskStatus, phaseHeader: string): JSX.Element {
        const completedTasks = phaseInfo.completedTasksCount;
        const totalTasks = phaseInfo.totalTasksCount;
        const currentTaskIndex = phaseInfo.InProgressTaskIndex > -1 ? phaseInfo.InProgressTaskIndex + 1 :
            completedTasks < totalTasks ? completedTasks + 1 : completedTasks;

        let circularProgressBar: JSX.Element = null;

        if (this.props.isManualInterventionPending) {
            circularProgressBar = (
                <div className="cd-environment-in-progress-phase-progress-container">
                    {this._getCircularProgressBarContent(totalTasks, currentTaskIndex, phaseHeader)}
                </div>
            );
        }
        else {
            const progressBarProps: ICircularProgressBarProps = {
                completedPercentage: ((completedTasks / totalTasks) * 100)
            };

            circularProgressBar = (
                <CircularProgressBar cssClass="cd-environment-in-progress-phase-progress-container" {...progressBarProps}>
                    {this._getCircularProgressBarContent(totalTasks, currentTaskIndex, phaseHeader)}
                </CircularProgressBar>
            );
        }

        return circularProgressBar;
    }

    private _getCircularProgressBarContent(totalTasks: number, currentTaskIndex: number, phaseHeader: string): JSX.Element {

        const taskStatusFormat = (totalTasks > 1) ? Resources.InProgressPhaseProgressBarLinkTitlePlural : Resources.InProgressPhaseProgressBarLinkTitleSingular;
        const progressBarContent = localeFormat(taskStatusFormat, currentTaskIndex, totalTasks, phaseHeader, this.props.environmentName);
        const viewLogsLinkDescriptionId = "view-environment-logs-description" + generateUID();
        const tasksTextClassName = "cd-environment-in-progress-phase-circle-tasks-text";
        const phaseTaskInfoCss: string = css("cd-environment-in-progress-phase-tasks-info", { "cd-environment-awaiting-intervention-phase-tasks-info": this.props.isManualInterventionPending });

        return (
            <a
                onClick={this._onProgressBarClick}
                onKeyDown={this._handleKeyDownOnProgressBar}
                aria-disabled={this.props.disabled}
                aria-label={progressBarContent}
                aria-describedby={viewLogsLinkDescriptionId}
                role="button"
                className={phaseTaskInfoCss}>
                <div className="cd-environment-in-progress-phase-tasks-count">
                    <span className="cd-environment-in-progress-phase-current-task-index">{currentTaskIndex}</span>
                    <span className="cd-environment-in-progress-phase-tasks-separator">/</span>
                    <span className="cd-environment-in-progress-phase-current-total-tasks">{totalTasks}</span>
                </div>
                <div className="hidden" id={viewLogsLinkDescriptionId}>{Resources.EnvironmentDescriptionLinkTitle}</div>
                <TooltipIfOverflow tooltip={Resources.TasksText} targetElementClassName={tasksTextClassName} cssClass="cd-environment-in-progress-phase-circle-tasks-text-tooltip">
                    <div className={tasksTextClassName}>
                        {Resources.TasksText}
                    </div>
                </TooltipIfOverflow>
            </a>
        );
    }

    private _onProgressBarClick = (e: React.SyntheticEvent<HTMLElement>) => {
        if (!this.props.disabled) {
            const environmentId = this.props.environmentId;
            ReleaseEnvironmentCanvasViewUtils.navigateToEnvironmentsView(environmentId, { environmentId: environmentId });
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _handleKeyDownOnProgressBar = (e: React.KeyboardEvent<HTMLElement>) => {
        if (!this.props.disabled && (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE)) {
            this._onProgressBarClick(e);
        }
    }

    private _navigateToEnvironmentView = (e: React.SyntheticEvent<HTMLElement>) => {
        if (!this.props.disabled) {
            const environmentId = this.props.environmentId;
            let taskToSelect = ReleaseEnvironmentCanvasViewUtils.getFirstTaskWithStatusFromPhaseInfo(this.props.inProgressPhaseStatus,
                [TaskStatus.Failed, TaskStatus.PartiallySucceeded, TaskStatus.Failure]);

            if (taskToSelect) {
                ReleaseEnvironmentCanvasViewUtils.navigateToEnvironmentsView(environmentId, { environmentId: environmentId, selectTaskWithIndex: taskToSelect.index });
            } else {
                ReleaseEnvironmentCanvasViewUtils.navigateToEnvironmentsView(environmentId, { environmentId: environmentId });
            }

            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _handleKeyDownOnEnvironmentName = (e: React.KeyboardEvent<HTMLElement>) => {
        if (!this.props.disabled && (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.SPACE)) {
            this._navigateToEnvironmentView(e);
        }
    }

}