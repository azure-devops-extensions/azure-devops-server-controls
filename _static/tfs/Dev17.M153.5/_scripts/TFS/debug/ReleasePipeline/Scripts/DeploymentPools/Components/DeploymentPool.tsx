// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Dialogs = require("VSS/Controls/Dialogs");
import Component_Base = require("VSS/Flux/Component");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import * as Utils_Array from "VSS/Utils/Array";
import VSS = require("VSS/VSS");
import Events_Document = require("VSS/Events/Document");
import Events_Services = require("VSS/Events/Services");
import {Hub} from "VSSUI/Hub";
import { IHubBreadcrumbItem, HubHeader } from "VSSUI/HubHeader";
import { IHubViewState, HubViewState, IHubViewStateOptions } from "VSSUI/Utilities/HubViewState";
import { VssIconType, VssIcon } from "VSSUI/VssIcon";
import { PivotBar, PivotBarItem, IOnOffViewActionProps, PivotBarViewActionType, PivotBarFocusItem } from 'VSSUI/PivotBar';
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { IPickListSelection } from "VSSUI/PickList";
import { IContextualMenuItem } from 'OfficeFabric/ContextualMenu';
import {Fabric} from "OfficeFabric/Fabric";
import {MessageBar, MessageBarType} from 'OfficeFabric/MessageBar';

import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import DTContracts = require("TFS/DistributedTask/Contracts");
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import { DeploymentPoolStore } from"ReleasePipeline/Scripts/DeploymentPools/Stores/DeploymentPoolStore";
import { DeploymentPoolActionCreator } from"ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolActionCreator";
import { DeploymentPoolEventsActionCreator } from"ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolEventsActionCreator";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import { DeploymentPoolDetails } from "ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPoolDetails";
import { DeploymentPoolTargets } from "ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPoolTargets";
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import 'VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPool';

export interface DeploymentPoolProps extends IProps {
    poolId: number;
    tab?: string;
}

export interface DeploymentPoolState extends IState {
    isDataLoaded: boolean;
    selectedTab?: string;
    deploymentPool: DeploymentPoolCommonModel.DeploymentPool;
    deploymentPoolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary;
    errorMessage?: string;
    projectList?: string[];
    selectedProjectList?: string[];
    removedProjectList?: string[];
    hasManagePermission?: boolean;
    filterText?: string;
    updatedDeploymentPoolName?: string;
    isPermissionSet?: boolean;
}

