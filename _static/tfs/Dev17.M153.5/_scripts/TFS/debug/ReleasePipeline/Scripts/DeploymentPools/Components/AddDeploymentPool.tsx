// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Navigation_Services = require("VSS/Navigation/Services");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import { Panel, PanelType } from "OfficeFabric/Panel";
import { TextField } from "OfficeFabric/TextField";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { PrimaryButton, IButtonProps } from "OfficeFabric/Button";
import {Spinner, SpinnerSize} from "OfficeFabric/Spinner";
import {IPickListSelection } from "VSSUI/PickList";

import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { DeploymentPoolStore } from"ReleasePipeline/Scripts/DeploymentPools/Stores/DeploymentPoolStore";
import { DeploymentPoolActionCreator } from"ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolActionCreator";
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import { TeamProjectPickList } from "DistributedTaskControls/Components/TeamProjectPickList";
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/DeploymentPools/Components/AddDeploymentPool";

export interface AddDeploymentPoolProps extends IProps {
    showPanel: boolean;
    onClosePanel: () => void;
}

export interface AddDeploymentPoolState extends IState {
    newPoolName ?: string;
    errorMessage ?: string;
    disablePoolNameField?: boolean;
    enableCreateButton ?: boolean;
    showLoadSpinner?: boolean;
    projectList: string[];
    selectedProjectList?: string[];
    dataLoaded: boolean;
}


export class AddDeploymentPool extends Component<AddDeploymentPoolProps, AddDeploymentPoolState> {
    constructor(props: AddDeploymentPoolProps) {
        super(props);
        let poolInstanceId: string = DPUtils.DEPLOYMENT_POOL_ITEM_PREFIX + "-pool-" + DtcUtils.getUniqueInstanceId();
        this._deploymentPoolStore = StoreManager.GetStore<DeploymentPoolStore>(DeploymentPoolStore, poolInstanceId);
        this._deploymentPoolActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolActionCreator>(DeploymentPoolActionCreator, poolInstanceId);
        this._eventManager = Events_Services.getService();
    }

    public render() {
        let state = this._getState();
        let elementToFocusOnDismiss = $(".ms-CommandBarItem-link")[0];
        return (
            <Panel isOpen={this.props.showPanel}
                type={PanelType.medium}
                headerText={Resources.NewDeploymentPoolPanelName}
                onDismiss={ this.props.onClosePanel }
                hasCloseButton= {!this._getState().showLoadSpinner}
                closeButtonAriaLabel = {Resources.CloseButtonText}
                onRenderFooterContent={this._renderPanelFooterContent}
                isFooterAtBottom={ true }
                focusTrapZoneProps = {{firstFocusableSelector: "new-deployment-pool-name-input .ms-TextField-field"}}
                elementToFocusOnDismiss={elementToFocusOnDismiss}
            >
                <div className="add-deployment-pool-panel">
                    {this._showErrorMessage()}
                    <TextField className="new-deployment-pool-name-input" placeholder={Resources.PoolNameInputPlaceholder} disabled={this._getState().disablePoolNameField} label={Resources.DeploymentPoolNameLabel} required={true} autoFocus = {true} onChanged={this._onDeploymentPoolNameChange} value={state.newPoolName? state.newPoolName : ""}/>
                    <span className="deployment-pool-project-description">{Resources.DeploymentPoolProjectDescription}</span>
                    <TeamProjectPickList items={this._getState().projectList} selectedProjectList={state.selectedProjectList} onSelectionChanged={this._onSelectionChanged} />
                </div>
            </Panel>);
    }

    private _renderPanelFooterContent = (): JSX.Element => {
        return (<PrimaryButton className="add-deployment-pool-panel-button" onClick={this._onCreateButtonClick} disabled={!(this._getState().enableCreateButton)}>
            {this.showLoadSpinnerComponent()}
            <span className="add-deployment-pool-panel-spinner">{this._getState().showLoadSpinner ? Resources.NewDeploymentPoolCreatingButton: Resources.NewDeploymentPoolCreateButtonText}</span>
        </PrimaryButton>);
    }
    
    private showLoadSpinnerComponent() {
        if(this._getState().showLoadSpinner) {
            return (
                <Spinner size={ SpinnerSize.small } />
            )
        }
        return null;
    }

