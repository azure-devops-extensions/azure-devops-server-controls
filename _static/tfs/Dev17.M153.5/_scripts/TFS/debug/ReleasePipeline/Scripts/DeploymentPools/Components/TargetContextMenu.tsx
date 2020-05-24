/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import Dialogs = require("VSS/Controls/Dialogs");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import { ContextualMenuButton } from "VSSUI/ContextualMenuButton";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import ContextualMenu = require("OfficeFabric/ContextualMenu");
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import { DeploymentPoolTarget } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model";
import { DeploymentPoolTargetsActionCreator } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolTargetsActionCreator";
import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import { getFabricIcon } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");

export interface Props extends IProps {
    poolId: number;
    target: DeploymentPoolTarget;
}

export class TargetContextMenu extends Component<Props, IStateless> {
    constructor(props ?: Props) {
        super(props);
        this._deploymentPoolTargetsActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolTargetsActionCreator>(DeploymentPoolTargetsActionCreator, this.props.instanceId);
    }

    public render(): JSX.Element {
        return (
            <div className={"action-icon"} >
                <ContextualMenuButton 
                    ref={(c) => this._ellipsisButton = c}
                    title = {Resources.MoreActions}
                    iconProps = {getFabricIcon("More")}
                    getItems={ () => this.getMenuItems()} />
            </div>
        );
    }

    protected getMenuItems(): ContextualMenu.IContextualMenuItem[] {
        if (RMUtilsCore.FeatureFlagUtils.isDisabledDeploymentTargetEnabled()){
            return [
                {
                    key: 'viewdetails',
                    name: Resources.OpenText,
                    iconProps: {iconName : "NavigateForward"},
                    onClick: () => {
                        this._onViewTargetDetails();
                    }
                },
                {
                    key: 'enable',
                    name: Resources.EnableText,
                    iconProps: {iconName : "OfflineOneDriveParachute"},
                    disabled: this.props.target.enabled,
                    onClick: () => {
                        this._onUpdateTargetState(true);
                    }
                },
                {
                    key: 'disable',
                    name: Resources.DisableText,
                    iconProps: {iconName : "OfflineOneDriveParachuteDisabled"},
                    disabled: !this.props.target.enabled,
                    onClick: () => {
                        this._onUpdateTargetState(false);
                    }
                },
                {
                    key: 'delete',
                    name: Resources.DeleteText,
                    iconProps: {iconName : "Delete"},
                    onClick: () => {
                        this._onTargetDelete();
                    }
                }
            ];
        }

        let items =
            [
                {
                    key: 'viewdetails',
                    name: Resources.OpenText,
                    iconProps: {iconName : "NavigateForward"},
                    onClick: () => {
                        this._onViewTargetDetails();
                    }
                },
                {
                    key: 'delete',
                    name: Resources.DeleteText,
                    iconProps: {iconName : "Delete"},
                    onClick: () => {
                        this._onTargetDelete();
                    }
                }
            ];
        return items;
    }

    private _onViewTargetDetails(): void {
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { targetid: this.props.target.id });
    }

    private _onTargetDelete(): void {
        let target: DeploymentPoolTarget = this.props.target;
        let titleText = Utils_String.format(Resources.DeleteMachineConfirmationTitle, target.name);
        let description = Resources.DeleteMachineConfirmationDescription;
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                close: () => {
                    if (this._ellipsisButton) {
                        this._ellipsisButton.focus();
                    }
                },
                okCallback: (data: any) => {
                    PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.DeleteTargetScenario);
                    this._deploymentPoolTargetsActionCreator.deleteTarget(this.props.poolId, target.id);
                },
                title: titleText,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }

    private _onUpdateTargetState(enabled: boolean): void {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.UpdateDeploymentTargetScenario);
        this._deploymentPoolTargetsActionCreator.updateDeploymentTarget(this.props.poolId, this.props.target, enabled);
    }

    private _ellipsisButton: ContextualMenuButton;
    private _deploymentPoolTargetsActionCreator: DeploymentPoolTargetsActionCreator;
}