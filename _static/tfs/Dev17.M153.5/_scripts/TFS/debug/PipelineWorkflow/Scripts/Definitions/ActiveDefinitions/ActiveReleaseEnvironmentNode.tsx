import * as React from "react";

import { Component, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";

import { PipelineReleaseApproval, PipelineEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { ActiveReleaseEnvironmentNodeHelper, ReleaseEnvironmentTileSize } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNodeHelper";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { EnvironmentSummaryNode, IEnvironmentSummaryNodeProps } from "PipelineWorkflow/Scripts/Shared/Canvas/EnvironmentSummaryNode";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleasesViewCanvasConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";

import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";

import * as Utils_String from "VSS/Utils/String";
import { registerLWPComponent } from "VSS/LWP";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleaseEnvironmentNode";

export interface IActiveReleaseEnvironmentNodeProps extends IEnvironmentSummaryNodeProps {
    environment: PipelineEnvironment;
    pendingApprovals: PipelineReleaseApproval[];
    envTileSize?: ReleaseEnvironmentTileSize;
    isLastDeployed?: boolean;
    onReleaseFound?: () => void;
}

export class ActiveReleaseEnvironmentNode extends Component<IActiveReleaseEnvironmentNodeProps, IStateless> {

    public render(): JSX.Element {

        let releaseEnvironment = this.props.environment;
        let statusIndicator = ActiveReleaseEnvironmentNodeHelper.getBorderColorCssPrefix(releaseEnvironment);
        let statusText = ActiveReleaseEnvironmentNodeHelper.getStatusText(releaseEnvironment);
        let computedStatus = ActiveReleaseEnvironmentNodeHelper.getComputedStatus(releaseEnvironment);
        let nodeDetailsInfo = ActiveReleaseEnvironmentNodeHelper.getSubStatusDetailsInfo(releaseEnvironment);

        let nodeWidth: number = ReleasesViewCanvasConstants.EnvironmentNodeWidthLarge;
        if (this.props.envTileSize === ReleaseEnvironmentTileSize.Small) {
            nodeWidth = ReleasesViewCanvasConstants.EnvironmentNodeWidthSmall;
        }

        return <ActiveReleaseEnvironmentNodeContent
            {...this.props}
            nodeHeight={ReleasesViewCanvasConstants.EnvironmentNodeHeight}
            nodeWidth={nodeWidth}
            envTileSize={this.props.envTileSize}
            cssClass={this.props.cssClass ? this.props.cssClass : "active-rel-env-node"}
            contentClass={css({ "last-deployed-env-node": !!this.props.isLastDeployed })}
            onResumeMIButtonClick={this._onMIResumeButtonClick}
            onApproveButtonClick={this._onApproveButtonClick}
            statusIndicator={statusIndicator}
            statusText={statusText}
            computedStatus={computedStatus}
            nodeDetailsInfo={nodeDetailsInfo}
        />;

    }

    private _onApproveButtonClick = (event: any): void => {
        if (this.props.onReleaseFound) {
            this.props.onReleaseFound();
        }
        DefinitionsUtils.onApprovalCalloutButtonClick(event, this.props.pendingApprovals[0].release.id);
    }

    private _onMIResumeButtonClick = (event: React.MouseEvent<HTMLButtonElement>, releaseId: number): void => {
        if (this.props.onReleaseFound) {
            this.props.onReleaseFound();
        }
        DefinitionsUtils.onApprovalCalloutButtonClick(event, releaseId);
    }
}

export class ActiveReleaseEnvironmentNodeContent extends EnvironmentSummaryNode<IActiveReleaseEnvironmentNodeProps> {

    public render(): JSX.Element {

        const describedByDivId: string = "node-description" + DtcUtils.getUniqueInstanceId();

        const tooltipCloseDelay = (((this.props.pendingApprovals && this._hasPendingApproval) || this._hasPendingManualIntervention) ? 500 : 0);

        const tooltipProps = this._getTooltipProps();

        return (
            <TooltipHost {...tooltipProps} closeDelay={tooltipCloseDelay}>
                <div
                    data-is-focusable={true}
                    data-is-grid-focusable={true}
                    onClick={this._onEnvironmentClick}
                    onKeyDown={this._onEnvironmentNodeKeyDown}
                    aria-label={this.props.environment.name}
                    aria-describedby={describedByDivId}>
                    <div className="hidden" id={describedByDivId}>{this._getTooltipDescription()}</div>
                    {
                        this._getNodeContent()
                    }
                </div>
            </TooltipHost>

        );
    }

    private _getTooltipDescription(): string {
        let tooltipDescription: string = "";
        let environmentDescription = this._getEnvironmentDescription();
        if (this._hasPendingApproval) {
            tooltipDescription = environmentDescription;
            for (const approval of this.props.pendingApprovals) {
                let approvalDescription: string = this._getApprovalDescription(approval);
                tooltipDescription = tooltipDescription.concat(approvalDescription);
            }
        }
        else if (this._hasPendingManualIntervention) {
            tooltipDescription = Utils_String.format("{0} {1} {2}", this.props.environment.name, environmentDescription, Resources.ResumeRejectText);
        }
        else {
            let nodeDetailsInfo = ActiveReleaseEnvironmentNodeHelper.getSubStatusDetailsInfo(this.props.environment);
            if (nodeDetailsInfo && nodeDetailsInfo.length > 0) {
                tooltipDescription = Utils_String.format("{0} {1} {2}", this.props.environment.name, environmentDescription, nodeDetailsInfo[0].ariaLabel);
            }
            else {
                tooltipDescription = Utils_String.format("{0} {1}", this.props.environment.name, environmentDescription);
            }
        }

        return tooltipDescription;
    }

    private _onEnvironmentClick = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
        if (this.props.onReleaseFound) {
            this.props.onReleaseFound();
        }

        const openInNewTab: boolean = !!event.ctrlKey;
        DefinitionsUtils.navigateToEnvironmentLogsView(this.props.environment.release.id, this.props.environment.id, openInNewTab);
    }

    private _onEnvironmentNodeKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter" || event.key === "" || event.key === "Spacebar") {
            if (this._onEnvironmentClick) {
                this._onEnvironmentClick(event);
            }
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _isAnyApprovalPendingOnMe(approval: PipelineReleaseApproval): boolean {
        return IdentityHelper.isThisMe(approval.approver.id);
    }

    private _getApprovalDescription(approval: PipelineReleaseApproval): string {
        if (!approval.approver) {
            return "";
        }
        const buttonText: string = this._isAnyApprovalPendingOnMe(approval) ? Resources.ApproveRejectText : Resources.ViewApproval;
        return (Utils_String.format("{0} {1} {2}", approval.approver.displayName, this._getFriendlyCreatedOnDate(approval.createdOn), buttonText));
    }

    private _getFriendlyCreatedOnDate(createdOnDate: Date): string {
        return createdOnDate ? new FriendlyDate(new Date(createdOnDate), PastDateMode.since, true).toString() : Utils_String.empty;
    }
}

registerLWPComponent("release-row-node", ActiveReleaseEnvironmentNode);