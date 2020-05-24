// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import Navigation_Controls = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import * as Utils_Array from "VSS/Utils/Array";
import Events_Document = require("VSS/Events/Document");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import {IHubViewState, HubViewState} from "VSSUI/Utilities/HubViewState";
import {Hub} from "VSSUI/Hub";
import {IHubBreadcrumbItem, HubHeader} from "VSSUI/HubHeader";
import { FilterBar } from "VSSUI/FilterBar";
import { PivotBar, PivotBarItem, IPivotBarAction, PivotBarViewActionType, PivotBarViewActionArea } from "VSSUI/PivotBar";
import { VssIconType, VssIcon } from "VSSUI/VssIcon";
import { Filter } from "VSSUI/Utilities/Filter";

import { Fabric } from "OfficeFabric/Fabric";
import { CommandBar } from "OfficeFabric/CommandBar";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import MachineGroupStore = require("ReleasePipeline/Scripts/MachineGroup/Stores/MachineGroupStore");
import MachineGroup_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActions");
import MachineGroupActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator");
import MachineGroupEventsActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupEventsActionCreator");
import Component_MachineGroupDetails = require("ReleasePipeline/Scripts/MachineGroup/Components/MachineGroupDetails");
import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";
import { Targets } from "ReleasePipeline/Scripts/MachineGroup/Components/Targets";
import DeploymentMachineFilter = require("ReleasePipeline/Scripts/MachineGroup/Components/DeploymentMachinesFilterBar");
import { AddTargetGuidance } from "ReleasePipeline/Scripts/Common/Components/AddTargetGuidance";
import { ShareMachineGroup } from "ReleasePipeline/Scripts/MachineGroup/Components/ShareMachineGroup";
import * as DGUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import DTContracts = require("TFS/DistributedTask/Contracts");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/DeploymentGroup";

export interface Props extends Component_Base.Props {
    mgId: number;
    tab: string;
    machineId?: number;
    machineDetailsTab?: string;
    actionCreator?: MachineGroupActionCreator.MachineGroupActionCreator;
}

export interface State extends Component_Base.State {
    machineGroup: Model.MachineGroup;
    errorMessage: string;
    dataloaded: boolean;
    updatedMgName?: string;
    updatedMgDescription?: string;
    showingRegistrationScript?: boolean;
    showingShareDGPanel?: boolean;
    deploymentGroupMetrics?: Model.DeploymentGroupUIMetrics;
    securityPermissions?: MachineGroupStore.ISecurityPermissions;
    pagedTargetGroups?: Model.PagedTargetGroups;
    isPermissionSet: boolean;
    poolDGReference?: DTContracts.DeploymentGroupReference[];
    removedProjectList?: string[];
    hasPoolUsePermission?: boolean;
    currentTagsBymachineIds?: Map<number, string[]>;
}

export class MachineGroup extends Component_Base.Component<Props, State> implements Events_Document.RunningDocument {
    constructor(props: Props) {
        super(props);
        let filter = new Filter();
        let defaultTab = props && props.tab && (props.tab === MGUtils.MachineGroupsConstants.DetailsTab) ? MGUtils.MachineGroupsConstants.DetailsTab : MGUtils.MachineGroupsConstants.MachinesTab;
        this._hubViewState =  new HubViewState({
                defaultPivot: defaultTab,
                filter: filter 
            });

        this._machineGroupActionCreator = this.props.actionCreator || MachineGroupActionCreator.ActionCreator;
        this._machineGroupEventsActionCreator = MachineGroupEventsActionCreator.ActionCreator;
        this._machineGroupStore = MachineGroupStore.MachineGroup;
        this._eventManager = Events_Services.getService();
    }

