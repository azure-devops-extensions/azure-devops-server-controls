// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import {Fabric} from "OfficeFabric/Fabric";
import {PrimaryButton} from "OfficeFabric/Button";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TooltipHost, TooltipDelay,ITooltipHostProps } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IColumn, CheckboxVisibility, DetailsListLayoutMode, ConstrainMode } from "OfficeFabric/DetailsList";
import { Async } from "OfficeFabric/Utilities";
import {IHubViewState, HubViewState} from "VSSUI/Utilities/HubViewState";
import {Hub} from "VSSUI/Hub";
import {IHubBreadcrumbItem, HubHeader} from "VSSUI/HubHeader";
import { VssIconType, VssIcon } from 'VSSUI/VssIcon';
import { PivotBarItem} from "VSSUI/PivotBar";
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { VssDetailsList } from "VSSUI/VssDetailsList";
import * as Utils_String from "VSS/Utils/String";

import DTContracts = require("TFS/DistributedTask/Contracts");
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { DeploymentPoolsStore } from"ReleasePipeline/Scripts/DeploymentPools/Stores/DeploymentPoolsStore";
import { DeploymentPoolsActionCreator } from"ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolsActionCreator";
import { AddDeploymentPool } from "ReleasePipeline/Scripts/DeploymentPools/Components/AddDeploymentPool";
import { DeploymentPoolContextMenuActions } from "ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPoolContextMenu";
import Resources = require('ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline');
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import * as ReleasePipelineCommonUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import 'VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPools';

export interface DeploymentPoolsProps extends IProps {
}

export interface DeploymentPoolsState extends IState {
    deploymentPoolsSummary: DeploymentPoolCommonModel.DeploymentPoolSummary[];
    dataloaded: boolean;
    errorMessage: string;
    showAddPoolPanel ?: boolean;
    filterText?: string;
}

export class DeploymentPools extends Component<DeploymentPoolsProps, DeploymentPoolsState> {
    constructor(props: DeploymentPoolsProps) {
        super(props);
        this._hubViewState = new HubViewState();
        this._hubViewState.filter.subscribe(this._onFilterApplied, FILTER_CHANGE_EVENT);
        this._deploymentPoolsStore = StoreManager.GetStore<DeploymentPoolsStore>(DeploymentPoolsStore);
        this._deploymentPoolsActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolsActionCreator>(DeploymentPoolsActionCreator);
        this._eventManager = Events_Services.getService();
    }

    public render(): JSX.Element {
        let filter = this._getFilter();
        let hubContent = this._getHubContent();
        let errorMessage = this._getErrorMessage();
        return (<Fabric>
            {errorMessage}
            <Hub
                className={this._getState().errorMessage ? "hub-view deployment-pools-hub has-error" : "hub-view deployment-pools-hub"}
                hubViewState={this._hubViewState}
                hideFullScreenToggle = {true}
                commands={[
                    { key: "new", name: Resources.NewDeploymentPoolButtonText, important: true, iconProps: { iconName: "Add", iconType: VssIconType.fabric }, onClick : this._onAddPoolClick},
                    { key: "security", name: Resources.SecurityButtonText, important: true, iconProps: { iconName: "Shield", iconType: VssIconType.fabric }, onClick: this._showSecurityDialog}
                ]} >
                <HubHeader breadcrumbItems={this._getBreadCrumbsItems()} />
                {filter}
                <PivotBarItem 
                    name={Resources.Pools}
                    itemKey="poolsTab" 
                    className="deployment-pools-pivot">
                    {hubContent}
                </PivotBarItem>
            </Hub>
        </Fabric>);
    }

    public componentWillMount(): void {
        this._async = new Async();
        this._onFilterApplied = this._async.debounce(this._onFilterApplied, ReleasePipelineCommonUtils.SEARCH_INPUT_CHANGE_DELAY, {
            leading: false
        });
        this.setState(this._getInitialState());
    }

