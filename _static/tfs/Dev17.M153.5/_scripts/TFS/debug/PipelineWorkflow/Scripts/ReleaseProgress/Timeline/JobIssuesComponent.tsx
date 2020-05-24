/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Collapsible } from "DistributedTaskControls/SharedControls/Collapsible/Collapsible";

import { IssueType } from "DistributedTaskUI/Logs/Logs.Types";

import { Link } from "OfficeFabric/Link";

import { ReleaseProgressNavigateStateActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import * as Types from "PipelineWorkflow/Scripts/ReleaseProgress/Timeline/Timeline.types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import * as NavigationService from "VSS/Navigation/Services";
import { clone } from "VSS/Utils/Array";
import { curry } from "VSS/Utils/Core";
import { empty, ignoreCaseComparer, localeFormat } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Timeline/JobIssuesComponent";

export interface IJobIssuesComponentProps extends Base.IProps {
    deploymentJob?: RMContracts.DeploymentJob;
    environmentId?: number;
    errorLog?: string;
    phaseId?: number;
    issues?: RMContracts.Issue[];
}

export class JobIssuesComponent extends Base.Component<IJobIssuesComponentProps, Base.IStateless> {

    public render(): JSX.Element {
        return this._getIssuesElementForJob(this.props.deploymentJob, this.props.errorLog, this.props.issues);
    }

    private _getIssuesElementForJob(deploymentJob: RMContracts.DeploymentJob, errorLog: string, issues: RMContracts.Issue[]): JSX.Element {
        const errorIssueDetailsList: Types.IIssueDetails[] = [];
        const warningIssueDetailsList: Types.IIssueDetails[] = [];
        this._populateErrorAndWarningIssueDetailsList(deploymentJob, errorLog, issues, errorIssueDetailsList, warningIssueDetailsList);

        if (!((errorIssueDetailsList && errorIssueDetailsList.length > 0) || (warningIssueDetailsList && warningIssueDetailsList.length > 0))) {
            return null;
        }

        const issuesHeaderText = this._getIssuesHeaderText(errorIssueDetailsList.length, warningIssueDetailsList.length);
        const errorIssueElements = this._getIssueElements(errorIssueDetailsList);
        const warningIssueElements = this._getIssueElements(warningIssueDetailsList);

        return (
            <Collapsible
                label={issuesHeaderText}
                initiallyExpanded={true}
                headingLevel={4}
                cssClass="execution-issues-collapsible"
                headerContainerCssClass="execution-issues-header-container"
                headerLabelCssClass="execution-issues-header label-text"
                headerChevronCssClass="execution-issues-header chevron-icon">

                <div className="execution-issues-container">
                    {errorIssueElements}
                    {warningIssueElements}
                </div>

            </Collapsible>
        );
    }

    private _getIssuesHeaderText(errorCount: number, warningCount: number): string {
        let errorText: string = empty;
        let warningText: string = empty;

        if (errorCount > 0) {
            let errorTextFormat = errorCount === 1 ? Resources.SingleErrorText : Resources.MultipleErrorsText;
            errorText = localeFormat(errorTextFormat, errorCount);
        }

        if (warningCount > 0) {
            let warningTextFormat = warningCount === 1 ? Resources.SingleWarningText : Resources.MultipleWarningsText;
            warningText = localeFormat(warningTextFormat, warningCount);
        }

        let errorWarningText: string = empty;
        if (errorText && warningText) {
            errorWarningText = localeFormat(Resources.EnvironmentErrorsAndWarnings, errorText, warningText);
        }
        else {
            errorWarningText = errorText || warningText;
        }

        return errorWarningText;
    }

    private _getIssueElements(issueDetailsList: Types.IIssueDetails[]): JSX.Element {
        const issueElements = issueDetailsList.map((issueDetails: Types.IIssueDetails, index: number) => {
            if (!(issueDetails.message && issueDetails.message.trim())) {
                return null;
            }

            return (
                <Link
                    key={index}
                    onClick={curry(this._onClickIssue, issueDetails.jobTimelineRecordId, issueDetails.taskIndex)}
                    onKeyDown={curry(this._onIssueKeyDown, issueDetails.jobTimelineRecordId, issueDetails.taskIndex)}
                    className="issue-link"
                    role="link">
                    <VssIcon
                        className={issueDetails.issueType === IssueType.Error ? "issue-icon error" : "issue-icon warning"}
                        iconName={issueDetails.issueType === IssueType.Error ? "Cancel" : "Warning"}
                        iconType={VssIconType.fabric}
                    />
                    {issueDetails.message.trim()}
                </Link>
            );
        });

        return (
            <div className="issue-list-container">
                {issueElements}
            </div>
        );
    }

    private _onIssueKeyDown = (jobTimelineRecordIdToSelect: string, selectTaskWithIndex: number, e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) {
            this._onClickIssue(jobTimelineRecordIdToSelect, selectTaskWithIndex);
            e.stopPropagation();
            e.preventDefault();
        }
    }

    private _onClickIssue = (jobTimelineRecordIdToSelect: string, selectTaskWithIndex: number) => {
        if (!jobTimelineRecordIdToSelect) {
            jobTimelineRecordIdToSelect = this.props.phaseId ? this.props.phaseId.toString() : null;
        }

        let data = {
            environmentId: this.props.environmentId,
            jobTimelineRecordIdToSelect: jobTimelineRecordIdToSelect,
            selectTaskWithIndex: (selectTaskWithIndex >= 0) ? selectTaskWithIndex : undefined
        };

        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs, data, null, false, true);
    }

    private _populateErrorAndWarningIssueDetailsList(deploymentJob: RMContracts.DeploymentJob, errorLog: string, issues: RMContracts.Issue[], errorIssueDetailsList: Types.IIssueDetails[], warningIssueDetailsList: Types.IIssueDetails[]) {

        if (issues) {
            this._populateErrorAndWarningIssueDetailsListForReleaseTask(
                issues,
                null,
                errorIssueDetailsList,
                warningIssueDetailsList
            );
        }

        if (deploymentJob) {
            if (deploymentJob.job) {
                this._populateErrorAndWarningIssueDetailsListForReleaseTask(
                    deploymentJob.job.issues,
                    deploymentJob.job.timelineRecordId,
                    errorIssueDetailsList,
                    warningIssueDetailsList
                );
            }

            if (deploymentJob.tasks && deploymentJob.tasks.length > 0) {
                let clonedTasks = clone(deploymentJob.tasks);
                clonedTasks.sort((a, b) => a.rank - b.rank);
                clonedTasks.forEach((task: RMContracts.ReleaseTask, index: number) => {
                    if (task) {
                        this._populateErrorAndWarningIssueDetailsListForReleaseTask(
                            task.issues,
                            deploymentJob.job.timelineRecordId,
                            errorIssueDetailsList,
                            warningIssueDetailsList,
                            index
                        );
                    }
                });
            }
        }

        if (!(errorIssueDetailsList && errorIssueDetailsList.length > 0) && errorLog) {
            errorIssueDetailsList.push(
                {
                    taskIndex: -1,
                    jobTimelineRecordId: null,
                    message: errorLog,
                    issueType: IssueType.Error
                } as Types.IIssueDetails
            );
        }
    }

    private _populateErrorAndWarningIssueDetailsListForReleaseTask(
        issues: RMContracts.Issue[],
        jobTimelineRecordId: string,
        errorIssueDetailsList: Types.IIssueDetails[],
        warningIssueDetailsList: Types.IIssueDetails[],
        taskIndex: number = -1
    ) {
        if (issues && issues.length > 0) {
            issues.forEach((issue: RMContracts.Issue) => {
                const issueDetails: Types.IIssueDetails = this._getIssueDetailsFromIssue(issue, jobTimelineRecordId, taskIndex);
                if (issueDetails) {
                    if (issueDetails.issueType === IssueType.Error) {
                        errorIssueDetailsList.push(issueDetails);
                    }
                    else if (issueDetails.issueType === IssueType.Warning) {
                        warningIssueDetailsList.push(issueDetails);
                    }
                }
            });
        }
    }

    private _getIssueDetailsFromIssue(issue: RMContracts.Issue, jobTimelineRecordId: string, taskIndex: number = -1): Types.IIssueDetails {
        if (issue && issue.message) {
            let issueType: IssueType = null;

            if (!ignoreCaseComparer(issue.issueType, this.ERROR_STRING)) {
                issueType = IssueType.Error;
            }
            else if (!ignoreCaseComparer(issue.issueType, this.WARNING_STRING)) {
                issueType = IssueType.Warning;
            }

            return {
                taskIndex: taskIndex,
                jobTimelineRecordId: jobTimelineRecordId,
                message: issue.message,
                issueType: issueType
            } as Types.IIssueDetails;
        }

        return null;
    }

    private readonly ERROR_STRING: string = "Error";
    private readonly WARNING_STRING: string = "Warning";
}