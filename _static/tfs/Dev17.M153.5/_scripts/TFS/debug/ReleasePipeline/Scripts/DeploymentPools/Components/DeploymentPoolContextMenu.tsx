// Copyright (c) Microsoft Corporation.  All rights reserved.

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
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import { DeploymentPoolsActionCreator } from"ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolsActionCreator";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import { getFabricIcon } from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

export interface Props extends IProps {
    deploymentPoolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary;
}

export class DeploymentPoolContextMenuActions extends Component<Props, IState> {

    constructor(props: Props) {
        super(props);
        this._deploymentPoolsActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolsActionCreator>(DeploymentPoolsActionCreator);
    }

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
                    name: Resources.OpenText,
                    iconProps: {iconName : "NavigateForward"},
                    onClick: () => {
                        this._onDeploymentPoolViewDetails();
                    }
                },
                {
                    key: 'upgradetargets',
                    name: Resources.UpdateTargets,
                    iconProps: {iconName : "Upload"},
                    disabled: !this._canUpgradeTargets(),
                    onClick: () => {
                        this._onUpgradeTargets();
                    }
                },
                {
                    key: 'delete',
                    name: Resources.DeleteText,
                    iconProps: {iconName : "Delete"},
                    onClick: () => {
                        this._onDeploymentPoolDelete();
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

    private _onDeploymentPoolViewDetails(): void {
        let deploymentPoolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary = this.props.deploymentPoolSummary;
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.LandingOnDeploymentPoolTargetsPageScenario);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: DPUtils.DeploymentPoolsConstants.DeploymentPoolView, poolid: deploymentPoolSummary.id});
    }

    private _onDeploymentPoolDelete(): void {
        let deploymentPoolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary = this.props.deploymentPoolSummary;
        let titleText = Utils_String.format(Resources.DeleteDeploymentPoolConfirmationTitle, deploymentPoolSummary.name);
        let description = Resources.DeleteDeploymentPoolConfirmationDescription;
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                close: () => {
                    if (this._ellipsisButton) {
                        this._ellipsisButton.focus();
                    }
                },
                okCallback: (data: any) => {
                    PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.DeleteDeploymentPoolScenario);
                    this._deploymentPoolsActionCreator.deleteDeploymentPool(deploymentPoolSummary.id);
                },
                title: titleText,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }

    private _canUpgradeTargets(): boolean {
        return !!this.props.deploymentPoolSummary && this.props.deploymentPoolSummary.size > 0;
    }

    private _showSecurityDialog() {
        if (this.props.deploymentPoolSummary) {
            DPUtils.showSecurityDialog(this.props.deploymentPoolSummary.id, this.props.deploymentPoolSummary.name);
        }
    }

    private _onUpgradeTargets(): void {
        let deploymentPoolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary = this.props.deploymentPoolSummary;
        let description = Utils_String.localeFormat(Resources.UpgradeMachinesConfirmationDescriptionForPool, deploymentPoolSummary.name);
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                close: () => {
                    if (this._ellipsisButton) {
                        this._ellipsisButton.focus();
                    }
                },
                okCallback: (data: any) => {
                    PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.UpgradeMachinesScenario);
                    this._deploymentPoolsActionCreator.upgradeDeploymentTargets(deploymentPoolSummary.id);
                },
                title: Resources.UpgradeMachinesConfirmationTitle,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }

    private _deploymentPoolsActionCreator: DeploymentPoolsActionCreator;
}
