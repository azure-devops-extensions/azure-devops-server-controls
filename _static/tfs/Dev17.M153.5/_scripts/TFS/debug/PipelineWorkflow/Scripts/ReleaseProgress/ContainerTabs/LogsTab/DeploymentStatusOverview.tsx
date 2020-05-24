/// <reference types="react" />
import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { DefaultVerticalItemRenderer } from "DistributedTaskUI/Logs/VerticalTab/DefaultVerticalItemRenderer";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";

import { IconButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";

import {
    DeploymentAttemptsHelper,
} from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentAttemptsHelper";
import { LogsTabTelemetryHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/LogsTabTelemetryHelper";
import { ReleaseDeploymentAttemptHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseDeploymentAttemptHelper";
import { IReleaseEnvironmentStatusInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/DeploymentStatusOverview";

export interface IDeploymentStatusOverviewProps extends ComponentBase.IProps {
    attempts: RMContracts.DeploymentAttempt[];
    environment: RMContracts.ReleaseEnvironment;
    selectedAttempt: number;
    onAttemptClick: (attemptNumber: number) => void;
}

export class DeploymentStatusOverview extends ComponentBase.Component<IDeploymentStatusOverviewProps, ComponentBase.IStateless> {

    public render(): JSX.Element {
        const attempts = this.props.attempts;
        return (
            <div className="deployment-status-overview">
                <FocusZone className="deployment-status-overview-focusZone" direction={FocusZoneDirection.horizontal} isCircularNavigation={true}>
                    {this._getOverviewSection()}
                    {attempts && attempts.length > 1 && this._getButtonSeparator()}
                    {attempts && attempts.length > 1 && this._getViewAttemptsButton()}
                </FocusZone>
            </div>
        );
    }

    private _getOverviewSection(): JSX.Element {
        const attempt = ReleaseDeploymentAttemptHelper.getDeploymentAttemptForAttemptNumber(this.props.attempts, this.props.selectedAttempt);
        const deploymentAttemptHelper: ReleaseDeploymentAttemptHelper = ReleaseDeploymentAttemptHelper.createReleaseDeploymentAttemptHelper(this.props.environment, attempt);
        
        if (attempt) {
            const displayName: string = DeploymentAttemptsHelper.getAttemptDisplayName(this.props.attempts, this.props.selectedAttempt);
            const statusInfo: IReleaseEnvironmentStatusInfo = deploymentAttemptHelper.getStatusInfo();
            const footerText = statusInfo.statusText;
            return (
                <DefaultVerticalItemRenderer
                    title={displayName}
                    footerText={footerText}
                />
            );
        } else {
            return null;
        }
    }

    private _getButtonSeparator(): JSX.Element {
        return (
            <div className="attempt-selection-button-separator" />
        );
    }

    private _getViewAttemptsButton(): JSX.Element {
        return (
            <IconButton
                className="view-attempts-button"
                iconProps={{ iconName: "ChevronDown" }}
                ariaLabel={Resources.ViewAttemptsAriaLabel}
                menuIconProps={{ className: "view-attempts-menu-icon" }}
                menuProps={{
                    shouldFocusOnMount: true,
                    isBeakVisible: false,
                    items: this._getAttemptsDropdownItems(),
                    directionalHint: DirectionalHint.bottomRightEdge
                }}>
            </IconButton>
        );
    }

    private _getAttemptsDropdownItems(): IContextualMenuItem[] {
        const menuItems: IContextualMenuItem[] = [];
        for (let attempt of this.props.attempts) {
            const item: IContextualMenuItem = {
                key: Utils_String.format(DeploymentStatusOverview._attemptKey, attempt.attempt),
                ariaLabel: Utils_String.localeFormat(Resources.AttemptNumberText, attempt.attempt),
                className: "fabric-style-overrides commandBar-hover-override",
                onRender: (item: any, dismissMenu: (ev?: any, dismissAll?: boolean) => void) => { return this._renderAttempt(attempt, dismissMenu); }
            };
            menuItems.push(item);
        }

        return menuItems;
    }

    private _renderAttempt = (attempt: RMContracts.DeploymentAttempt, dismissMenu: (ev?: any, dismissAll?: boolean) => void): JSX.Element => {
        let status = DeploymentAttemptsHelper.getDeploymentViewStatus(attempt.status);
        let attemptText = Utils_String.localeFormat(Resources.AttemptNumberText, attempt.attempt);
        const friendlyCompletedTime: string = this._getCompletedTime(attempt);
        const footerText = friendlyCompletedTime ? Utils_String.localeFormat("{0} {1}", status.status, friendlyCompletedTime) : status.status;
        return (
            <div className={"deployment-attempt-menu-item"}
                key={Utils_String.format(DeploymentStatusOverview._attemptKey, attempt.attempt)}
                role="menuitem"
                data-is-focusable="true"
                onClick={() => { this._onAttemptClick(attempt.attempt, dismissMenu); }}>
                <DefaultVerticalItemRenderer
                    statusIconProps={status.statusProps}
                    title={attemptText}
                    footerText={footerText}
                />
            </div>
        );
    }

    private _getCompletedTime(attempt: RMContracts.DeploymentAttempt): string {
        const deploymentAttemptHelper: ReleaseDeploymentAttemptHelper = ReleaseDeploymentAttemptHelper.createReleaseDeploymentAttemptHelper(this.props.environment, attempt);
        const completedTime: Date = deploymentAttemptHelper.getDeploymentCompletedTime();
        const friendlyCompletedTime: string = completedTime ? new FriendlyDate(completedTime, PastDateMode.ago, true).toString() : null;
        return friendlyCompletedTime;
    }

    private _onAttemptClick(attemptNumber: number, dismissMenu: (ev?: any, dismissAll?: boolean) => void): void {
        if (this.props.onAttemptClick) {
            this.props.onAttemptClick(attemptNumber);
            LogsTabTelemetryHelper.publishAttemptChangeTelemetry();
        }
        dismissMenu();
    }

    private static readonly _attemptKey = "Attempt-{0}";
}
