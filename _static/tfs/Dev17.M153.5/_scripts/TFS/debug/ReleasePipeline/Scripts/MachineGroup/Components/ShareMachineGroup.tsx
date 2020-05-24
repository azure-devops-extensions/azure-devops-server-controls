// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import VSS = require("VSS/VSS");
import Component_Base = require("VSS/Flux/Component");
import Events_Services = require("VSS/Events/Services");
import { Panel, PanelType } from "OfficeFabric/Panel";
import { PrimaryButton } from "OfficeFabric/Button";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import {Spinner, SpinnerSize} from "OfficeFabric/Spinner";
import { IPickListSelection } from "VSSUI/PickList";
import { IVssIconProps, VssIcon, VssIconType } from "VSSUI/VssIcon";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import MachineGroupStore = require("ReleasePipeline/Scripts/MachineGroup/Stores/MachineGroupStore");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import MachineGroupActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator");
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import DTContracts = require("TFS/DistributedTask/Contracts");
import { TeamProjectPickList } from "DistributedTaskControls/Components/TeamProjectPickList";
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/ShareMachineGroup";

export interface Props extends Component_Base.Props {
    showPanel: boolean;
    pool: DTContracts.TaskAgentPoolReference;
    poolDGReference: DTContracts.DeploymentGroupReference[];
    onClosePanel: () => void;
}

export interface State extends Component_Base.State {
    errorMessage ?: string;
    showLoadSpinner?: boolean;
    selectedProjectList?: string[];
    projectList: string[];
}


export class ShareMachineGroup extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this._machineGroupActionCreator = MachineGroupActionCreator.ActionCreator;
        this._machineGroupStore = MachineGroupStore.MachineGroup;
        this._eventManager = Events_Services.getService();
    }
    
    public componentDidMount() {
        super.componentDidMount();
        this._machineGroupStore.addChangedListener(this._onStoreChange);
        this._machineGroupActionCreator.getProjectList();    
        if(!!this.props.pool){
            this._machineGroupActionCreator.getDeploymentPoolSummary(this.props.pool.name, DTContracts.TaskAgentPoolActionFilter.Use);
        } 

        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.UpdateSharePoolFailureMessage, this._updateErrorMessage);
        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.ClearSharePoolFailureMessage, this._clearErrorMessage);
    }

    public componentWillUnmount() {
        this._machineGroupStore.removeChangedListener(this._onStoreChange);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.UpdateSharePoolFailureMessage, this._updateErrorMessage);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.ClearSharePoolFailureMessage, this._clearErrorMessage);
        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        let state = this._getState();
        let elementToFocusOnDismiss = $(".ms-CommandBarItem-link")[0];
        let availableProjectsToShare = state.projectList;
        if(!!this.props.poolDGReference && !!state.projectList){
            availableProjectsToShare = state.projectList.filter(p=> !this.props.poolDGReference.some(dg => dg.project.name === p));
        }
        return (
            <Panel
                isOpen={this.props.showPanel}
                type={PanelType.medium}
                onDismiss={this.props.onClosePanel }
                headerText={Resources.ShareDeploymentGroupText}
                closeButtonAriaLabel = {Resources.ShareDGPopuptCloseText} 
                hasCloseButton= {!state.showLoadSpinner}
                onRenderFooterContent={this._renderPanelFooterContent}
                isFooterAtBottom={ true }
                focusTrapZoneProps={{ firstFocusableSelector: "share-deployment-group-panel .ms-TextField-field"}}
                elementToFocusOnDismiss={elementToFocusOnDismiss} >
                <div className="share-deployment-group-panel">
                    {this._showErrorMessage()}
                    <span className="deployment-group-team-project-description">{Resources.DeploymentGroupTeamProjectDescription}</span>
                    <TeamProjectPickList items={availableProjectsToShare} noItemsText={Resources.NoItemsInSharePoolPanel} selectedProjectList={state.selectedProjectList} onSelectionChanged={this._onSelectionChanged} />
                </div>
            </Panel> 
        );
    }  

    private _renderPanelFooterContent = (): JSX.Element => {
        let selectedItems = this._getState().selectedProjectList;
        return (<PrimaryButton className="share-deployment-group-panel-button" onClick={this._onShareButtonClick} disabled={!(selectedItems && selectedItems.length>0)}>
            {this.showLoadSpinnerComponent()}
            <span className="share-deployment-group-panel-spinner">{this._getState().showLoadSpinner ? Resources.ShareDeploymentGroupSharingButton: Resources.ShareDeploymentGroup}</span>
        </PrimaryButton>);
    }

    private showLoadSpinnerComponent = () => {
        if(this._getState().showLoadSpinner) {
            return (
                <Spinner size={ SpinnerSize.small } />
            )
        }
        return null;
    }

    private _onSelectionChanged = (selection: IPickListSelection) => {
        const selectedItems = selection.selectedItems;var selectedProjects = [];
        for(var selectedItem of selectedItems) {
            selectedProjects.push(selectedItem);
        }

        var currentState = this._getState();
        currentState.selectedProjectList = selectedProjects;
        this.setState(currentState);
    }

    private _onStoreChange = () => {
        let state = this._getState();
        let machineGroupData = this._machineGroupStore.getData();
        
        if(!!machineGroupData.projectList) state.projectList = machineGroupData.projectList;
        state.selectedProjectList = machineGroupData.selectedProjectList;
        state.showLoadSpinner = machineGroupData.showLoadSpinner;
        if(!!machineGroupData.clearErrorMessage){
            state.errorMessage = "";
        }
        this.setState(state);
    }

    private _onShareButtonClick = () => {
        let currentState = this._getState();
        currentState.errorMessage = '';
        currentState.showLoadSpinner = true;
        this.setState(currentState);
        let poolObj= new DeploymentPoolCommonModel.DeploymentPool();
        poolObj.id = this.props.pool.id;
        poolObj.name = this.props.pool.name;
        this._machineGroupActionCreator.updateDeploymentGroupReferences(poolObj, [], this._getState().selectedProjectList);
    }

    private _getState(): State {
        return this.state || {projectList: [], poolDGReference: [], errorMessage: "", showLoadSpinner: false};
    }

    private _showErrorMessage = (): JSX.Element => {
        return !!(this._getState().errorMessage) ? 
            (<MessageBar messageBarType={ MessageBarType.error } isMultiline={ true } onDismiss= {this._clearErrorMessage} dismissButtonAriaLabel = {Resources.CloseButtonText}>
                {this._getState().errorMessage}
            </MessageBar>) : null;
    }

    private _updateErrorMessage = (sender: any, error: any) => {
        let state = this._getState();
        state.errorMessage = VSS.getErrorMessage(error);
        state.showLoadSpinner = false;
        this.setState(state);
    }

    private _clearErrorMessage = () => {
        let state = this._getState();
        state.errorMessage = "";
        state.showLoadSpinner = false;
        this.setState(state);
    }

    private _machineGroupActionCreator: MachineGroupActionCreator.MachineGroupActionCreator;
    private _machineGroupStore: MachineGroupStore.MachineGroupStore;
    private _eventManager: Events_Services.EventService;
}