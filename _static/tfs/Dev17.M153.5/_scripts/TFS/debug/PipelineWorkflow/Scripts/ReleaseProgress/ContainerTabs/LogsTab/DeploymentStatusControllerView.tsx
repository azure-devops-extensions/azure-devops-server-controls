/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { Avatar } from "DistributedTaskControls/Components/Avatar";
import { LogsSummaryView } from "DistributedTaskUI/Logs/LogsSummaryView";
import { LogsViewUtility } from "DistributedTaskUI/Logs/LogsViewUtility";

import {
    DeploymentAttemptsHelper,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentAttemptsHelper";
import { IInfoColumn, InformationRow } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/InformationRow";
import { ReleasePhaseHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleasePhaseHelper";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { IEnvironmentSubStatusDetailInfo, IReleaseEnvironmentStatusInfo, IIssuesCount, ReleaseEnvironmentStatusIndicator } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseEnvironmentIssuesHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseEnvironmentIssuesHelper";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { IStatusProps } from "VSSUI/Status";
import { VssPersona } from "VSSUI/VssPersona";
import * as Utils_Html from "VSS/Utils/Html";
import * as Utils_String from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentStatusControllerView";
import { isPromise } from "q";

export interface IDeploymentStatusControllerViewProps extends ComponentBase.IProps {
    attempt: RMContracts.DeploymentAttempt;
    environment: RMContracts.ReleaseEnvironment;
    isLatestAttempt: boolean;
    totalAttemptsCount: number;
}

export interface IState {
    subStatusInfo: IEnvironmentSubStatusDetailInfo;
    imageError: boolean;
}

export class DeploymentStatusControllerView extends ComponentBase.Component<IDeploymentStatusControllerViewProps, IState> {

    public render(): JSX.Element {
        return (
            <div className="deployment-status-controller-view">
                {this._renderDeploymentProperties()}
                {this._renderIssuesComponent()}
            </div>
        );
    }

    public componentWillMount(): void {
        this._resolveSubStatusIfNeeded(this.props.attempt, this.props.environment);
    }

    public componentWillReceiveProps(nextProps: IDeploymentStatusControllerViewProps): void {
        this._resolveSubStatusIfNeeded(nextProps.attempt, nextProps.environment);
    }

    public componentDidMount(): void {
        this._mounted = true;
    }

    public componentWillUnmount(): void {
        this._mounted = false;
    }

    private _resolveSubStatusIfNeeded(attempt: RMContracts.DeploymentAttempt, environment: RMContracts.ReleaseEnvironment): void {
        this._deploymentAttemptHelper = ReleaseDeploymentAttemptHelper.createReleaseDeploymentAttemptHelper(environment, attempt);
        const statusInfo: IReleaseEnvironmentStatusInfo = this._deploymentAttemptHelper.getStatusInfo();

        if (isPromise(statusInfo.detailedSubStatusInfo)) {
            let subStatusInfoPromise = statusInfo.detailedSubStatusInfo as IPromise<IEnvironmentSubStatusDetailInfo>;
            subStatusInfoPromise.then((info) => {
                if (this._mounted) {
                    this.setState({ subStatusInfo: info });
                }
            });
        }
        else {
            this.setState({ subStatusInfo: statusInfo.detailedSubStatusInfo as IEnvironmentSubStatusDetailInfo });
        }
    }

    private _renderIssuesComponent(): JSX.Element {
        const attempt: RMContracts.DeploymentAttempt = this.props.attempt;

        if (attempt && attempt.issues && attempt.issues.length > 0) {
            const logLines = LogsViewUtility.getLogLinesFromIssues(ReleasePhaseHelper.convertToLogIssues(attempt.issues, attempt.errorLog), Number.MAX_VALUE);
            const issuesInfo = ReleaseEnvironmentIssuesHelper.getIssuesInfo(ReleaseEnvironmentIssuesHelper.accumulateIssuesCount(attempt.issues));

            return (
                <div className="deployment-issues-container">
                    <FormatComponent className="deployment-issues-header" format={Resources.LogsDeploymentIssuesFormat}>
                        {
                            <div className="deployment-issues-info">
                                {issuesInfo.errorsText && <span className="deployment-issues-errors">{issuesInfo.errorsText}</span>}
                                {issuesInfo.errorsText && issuesInfo.warningsText && <span className="deployment-issues-separator">&middot;</span>}
                                {issuesInfo.warningsText && <span className="deployment-issues-warnings">{issuesInfo.warningsText}</span>}
                            </div>
                        }
                    </FormatComponent>
                    <LogsSummaryView cssClass={"deployment-issues-summary-view"} logLines={logLines} showSectionIcons={true} />
                </div>);
        }

        return null;
    }

    private _renderDeploymentProperties(): JSX.Element[] {
        let properties: JSX.Element[] = [];
        const attempt: RMContracts.DeploymentAttempt = this.props.attempt;

        if (attempt) {

            // Render deployment status
            const statusInfo: IReleaseEnvironmentStatusInfo = this._deploymentAttemptHelper.getStatusInfo();

            const statusIconProps: IStatusProps = this._deploymentAttemptHelper.getStatusIconProps(statusInfo.statusIndicator);

            const deploymentStatusData = this._createInfoRendererData(Resources.DeploymentStatusViewStatusTitle, statusInfo.statusText, statusIconProps);
            properties.push(this._renderRow([deploymentStatusData], "deployment-status"));

            // Render deployment sub-status
            let subStatus = statusInfo.detailedSubStatusInfo ? this._getSubStatusElement(statusInfo.statusText) : statusInfo.statusText;
            const deploymentSubStatusData = this._createInfoRendererData(Resources.DeploymentSubStatusViewStatusTitle, subStatus);
            properties.push(this._renderRow([deploymentSubStatusData], "deployment-sub-status"));

            // Render trigger
            const reason: string = this._deploymentAttemptHelper.getDeploymentReason();
            if (reason) {
                const triggerData = this._createInfoRendererData(Resources.DeploymentStatusViewTriggerTitle, reason);
                properties.push(this._renderRow([triggerData], "deployment-trigger"));
    
            }

            // Render requested by
            if (attempt.requestedBy) {
                const requestedByData = this._createInfoRendererData(Resources.DeploymentStatusViewRequestedByTitle, this._renderAvatar(attempt.requestedBy));
                properties.push(this._renderRow([requestedByData], "deployment-requested-by"));
            }

            // Render requested for
            if (attempt.requestedFor) {
                const requestedForData = this._createInfoRendererData(Resources.DeploymentStatusViewRequestedForTitle, this._renderAvatar(attempt.requestedFor));
                properties.push(this._renderRow([requestedForData], "deployment-requested-for"));    
            }
    
            // Render queued time, started on and completed on
            this.insertTimeInformationRow(properties, this._deploymentAttemptHelper);

            //Render atttempt number
            if (this.props.totalAttemptsCount > 1) {
                const attemptNumber = this._createInfoRendererData(Resources.DeploymentStatusAttemptNumberTitle,
                    Utils_String.format(Resources.SelectedAttemptNumberText, attempt.attempt, this.props.totalAttemptsCount));
                properties.push(this._renderRow([attemptNumber], "deployment-attempt-number"));
            }
        }

        return properties;
    }

    private _getSubStatusElement(statusText: string): JSX.Element {
        let subStatusInfo: IEnvironmentSubStatusDetailInfo = this.state.subStatusInfo;
        if (subStatusInfo && subStatusInfo.subStatus) {
            let imageUrl = subStatusInfo.modifiedByUser && IdentityHelper.getIdentityAvatarUrl(subStatusInfo.modifiedByUser);
            let normalizedSubStatus = Utils_Html.HtmlNormalizer.normalize(subStatusInfo.subStatus);
            return (
                <div>
                    {
                        //disabling tslint check for dangerouslySetInnerHTML as we have verified all input strings are html Encoded.
                        /* tslint:disable-next-line */
                        <div className="modified-by-help-text" dangerouslySetInnerHTML={this._renderHtml(normalizedSubStatus)}></div>
                    }

                    {
                        imageUrl && !this.state.imageError &&
                        <VssPersona
                            cssClass={"user-avatar-image"}
                            onImageError={this._onImageError}
                            identityDetailsProvider={{
                                getIdentityImageUrl: (size: number): string => {
                                    return imageUrl;
                                },
                                getDisplayName: (): string => {
                                    return subStatusInfo.modifiedByUser.displayName;
                                }
                            }} />
                    }

                    <div className="modified-by-text">{subStatusInfo.modifiedByUser && subStatusInfo.modifiedByUser.displayName}</div>

                </div>
            );
        }
        return (
            <div>{statusText}</div>
        );
    }

    private _onImageError = (): void => {
        this.setState({ imageError: true });
    }

    private insertTimeInformationRow(properties: JSX.Element[], deploymentAttemptHelper: ReleaseDeploymentAttemptHelper): void {
        const attempt: RMContracts.DeploymentAttempt = this.props.attempt;
        const queueTime: string = new FriendlyDate(attempt.queuedOn, PastDateMode.ago, true).toString();
        const queueTimeData = this._createInfoRendererData(Resources.DeploymentStatusViewQueuedTitle, queueTime);

        const startedOnTime: Date = deploymentAttemptHelper.getDeploymentStartTime();
        const friendlyStartTime: string = startedOnTime ? new FriendlyDate(startedOnTime, PastDateMode.ago, true).toString() : Resources.DeploymentNotStartedText;
        const startTimeData = this._createInfoRendererData(Resources.DeploymentStatusStartedTitle, friendlyStartTime);

        const completedTime: Date = deploymentAttemptHelper.getDeploymentCompletedTime();
        const friendlyCompletedTime: string = completedTime ? new FriendlyDate(completedTime, PastDateMode.ago, true).toString() : Resources.DeploymentNotCompletedText;
        const completedTimeData = this._createInfoRendererData(Resources.DeploymentStatusCompletedTitle, friendlyCompletedTime);

        properties.push(this._renderRow([queueTimeData, startTimeData, completedTimeData], "deployment-time-info"));
    }

    private _createInfoRendererData(label: string, value: string | JSX.Element, iconProps?: IStatusProps): IInfoColumn {
        let data: IInfoColumn = {
            label: label,
            value: value,
            iconProps: iconProps
        };
        return data;
    }

    private _renderRow(infoColumns: IInfoColumn[], key: string): JSX.Element {
        return (
            <InformationRow columns={infoColumns} key={key} />
        );
    }

    private _renderAvatar(identity: IdentityRef): JSX.Element {
        return <Avatar displayName={identity.displayName} imageUrl={IdentityHelper.getIdentityAvatarUrl(identity)} />;
    }

    private _renderHtml(html: string) {
        return {
            __html: html
        };
    }

    private _mounted: boolean;
    private _deploymentAttemptHelper: ReleaseDeploymentAttemptHelper;
}