    public componentDidMount() {
        super.componentDidMount();
        this._deploymentPoolsStore.addChangedListener(this._onStoreChange);
        this._eventManager.attachEvent(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.attachEvent(DPUtils.DeploymentPoolActions.ClearErrorMessage, this._clearErrorMessage);
        this._deploymentPoolsActionCreator.loadDeploymentPoolsSummary();
    }

    public componentWillUnmount() {
        this._deploymentPoolsStore.removeChangedListener(this._onStoreChange);
        this._hubViewState.filter.unsubscribe(this._onFilterApplied, FILTER_CHANGE_EVENT);
        StoreManager.DeleteStore<DeploymentPoolsStore>(DeploymentPoolsStore);
        this._eventManager.detachEvent(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this._updateErrorMessage);
        this._eventManager.detachEvent(DPUtils.DeploymentPoolActions.ClearErrorMessage, this._clearErrorMessage);
        if (this._async) {
            this._async.dispose();
        }
        super.componentWillUnmount();
    }

    private _onStoreChange = () => {
        let state = this._getState();
        let deploymentPoolsSummary: DeploymentPoolCommonModel.DeploymentPoolSummary[] = this._deploymentPoolsStore.getPoolsSummaryData().slice();
        state.deploymentPoolsSummary = deploymentPoolsSummary;
        state.dataloaded = true;
        state.errorMessage = "";
        this.setState(state);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.LandingOnDeploymentPoolHubScenario);
    }

    private _onFilterApplied = (filterState: IFilterState): void => {
        if (filterState && filterState[this._deploymentPoolsNameFilterKey]) {
            let state = this._getState();
            let searchText: string = "*" + filterState[this._deploymentPoolsNameFilterKey].value.trim() + "*";
            this._deploymentPoolsActionCreator.loadDeploymentPoolsSummary(searchText);            
            state.filterText = searchText;
            this.setState(state);
        }
    }

    private _getState(): DeploymentPoolsState {
       return this.state || this._getInitialState();
    }

    private _getInitialState(): DeploymentPoolsState {
       return { deploymentPoolsSummary: [], dataloaded: false, errorMessage: "", showCreatePoolPane: false, filterText: null};
    }

    private _getHubContent(): JSX.Element {
        let state = this._getState();
        if (!state.dataloaded) {
            return (<div></div>);
        }

        let addPoolPane: JSX.Element = (<AddDeploymentPool showPanel={state.showAddPoolPanel} onClosePanel = {this._onAddPoolDialogClose}/>);

        if (state.deploymentPoolsSummary.length > 0 || !!state.filterText) {
            return (<div className="deployment-pool-list" role="region" aria-label={Resources.DeploymentPools}>
                {addPoolPane}
                <VssDetailsList
                    items={state.deploymentPoolsSummary}
                    initialFocusedIndex={0}
                    setKey='set'
                    constrainMode={ConstrainMode.unconstrained}
                    layoutMode={DetailsListLayoutMode.justified}
                    columns={this._getColumns()}
                    ariaLabelForGrid={Resources.DeploymentPools}
                    onRenderItemColumn={this._renderItemColumn}
                    checkboxVisibility={CheckboxVisibility.hidden}
                    onItemInvoked={(item, index, ev) => this._onItemInvoked(item, ev)} />
            </div>);
        }

        return (<div className="deployment-pool-list" role="region" aria-label={Resources.DeploymentPools}>
            {addPoolPane}
            <div className="deployment-pools-getting-started">
                <div className="deployment-pools-getting-started-icon">
                    <VssIcon iconName={"EngineeringGroup"} iconType={VssIconType.fabric} />
                </div>
                <div className="deployment-pools-getting-started-content">
                    <div className="deployment-pools-getting-started-content-title">{Resources.DeploymentPools}</div>
                    <div className="deployment-pools-getting-started-content-about">
                        {Resources.DeploymentPoolsDescription}
                    </div>
                    <div className="deployment-pools-getting-started-content-button">
                        <PrimaryButton text={Resources.NewDeploymentPoolPrimaryButtonText} onClick={this._onAddPoolClick} />
                    </div>
                </div>
            </div>
        </div>);
    }

    private _getFilter(): JSX.Element {
        return (
            <FilterBar>
                <KeywordFilterBarItem filterItemKey= {this._deploymentPoolsNameFilterKey} placeholder={Resources.DeploymentPoolsSearchPlaceHolder} />
            </FilterBar>);
    }

    private _getColumns(): IColumn[] {
        return [
            {
                key: "name",
                name: Resources.Name,
                fieldName: Resources.Name,
                minWidth: 250,
                maxWidth: 350,
                isResizable: true
            },
            {
                key: "deploymentpoolstatus",
                name: Resources.StatusTitle,
                fieldName: Resources.StatusTitle,
                minWidth: 250,
                maxWidth: 300,
                isResizable: true
            },
                        {
                key: "projectReferences",
                name: Resources.ProjectReferencesTitle,
                fieldName: Resources.ProjectReferencesTitle,
                minWidth: 250,
                maxWidth: 500,
                isMultiline: true
            }
        ];
    }

