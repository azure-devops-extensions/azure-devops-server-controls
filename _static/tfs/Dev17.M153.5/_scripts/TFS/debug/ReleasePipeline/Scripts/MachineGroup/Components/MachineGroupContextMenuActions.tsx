/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import Dialogs = require("VSS/Controls/Dialogs");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import { ContextualMenuButton } from "VSSUI/ContextualMenuButton";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import ContextualMenu = require("OfficeFabric/ContextualMenu");

import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import MachineGroupsActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupsActionCreator");
import MachineGroupActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import { getFabricIcon } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";


export interface Props extends IProps {
    deploymentGroupMetrics: Model.DeploymentGroupUIMetrics;
}

export class MachineGroupContextMenuActions extends Component<Props, IState> {

    protected _ellipsisButton: ContextualMenuButton;

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
        var items =
            [
                {
                    key: 'viewdetails',
                    name: Resources.OpenDeploymentGroupText,
                    iconProps: {iconName : "NavigateForward"},
                    onClick: () => {
                        this._onMachineGroupViewDetails();
                    }
                },
                {
                    key: 'updateagents',
                    name: Resources.UpdateTargets,
                    iconProps: {iconName : "Upload"},
                    disabled: !this._canUpgradeMachines(),
                    onClick: () => {
                        this._onUpgradeMachines();
                    }
                },
                {
                    key: 'delete',
                    name: Resources.DeleteMachineGroupText,
                    iconProps: {iconName : "Delete"},
                    onClick: () => {
                        this._onMachineGroupDelete();
                    }
                },
                {
                    key: 'security',
                    name: Resources.DeploymentGroupSecurity,
                    iconProps: {iconName : "Shield"},
                    onClick: () => {
                        this._showSecurityDialog();
                    }
                }
            ]
        return items;
    }

    private _onMachineGroupViewDetails(): void {
        let deploymentGroupMetrics: Model.DeploymentGroupUIMetrics = this.props.deploymentGroupMetrics;
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.ListMachinesScenario);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupView, mgid: deploymentGroupMetrics.id});
    }

    private _onMachineGroupDelete(): void {
        let deploymentGroupMetrics: Model.DeploymentGroupUIMetrics = this.props.deploymentGroupMetrics;
        let titleText = Utils_String.format(Resources.DeleteMachineGroupConfirmationTitle, deploymentGroupMetrics.name);
        let description = Resources.DeleteMachineGroupConfirmationDescription;
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                close: () => {
                    if (this._ellipsisButton) {
                        this._ellipsisButton.focus();
                    }
                },
                okCallback: (data: any) => {
                    PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.DeleteMachineGroupScenario);
                    MachineGroupsActionCreator.ActionCreator.deleteMachineGroup(deploymentGroupMetrics.id);
                },
                title: titleText,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }

    private _onUpgradeMachines(): void {
        let deploymentGroupMetrics: Model.DeploymentGroupUIMetrics = this.props.deploymentGroupMetrics;
        let titleText = Utils_String.localeFormat(Resources.UpgradeMachinesConfirmationTitle, deploymentGroupMetrics.name);
        let description = Utils_String.localeFormat(Resources.UpgradeMachinesConfirmationDescription, deploymentGroupMetrics.name);
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                close: () => {
                    if (this._ellipsisButton) {
                        this._ellipsisButton.focus();
                    }
                },
                okCallback: (data: any) => {
                    if (this._canUpgradeMachines()) {
                        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.UpgradeMachinesScenario);
                        MachineGroupActionCreator.ActionCreator.upgradeMachines(deploymentGroupMetrics.id);
                    }
                },
                title: titleText,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }

    private _showSecurityDialog() {
        if (this.props.deploymentGroupMetrics) {
            MGUtils.showSecurityDialog(this.props.deploymentGroupMetrics.id, this.props.deploymentGroupMetrics.name);
        }
    }

    private _canUpgradeMachines(): boolean {
        let deploymentGroupMetrics: Model.DeploymentGroupUIMetrics = this.props.deploymentGroupMetrics;
        return (!!deploymentGroupMetrics && deploymentGroupMetrics.count > 0);
    }
}