    public render(): JSX.Element {
        let state = this._getState();
        let errorMessage = this._getErrorMessage();
        if(state.dataloaded == false) {
            return (<Fabric>
                        {errorMessage}
                    </Fabric>);
        }

        let targetPivot: JSX.Element = null;
        if(!this._isNewDeploymentGroup()){
            targetPivot = (
                <PivotBarItem
                            itemKey={MGUtils.MachineGroupsConstants.MachinesTab}
                            name={Resources.DeploymentGroupTabTitleTargets}
                            viewActions={[
                                { key: "registerScript", name: Resources.RegistrationScriptText, ariaLabel: Resources.DeploymentGroupRegisterIconToolTip, actionType: PivotBarViewActionType.Command, iconProps: { iconName: "bowtie-script", iconType: VssIconType.bowtie }, important: true, onClick: this._onRegistrationScriptButtonClicked, viewActionRenderArea: PivotBarViewActionArea.beforeViewOptions },
                            ]}>
                            {this._getHubContent(this.props.tab, state)}
                        </PivotBarItem>
            );
        }

        return (<Fabric>
                    {errorMessage}
                    <Hub
                        className={state.errorMessage ? "hub-view deployment-group-view has-error" : "hub-view deployment-group-view"}
                        hubViewState={this._hubViewState}                        
                        hideFullScreenToggle = {true}
                        commands={this._getCommandBarItems()}
                        onRenderFilterBar={() => this._getFilterBar()}>
                        <HubHeader breadcrumbItems={this._getBreadCrumbsItems()}>{this._drawDeploymentGroupMetrics()}</HubHeader>
                        <PivotBarItem 
                            itemKey={MGUtils.MachineGroupsConstants.DetailsTab}
                            name={Resources.DeploymentGroupTabTitleDetails}>
                            {this._getHubContent(this.props.tab, state)}
                        </PivotBarItem>
                        {targetPivot}
                    </Hub>
                </Fabric>);
    }