    private _renderItemColumn(item, index, column) {
        let fieldContent = item[column.fieldName];

        switch (column.key) {
            case "name":
                return (
                    <div className="deployment-pool-item-name-wrapper">
                        <div className="deployment-pool-item-name">
                            <div className="deployment-pool-name-wrapper">
                                <KeyboardAccesibleComponent className={"deployment-pool-name-column"} onClick={() => DeploymentPools._onDeploymentPoolClick(item)} toolTip={ Utils_String.format(Resources.ViewDeploymentPoolTooltip, item.name) } >
                                    <VssIcon iconName="EngineeringGroup" iconType={VssIconType.fabric} />
                                    <span>{item.name}</span>
                                </KeyboardAccesibleComponent>
                            </div>
                            <DeploymentPoolContextMenuActions deploymentPoolSummary={item} />
                        </div>
                    </div>
                );

            case 'deploymentpoolstatus':
                let status = DeploymentPoolCommonModel.DeploymentPoolSummary.getSummaryStatusIconClass(item);
                return (
                    <div className="deployment-pool-status-wrapper">
                        <VssIcon iconName={status.iconName} iconType={status.iconType} className={status.className} />
                        <span className="deployment-pools-status-column">{DeploymentPoolCommonModel.DeploymentPoolSummary.getSummaryStatus(item)}</span>
                    </div>
                );

            case 'projectReferences':
            let dgReferences = item.deploymentGroups || [];
            dgReferences = dgReferences.sort((a: DTContracts.DeploymentGroupReference, b: DTContracts.DeploymentGroupReference) => { return Utils_String.localeIgnoreCaseComparer(a.project.name, b.project.name); });
                return (
                    <div className="deployment-pool-project-references-column-wrapper">
                    {
                        dgReferences.map((dg: DTContracts.DeploymentGroupReference, index: number) => {
                            let separator = index !== dgReferences.length -1? (<span>{Resources.CommaSeparator}</span>) : null;
                            return (<TooltipHost
                                        key={dg.id}
                                        content={ Utils_String.format(Resources.ViewDeploymentGroupToolTip, dg.name) }
                                        directionalHint={DirectionalHint.bottomLeftEdge}>
                                        <a href={RMUtilsCore.UrlHelper.getDeploymentGroupPageUrl(dg.id, dg.project.id)} target="_blank" aria-label={ dg.project.name }>{dg.project.name}</a>
                                        {separator}
                                    </TooltipHost>)
                        })
                    }
                    </div>
                );

            default:
                return <span>{fieldContent}</span>;
        }
    }

    private static _onDeploymentPoolClick(deploymentPoolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary): void {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.LandingOnDeploymentPoolTargetsPageScenario);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: DPUtils.DeploymentPoolsConstants.DeploymentPoolView, poolid: deploymentPoolSummary.id});
    }

    public _onItemInvoked(deploymentPoolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary, event: Event): void {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.LandingOnDeploymentPoolTargetsPageScenario);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: DPUtils.DeploymentPoolsConstants.DeploymentPoolView, poolid: deploymentPoolSummary.id});
        event.stopPropagation();
    }

    private _getBreadCrumbsItems(): IHubBreadcrumbItem[] {
        var items: IHubBreadcrumbItem[] = [];
        items.push({
                key: "DeploymentPools",
                text: Resources.DeploymentPools
            } as IHubBreadcrumbItem);

        return items;
    }

    private _getErrorMessage(): JSX.Element {
        return !!(this._getState().errorMessage) ? 
            (<MessageBar messageBarType={ MessageBarType.error } isMultiline={ true } onDismiss= {this._clearErrorMessage} dismissButtonAriaLabel = {Resources.CloseButtonText}>
                {this._getState().errorMessage}
            </MessageBar>) : null;
    }

    private _onAddPoolClick = () => {
        let state = this._getState();
        state.showAddPoolPanel = true;
        this.setState(state);
    }

    private _onAddPoolDialogClose = () => {
        let state = this._getState();
        state.showAddPoolPanel = false;
        this.setState(state);
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

    private _showSecurityDialog = (): void => {
        DPUtils.showSecurityDialog();
    }

    private _deploymentPoolsActionCreator: DeploymentPoolsActionCreator;
    private _deploymentPoolsStore: DeploymentPoolsStore;
    private _eventManager: Events_Services.EventService;
    private _hubViewState: IHubViewState;
    private readonly _deploymentPoolsNameFilterKey: string = "DeploymentPoolsNameFilter";
    private _async: Async;
}