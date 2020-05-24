import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { ModifiedOval } from "DistributedTaskControls/Components/Canvas/ModifiedOval";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";

import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import { ReleaseIndicator, IReleaseIndicatorProps } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseIndicator";
import {
    ApprovalExecutionOrderIndicator,
    IDeploymentConditionsInfo,
    IndicatorSizeAndPosition,
    ReleaseApprovalStatusIndicator,
    ReleaseGatesStatusIndicator,
    ReleaseEditorMode,
    ReleaseIndicatorType,
    IIndicatorViewInfo,
    OverallStatusIndicator
} from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleaseApprovalStatusHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalStatusHelper";
import { ReleaseGateStatusHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGateStatusHelper";
import { ReleaseProgressCanvasTelemetryHelper, CanvasClickTargets } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

import { mergeStyles } from "OfficeFabric/Styling";
import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseDeploymentIndicator";

export interface IReleaseDeploymentIndicatorProps extends Base.IProps {
    deploymentConditionsInfo: IDeploymentConditionsInfo;
    environmentName: string;
}

export abstract class ReleaseDeploymentIndicator extends Base.Component<IReleaseDeploymentIndicatorProps, Base.IStateless>{

    public render(): JSX.Element | null {

        if (!this.props.deploymentConditionsInfo) {
            return null;
        }

        let approvalInfo = this.props.deploymentConditionsInfo.approvalInfo;
        const gatesInfo = this.props.deploymentConditionsInfo.gatesInfo;

        const ovalMarginTop = ((LayoutConstants.releaseCorePropertiesHeight - LayoutConstants.prePostDeploymentApprovalsAndGatesElementHeight) / 2);
        const circleMarginTop = ((LayoutConstants.releaseCorePropertiesHeight - (2 * LayoutConstants.postDeploymentIndicatorElementRadius)) / 2);

        const overallStatusIndicator = this.props.deploymentConditionsInfo.overallStatusIndicator;
        const overallStatus = overallStatusIndicator && overallStatusIndicator.overallStatus || "";
        const tooltip = overallStatusIndicator && overallStatusIndicator.tooltip ? overallStatusIndicator.tooltip : overallStatus.toString();

        if (approvalInfo && gatesInfo) {
            const ovalClassName = css("cd-approvals-and-gates", overallStatus ? "cd-approvals-and-gates-" + overallStatus.toString().toLowerCase() : null);
            const approvalsBeforeGates: boolean = this.props.deploymentConditionsInfo.approvalsBeforeGates;
            const approvalElement: JSX.Element = this._getApprovalsElement(approvalInfo.statusIndicator, approvalsBeforeGates ? IndicatorSizeAndPosition.SmallTop : IndicatorSizeAndPosition.SmallBottom);
            const gateElement: JSX.Element = this._getGatesElement(gatesInfo.statusIndicator, approvalsBeforeGates ? IndicatorSizeAndPosition.SmallBottom : IndicatorSizeAndPosition.SmallTop);

            return (
                <OverlayPanelSelectable
                    instanceId={CanvasSelectorConstants.ReleaseCanvasSelectorInstance}
                    getItem={this._getItem}
                    cssClass="cd-pre-deployment-checks"
                    tooltipProps={{
                        content: tooltip,
                        directionalHint: DirectionalHint.bottomCenter
                    }}
                    onShowOverlayPanel={this._publishClickActionTelemetry}>
                    <ModifiedOval
                        width={LayoutConstants.triggersAndPreDeploymentApprovalsElementWidth}
                        height={LayoutConstants.prePostDeploymentApprovalsAndGatesElementHeight}
                        cssClass={css(ovalClassName, mergeStyles({ marginTop: ovalMarginTop }))}
                        ovalClass="cd-pre-deployment-checks-content">
                        <div className="cd-environment-pre-deployment-parent-container">
                            {approvalsBeforeGates ? approvalElement : gateElement}
                            {approvalsBeforeGates ? gateElement : approvalElement}
                        </div>
                    </ModifiedOval>
                </OverlayPanelSelectable>
            );
        }
        else if (approvalInfo) {
            return this._getApprovalsElement(approvalInfo.statusIndicator, IndicatorSizeAndPosition.Big, true, circleMarginTop, tooltip);
        }
        else if (gatesInfo) {
            return this._getGatesElement(gatesInfo.statusIndicator, IndicatorSizeAndPosition.Big, true, circleMarginTop, tooltip);
        }
        else {
            return null;
        }
    }

    protected abstract _getItem(): Item;

    protected abstract _getClickTargetName(): string;

    private _getApprovalsElement = (approvalStatusIndicator: ReleaseApprovalStatusIndicator, indicatorSizeAndPosition: IndicatorSizeAndPosition,
        isOnlyApprovals?: boolean, approvalsTopMargin?: number, tooltip?: string): JSX.Element => {
        const indicatorProps: IReleaseIndicatorProps = {
            statusName: approvalStatusIndicator.toLowerCase(),
            indicatorSizeAndPosition: indicatorSizeAndPosition,
            indicatorViewInfo: this.getApprovalViewInfo(),
            indicatorName: ReleaseIndicatorType.Approval
        };

        if (isOnlyApprovals) {
            return (
                <OverlayPanelSelectable
                    instanceId={CanvasSelectorConstants.ReleaseCanvasSelectorInstance}
                    getItem={this._getItem}
                    tooltipProps={{
                        content: tooltip,
                        directionalHint: DirectionalHint.bottomCenter
                    }}
                    cssClass={css("cd-environment-approval-or-gate-cicle", this.props.cssClass + "-approvals", mergeStyles({ marginTop: approvalsTopMargin }))}
                    onShowOverlayPanel={this._publishClickActionTelemetry}>
                    <ReleaseIndicator  {...indicatorProps} isSelectable={true} />
                </OverlayPanelSelectable>
            );
        } else {
            return (
                <div className={this.props.cssClass + "-approvals"}>
                    <ReleaseIndicator {...indicatorProps} />
                </div>
            );
        }
    }

    private _publishClickActionTelemetry = (): void => {
        ReleaseProgressCanvasTelemetryHelper.publishClickActionTelemetry(this._getClickTargetName());
    }

    private _getGatesElement = (gatesStatusIndicator: ReleaseGatesStatusIndicator, indicatorSizeAndPosition: IndicatorSizeAndPosition,
        isOnlyGates?: boolean, gatesTopMargin?: number, tooltip?: string): JSX.Element => {
        const indicatorProps: IReleaseIndicatorProps = {
            statusName: gatesStatusIndicator.toLowerCase(),
            indicatorSizeAndPosition: indicatorSizeAndPosition,
            indicatorViewInfo: this.getGateViewInfo(),
            indicatorName: ReleaseIndicatorType.Gate
        };
        if (isOnlyGates) {
            return (
                <OverlayPanelSelectable
                    instanceId={CanvasSelectorConstants.ReleaseCanvasSelectorInstance}
                    getItem={this._getItem}
                    tooltipProps={{
                        content: tooltip,
                        directionalHint: DirectionalHint.bottomCenter
                    }}
                    cssClass={css("cd-environment-approval-or-gate-cicle", this.props.cssClass + "-gates", mergeStyles({ marginTop: gatesTopMargin }))}
                    onShowOverlayPanel={this._publishClickActionTelemetry}>
                    <ReleaseIndicator {...indicatorProps} isSelectable={true} />
                </OverlayPanelSelectable>
            );
        } else {
            return (
                <div className={this.props.cssClass + "-gates"}>
                    <ReleaseIndicator {...indicatorProps} />
                </div>
            );
        }
    }

    private getApprovalViewInfo(): IIndicatorViewInfo {
        return ReleaseApprovalStatusHelper.getApprovalInfo(this.props.deploymentConditionsInfo.approvalInfo.statusIndicator);
    }

    private getGateViewInfo(): IIndicatorViewInfo {
        return ReleaseGateStatusHelper.getGateInfo(this.props.deploymentConditionsInfo.gatesInfo.statusIndicator);
    }

}