    public componentDidMount() {
        super.componentDidMount();
        this._machineGroupStore.addChangedListener(this._onStoreChange);
        this._hubViewState.selectedPivot.subscribe(this._UpdateSelectedTab);

        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.ClearErrorMessage, this.clearErrorMessage);
        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.UpdateSharePoolFailureMessage, this.updateErrorMessage);
        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.ClearSharePoolFailureMessage, this.clearErrorMessage);
        this._machineGroupActionCreator.loadMachineGroup(this.props.mgId);
        if (!this._isNewDeploymentGroup()) {
            this._machineGroupActionCreator.getMachinesByGrouping(this.props.mgId);
        }
        
        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("DeploymentGroupView", this);
    }

    public componentWillUnmount() {
        let machineGroupData = this._machineGroupStore.getData();
        if(!!machineGroupData.machineGroup && machineGroupData.machineGroup.id !== 0 ){
            this._machineGroupEventsActionCreator.unSubscribe(machineGroupData.machineGroup.id);
        } 

        this._machineGroupStore.removeChangedListener(this._onStoreChange);
        this._hubViewState.selectedPivot.unsubscribe(this._UpdateSelectedTab);
        Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.ClearErrorMessage, this.clearErrorMessage);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.UpdateSharePoolFailureMessage, this.updateErrorMessage);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.ClearSharePoolFailureMessage, this.clearErrorMessage);
        super.componentWillUnmount();
    }

    public componentWillUpdate(nextProps: Props) {
        if(nextProps && nextProps.tab){
            let selectedTab = (nextProps.tab === MGUtils.MachineGroupsConstants.DetailsTab) ? MGUtils.MachineGroupsConstants.DetailsTab : MGUtils.MachineGroupsConstants.MachinesTab;
            this._hubViewState.selectedPivot.value = selectedTab;
        } 
    }

    public isDirty(): boolean {
        return this._isMachineGroupUnsaved(this._getState());
    }

    private _getRegistrationButton(): JSX.Element {
        return (   
            <div
                className="registration-script-button-container"
                ref={(registrationButton) => this._registartionTargetRef = registrationButton}>
                <KeyboardAccesibleComponent
                    className="registration-script-button"
                    ariaLabel={Resources.AddTargetScriptLabel}
                    onClick={this._onRegistrationScriptButtonClicked}
                    toolTip={Resources.DeploymentGroupRegisterIconToolTip}>
                    <span className="bowtie-icon bowtie-script"></span>
                    <span className="registration-text"> {Resources.RegistrationScriptText} </span>
                </KeyboardAccesibleComponent> 
            </div>
        );
    }

    private _getBreadCrumbsItems(): IHubBreadcrumbItem[] { 
        let dgName = this._getMachineGroupName();

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
                    leftIconProps: {
                        iconName: "bowtie-server-remote",
                        iconType: VssIconType.bowtie,
                        styles: { root: { color: MGUtils.MachineGroupsConstants.hubTitleIconColor } }
                    }
                }];
    }

    private _getCommandBarItems(): IPivotBarAction[] {
        let items: IPivotBarAction[] = [];

        if (this._isNewDeploymentGroup()) {
            return items;
        }

        items.push({
            iconProps: { iconName: "Save", iconType: VssIconType.fabric },
            name: Resources.Save,
            key: "Save",
            important: true,
            ariaLabel: Resources.SaveDeploymentGroup,
            onClick: this._onSaveMachineGroup,
            disabled: this._isSaveButtonDisabled(this._getState())
        });

        items.push({
            iconProps: { iconName: "bowtie-share", iconType: VssIconType.bowtie },
            name: Resources.ShareDeploymentGroup,
            key: "Share",
            important: true,
            ariaLabel: Resources.ShareDeploymentGroupText,
            onClick: this._onShareMachineGroup,
            disabled: (!this._getState().hasPoolUsePermission || this._isMachineGroupUnsaved(this._getState()))
        });

        items.push({
            iconProps: { iconName: "Shield", iconType: VssIconType.fabric },
            name: Resources.DeploymentGroupSecurity,
            key: "Security",
            important: true,
            ariaLabel: Resources.DeploymentGroupSecurityText,
            onClick: this._showSecurityDialog,
            disabled: this._isMachineGroupUnsaved(this._getState())
        });

        items.push({
            iconProps: { iconName: "bowtie-status-help-outline", iconType: VssIconType.bowtie },
            name: Resources.DeploymentGroupTitleBarHelp,
            key: "help",
            important: true,
            ariaLabel: Resources.LearnMoreAboutMachineGroupsText,
            onClick: (e) => { MGUtils.onExternalLinkClicked(e, MGUtils.MachineGroupsForwardLinks.LearnMoreAboutMachineGroupsLink); }
        });

        return items;
    }

    private _getRegistrationScriptPopupContent(): JSX.Element {
        let state = this._getState();
        return (
            <Panel
                isOpen={state.showingRegistrationScript}
                type={PanelType.medium}
                onDismiss={this._onRegistrationScriptClosed}
                headerText={Resources.RegistrationScriptText}
                closeButtonAriaLabel = {Resources.RegistrationScriptCloseText} >
                <AddTargetGuidance
                    resourceName={this.state.machineGroup.name}
                    resourceId={this.state.machineGroup.id}
                    resourceType={DGUtils.AddTargetGuidanceResourceTypes.DeploymentGroup}
                    copyScriptEnabled={this._copyScriptEnabled(this.state)}
                    warningMessage={this._getWarningMessage()} />
            </Panel> 
        );
    }

    private _getWarningMessage(): string {
        let state = this._getState();
        if(!state.dataloaded){
            return null;
        }
        
        if(state.isPermissionSet && !state.securityPermissions.hasDgManagePermission) {
            return Resources.GuidanceForInsufficientPermissionsForDeploymentGroup;
        }
        if(state.isPermissionSet && !state.securityPermissions.hasDpManagePermission) {
            return Resources.GuidanceForInsufficientPermissionsForDeploymentPool;
        }
        return null;
    }

    private _getFilterBar(): JSX.Element {
        let filterBar: JSX.Element = null;
        if (this._hubViewState.selectedPivot.value === MGUtils.MachineGroupsConstants.MachinesTab) {
            filterBar = (
                <div className="filter-bar">
                    <DeploymentMachineFilter.MachinesFilter
                        filter={this._hubViewState.filter}
                        allTags={this._getAllTags()}
                        onFilter={this._onFilterUpdated}
                        filters={this._getFilters()}
                    />
                </div>);
        }

        return filterBar;
    }

    private _getErrorMessage(): JSX.Element {
        return !!(this._getState().errorMessage) ? 
            (<MessageBar messageBarType={ MessageBarType.error } isMultiline={ true } onDismiss={() => { Events_Services.getService().fire(MGUtils.DeploymentGroupActions.ClearErrorMessage); }} dismissButtonAriaLabel = {Resources.CloseButtonText}>
                {this._getState().errorMessage}
            </MessageBar>) : null;
    }

    private _drawDeploymentGroupMetrics(): JSX.Element {
        var deploymentGroupMetrics = this._getState().deploymentGroupMetrics;        
        let shareBadge: JSX.Element = null;
        let dgMetrics: JSX.Element = null;

        if (!!deploymentGroupMetrics) {
            let status = Model.DeploymentGroupUIMetrics.getSummaryStatusIconClass(deploymentGroupMetrics);
            dgMetrics = <div className = "machine-group-metrics-wrapper" >
                            <VssIcon iconName={status.iconName} iconType={status.iconType} className={status.className} />
                            <span className="machine-groups-metrics-column" >{Model.DeploymentGroupUIMetrics.getSummaryStatus(deploymentGroupMetrics) } </span>
                        </div>;
        }

        if(!!this._getState().poolDGReference && this._getState().poolDGReference.length > 1){
            shareBadge = <span className="badge" >{Resources.SharedBadgeText}</span>;
        }

        return (
            <div className = "machine-group-data-container" >
            {shareBadge}
            {dgMetrics}
            </div>
        );
    }

    private _onStoreChange = () => {
        let state = this._getState();
        let machineGroupData = this._machineGroupStore.getData();
        if (!!machineGroupData.machineGroup && machineGroupData.machineGroup.id !== 0 && (!state.machineGroup || (state.machineGroup.id !== machineGroupData.machineGroup.id))) {
            this._machineGroupEventsActionCreator.subscribe(machineGroupData.machineGroup.deploymentMachineGroup.pool.id, machineGroupData.machineGroup.id);
        }

        let dgDataLoaded = machineGroupData.machineGroup !== undefined && (this.props.mgId === 0 || machineGroupData.machineGroup.id === this.props.mgId);
        state.machineGroup = machineGroupData.machineGroup;
        state.updatedMgName = machineGroupData.updatedMgName || "";
        state.updatedMgDescription = machineGroupData.updatedMgDescription || "";
        state.deploymentGroupMetrics = machineGroupData.deploymentGroupMetrics;
        state.securityPermissions = machineGroupData.permissions;
        state.pagedTargetGroups = machineGroupData.pagedTargetGroups;
        state.isPermissionSet = machineGroupData.isPermissionSet;
        state.showingShareDGPanel = machineGroupData.showingShareDGPanel;
        state.poolDGReference = machineGroupData.poolDGReference;
        state.hasPoolUsePermission = machineGroupData.hasPoolUsePermission;
        state.removedProjectList = [];
        state.currentTagsBymachineIds = machineGroupData.currentTagsBymachineIds;

        if (dgDataLoaded) {
            state.dataloaded = true;
            if (machineGroupData.updatedMgName === undefined) {
                state.updatedMgName = machineGroupData.machineGroup.name;
            }
            if (machineGroupData.updatedMgDescription === undefined) {
                state.updatedMgDescription = machineGroupData.machineGroup.description;
            }
        }
        if ((dgDataLoaded && state.machineGroup.count === 0 && this.props.tab === undefined) || this._isNewDeploymentGroup()) {
            let urlState = Navigation_Services.getHistoryService().getCurrentState();
            urlState.tab = MGUtils.MachineGroupsConstants.DetailsTab;
            Navigation_Services.getHistoryService().replaceHistoryPoint(undefined, urlState, undefined, false);
        }

        if (dgDataLoaded && state.machineGroup.count > 0 && this.props.tab === undefined) {
            let urlState = Navigation_Services.getHistoryService().getCurrentState();
            urlState.tab = MGUtils.MachineGroupsConstants.MachinesTab;
            Navigation_Services.getHistoryService().replaceHistoryPoint(undefined, urlState, undefined, false);
        }

        if(!!machineGroupData.clearErrorMessage){
            state.errorMessage = "";
        }

        this.setState(state);

        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.CreateOrUpdateMachineGroupScenario);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.ListMachinesScenario);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.DeleteMachineScenario);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.UpdateMachineScenario);
        // New Machine Group
        if (dgDataLoaded && (this.props.mgId !== state.machineGroup.id)) {
            let urlState = Navigation_Services.getHistoryService().getCurrentState();
            urlState.mgid = machineGroupData.machineGroup.id;
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false);
        }
    }

    private _getState(): State {
        return this.state || { machineGroup: undefined, errorMessage: "", updatedMgName: "", updatedMgDescription: "", tagFilters: [], dataloaded: false, nameFilter: "", selectedStatusOptions: [], allTags: [], deploymentGroupMetrics: undefined, pagedTargetGroups: new Model.PagedTargetGroups(), agentFilters: { agentStatus: null, agentJobResult: null }, securityPermissions: {hasDgManagePermission : false, hasDpManagePermission: false}, isPermissionSet: false, showingShareDGPanel: false, poolDGReference: [], removedProjectList: [], hasPoolUsePermission: false};
    }

    private _onMachineGroupTitleClick = (e: React.MouseEvent<HTMLElement>): void => {
        if (!this._isMachineGroupUnsaved(this._getState())) {
            if (e.ctrlKey) {
                return;
            }
            e.preventDefault();
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupsView }, undefined, false, false);
        }
    }

    private _showSecurityDialog = (): void => {
        let state = this._getState();
        if (state.machineGroup) {
            MGUtils.showSecurityDialog(state.machineGroup.id, state.machineGroup.name);
        }
    }
    
    private _copyScriptEnabled(state: State): boolean {
        return !!state.machineGroup && !this._isMachineGroupNameUpdated(state) && (state.isPermissionSet && state.securityPermissions.hasDgManagePermission && state.securityPermissions.hasDpManagePermission);
    }

    private _onSaveMachineGroup = () => {
        let state = this._getState();
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.CreateOrUpdateMachineGroupScenario);
        if (this._isNewDeploymentGroup() || !state.machineGroup) {
            this._machineGroupActionCreator.addMachineGroup(state.updatedMgName, state.updatedMgDescription);
        }
        else {
            let dgsToRemove: DTContracts.DeploymentGroupReference[] = [];
            if(!!state.poolDGReference  && !!state.removedProjectList) {
                dgsToRemove = state.poolDGReference.filter(dg => Utils_Array.contains(state.removedProjectList, dg.project.name));
            }
            this._machineGroupActionCreator.updateMachineGroupAndReferences(state.machineGroup, state.updatedMgName, state.updatedMgDescription, dgsToRemove);
        }

        if (state.currentTagsBymachineIds && state.currentTagsBymachineIds.size > 0 ) {
            let machines = MGUtils._getAllTargets(this.state.pagedTargetGroups).filter(a => state.currentTagsBymachineIds.has(a.id));
            let deploymentMachines = [];
            machines.forEach(machine => {
                var deploymentMachine = machine.deploymentMachine;
                deploymentMachine.tags = state.currentTagsBymachineIds.get(machine.id);
                deploymentMachines.push(deploymentMachine);
            });
            this._machineGroupActionCreator.updateMachines(this.props.mgId, deploymentMachines);
        }
    }

    private _handleShortCuts = (ev: React.KeyboardEvent<HTMLElement>) => {
        if (ev.ctrlKey && (String.fromCharCode(ev.keyCode).toLowerCase() === "s")) {
            if (!this._isSaveButtonDisabled(this._getState())) {
                this._onSaveMachineGroup();
            }
            ev.preventDefault();
            ev.stopPropagation();
        }
    }

    private _getMachineGroupTitleLink(): string {
        return RMUtilsCore.UrlHelper.getMachineGroupAdminActionUrl();
    }

    private _getHubContent(tab: string, state: State): JSX.Element {
        let hubContent = null;
        let machineRegistrationScriptContainer: JSX.Element = null;
        let poolData: DTContracts.TaskAgentPoolReference = undefined
        if (!!state.machineGroup && !!state.machineGroup.deploymentMachineGroup && !!state.machineGroup.deploymentMachineGroup.pool) {
            poolData = state.machineGroup.deploymentMachineGroup.pool;
        }
        let deploymentGroupShareContainer: JSX.Element = (<ShareMachineGroup showPanel={state.showingShareDGPanel} onClosePanel = {this._onShareDGPopupClosed} pool = {poolData} poolDGReference = {state.poolDGReference} />);
        if (this._isNewDeploymentGroup() || Utils_String.equals(tab, MGUtils.MachineGroupsConstants.DetailsTab, true)) {
            hubContent = <Component_MachineGroupDetails.MachineGroupDetails machineGroup={state.machineGroup} updatedMgName={state.updatedMgName} updatedMgDescription={state.updatedMgDescription} copyScriptEnabled={this._copyScriptEnabled(state)} isNewDeploymentGroup={this._isNewDeploymentGroup()} pool={poolData} securityPermissions={state.securityPermissions} isPermissionSet={state.isPermissionSet}  poolDGReference={state.poolDGReference} removedProjectList={state.removedProjectList} handleDeleteDeploymentGroup={this._handleDeleteDeploymentGroup} handleUndeleteDeploymentGroup={this._handleUndeleteDeploymentGroup} />;
        }
        else{
            machineRegistrationScriptContainer = this._getRegistrationScriptPopupContent();
            hubContent = (<Targets
            selectedMachineId={this.props.machineId}
            mgId={state.machineGroup.id}
            machineTags={this._getAllTags()}
            className="machine-list"
            pagedTargetGroups={state.pagedTargetGroups}
            isFilteredApplied={this._isFilteredApplied()}
            deploymentGroupMetrics={state.deploymentGroupMetrics}
            currentTagsBymachineIds={state.currentTagsBymachineIds} />);
        }

        return (<div className="machinegroup-hub-content" onKeyDown={this._handleShortCuts}>
                 {machineRegistrationScriptContainer}
                 {deploymentGroupShareContainer}
                 {hubContent}
                </div>);
    }  

    private _handleDeleteDeploymentGroup = (item: DTContracts.DeploymentGroupReference) => {
        let state = this._getState();
        let removedProjectList: string[] = state.removedProjectList;
        removedProjectList.push(item.project.name);
        state.removedProjectList = removedProjectList;
        this.setState(state); 
    }

    private _handleUndeleteDeploymentGroup = (item: DTContracts.DeploymentGroupReference) => {
        let state = this._getState();
        let removedProjectList: string[] = state.removedProjectList;
        removedProjectList = removedProjectList.filter(project => project !== item.project.name);
        state.removedProjectList = removedProjectList;
        this.setState(state); 
    }

    private _UpdateSelectedTab(newTab: string) {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        urlState.tab = newTab;
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false);
    }

    private _getMachineGroupName(): string {
        let state = this._getState();
        if (this._isNewDeploymentGroup() || this._isMachineGroupNameUpdated(state)) {
            return state.updatedMgName + Resources.RenameIndicator;
        }

        return state.updatedMgName;
    }

    private _isSaveButtonDisabled(state: State): boolean {
        return (!this._isMachineGroupUnsaved(state) || (state.updatedMgName.length === 0) || (/^\s*$/.test(state.updatedMgName)));
    }

    private _doesTagsGotUpdated(): boolean {
        return (!!this.state.currentTagsBymachineIds && this.state.currentTagsBymachineIds.size > 0);
    }

    private _isMachineGroupUnsaved(state: State): boolean {
        return (this._isNewDeploymentGroup() || this._isMachineGroupNameUpdated(state) || this._isMachineGroupDescriptionUpdated(state) || this._isSharingRemoved(state) || this._doesTagsGotUpdated());
    }

    private _isMachineGroupNameUpdated(state: State): boolean {
        return !(!!state.machineGroup && Utils_String.equals(state.machineGroup.name, state.updatedMgName, false));
    }

    private _isMachineGroupDescriptionUpdated(state: State): boolean {
        return !(!!state.machineGroup && Utils_String.equals(state.machineGroup.description, state.updatedMgDescription, false));
    }

    private _isNewDeploymentGroup(): boolean {
        return this.props.mgId === 0;
    }

    private _isSharingRemoved(state: State): boolean {
        return (!!state.removedProjectList && state.removedProjectList.length > 0);
    }

    private _onFilterUpdated = (filters: MachineGroup_Actions.IMachinesFilter): void => {
        let state = this._getState();
        if (this._isFilteredApplied(filters)) {
            this._machineGroupActionCreator.getMachines(this.props.mgId, false, filters.tagList, filters.name, filters.statusList, false, true);
        } else {
            this._machineGroupActionCreator.getMachinesByGrouping(this.props.mgId);
        }
    }

    private _getFilters() : MachineGroup_Actions.IMachinesFilter{
        let filters: MachineGroup_Actions.IMachinesFilter;
        const pagedTargetGroups = this._machineGroupStore.getData().pagedTargetGroups;
        if (pagedTargetGroups &&
            pagedTargetGroups.filteredPagedTargetGroup) {
            filters = {
                name: pagedTargetGroups.filteredPagedTargetGroup.name,
                tagList: pagedTargetGroups.filteredPagedTargetGroup.tagList,
                statusList: pagedTargetGroups.filteredPagedTargetGroup.statusList
            };
        }
        return filters;
    }

    private _isFilteredApplied(filters?: MachineGroup_Actions.IMachinesFilter): boolean {
        let result: boolean;
        if (filters) {
            if (filters && (
                    (filters.tagList &&
                    filters.tagList.length > 0) ||
                    (filters.name &&
                        filters.name !== "") ||
                    (filters.statusList &&
                    filters.statusList.length > 0))) {
                result = true;
            }else{
                result = false;
            }
        } else {
            const pagedTargetGroups = this._machineGroupStore.getData().pagedTargetGroups;
            if(pagedTargetGroups &&
                pagedTargetGroups.filteredPagedTargetGroup &&
                ((pagedTargetGroups.filteredPagedTargetGroup.tagList &&
                    pagedTargetGroups.filteredPagedTargetGroup.tagList.length > 0) ||
                    (pagedTargetGroups.filteredPagedTargetGroup.name &&
                        pagedTargetGroups.filteredPagedTargetGroup.name !== "") ||
                    (pagedTargetGroups.filteredPagedTargetGroup.statusList &&
                        pagedTargetGroups.filteredPagedTargetGroup.statusList.length > 0))) {
                result = true;
            } else {
                result = false;
            }
        }

        return result;
    }

	private _onRegistrationScriptButtonClicked = () => {
        let state = this._getState();
        state.showingRegistrationScript = !state.showingRegistrationScript;
        this.setState(state); 
    }

    private _onShareMachineGroup = () => {
        let state = this._getState();
        state.showingShareDGPanel = !state.showingShareDGPanel;
        this.setState(state); 
    }

	private _onRegistrationScriptClosed = () => {
        let state = this._getState();
        state.showingRegistrationScript = false;
        this.setState(state); 
    }

    private _onShareDGPopupClosed = () => {
        let state = this._getState();
        state.showingShareDGPanel = false;
        this.setState(state); 
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

    private _getAllTags(): string[] {
        return MGUtils.getAllTags(MGUtils._getAllTargets(this._machineGroupStore.getData().pagedTargetGroups));
    }
    
    private _machineGroupActionCreator: MachineGroupActionCreator.MachineGroupActionCreator;
    private _machineGroupEventsActionCreator: MachineGroupEventsActionCreator.MachineGroupEventsActionCreator
    private _machineGroupStore: MachineGroupStore.MachineGroupStore;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
    private _eventManager: Events_Services.EventService;
    private _registartionTargetRef: HTMLElement;
    private _fiterTargetRef: HTMLElement;
    private _hubViewState: IHubViewState;
}