export class DeploymentPool extends Component<DeploymentPoolProps, DeploymentPoolState> implements Events_Document.RunningDocument  {
    constructor(props: DeploymentPoolProps) {
        super(props);
        this._poolInstanceId = DPUtils.DEPLOYMENT_POOL_ITEM_PREFIX + "-pool-" + props.poolId + DtcUtils.getUniqueInstanceId();
        let defaultTab = props && props.tab && (props.tab === DPUtils.DeploymentPoolTabs.details) ? DPUtils.DeploymentPoolTabs.details : DPUtils.DeploymentPoolTabs.targets;
        this._hubViewState =  new HubViewState({
                defaultPivot: defaultTab
            })
        this._hubViewState.filter.subscribe(this._onSearchTextChanged, FILTER_CHANGE_EVENT);
        this._deploymentPoolStore = StoreManager.GetStore<DeploymentPoolStore>(DeploymentPoolStore, this._poolInstanceId);
        this._deploymentPoolActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolActionCreator>(DeploymentPoolActionCreator, this._poolInstanceId);
        this._deploymentPoolEventsActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolEventsActionCreator>(DeploymentPoolEventsActionCreator, this._poolInstanceId);
        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);
        this._eventManager = Events_Services.getService();
    }

    public render(): JSX.Element {
        let filter = this._getFilter();
        let state = this._getState();
        let errorMessage = this._getErrorMessage();
        let badgeCount: number = !!state.deploymentPool && state.deploymentPool.size > 0 ? state.deploymentPool.size : null;
        let isSaveButtonDisabled = !this._isSaveButtonEnabled();
        return (
            <Fabric>
                {errorMessage}
                <Hub
                    className={!!state.errorMessage ? "hub-view deployment-pool-view has-error" : "hub-view deployment-pool-view"}
                    hubViewState={this._hubViewState}
                    hideFullScreenToggle = {true}
                    commands={[
                        { key: "save", name: Resources.Save, important: true, iconProps: { iconName: "Save", iconType: VssIconType.fabric }, onClick: this._onSaveDeploymentPool, disabled: isSaveButtonDisabled},
                        { key: "security", name: Resources.SecurityButtonText, important: true, iconProps: { iconName: "Shield", iconType: VssIconType.fabric }, onClick: this._showSecurityDialog}
                    ]} >
                    <HubHeader breadcrumbItems={this._getBreadCrumbsItems()}>{this._getMetricsElement()}</HubHeader>
                    {filter}
                    <PivotBarItem className="pool-pivot-content" itemKey={DPUtils.DeploymentPoolTabs.details} name={Resources.DeploymentPoolDetailsTab}>
                        {this._getPivotContentForDetailsPivot()}
                    </PivotBarItem>
                    <PivotBarItem className="pool-pivot-content" itemKey={DPUtils.DeploymentPoolTabs.targets} name={Resources.DeploymentPoolTargetsTab} badgeCount={badgeCount} >
                        {this._getPivotContentForTargetsPivot()}
                    </PivotBarItem>
                </Hub>
            </Fabric>);
    }

    public componentWillMount(): void {
        this.setState(this._getInitialState());
    }

    public componentDidMount() {
        super.componentDidMount();
        this._deploymentPoolStore.addChangedListener(this._onStoreChange);
        this._deploymentPoolActionCreator.getDeploymentPoolWithSummary(this.props.poolId);
        this._deploymentPoolActionCreator.getProjectList();
        if (this.props.poolId !== 0) {
            this._deploymentPoolEventsActionCreator.subscribe(this.props.poolId);
        }
        this._eventManager.attachEvent(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.attachEvent(DPUtils.DeploymentPoolActions.ClearErrorMessage, this._clearErrorMessage);
        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("DeploymentPoolView", this);
    }

    public componentWillUnmount() {
        let state = this._getState();
        this._deploymentPoolStore.removeChangedListener(this._onStoreChange);
        this._deploymentPoolEventsActionCreator.unSubscribe(this.props.poolId);
        this._hubViewState.filter.unsubscribe(this._onSearchTextChanged, FILTER_CHANGE_EVENT);
        StoreManager.DeleteStore<DeploymentPoolStore>(DeploymentPoolStore, this._deploymentPoolStore.getInstanceId());
        this._eventManager.detachEvent(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.detachEvent(DPUtils.DeploymentPoolActions.ClearErrorMessage, this._clearErrorMessage);
        super.componentWillUnmount();
    }

    public componentWillUpdate(nextProps: DeploymentPoolProps) {
        if(nextProps && nextProps.tab){
            let selectedTab = (nextProps.tab === DPUtils.DeploymentPoolTabs.details) ? DPUtils.DeploymentPoolTabs.details : DPUtils.DeploymentPoolTabs.targets;
            this._hubViewState.selectedPivot.value = selectedTab;
        } 
    }

    public isDirty() {
        return this._isSaveButtonEnabled() || !this._getState().updatedDeploymentPoolName;
    }

    private _onStoreChange = () => {
        let state = this._getState();
        var deploymentPoolData = this._deploymentPoolStore.getData();
        let updatedDeploymentPoolName: string = deploymentPoolData.updatedDeploymentPoolName || "";
        let selectedTab: string = state.selectedTab;
        if (!state.isDataLoaded && !!deploymentPoolData.deploymentPool) {
            // Data is available for the first time

            updatedDeploymentPoolName = deploymentPoolData.deploymentPool.name || "";
            if(this.props.tab === DPUtils.DeploymentPoolTabs.targets || this.props.tab === DPUtils.DeploymentPoolTabs.details) {
                selectedTab = this.props.tab;
            }
            else {
                selectedTab = deploymentPoolData.deploymentPool.size > 0 ? DPUtils.DeploymentPoolTabs.targets : DPUtils.DeploymentPoolTabs.details;
            }
            
            let urlState = Navigation_Services.getHistoryService().getCurrentState();
            urlState.tab = selectedTab;
            Navigation_Services.getHistoryService().replaceHistoryPoint(undefined, urlState, undefined, false);
        }

        this.setState({
            deploymentPool: deploymentPoolData.deploymentPool,
            isDataLoaded: !!deploymentPoolData.deploymentPool,
            selectedTab: selectedTab,
            projectList: deploymentPoolData.projectList,
            selectedProjectList: deploymentPoolData.selectedProjectList,
            removedProjectList: deploymentPoolData.removedProjectList,
            deploymentPoolSummary: deploymentPoolData.deploymentPoolSummary,
            hasManagePermission: deploymentPoolData.hasManagePermission,
            updatedDeploymentPoolName: updatedDeploymentPoolName,
            isPermissionSet: deploymentPoolData.isPermissionSet
        });
    }

    private _onSearchTextChanged = (filterState: IFilterState): void => {
        let state = this._getState();
        if (filterState && filterState[this._deploymentPoolTargetsNameFilterKey]) {
            let searchText: string = filterState[this._deploymentPoolTargetsNameFilterKey].value.trim();         
            state.filterText = searchText;
            this.setState(state);
        }
    }

    private _getFilter(): JSX.Element {
        if (!this.props.tab || Utils_String.equals(this.props.tab, DPUtils.DeploymentPoolTabs.details, true)){
            return (
                <div></div>
            )
        }
        return (
            <FilterBar>
                <KeywordFilterBarItem filterItemKey= {this._deploymentPoolTargetsNameFilterKey} placeholder={Resources.DeploymentPoolTargetsSearchPlaceHolder} />
            </FilterBar>);
    }

    private _getDeploymentPoolTitleLink(): string {
        return RMUtilsCore.UrlHelper.getDeploymentPoolsPageUrl();
    }

    private _onDeploymentPoolsTitleClick = (e: React.MouseEvent<HTMLElement>): void => {
        if(!this.isDirty()) {
            if (e.ctrlKey) {
                return;
            }
            
            e.preventDefault();
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: DPUtils.DeploymentPoolsConstants.DeploymentPoolsView }, undefined, false, false);
        }
    }

    private _getBreadCrumbsItems(): IHubBreadcrumbItem[] {
        return [
                {
                    key: "DeploymentPools",
                    text: Resources.DeploymentPools,
                    onClick: this._onDeploymentPoolsTitleClick,
                    href: this._getDeploymentPoolTitleLink()
                },
                {
                    key: "DeploymentPool",
                    text: this._getDeploymentPoolDisplayName(),
                    leftIconProps: {
                        iconName: "EngineeringGroup",
                        iconType: VssIconType.fabric
                    }
                }];
    }

    private _getDeploymentPoolDisplayName = (): string => {
        let state = this._getState();
        if(this._isDeploymentPoolNameUpdated(state)){
            return state.updatedDeploymentPoolName + Resources.RenameIndicator;
        }
        return !!state.deploymentPool ? state.deploymentPool.name : "";
    }

    private _isDeploymentPoolNameUpdated(state: DeploymentPoolState): boolean {
        return !!state.deploymentPool && !Utils_String.equals(state.updatedDeploymentPoolName, state.deploymentPool.name, false);
    }

    private _getState(): DeploymentPoolState {
        return this.state || this._getInitialState();
    }

    private _getInitialState(): DeploymentPoolState {
        return {isDataLoaded: false, deploymentPool: undefined, selectedTab: this.props.tab || DPUtils.DeploymentPoolTabs.details, deploymentPoolSummary: undefined, projectList: [], selectedProjectList: [], removedProjectList: [], hasManagePermission: false, filterText: null, updatedDeploymentPoolName: "", isPermissionSet: false} as DeploymentPoolState;    }

    private _getPivotContentForTargetsPivot() {
        if (!this._getState().isDataLoaded) {
            return (<div></div>);
        }

        let pivotContent = <DeploymentPoolTargets deploymentPoolId={this.props.poolId} dpTargetName={this.state.filterText} instanceId={this._poolInstanceId} />;
        return pivotContent;
    }

    private _getPivotContentForDetailsPivot() {
        let state = this._getState();
        if (!state.isDataLoaded) {
            return (<div></div>);
        }

        let dgReferences = !!state.deploymentPoolSummary? state.deploymentPoolSummary.deploymentGroups : [];

        let pivotContent = !!state.deploymentPool ? <DeploymentPoolDetails deploymentPool={state.deploymentPool} projectList = {state.projectList} deploymentGroupReferences = {dgReferences} selectedProjectList = {state.selectedProjectList} removedProjectList = {state.removedProjectList} hasManagePermission={state.hasManagePermission} updatedDeploymentPoolName={state.updatedDeploymentPoolName} instanceId={this._poolInstanceId} isPermissionSet={state.isPermissionSet} copyScriptEnabled={this._isCopyScriptEnabled()} handleDeleteDeploymentGroup={this._handleDeleteDeploymentGroup} handleUndeleteDeploymentGroup={this._handleUndeleteDeploymentGroup} /> : null;   
        return pivotContent;
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


    private _isCopyScriptEnabled(): boolean {
        let state = this._getState();
        return !this.isDirty() && state.hasManagePermission && state.isPermissionSet;
    }

    private _onPivotChanged = (ev: any, pivotKey: string) => {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        urlState.tab = ev;
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false, false);
        var currentState = this._getState();
        currentState.selectedTab = ev;
        currentState.errorMessage = '';
        this.setState(currentState);
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

    private _getErrorMessage(): JSX.Element {
        return !!(this._getState().errorMessage) ? 
            (<MessageBar messageBarType={ MessageBarType.error } isMultiline={ false } onDismiss= {this._clearErrorMessage} dismissButtonAriaLabel = {Resources.CloseButtonText}>
                {this._getState().errorMessage}
            </MessageBar>)
        : null;
    }

    private _showSecurityDialog = (): void => {
        let state = this._getState();
        if (state.deploymentPool) {
            DPUtils.showSecurityDialog(state.deploymentPool.id, state.deploymentPool.name);
        }
    }

    private _onSaveDeploymentPool = () => {
        let state = this._getState();
        let dgsToRemove: DTContracts.DeploymentGroupReference[] = [];
        let projectsToAddDG: string[] = state.selectedProjectList || [];
        if(!!state.deploymentPoolSummary  && !!state.removedProjectList) {
            dgsToRemove = state.deploymentPoolSummary.deploymentGroups.filter(dg => Utils_Array.contains(state.removedProjectList, dg.project.name));
        }

        if(dgsToRemove.length > 0) {
            this._showDGDeleteConfirmationDialog(dgsToRemove, projectsToAddDG);
        }
        else {
            this._deploymentPoolActionCreator.updateDeploymentPoolAndReferences(state.deploymentPool, state.updatedDeploymentPoolName, dgsToRemove, projectsToAddDG);
        }      
    }

    private _showDGDeleteConfirmationDialog = (dgsToRemove: DTContracts.DeploymentGroupReference[], projectsToAddDG: string[]): void => {
        let state = this._getState();
        let namesOfDGsToRemove: string[] = dgsToRemove.map((dg: DTContracts.DeploymentGroupReference) => {
            return dg.name;
        });
        let namesOfDGsToRemoveDisplayString: string = namesOfDGsToRemove.join(', ');
        let titleText = Resources.DeleteDGsFromPoolConfirmationTitle;
        let description = Utils_String.localeFormat(Resources.DeleteDGsFromPoolConfirmationDescription, namesOfDGsToRemoveDisplayString);
        Dialogs.show(ActionConfirmationDialog.ActionConfirmationDialog,
            {
                okCallback: (data: any) => {
                    this._deploymentPoolActionCreator.updateDeploymentPoolAndReferences(state.deploymentPool, state.updatedDeploymentPoolName, dgsToRemove, projectsToAddDG);
                },
                title: titleText,
                description: description
            } as ActionConfirmationDialog.IActionConfirmationDialogOptions);
    }

    private _isSaveButtonEnabled(): boolean{
        let state = this._getState();
        // data is not loaded yet
        if(!state.deploymentPoolSummary || state.projectList.length === 0){
            return false;
        }

        return (!!state.selectedProjectList && state.selectedProjectList.length > 0) ||  (!!state.removedProjectList && state.removedProjectList.length > 0) || (this._isDeploymentPoolNameUpdated(state) && !!state.updatedDeploymentPoolName);
    }

    private _getMetricsElement(): JSX.Element {
        let state = this._getState();
        let onlineAgentsCount: number = !!state.deploymentPoolSummary ? state.deploymentPoolSummary.onlineAgentsCount : undefined;
        let offlineAgentsCount: number = !!state.deploymentPoolSummary ? state.deploymentPoolSummary.offlineAgentsCount : undefined;
        
        if(!onlineAgentsCount && !offlineAgentsCount) {
            return null;
        }

        let metricsIconClass = offlineAgentsCount === 0 ? {iconName:"CircleFill", iconType:VssIconType.fabric, className:"metrics-icon targets-online"} : {iconName:"Blocked", iconType:VssIconType.fabric, className:"metrics-icon targets-offline"};
        let metricsDisplayString: string = this._getMetricsDisplayString(onlineAgentsCount, offlineAgentsCount);

        return <div className = "deployment-pool-metrics">
                <VssIcon iconName={metricsIconClass.iconName} iconType={metricsIconClass.iconType} className={metricsIconClass.className} />
                <span className="deployment-pool-metrics-counts">{metricsDisplayString}</span>
            </div>

    }

    private _getMetricsDisplayString(onlineAgentsCount: number, offlineAgentsCount: number): string {
        if(onlineAgentsCount === 0) {
            return Utils_String.localeFormat(Resources.DeploymentTargetsOffline, offlineAgentsCount);
        }
        if(offlineAgentsCount === 0) {
            return Utils_String.localeFormat(Resources.DeploymentTargetsOnline, onlineAgentsCount);
        }
        return Utils_String.localeFormat(Resources.DeploymentTargetsOfflineOnline, offlineAgentsCount, onlineAgentsCount);
    }

    private _deploymentPoolActionCreator: DeploymentPoolActionCreator;
    private _deploymentPoolEventsActionCreator: DeploymentPoolEventsActionCreator;
    private _deploymentPoolStore: DeploymentPoolStore;
    private _eventManager: Events_Services.EventService;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
    private _hubViewState: IHubViewState;
    private _poolInstanceId: string;
    private readonly _deploymentPoolTargetsNameFilterKey: string = "DeploymentPoolTargetsNameFilter";
}