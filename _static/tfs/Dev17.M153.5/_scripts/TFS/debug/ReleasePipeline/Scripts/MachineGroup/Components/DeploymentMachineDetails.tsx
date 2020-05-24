// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import Navigation_Services = require("VSS/Navigation/Services");
import Events_Document = require("VSS/Events/Document");
import Events_Services = require("VSS/Events/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import {IHubViewState, HubViewState} from "VSSUI/Utilities/HubViewState";
import {Hub} from "VSSUI/Hub";
import {IHubBreadcrumbItem, HubHeader} from "VSSUI/HubHeader";
import { PivotBar, PivotBarItem, IPivotBarAction } from 'VSSUI/PivotBar';
import { VssIconType, VssIcon } from "VSSUI/VssIcon";
import Dialogs = require("VSS/Controls/Dialogs");

import { Fabric } from "OfficeFabric/Fabric";
import { CommandBar } from "OfficeFabric/CommandBar";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import Component_MachineConfiguration = require("ReleasePipeline/Scripts/MachineGroup/Components/MachineConfiguration");
import DeploymentTargetHistory = require("ReleasePipeline/Scripts/MachineGroup/Components/DeploymentTargetHistory");
import Component_DeploymentMachineOverview = require("ReleasePipeline/Scripts/MachineGroup/Components/DeploymentMachineOverview");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import { Async } from "OfficeFabric/Utilities";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import DeploymentMachineStore = require("ReleasePipeline/Scripts/MachineGroup/Stores/DeploymentMachineStore");
import DeploymentMachineEventActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/DeploymentMachineEventActionCreator");
import DeploymentMachineActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/DeploymentMachineActionCreator");
import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/DeploymentMachineDetails";

export interface Props extends Component_Base.Props {
    mgid: number;
    machineid: number;
    tab?: string;
}

export interface State extends Component_Base.State {
    selectedTab: string;
    machine?: Model.Machine;
    isDataLoaded?: boolean;
    machineGroupName?: string;
    tags: Array<string>;
    errorMessage: string;
    currentTags?: string[];
}

export class DeploymentMachine extends Component_Base.Component<Props, State> implements Events_Document.RunningDocument {

    constructor(props: Props) {
        super(props);
        let defaultTab = MGUtils.MachineGroupsConstants.OverviewTab;
        if(props && props.tab) {
            if (Utils_String.equals(props.tab, MGUtils.MachineGroupsConstants.ReleasesTab, true)) {
                defaultTab = MGUtils.MachineGroupsConstants.ReleasesTab;
            }
            else if(Utils_String.equals(props.tab, MGUtils.MachineGroupsConstants.ConfigurationTab, true)) {
                defaultTab = MGUtils.MachineGroupsConstants.ConfigurationTab;
            }
        }

        this._hubViewState =  new HubViewState({
                defaultPivot: defaultTab
            });

        this._async = new Async();
        this._deploymentMachineActionCreator = DeploymentMachineActionCreator.ActionCreator;
        this._machineGroupEventsActionCreator = DeploymentMachineEventActionCreator.ActionCreator;
        this._deploymentMachineStore = DeploymentMachineStore.DeploymentMachine;
        this._eventManager = Events_Services.getService();
    }

    public render(): JSX.Element {
        let state: State = this._getState();
        let errorMessage = this._getErrorMessage();
        if(state.isDataLoaded == false) {
            return (<Fabric>
                        {errorMessage}
                    </Fabric>);
        }

        return (<Fabric>
                    {errorMessage}
                    <Hub
                        className={state.errorMessage ? "hub-view deployment-machine-view has-error" : "hub-view deployment-machine-view"}
                        hubViewState={this._hubViewState}
                        hideFullScreenToggle = {true}
                        commands={this._getCommandBarItems()} >
                        <HubHeader breadcrumbItems={this._getBreadCrumbsItems()}>{this._drawDeploymentMachineStatus()}</HubHeader>
                        <PivotBarItem 
                            itemKey={MGUtils.MachineGroupsConstants.OverviewTab}
                            name={Resources.Summary}>
                             <Component_DeploymentMachineOverview.MachineOverview mgid={ this.props.mgid } machine={ state.machine } allTags = { state.tags } currentTags = { state.currentTags }/>
                        </PivotBarItem>
                        <PivotBarItem
                            itemKey={MGUtils.MachineGroupsConstants.ReleasesTab}
                            name={Resources.DeploymentsText} >
                            <DeploymentTargetHistory.MachineReleases mgid={ this.props.mgid } machine={ state.machine } />
                        </PivotBarItem>
                        <PivotBarItem
                            itemKey={MGUtils.MachineGroupsConstants.ConfigurationTab}
                            name={Resources.Capabilities} >
                            <Component_MachineConfiguration.MachineConfiguration mgid={ this.props.mgid } machineId={ state.machine.id } />
                        </PivotBarItem>
                    </Hub>
                </Fabric>);
    }

    public componentDidMount() {             
        super.componentDidMount()
        this._deploymentMachineStore.addChangedListener(this._onStoreChange);
        this._hubViewState.selectedPivot.subscribe(this._UpdateSelectedTab);
        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.ClearErrorMessage, this.clearErrorMessage);
        this._deploymentMachineActionCreator.loadDeploymentGroupWithSelectedMachine(this.props.mgid, this.props.machineid);

        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("DeploymentMachineDetailsView", this);
    }

    private _onStoreChange = () => {
        let state: State = this._getState();
        state.selectedTab = state.selectedTab;
        
        let machineGroupData = this._deploymentMachineStore.getData();

        // If machine is deleted, 
        if(machineGroupData.isMachineDeleted && machineGroupData.isMachineDeleted == true) {
            var currentNavigationHistory = Navigation_Services.getHistoryService();
            currentNavigationHistory.addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupView, mgid: this.props.mgid }, undefined, false, false);
            return;
        }

        state.machine = machineGroupData.machine;
        state.machineGroupName = !!machineGroupData.deploymentGroup? machineGroupData.deploymentGroup.name : "";

        if (!state.tags) {
            state.tags = machineGroupData.tags;
        }

        if(!state.isDataLoaded && !!machineGroupData.deploymentGroup && !!machineGroupData.machine) {
            this._machineGroupEventsActionCreator.subscribe(machineGroupData.deploymentGroup.id, machineGroupData.machine.id);
        }

        if(!!machineGroupData.clearErrorMessage){
            state.errorMessage = "";
        }

        if (!!machineGroupData.currentTags) {
            state.currentTags = machineGroupData.currentTags;
        } else {
            state.currentTags = state.machine.tags;
        }
        
        state.isDataLoaded = true;
        this.setState(state);
    }

    public isDirty(): boolean {
        return this._doesTagsGotUpdated();
    }

    public componentWillUnmount() {
        let machineGroupData = this._deploymentMachineStore.getData();
        if(!!machineGroupData.deploymentGroup){
            this._machineGroupEventsActionCreator.unSubscribe(machineGroupData.deploymentGroup.id);
        }

        this._deploymentMachineStore.removeChangedListener(this._onStoreChange);
        this._hubViewState.selectedPivot.unsubscribe(this._UpdateSelectedTab);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.ClearErrorMessage, this.clearErrorMessage);

        Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);

        super.componentWillUnmount();
    }

    public focus(): void {
        // focus the corresponding pivot tab in the details pane
        if (this._pivotTabsElement) {
            this._async.setTimeout(() => {
                this._pivotTabsElement.focus()
            }, 0);
        }
    }

    private _getBreadCrumbsItems(): IHubBreadcrumbItem[] {
        let state = this._getState();
        let dgName = !!state.machineGroupName? state.machineGroupName : "";
        let machineName = !!state.machine? state.machine.name : "";

        return [
                {
                    key: "DeploymentGroups",
                    text: Resources.DeploymentGroupHubTitle,
                    onClick: this._onMachineGroupTitleClick,
                    href: this._getMachineGroupTitleLink()
                },
                {
                    key: "DeploymentGroup",
                    text: dgName,
                    onClick: this._onMachineGroupNameTitleClick,
                    href: this._getMachineGroupNameLink(),
                    leftIconProps: {
                        iconName: "bowtie-server-remote",
                        iconType: VssIconType.bowtie,
                        styles: { root: { color: MGUtils.MachineGroupsConstants.hubTitleIconColor } }
                    }
                },
                {
                    key: "DeploymentMachine",
                    text: machineName,
                    leftIconProps: {
                        iconName: "bowtie-devices",
                        iconType: VssIconType.bowtie,
                        styles: { root: { color: MGUtils.MachineGroupsConstants.hubTitleIconColor } }
                    }
                }
            ];
    }

    private _getCommandBarItems(): IPivotBarAction[] {
        let items: IPivotBarAction[] = [];

        items.push(
            {
                iconProps: { iconName: "Save", iconType: VssIconType.fabric },
                name: Resources.Save,
                key: "Save",
                important: true,
                ariaLabel: Resources.SaveDeploymentTarget,
                onClick: this._onSaveMachine,
                disabled: this._isSaveButtonDisabled()
            },
            {
            iconProps: { iconName: "Delete", iconType: VssIconType.fabric },
            name: Resources.DeleteMachineGroupText,
            key: "Remove",
            important: true,
            ariaLabel: Resources.DeleteMachineGroupText,
            onClick: this._onMachineDelete
            });

        return items;
    }

    private _onSaveMachine = (): void => {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.UpdateMachineScenario);
        let state = this._getState();
        let deploymentMachine = state.machine.deploymentMachine;
        deploymentMachine.tags = state.currentTags;
        let updatedMachines = [];
        updatedMachines.push(deploymentMachine);
        this._deploymentMachineActionCreator.updateMachines(this.props.mgid, updatedMachines);
    }

    private _isSaveButtonDisabled = (): boolean => {
        return !this._doesTagsGotUpdated();
    }

    private _onMachineDelete = (): void => {
        let machine: Model.Machine = this._getState().machine;
        let titleText = Utils_String.format(Resources.DeleteMachineConfirmationTitle, machine.name);
        let description = Resources.DeleteMachineConfirmationDescription;
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                okCallback: (data: any) => {
                    PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.DeleteMachineScenario);
                    this._deploymentMachineActionCreator.deleteMachine(this.props.mgid, machine.id);
                },
                title: titleText,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }

    private _UpdateSelectedTab(newTab: string) {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        urlState.machinedetailstab = newTab;
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false);
    }

    private _getState(): State {
        if(this.state){
            let tab = (!!this.state.machine && this.props.tab)? this.props.tab : MGUtils.MachineGroupsConstants.OverviewTab;
            return { selectedTab: tab, machine: this.state.machine, isDataLoaded: this.state.isDataLoaded, machineGroupName: this.state.machineGroupName, tags: this.state.tags, errorMessage: this.state.errorMessage, currentTags: this.state.currentTags}
        }
        else{
            return { selectedTab: MGUtils.MachineGroupsConstants.OverviewTab, machine: undefined, isDataLoaded: false, machineGroupName: "", tags: null, errorMessage: "", currentTags: null};
        }
    }

    private _drawDeploymentMachineStatus(): JSX.Element {
        var machine = this._getState().machine;

        if (!!machine) {
            return (
                <div className = "deploymentmachine-status-wrapper" >
                    <VssIcon className={machine.online ? "machine-group-vss-Icon--Accept" : "machine-group-vss-Icon--Clear"} iconName={machine.online ? "Accept" : "Clear" } iconType={VssIconType.fabric}/> <span className = "deploymentmachine-status-text">{this.state.machine.online ? Resources.AgentStatusOnline : Resources.AgentStatusOffline}</span>
                </div>
            );
        }

        return null;
    }

    private _getErrorMessage(): JSX.Element {
        return !!(this._getState().errorMessage) ? 
            (<MessageBar messageBarType={ MessageBarType.error } isMultiline={ true } onDismiss={() => { Events_Services.getService().fire(MGUtils.DeploymentGroupActions.ClearErrorMessage); }} dismissButtonAriaLabel = {Resources.CloseButtonText}>
                {this._getState().errorMessage}
            </MessageBar>) : null;
    }

    private _getMachineGroupTitleLink(): string {
        return RMUtilsCore.UrlHelper.getMachineGroupAdminActionUrl();
    }

    private _getMachineGroupNameLink(): string {
        return RMUtilsCore.UrlHelper.getMachineAdminPageUrl(this.props.mgid);
    }

    private _onMachineGroupTitleClick = (e: React.MouseEvent<HTMLElement>): void => {
        // if control key is pressed, don't do the navigation since the user
        // is intending for the href to opened in a new tab
        if (e.ctrlKey) {
            return;
        }

        if (!this._doesTagsGotUpdated()) {
            e.preventDefault();
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupsView }, undefined, false, false);
        }
    }

    private _onMachineGroupNameTitleClick = (e: React.MouseEvent<HTMLElement>): void => {
        // if control key is pressed, don't do the navigation since the user
        // is intending for the href to opened in a new tab
        if (e.ctrlKey) {
            return;
        }

        if (!this._doesTagsGotUpdated()) {
            e.preventDefault();
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupView, mgid: this.props.mgid }, undefined, false, false);
        }
    }

    private updateErrorMessage = (sender: any, error: any) => {
        let state = this._getState();
        state.errorMessage = VSS.getErrorMessage(error);
        this.setState(state);
    }

    private clearErrorMessage = () => {
        let state = this._getState();
        state.errorMessage = "";
        this.setState(state);
    }

    private _doesTagsGotUpdated(): boolean {
        let state = this._getState();
        if (!!state.machine && !!state.currentTags) {
            return !Utils_Array.arrayEquals(state.machine.tags, state.currentTags, (a, b) => Utils_String.localeIgnoreCaseComparer(a, b) === 0);
        }
        return false;
    }

    private _pivotTabsElement;
    private _deploymentMachineActionCreator: DeploymentMachineActionCreator.DeploymentMachineActionCreator;
    private _deploymentMachineStore: DeploymentMachineStore.DeploymentMachineStore;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
    private _machineGroupEventsActionCreator: DeploymentMachineEventActionCreator.DeploymentMachineEventActionCreator;
    private _async: Async
    private _eventManager: Events_Services.EventService;
    private _hubViewState: IHubViewState;
}