    private _onSelectionChanged = (selection: IPickListSelection) => {
        const selectedItems = selection.selectedItems;
        var selectedProjects = [];
        for(var selectedItem of selectedItems) {
            selectedProjects.push(selectedItem);
        }

        var currentState = this._getState();
        currentState.selectedProjectList = selectedProjects;
        this.setState(currentState);
    }

    private _onStoreChange = () => {
        var deploymentPoolStoreData = this._deploymentPoolStore.getData();
        if(deploymentPoolStoreData.deploymentPool) {
            var currentNavigationHistory = Navigation_Services.getHistoryService();
            currentNavigationHistory.addHistoryPoint(undefined, {view: DPUtils.DeploymentPoolsConstants.DeploymentPoolView,
                 poolid: deploymentPoolStoreData.deploymentPool.id });
        }
        else {
            // Initial Load Page
            var currentState = this._getState();
            currentState.dataLoaded = true;
            currentState.projectList = deploymentPoolStoreData.projectList;
            this.setState(currentState);
        }
    }

    private _onCreateButtonClick = () => {
        let currentState = this._getState();
        currentState.errorMessage = '';
        currentState.disablePoolNameField = true;
        currentState.showLoadSpinner = true;
        currentState.enableCreateButton = false;
        this.setState(currentState);
        this._deploymentPoolActionCreator.addDeploymentPool(this._getState().newPoolName, this._getState().selectedProjectList);
    }
    
    private _onDeploymentPoolNameChange = (deploymentPoolName: string) => {
        var currentState = this._getState();
        currentState.newPoolName = deploymentPoolName;
        currentState.showLoadSpinner = false;
        currentState.enableCreateButton = (deploymentPoolName && deploymentPoolName.length > 0);
        this.setState(currentState);
    }

    public componentWillMount(): void {
        this.setState(this._getInitialState());
    }

    public componentDidMount() {
        super.componentDidMount();
        this._eventManager.attachEvent(DPUtils.DeploymentPoolActions.UpdateCreatePoolFailureMessage, this._updateErrorMessage);
        this._eventManager.attachEvent(DPUtils.DeploymentPoolActions.ClearCreatePoolFailureMessage, this._clearErrorMessage);
        this._deploymentPoolStore.addChangedListener(this._onStoreChange);
        this._deploymentPoolActionCreator.getProjectList();
    }

    public componentWillUnmount() {
        this._deploymentPoolStore.removeChangedListener(this._onStoreChange);
        StoreManager.DeleteStore<DeploymentPoolStore>(DeploymentPoolStore, this._deploymentPoolStore.getInstanceId());
        this._eventManager.detachEvent(DPUtils.DeploymentPoolActions.UpdateCreatePoolFailureMessage, this._updateErrorMessage);
        this._eventManager.detachEvent(DPUtils.DeploymentPoolActions.ClearCreatePoolFailureMessage, this._clearErrorMessage);
        super.componentWillUnmount();
    }

    private _getState(): AddDeploymentPoolState {
        return this.state || this._getInitialState();
    }

    private _getInitialState(): AddDeploymentPoolState {
        return {
            newPoolName: "",
            errorMessage: "",
            enableCreateButton: false,
            showLoadSpinner: false,
            disablePoolNameField: false,
            projectList: [],
            selectedProjectList: [],
            dataLoaded: false
        } as AddDeploymentPoolState;
    }

    private _showErrorMessage(): JSX.Element {
        return !!(this._getState().errorMessage) ? 
            (<MessageBar messageBarType={ MessageBarType.error } isMultiline={ true } onDismiss= {this._clearErrorMessage} dismissButtonAriaLabel = {Resources.CloseButtonText}>
                {this._getState().errorMessage}
            </MessageBar>) : null;
    }

    private _updateErrorMessage = (sender: any, error: any) => {
        let state = this._getState();
        state.errorMessage = VSS.getErrorMessage(error);
        state.showLoadSpinner = false;
        state.enableCreateButton = true;
        state.disablePoolNameField = false;
        this.setState(state);
    }

    private _clearErrorMessage = () => {
        let state = this._getState();
        state.errorMessage = "";
        state.showLoadSpinner = false;
        this.setState(state);
    }

    private _deploymentPoolActionCreator: DeploymentPoolActionCreator;
    private _deploymentPoolStore: DeploymentPoolStore;
    private _eventManager: Events_Services.EventService;
}