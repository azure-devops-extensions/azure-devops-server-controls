// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import Utils_String = require("VSS/Utils/String");
import Dialogs = require("VSS/Controls/Dialogs");
import {Fabric} from "OfficeFabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import {IHubViewState, HubViewState} from "VSSUI/Utilities/HubViewState";
import {Hub} from "VSSUI/Hub";
import {IHubBreadcrumbItem, HubHeader} from "VSSUI/HubHeader";
import { VssIconType, VssIcon } from 'VSSUI/VssIcon';
import { PivotBarItem, IPivotBarAction} from "VSSUI/PivotBar";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { ToggleInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ToggleInputComponent";
import { DeploymentTargetStore } from"ReleasePipeline/Scripts/DeploymentPools/Stores/DeploymentTargetStore";
import { DeploymentTargetActionCreator } from"ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentTargetActionCreator";
import Resources = require('ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline');
import { TargetCapabilities } from "ReleasePipeline/Scripts/Common/Components/TargetCapabilities";
import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import 'VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentTarget';

export interface DeploymentTargetProps extends IProps {
    poolId: number;
    targetId: number;
}

export interface DeploymentTargetState extends IState {
    deploymentPool: DeploymentPoolCommonModel.DeploymentPool;
    deploymentTarget: Model.DeploymentPoolTarget;
    dataloaded: boolean;
    errorMessage: string;
}

export class DeploymentTarget extends Component<DeploymentTargetProps, DeploymentTargetState> {
    constructor(props?: DeploymentTargetProps) {
        super(props);
        this._hubViewState = new HubViewState();
        this._deploymentTargetStore = StoreManager.GetStore<DeploymentTargetStore>(DeploymentTargetStore);
        this._deploymentTargetActionCreator = ActionCreatorManager.GetActionCreator<DeploymentTargetActionCreator>(DeploymentTargetActionCreator);
        this._eventManager = Events_Services.getService();
    }

    public render(): JSX.Element {
        let hubContent = this._getHubContent();
        let errorMessage = this._getErrorMessage();
        return (<Fabric>
            {errorMessage}
            <Hub
                className={this._getState().errorMessage ? "hub-view deployment-target-hub has-error" : "hub-view deployment-target-hub"}
                hubViewState={this._hubViewState}
                hideFullScreenToggle = {true}
                commands={this._getCommandBarItems()} >
                <HubHeader breadcrumbItems={this._getBreadCrumbsItems()} />
                <PivotBarItem 
                    name={Resources.Capabilities}
                    itemKey="capabilitiesTab" 
                    className="deployment-target-pivot">
                    {hubContent}
                </PivotBarItem>
            </Hub>
        </Fabric>);
    }

    public componentWillMount(): void {
        this.setState(this._getInitialState());
    }

    public componentDidMount() {
        super.componentDidMount();
        this._deploymentTargetStore.addChangedListener(this._onStoreChange);
        this._eventManager.attachEvent(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.attachEvent(DPUtils.DeploymentPoolActions.ClearErrorMessage, this._clearErrorMessage);
        this._deploymentTargetActionCreator.loadDeploymentPoolWithSelectedTarget(this.props.poolId, this.props.targetId);
    }

    public componentWillUnmount() {
        this._deploymentTargetStore.removeChangedListener(this._onStoreChange);
        StoreManager.DeleteStore<DeploymentTargetStore>(DeploymentTargetStore);
        this._eventManager.detachEvent(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.detachEvent(DPUtils.DeploymentPoolActions.ClearErrorMessage, this._clearErrorMessage);
        super.componentWillUnmount();
    }

    private _onStoreChange = () => {
        let state = this._getState();
        let storeData = this._deploymentTargetStore.getDeploymentTargetData();
        
        // If target is deleted, 
        if(storeData.isTargetDeleted && storeData.isTargetDeleted === true) {
            PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.DeleteTargetScenario);
            var currentNavigationHistory = Navigation_Services.getHistoryService();
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: DPUtils.DeploymentPoolsConstants.DeploymentPoolView, poolid: this.props.poolId }, undefined, false, false);
            return;
        }
        state.deploymentPool = storeData.deploymentPool;
        state.deploymentTarget = storeData.target;
        state.dataloaded = true;
        state.errorMessage = "";
        this.setState(state);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.LoadTargetScenario);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.UpdateDeploymentTargetScenario);
    }

    private _getState(): DeploymentTargetState {
       return this.state || this._getInitialState();
    }

    private _getInitialState(): DeploymentTargetState {
       return { deploymentPool: undefined, deploymentTarget: undefined, dataloaded: false, errorMessage: "" };
    }

    private _getHubContent(): JSX.Element {
        let state = this._getState();
        if (!state.dataloaded) {
            return (<div></div>);
        }

        let toggleElement: JSX.Element = null;
        if (RMUtilsCore.FeatureFlagUtils.isDisabledDeploymentTargetEnabled()) {
            toggleElement =
            (<div className="agent-state-toggle-container" role="region" aria-label={Resources.TargetSettingsAriaLabel}>
                <div className="settings-toggle">
                    <ToggleInputComponent
                        label= {Resources.EnableDisableButtonLabel}
                        value={state.deploymentTarget.enabled}
                        onText={Resources.Enabled}
                        offText={Resources.Disabled}
                        onValueChanged={this._onContainerToggle}/>
                </div>
            </div>);  
        }                     

        return (<div className = "target-details-view">
                    <div className = "target-details-left-view">
                        <TargetCapabilities targetCapabilities = {state.deploymentTarget.capabilities}/>
                    </div>
                    <div className = "target-details-right-view">
                        {toggleElement}
                    </div>
                </div>
                );
    }

    private _getBreadCrumbsItems(): IHubBreadcrumbItem[] {
        let state = this._getState();
        let dpName = !!state.deploymentPool? state.deploymentPool.name : "";
        let targetName = !!state.deploymentTarget? state.deploymentTarget.name : "";

        return [
                {
                    key: "DeploymentPools",
                    text: Resources.DeploymentPools,
                    onClick: this._onDeploymentPoolsTitleClick,
                    href: this._getDeploymentPoolTitleLink()
                },
                {
                    key: "DeploymentPool",
                    text: dpName,
                    onClick: this._onDeploymentPoolNameClick,
                    href: this._getDeploymentPoolNameLink(),
                    leftIconProps: {
                        iconName: "EngineeringGroup",
                        iconType: VssIconType.fabric,
                        styles: { root: { color: DPUtils.DeploymentPoolsConstants.hubTitleIconColor } }
                    }
                },
                {
                    key: "DeploymentTarget",
                    text: targetName,
                    leftIconProps: {
                        iconName: "bowtie-devices",
                        iconType: VssIconType.bowtie,
                        styles: { root: { color: DPUtils.DeploymentPoolsConstants.hubTitleIconColor } }
                    }
                },
                {
                    key: "TargetCapabilities",
                    text: Resources.Capabilities,
                }
            ];
    }

    private _getCommandBarItems(): IPivotBarAction[] {
        let items: IPivotBarAction[] = [];

        items.push(
            {
            iconProps: { iconName: "Delete", iconType: VssIconType.fabric },
            name: Resources.DeleteMachineGroupText,
            key: "Remove",
            important: true,
            ariaLabel: Resources.DeleteMachineGroupText,
            onClick: this._onDeleteTarget
            });

        return items;
    }

    private _getDeploymentPoolTitleLink(): string {
        return RMUtilsCore.UrlHelper.getDeploymentPoolsPageUrl();
    }

    private _onDeploymentPoolsTitleClick = (e: React.MouseEvent<HTMLElement>): void => {
        if (e.ctrlKey) {
            return;
        }
        
        e.preventDefault();
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: DPUtils.DeploymentPoolsConstants.DeploymentPoolsView }, undefined, false, false);
    }

    private _getDeploymentPoolNameLink(): string {
        return RMUtilsCore.UrlHelper.getDeploymentPoolUrl(this.props.poolId);
    }

    private _onDeploymentPoolNameClick = (e: React.MouseEvent<HTMLElement>): void => {
        // if control key is pressed, don't do the navigation since the user
        // is intending for the href to opened in a new tab
        if (e.ctrlKey) {
            return;
        }
        e.preventDefault();
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: DPUtils.DeploymentPoolsConstants.DeploymentPoolView, poolid: this.props.poolId }, undefined, false, false);
    }
    
    private _onDeleteTarget = (): void => {
        let target: Model.DeploymentPoolTarget = this._getState().deploymentTarget;
        let titleText = Utils_String.format(Resources.DeleteMachineConfirmationTitle, target.name);
        let description = Resources.DeleteMachineConfirmationDescription;
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                okCallback: (data: any) => {
                    PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.DeleteTargetScenario);
                    this._deploymentTargetActionCreator.deleteTarget(this.props.poolId, this.props.targetId);
                },
                title: titleText,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }

    private _getErrorMessage(): JSX.Element {
        return !!(this._getState().errorMessage) ? 
            (<MessageBar messageBarType={ MessageBarType.error } isMultiline={ true } onDismiss= {this._clearErrorMessage} dismissButtonAriaLabel = {Resources.CloseButtonText}>
                {this._getState().errorMessage}
            </MessageBar>) : null;
    }

    private _updateErrorMessage = (sender: any, error: any) => {
        let state = this._getState();
        state.errorMessage = VSS.getErrorMessage(error);
        this.setState(state);
    }

    private _clearErrorMessage = () => {
        let state = this._getState();
        state.errorMessage = "";
        this.setState(state);
    }

    private _onContainerToggle = (newValue: boolean): void => {
        let state = this._getState();
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.UpdateDeploymentTargetScenario);
        this._deploymentTargetActionCreator.updateDeploymentTarget(this.props.poolId, state.deploymentTarget, newValue);
    }

    private _deploymentTargetActionCreator: DeploymentTargetActionCreator;
    private _deploymentTargetStore: DeploymentTargetStore;
    private _eventManager: Events_Services.EventService;
    private _hubViewState: IHubViewState;
}