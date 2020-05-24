/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { PanelComponent } from "DistributedTaskControls/Components/PanelComponent";
import { IStepStatus, StepComponent } from "DistributedTaskUI/Logs/StepComponent";

import { DefaultButton, IconButton } from "OfficeFabric/Button";
import { IIconStyleProps } from "OfficeFabric/Icon";
import { css, autobind } from "OfficeFabric/Utilities";
import { IFocusTrapZoneProps, IFocusTrapZone } from "OfficeFabric/FocusTrapZone";

import { ReleaseApprovalPostDeployDetailsViewForLogs } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleaseApprovalPostDeployDetailsViewForLogs";
import { ReleaseApprovalPreDeployDetailsViewForLogs } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleaseApprovalPreDeployDetailsViewForLogs";
import { LogsTabTelemetryHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabTelemetryHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { IStatusProps } from "VSSUI/Status";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabApprovalDetailsView";

export interface ILogsTabApprovalDetailsViewProps extends ComponentBase.IProps {
    title: string;
    stepStatus: IStepStatus;
    statusProps: IStatusProps;
    environmentName: string;
    approvalType: RMContracts.ApprovalType;
    showApproveButtonDelegate: (approvalType: RMContracts.ApprovalType) => IPromise<boolean>;
    verticalTabItemKey?: string;
    isEditMode?: boolean;
    onPanelOpen?: (key: string) => void;
}

export interface ILogsTabApprovalDetailsViewState extends ComponentBase.IState {
    showPanel: boolean;
    showApproveButton: boolean;
}

export class LogsTabApprovalDetailsView extends ComponentBase.Component<ILogsTabApprovalDetailsViewProps, ILogsTabApprovalDetailsViewState> {

    constructor(props: ILogsTabApprovalDetailsViewProps) {
        super(props);
        this.state = { showApproveButton: false, showPanel: false };
        this._onApproveButtonClick = this._onApproveButtonClick.bind(this);
        this._closePanel = this._closePanel.bind(this);
    }

    public componentWillMount(): void {
        this._setApprovalButtonState();
    }

    public componentWillReceiveProps(nextProps: ILogsTabApprovalDetailsViewProps): void {
        this._setApprovalButtonState();
    }

    public render(): JSX.Element {
        const iconClassName = css("logs-approval-step-status-icon", this.props.stepStatus.className);
        const stepStatusClassName = css("logs-approval-step-status", this.props.stepStatus.className);
        const isTitleClickable = this.props.isEditMode ? false : true;
        const rightSection = this.props.isEditMode ? null : this._getRightSection();

        return (
            <div className="logs-approval-details-view-container">
                <StepComponent
                    isTitleClickable={isTitleClickable}
                    onActionClick={this._onApproveButtonClick}
                    title={this.props.title}
                    hasSepartor={true}
                    stepStatus={{ status: this.props.stepStatus.status, className: stepStatusClassName }}
                    statusProps={{ className: iconClassName, statusProps: this.props.statusProps }}
                    cssClass={"logs-approval-step-content"}
                    tooltipContent={Resources.ViewApproval}
                    rightSection={rightSection}
                >
                </StepComponent>
                {this.state.showPanel &&
                    <PanelComponent
                        onRenderNavigation={this._renderNavigationHeader}
                        showPanel={this.state.showPanel}
                        onClose={this._closePanel}
                        isBlocking={true}
                        isLightDismiss={true}
                        focusTrapZoneProps={
                            {
                                firstFocusableSelector: "logs-approval-navigation-style",
                                componentRef: this._resolveRef("_focusTrapZoneHandler"),
                                isClickableOutsideFocusTrap: true
                            } as IFocusTrapZoneProps
                        }

                    >
                        {this._getApprovalDetailsView()}
                    </PanelComponent>
                }
            </div>
        );
    }

    private _renderNavigationHeader = (): JSX.Element => {
        return (
            <div className="navigation-header">
                <IconButton
                    iconProps={{ iconName: "ChromeClose", getStyles: this._getIconStyles }}
                    className={"logs-approval-navigation-style"}
                    onClick={this._closePanel}
                    ariaLabel={Resources.CloseText}
                />
            </div>
        );
    }

    private _getIconStyles = (props: IIconStyleProps) => {
        return ({
            root: ["approval-logs-close-panel-icon"]
        });

    }

    private _getRightSection(): JSX.Element {
        const showApproveButton: boolean = this.state.showApproveButton;
        const text: string = showApproveButton ? Resources.ApproveNowAction : Resources.ViewApproval;

        const rightSection: JSX.Element =
            <div className="logs-approval-step-right-section">
                <div>
                    <DefaultButton
                        onClick={this._onApproveButtonClick}
                        ariaHidden={true}
                        primary={showApproveButton}
                        tabIndex={-1}
                        text={text}
                        title={text}
                        className={"canvas-approve-button"}
                    />
                </div>
            </div>;

        return rightSection;
    }

    private _getApprovalDetailsView(): JSX.Element {
        if (this.props.approvalType === RMContracts.ApprovalType.PreDeploy) {
            return <ReleaseApprovalPreDeployDetailsViewForLogs
                instanceId={this.props.instanceId}
                environmentName={this.props.environmentName}
                label={Resources.PreDeploymentApproversHeading}
                onApprovalActionCallback={this._setFocusOnCloseButton} />;
        } else if (this.props.approvalType === RMContracts.ApprovalType.PostDeploy) {
            return <ReleaseApprovalPostDeployDetailsViewForLogs
                instanceId={this.props.instanceId}
                environmentName={this.props.environmentName}
                label={Resources.PostDeploymentApproversHeading}
                onApprovalActionCallback={this._setFocusOnCloseButton} />;
        }
    }

    @autobind
    private _setFocusOnCloseButton() {
        if (this._focusTrapZoneHandler && this._focusTrapZoneHandler.focus) {
            this._focusTrapZoneHandler.focus();
        }
    }

    private _setApprovalButtonState() {
        if (this.props.showApproveButtonDelegate) {
            this.props.showApproveButtonDelegate(this.props.approvalType).then((status: boolean) => {
                // Don't set state if status of approval button is same to avoid rerendering
                if (this.state.showApproveButton !== status) {
                    this.setState({ showApproveButton: status });
                }
            }, () => {
                this.setState({ showApproveButton: false });
            });
        }
    }

    private _closePanel() {
        this.setState({ showPanel: false } as ILogsTabApprovalDetailsViewState);
    }

    private _onApproveButtonClick() {
        this.setState({ showPanel: true } as ILogsTabApprovalDetailsViewState);
        LogsTabTelemetryHelper.publishViewApprovalClickActionTelemetry(this.state.showApproveButton);
        if (this.props.onPanelOpen) {
            this.props.onPanelOpen(this.props.verticalTabItemKey);
        }
    }

    private _focusTrapZoneHandler: IFocusTrapZone;
}
