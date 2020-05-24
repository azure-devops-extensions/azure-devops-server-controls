/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";

import { autobind, css } from "OfficeFabric/Utilities";

import { CustomOverlayPanelHeading } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/CustomOverlayPanelHeading";
import {
    IReleaseConditionDetailsViewState,
    ReleaseConditionDetailsViewStore
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseConditionDetailsViewStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import {
    ReleaseApprovalStatusIndicator,
    ReleaseGatesStatusIndicator,
    ReleaseIndicatorType
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { LogsTabActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabActionsCreator";
import { ReleaseProgressNavigateStateActions, CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import {
    ReleaseProgressCanvasTelemetryHelper,
    CanvasClickTargets,
    ReleaseConditionDetailsViewTelemetryFeature
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

import * as NavigationService from "VSS/Navigation/Services";
import { PivotBar, PivotBarItem } from "VSSUI/PivotBar";
import { IPivotBarAction } from "VSSUI/Components/PivotBar";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseConditionDetailsView";

export interface IReleaseConditionDetailsViewProps extends Base.IProps {
    environmentName: string;
    label: string;
    sourceLocation: string;
    initialSelectedPivot?: ReleaseIndicatorType;
}

export interface IReleaseConditionDetailsState extends Base.IState {
    storeState: IReleaseConditionDetailsViewState;
    selectedPivot: string;
}

export abstract class ReleaseConditionDetailsView extends Base.Component<IReleaseConditionDetailsViewProps, IReleaseConditionDetailsState> {

    public componentWillMount() {
        this._viewStore = this.getViewStore();
        this._viewStore.addChangedListener(this._onChange);
        let storeState: IReleaseConditionDetailsViewState = this._viewStore.getState();
        let initialSelectedPivot: string = this._getPivotKeyFromPivotType(this.props.initialSelectedPivot ? this.props.initialSelectedPivot : storeState.defaultPivot);

        this.setState({
            storeState: storeState,
            selectedPivot: initialSelectedPivot
        });

        this._publishTelemetry(ReleaseConditionDetailsViewTelemetryFeature.releaseConditionPanelOpenTelemetry,
            this.props.sourceLocation,
            initialSelectedPivot,
            this.getApprovalStatus(storeState),
            this.getGateStatus(storeState));
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (
            <div>
                {this._getHeaderElement()}
                {this._getTabs()}
            </div>
        );
    }

    private _getHeaderElement(): JSX.Element {
        return (
            <div className="approval-panel-header">
                <CustomOverlayPanelHeading
                    header={this.props.environmentName}
                    descriptionLabel={this.props.label}
                    descriptionIconProps={this.state.storeState.descriptionIconProps}
                    descriptionStatus={this.state.storeState.description}
                    descriptionStatusClass={"desc-icon"} >
                </CustomOverlayPanelHeading>
            </div>
        );
    }

    private _getTabs(): JSX.Element {

        let pivotBar: JSX.Element = (
            <PivotBar showPivots={true}
                headerAriaLabel={Resources.ReleaseConditionsNavigationLabel}
                className="cd-deployment-condition-pivot-bar"
                selectedPivot={this.state.selectedPivot}
                onPivotClicked={this._onPivotClicked}>
                <PivotBarItem
                    itemKey={ReleaseConditionDetailsView.c_approvalPivotKey}
                    name={Resources.ApproversLabel}
                    hidden={!this.state.storeState.canShowApprovals}
                    commands={this._getPivotCommands(true)}
                    className={"cd-deployment-condition-pivot-bar-item"} >
                    {
                        this.state.storeState.canShowApprovals ? this.getApprovalContent() : null
                    }
                </PivotBarItem>
                <PivotBarItem
                    itemKey={ReleaseConditionDetailsView.c_gatesPivotKey}
                    name={Resources.GatesLabel}
                    hidden={!this.state.storeState.canShowGates}
                    commands={this._getPivotCommands(false)}
                    className={"cd-deployment-condition-pivot-bar-item"} >
                    {
                        this.state.storeState.canShowGates ? this.getGatesContent() : null
                    }
                </PivotBarItem>
            </PivotBar>
        );

        return pivotBar;
    }

    private _getPivotCommands(approvalsPivot: boolean): IPivotBarAction[] {
        return [{
            key: "approval-view-logs-button",
            name: Resources.ViewLogsButtonText,
            title: Resources.ViewLogsButtonText,
            iconProps: { className: "bowtie-icon bowtie-arrow-open" },
            onClick: () => { this._onViewLogsClick(approvalsPivot); },
            important: true
        }];
    }

    @autobind
    private _onViewLogsClick(approvalsPivot: boolean): void {
        ReleaseProgressCanvasTelemetryHelper.publishClickActionTelemetry(approvalsPivot ? CanvasClickTargets.approvalPanelViewLogsButton : CanvasClickTargets.gatesPanelViewLogsButton);

        //  Add history point using navigation services while navigating to Logs tab
        NavigationService.getHistoryService().addHistoryPoint(ReleaseProgressNavigateStateActions.ReleaseEnvironmentLogs, { environmentId: this._viewStore.getReleaseEnvironmentId() }, null, false, true);
    }

    @autobind
    private _onPivotClicked(ev: React.MouseEvent<HTMLElement>, pivotKey: string) {

        this._publishTelemetry(ReleaseConditionDetailsViewTelemetryFeature.releaseConditionPivotSwitchTelemetry,
            this.props.sourceLocation,
            pivotKey,
            this.getApprovalStatus(this.state.storeState),
            this.getGateStatus(this.state.storeState),
            this.state.selectedPivot);

        this.setState({
            selectedPivot: pivotKey
        });
    }

    private _onChange = () => {
        this.setState({
            storeState: this._viewStore.getState()
        });
    }

    private _getPivotKeyFromPivotType(pivotType: ReleaseIndicatorType): string {
        switch (pivotType) {
            case ReleaseIndicatorType.Approval:
                return ReleaseConditionDetailsView.c_approvalPivotKey;
            case ReleaseIndicatorType.Gate:
                return ReleaseConditionDetailsView.c_gatesPivotKey;
        }
    }

    private _publishTelemetry(featureName: string,
        sourceLocation: string,
        newSelectedPivot: string,
        approvalStatus: string,
        gateStatus: string,
        oldSelectedPivot?: string): void {

        ReleaseProgressCanvasTelemetryHelper.publishReleaseConditionDetailsViewTelemetry(featureName, sourceLocation, newSelectedPivot, approvalStatus, gateStatus, oldSelectedPivot);
    }

    protected _approvalActionCallback(): void {
        const overlayPanelActions = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        overlayPanelActions.setFocusOnCloseButton();
    }

    protected abstract getViewStore(): ReleaseConditionDetailsViewStore;
    protected abstract getApprovalContent(): JSX.Element;
    protected abstract getGatesContent(): JSX.Element;
    protected abstract getApprovalStatus(storeState: IReleaseConditionDetailsViewState): ReleaseApprovalStatusIndicator;
    protected abstract getGateStatus(storeState: IReleaseConditionDetailsViewState): ReleaseGatesStatusIndicator;

    private _viewStore: ReleaseConditionDetailsViewStore;

    public static readonly c_approvalPivotKey: string = "approvals";
    public static readonly c_gatesPivotKey: string = "gates";
}