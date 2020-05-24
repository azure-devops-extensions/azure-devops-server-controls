/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";
import { TaskState } from "DistributedTaskUI/Logs/Logs.Types";
import { LogsViewUtility } from "DistributedTaskUI/Logs/LogsViewUtility";
import { StepComponent } from "DistributedTaskUI/Logs/StepComponent";
import { ClockComponent } from "DistributedTaskControls/Components/ClockComponent";

import { DefaultButton } from "OfficeFabric/Button";
import { autobind, css } from "OfficeFabric/Utilities";

import { ReleaseManualInterventionActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionActionCreator";
import { ReleaseManualInterventionDetailsViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionDetailsViewStore";
import { ReleaseManualInterventionDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionDetailsView";
import { ActionTelemetrySource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ReleaseManualInterventionStatusHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionStatusHelper";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { VssIconType } from "VSSUI/VssIcon";
import { getDefaultWebContext } from "VSS/Context";
import { localeFormat } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabManualInterventionLogComponent";

export interface ILogsTabManualInterventionLogComponentProps extends ComponentBase.IProps {
    taskState: TaskState;
    verticalTabItemKey?: string;
    manualIntervention: RMContracts.ManualIntervention;
    definitionEnvironmentId: number;
    definitionPath: string;
    onPanelOpen?: (key: string) => void;
    taskIndex?: number;
}

export interface ILogsTabManualInterventionLogComponentState extends ComponentBase.IState {
    showPanel: boolean;
    showResumeRejectButton: boolean;
    miStatus: RMContracts.ManualInterventionStatus;
}

export class LogsTabManualInterventionLogComponent extends ComponentBase.Component<ILogsTabManualInterventionLogComponentProps, ILogsTabManualInterventionLogComponentState> {

    constructor(props: ILogsTabManualInterventionLogComponentProps) {
        super(props);
        const showResumeRejectButton = this.props.manualIntervention.status === RMContracts.ManualInterventionStatus.Pending;
        this.state = { showResumeRejectButton: showResumeRejectButton, miStatus: this.props.manualIntervention.status, showPanel: false };

        this._manualInterventionViewStore = StoreManager.GetStore<ReleaseManualInterventionDetailsViewStore>(ReleaseManualInterventionDetailsViewStore, this.props.instanceId);
        this._manualInterventionActionCreator = ActionCreatorManager.GetActionCreator<ReleaseManualInterventionActionCreator>(ReleaseManualInterventionActionCreator, this.props.instanceId);

        this._manualInterventionActionCreator.publishLogsMIPanelLaunchTelemetry(this._getHasManageDeploymentPermissions(), this.props.manualIntervention.status);
    }

    public componentDidMount(): void {
        this._manualInterventionViewStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._manualInterventionViewStore.removeChangedListener(this._onStoreChange);
    }

    public render(): JSX.Element {
        let ariaLabelText = this._getDefaultOverviewAriaLabel();
        let pendingCss = "";
        let logStatus = LogsViewUtility.getTaskStatus(this.props.taskState, 0);
        if (this.state.miStatus === RMContracts.ManualInterventionStatus.Pending && this.props.manualIntervention.createdOn) {
            logStatus.status = localeFormat(Resources.ApprovalPending, new FriendlyDate(this.props.manualIntervention.createdOn, PastDateMode.since, true).toString());
            pendingCss = "task-state-inprogress";
            ariaLabelText = localeFormat("{0}, {1}", this.props.manualIntervention.name, logStatus.status);
        }

        const iconClassName = css("logs-mi-ssi", "left-section-task-status-icon log-task-state");
        const stepStatusClassName = css("logs-mi-ss", "left-section-step-status", logStatus.className);
        const additionalCss = css(pendingCss, "task-log-view-container", "task-log-step-component-container", `task-log-step-component-container-${(this.props.taskIndex || 0) + 1}`);
        const tooltipText = this.state.showResumeRejectButton ? Resources.ResumeManualInterventionTooltip : Resources.ViewStatusText;
        const mi = this.props.manualIntervention;
        const uniqueKey = mi.id && mi.id.toString();

        return (
            <div
                data-is-focusable={true}
                role="listitem"
                className={css(this.props.cssClass, "logs-mi-lsc", additionalCss)}>
                <StepComponent
                    isTitleClickable={true}
                    onActionClick={this._onResumeRejectButtonClick}
                    title={mi.name}
                    hasSepartor={true}
                    stepStatus={{ status: logStatus.status, className: stepStatusClassName }}
                    statusProps={{ statusProps: logStatus.statusProps, className: iconClassName }}
                    cssClass={css("logs-mi-sc", "task-log-step-content")}
                    tooltipContent={tooltipText}
                    buttonAriaDescription={tooltipText}
                    ariaLabel={ariaLabelText}
                    rightSection={this._getRightSection()}
                    uniqueKey={uniqueKey}
                />
                {
                    this.state.showPanel && mi && mi.releaseEnvironment && mi.releaseEnvironment.id &&
                    <PanelComponent
                        showPanel={this.state.showPanel}
                        onClose={this._onClose}
                        isBlocking={true}
                        isLightDismiss={true}
                        hasCloseButton={true}>
                        {this._getManualInterventionDetailsView()}
                    </PanelComponent>
                }
            </div>
        );
    }

    private _getRightSection(): JSX.Element {
        return (
            <div className="logs-mi-srs task-log-step-component-right-section flex">
                {/* Show action button or duration based on MI status */}
                {
                    this.props.manualIntervention.status === RMContracts.ManualInterventionStatus.Pending
                        ? this._getManualInterventionActionButton()
                        : this._getDurationComponent()
                }
            </div>
        );
    }

    private _getManualInterventionActionButton() {
        const showResumeRejectButton: boolean = this.state.showResumeRejectButton && this._getHasManageDeploymentPermissions();
        const btnText: string = showResumeRejectButton ? Resources.ResumeRejectText : Resources.ViewStatusText;

        return (
            <DefaultButton
                onClick={this._onResumeRejectButtonClick}
                ariaHidden={true}
                primary={showResumeRejectButton}
                tabIndex={-1}
                text={btnText}
                title={btnText}
                className={"logs-mi-status-btn"}
            />
        );
    }

    private _getDurationComponent(): JSX.Element {
        const mi = this.props.manualIntervention;
        const isMiPending = this.state.showResumeRejectButton;
        return (
            <div className={css("task-log-clock-container", isMiPending ? "logs-mi-pending" : "logs-mi-completed")}>
                <ClockComponent
                    cssClass="task-log-clock"
                    startTime={mi.createdOn}
                    finishTime={isMiPending ? null : mi.modifiedOn}
                    autoRefresh={isMiPending}
                    hideTimerIcon={!isMiPending}
                    showTimerWithMilliSecondPrecision={true}
                    refreshIntervalInSeconds={1}
                />
            </div>
        );
    }

    private _getManualInterventionDetailsView(): JSX.Element {
        return (
            <ReleaseManualInterventionDetailsView
                hasManageDeploymentsPermissions={this._getHasManageDeploymentPermissions()}
                instanceId={this.props.instanceId}
                cssClass={"mi-dv-logs"}
                hideViewLogsAction={true}
                invokedSource={ActionTelemetrySource.LogsTab}
                environmentId={this.props.manualIntervention.releaseEnvironment.id}
                environmentName={this.props.manualIntervention.releaseEnvironment.name}
            />
        );
    }

    @autobind
    private _onClose(): void {
        this.setState({
            showPanel: false
        });
    }

    @autobind
    private _onResumeRejectButtonClick(): void {
        if (this.props.onPanelOpen) {
            this.props.onPanelOpen(this.props.verticalTabItemKey);
        }

        this.setState({
            showPanel: true
        });
    }

    private _getHasManageDeploymentPermissions(): boolean {
        const releaseDefinition = this.props.manualIntervention.releaseDefinition;
        const projectId = getDefaultWebContext().project.id;

        return PermissionHelper.hasManageDeploymentsPermissions(this.props.definitionPath, releaseDefinition.id, projectId, this.props.definitionEnvironmentId);
    }

    private _onStoreChange = (): void => {
        const miViewState = this._manualInterventionViewStore.getState();
        this.setState({
            showResumeRejectButton: miViewState.status === RMContracts.ManualInterventionStatus.Pending,
            miStatus: miViewState.status
        });
    }

    private _getDefaultOverviewAriaLabel(): string {
        if (this.props.manualIntervention) {
            const statusTextFormat = ReleaseManualInterventionStatusHelper.getStatusTitleFormat(this.props.manualIntervention.status, this.props.manualIntervention.name) || "";
            const statusText = ReleaseManualInterventionStatusHelper.getStatusTitle(this.props.manualIntervention.status, this.props.manualIntervention.modifiedOn || new Date()) || "";

            return localeFormat(statusTextFormat, statusText);
        }

        return "";
    }

    private _manualInterventionActionCreator: ReleaseManualInterventionActionCreator;
    private _manualInterventionViewStore: ReleaseManualInterventionDetailsViewStore;
}
