// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import Navigation_Controls = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_String = require("VSS/Utils/String");
import Events_Services = require("VSS/Events/Services");
import VSS = require("VSS/VSS");
import {IHubViewState, HubViewState} from "VSSUI/Utilities/HubViewState";
import {Hub} from "VSSUI/Hub";
import {HubHeader} from "VSSUI/HubHeader";
import {VssIconType, VssIcon} from "VSSUI/VssIcon";
import { PivotBar, PivotBarItem, PivotBarItemDeselectionBehavior, IPivotBarAction } from 'VSSUI/PivotBar';
import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { VssDetailsList, VssDetailsListRowStyle, VssDetailsListTitleCell } from 'VSSUI/VssDetailsList';

import { Fabric } from "OfficeFabric/Fabric";
import { DetailsList, IColumn, CheckboxVisibility , DetailsListLayoutMode, ConstrainMode} from 'OfficeFabric/DetailsList';
import { PrimaryButton } from "OfficeFabric/components/Button/PrimaryButton/PrimaryButton";
import { CommandBar } from "OfficeFabric/CommandBar";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Selection } from "OfficeFabric/utilities/selection/Selection";
import { Async } from "OfficeFabric/Utilities";

import {DeploymentPoolSummary} from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model"
import * as ReleasePipelineCommonUtils from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.Common.Utils";
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import MachineGroupsStore = require("ReleasePipeline/Scripts/MachineGroup/Stores/MachineGroupsStore");
import {MachineGroupContextMenuActions}  from "ReleasePipeline/Scripts/MachineGroup/Components/MachineGroupContextMenuActions";
import MachineGroupsActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupsActionCreator");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";
import { focusDetailsListRow } from "DistributedTaskControls/Common/ReactFocus";
import MachineGroupActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator");
import Component_AvailableSharedPools = require("ReleasePipeline/Scripts/MachineGroup/Components/AvailableSharedPools");
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/MachineGroups";

export interface Props extends Component_Base.Props {
    tab: string;
    actionCreator?: MachineGroupsActionCreator.MachineGroupsActionCreator;
}

export interface State extends Component_Base.State {
    machineGroups: Model.MachineGroup[];
    deploymentGroupsMetrics: Model.DeploymentGroupUIMetrics[];
    dataloaded: boolean;
    errorMessage: string;
    continuationToken: string;
    availableSharedPoolsSummary: DeploymentPoolSummary[];
    filterText?: string;
}

export class MachineGroups extends Component_Base.Component<Props, State> {
    public refs: {
        [key: string]: React.ReactInstance,
        machineGroupsList: HTMLElement
    };

    constructor(props: Props) {
        super(props);
        let defaultTab = props && props.tab && (props.tab === MGUtils.MachineGroupsConstants.AvailablePoolsTab) ? MGUtils.MachineGroupsConstants.AvailablePoolsTab : MGUtils.MachineGroupsConstants.AllTab;
        this._hubViewState =  new HubViewState({
                defaultPivot: defaultTab
            });
        this._hubViewState.filter.subscribe(this._onFilterApplied, FILTER_CHANGE_EVENT);
        this._selection = new Selection();
        this._isDeleting = false;
        this._isMounted = false;
        this._selectedMachineGroupIndex = -1;

        this._machineGroupsActionCreator = this.props.actionCreator || MachineGroupsActionCreator.ActionCreator;
        this._machineGroupActionCreator = MachineGroupActionCreator.ActionCreator;
        this._machineGroupsStore = MachineGroupsStore.MachineGroups;
        this._eventManager = Events_Services.getService();
    }

    public render(): JSX.Element {

        let state = this._getState();
        let filter = this._getFilter(this.props.tab);
        let errorMessage = this._getErrorMessage();
        let availablePoolsTab: JSX.Element = null;
        let badgeCount: number = !!state.availableSharedPoolsSummary && state.availableSharedPoolsSummary.length > 0 ? state.availableSharedPoolsSummary.length : null;
        availablePoolsTab = (<PivotBarItem
            itemKey={MGUtils.MachineGroupsConstants.AvailablePoolsTab}
            name={Resources.DeploymentGroupTitleBarAvailableSharedPools}
            deselectionBehavior={PivotBarItemDeselectionBehavior.Hide}
            badgeCount={badgeCount}>
                {this._getHubContent(MGUtils.MachineGroupsConstants.AvailablePoolsTab)}
        </PivotBarItem>);

        return (<Fabric>
            {errorMessage}
            <Hub
                className={state.errorMessage ? "hub-view deployment-groups-view has-error" : "hub-view deployment-groups-view"}
                hubViewState={this._hubViewState}
                hideFullScreenToggle = {true}
                commands={this._getCommandBarItemsForAllTab()} >
                <HubHeader title={Resources.DeploymentGroupHubTitle} />
                {filter}
                <PivotBarItem 
                    itemKey={MGUtils.MachineGroupsConstants.AllTab}
                    name={Resources.DeploymentGroupTabTitleGroups}
                    deselectionBehavior={PivotBarItemDeselectionBehavior.Hide}>
                    {this._getHubContent(MGUtils.MachineGroupsConstants.AllTab)}
                </PivotBarItem>
                {availablePoolsTab}
            </Hub>
        </Fabric>);
    }

    public componentDidMount() {
        this._isMounted = true;
        super.componentDidMount();
        this._machineGroupsStore.addChangedListener(this._onStoreChange);
        this._hubViewState.selectedPivot.subscribe(this._UpdateSelectedTab);
        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.attachEvent(MGUtils.DeploymentGroupActions.ClearErrorMessage, this.clearErrorMessage);

        this._machineGroupsActionCreator.loadDeploymentGroupsMetricsView();
        this._machineGroupsActionCreator.loadAvailableSharedPools();
    }

    public componentWillMount() {
        this._async = new Async();
        this._onFilterApplied = this._async.debounce(this._onFilterApplied, ReleasePipelineCommonUtils.SEARCH_INPUT_CHANGE_DELAY, {
            leading: false
        });
    }
 
    public componentWillUnmount() {
        this._isMounted = false;
        this._machineGroupsStore.removeChangedListener(this._onStoreChange);
        this._hubViewState.filter.unsubscribe(this._onFilterApplied, FILTER_CHANGE_EVENT);
        this._hubViewState.selectedPivot.unsubscribe(this._UpdateSelectedTab);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this.updateErrorMessage);
        this._eventManager.detachEvent(MGUtils.DeploymentGroupActions.ClearErrorMessage, this.clearErrorMessage);
        if (this._async) {
            this._async.dispose();
        }
        super.componentWillUnmount();
    }


    public componentWillUpdate(nextProps: Props) {
        if(nextProps && nextProps.tab){
            let selectedTab = (nextProps.tab === MGUtils.MachineGroupsConstants.AvailablePoolsTab) ? MGUtils.MachineGroupsConstants.AvailablePoolsTab : MGUtils.MachineGroupsConstants.AllTab;
            this._hubViewState.selectedPivot.value = selectedTab;
        } 
        if (this._selection.getSelectedCount() > 0) {
                let selectedDGId: number = -1;
                this._selection.getSelection().forEach((item: any) => {
                    // Since it is not a multi-select list, only one item will be selected
                    selectedDGId = item.id;
                });

                this._selection.getItems().forEach((item: any, index: number) => {
                    if (item.id === selectedDGId) {
                        this._selectedMachineGroupIndex = index;
                    }
                });
            }
    }

    public componentDidUpdate(): void {
        if (this._isDeleting) {
            if (this._selectedMachineGroupIndex === this._getState().deploymentGroupsMetrics.length) {
                this._selectedMachineGroupIndex--;
            }

            if (this._selectedMachineGroupIndex !== -1 && this.refs.machineGroupsList) {
                this._selection.setIndexSelected(this._selectedMachineGroupIndex, true, true);
                focusDetailsListRow(this.refs.machineGroupsList, this._selectedMachineGroupIndex);
            }

            this._isDeleting = false;
        }
    }

    private _onStoreChange = () => {
        let state = this._getState();
        let deploymentGroupsMetrics: Model.DeploymentGroupUIMetrics[] = this._machineGroupsStore.getMetricsData().slice();
        let continuationToken: string = this._machineGroupsStore.getContinuationToken();
        state.deploymentGroupsMetrics = deploymentGroupsMetrics;
        state.availableSharedPoolsSummary = this._machineGroupsStore.getAvailableSharedPoolsSummary();
        state.continuationToken = continuationToken;
        state.dataloaded = true;
        state.errorMessage = "";
        this.setState(state);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.LandingOnMachineGroupHubScenario);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.DeleteMachineGroupScenario);
    }

    private _onFilterApplied = (filterState: IFilterState): void => {
        if (filterState && filterState[this._deploymentGroupsNameFilterKey]) {         
            let state = this._getState();
            let searchText: string = "*" + filterState[this._deploymentGroupsNameFilterKey].value.trim() + "*";
            this._machineGroupsActionCreator.loadDeploymentGroupsMetricsView(null, false, searchText);            
            state.filterText = searchText;
            state.continuationToken = null;
            this.setState(state);
        }
    }

    private static _onMachineGroupClick(machineGroup: Model.MachineGroup): void {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.ListMachinesScenario);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupView, mgid: machineGroup.id });
    }

    private static _onDeploymentGroupMetricsClick(deploymentGroupMetrics: Model.DeploymentGroupUIMetrics): void {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.ListMachinesScenario);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupView, mgid: deploymentGroupMetrics.id });
    }

    public _onItemInvoked(machineGroup: Model.MachineGroup, event: Event): void {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.ListMachinesScenario);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupView, mgid: machineGroup.id });
        event.stopPropagation();
    }

    public _onMetricsItemInvoked(deploymentGroupMetrics: Model.DeploymentGroupUIMetrics, event: Event): void {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.ListMachinesScenario);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { view: MGUtils.MachineGroupsConstants.MachineGroupView, mgid: deploymentGroupMetrics.id });
        event.stopPropagation();
    }

    private _onAddMachineGroup = () =>{
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        let machineGroup: Model.MachineGroup = new Model.MachineGroup();
        machineGroup.id = 0
        this._machineGroupActionCreator.initializeDeploymentGroup(machineGroup);

        urlState.view = MGUtils.MachineGroupsConstants.MachineGroupView;
        urlState.mgid = 0;
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false);
    }

    private _onAvailablePoolsClick = () =>{
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        urlState.tab = MGUtils.MachineGroupsConstants.AvailablePoolsTab;
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false);
    }

    private _showSecurityDialog() {
        MGUtils.showSecurityDialog();
    }

    private _UpdateSelectedTab(newTab: string) {
        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        urlState.tab = newTab;
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false);
    }

    private _getHubContent(tab: string): JSX.Element {
        let state = this._getState();
        if (tab == MGUtils.MachineGroupsConstants.AvailablePoolsTab) {
            return (
                <Fabric>
                    <Component_AvailableSharedPools.AvailableSharedPools availableSharedPoolsSummary={state.availableSharedPoolsSummary} />
                </Fabric>);
        }

        if (!state.dataloaded) {
            return (<div></div>);
        }
        let showMoreComponent: JSX.Element;
        if (state.continuationToken == null) {
            showMoreComponent = (<div></div>);
        } else {
            showMoreComponent = (<KeyboardAccesibleComponent className={"show-more-metrics"} onClick={ () => { this._machineGroupsActionCreator.loadDeploymentGroupsMetricsView(state.continuationToken, true, state.filterText); } }>
                <span role="button"> { Resources.ShowMoreDeploymentGroups }</span>
            </KeyboardAccesibleComponent>);
        }

        if (!(state.continuationToken == null && state.deploymentGroupsMetrics.length == 0) || !!state.filterText)
        {
            return (<div className = "machine-group-list" ref="machineGroupsList" role = "region" aria-label = {Resources.DeploymentGroups}>
                <VssDetailsList
                    items={ this._getDeploymentGroupsMetrics(state) }
                    setKey='set'
                    selection={this._selection}
                    initialFocusedIndex = {0}
                    constrainMode={ConstrainMode.unconstrained}
                    layoutMode={DetailsListLayoutMode.justified}
                    columns={ this._getColumns() }
                    ariaLabelForGrid = {Resources.DeploymentGroups}
                    onRenderItemColumn={ this._renderItemColumn }
                    checkboxVisibility={CheckboxVisibility.hidden}
                    onRowWillUnmount={this._onMetricsRowWillUnmount.bind(this) }
                    onItemInvoked={(item, index, ev) => this._onMetricsItemInvoked(item, ev) } />
                    {showMoreComponent}
                </div>); 
            }

        return ( <div className = "machine-group-getting-started" role = "region" aria-label = {Resources.DeploymentGroups}>
                    <div className = "machine-group-icon-section">
                        <i className= { "bowtie-icon bowtie-server-remote machine-group-icon" }/>
                        <i className= { "bowtie-icon bowtie-math-plus-circle-outline add-machine-group-icon" }/>
                    </div>
                    <div className = "add-machine-group-section">
                        <div className = "machine-group-add-text">{Resources.AddDeploymentGroupText}</div>
                        <div className = "machine-group-add-description">{Resources.AddDeploymentGroupDescription}</div>
                        <div className = "machine-group-buttons machine-group-add-button">
                            <PrimaryButton onClick={this._onAddMachineGroup}>{Resources.AddDeploymentGroupText}</PrimaryButton>
                        </div>
                        <div className = "machine-group-info-link">
                            <a onClick={ (e) => { MGUtils.onExternalLinkClicked(e, MGUtils.MachineGroupsForwardLinks.LearnMoreAboutMachineGroupsLink); } } href = {MGUtils.MachineGroupsForwardLinks.LearnMoreAboutMachineGroupsLink}>
                                <span className = {"bowtie-icon bowtie-status-help-outline"}/>
                                {Resources.LearnMoreAboutMachineGroupsText}</a>
                        </div>
                    </div>
            </div>);
    }

    private _getFilter(tab: string): JSX.Element {
        if (tab != MGUtils.MachineGroupsConstants.AvailablePoolsTab) {
            return (
                <FilterBar>
                    <KeywordFilterBarItem filterItemKey= {this._deploymentGroupsNameFilterKey} placeholder={Resources.DeploymentGroupsSearchPlaceHolder} />
                </FilterBar>);
            }

        return null;           
    }

    public _onRowWillUnmount(item: Model.MachineGroup, index: number): void {
        if (this._isMounted && this.refs.machineGroupsList) {
            // The component is mounted, but row is being unmounted implies a delete operation is being performed
            this._isDeleting = true;
        }
    }

    public _onMetricsRowWillUnmount(item: Model.DeploymentGroupUIMetrics, index: number): void {
        if (this._isMounted && this.refs.machineGroupsList) {
            // The component is mounted, but row is being unmounted implies a delete operation is being performed
            this._isDeleting = true;
        }
    }

    private _getColumns(): IColumn[] {
        return [
                {
                    key: "name",
                    name: Resources.Name,
                    fieldName: Resources.Name,
                    minWidth: 340,
                    maxWidth: 400,
                    isResizable: true
                },
                {
                    key: "targetStatus",
                    name: Resources.AvailableSharedPoolsColoumnTitleForPoolsTargetStatus,
                    fieldName: Resources.AvailableSharedPoolsColoumnTitleForPoolsTargetStatus,
                    minWidth: 150,
                    maxWidth: 300,
                    isResizable: true
                },
                {
                    key: "deploymentStatus",
                    name: Resources.DeploymentStatusColumn,
                    fieldName: Resources.DeploymentStatusColumn,
                    minWidth: 150,
                    maxWidth: 350
                }
            ];
    }

    private _renderItemColumn(item, index, column) {
        let fieldContent = item[column.fieldName];
        let shareBadge: JSX.Element = null;
        if(item.isShared){
            shareBadge = <span className="badge" >{Resources.SharedBadgeText}</span>;
        } 

        switch (column.key) {
            case 'name':
                return (
                    <div className="deploymentgroup-name-column-wrapper">
                        <KeyboardAccesibleComponent className="deploymentgroup-name-wrapper" hostClassName="deploymentgroup-name-tooltip" onClick={ () => MachineGroups._onDeploymentGroupMetricsClick(item) } toolTip={ Utils_String.format(Resources.ViewDeploymentGroupToolTip, item.name) } >
                            <VssIcon iconName = "bowtie-server-remote" iconType = {VssIconType.fabric} />
                            <span className="deploymentgroup-name-text">{item.name}</span>
                        </KeyboardAccesibleComponent>
                        {shareBadge}
                        <MachineGroupContextMenuActions deploymentGroupMetrics = {item}/>
                    </div>
                );

            case 'targetStatus':
            let targetStatus = Model.DeploymentGroupUIMetrics.getTargetStatusIconClass(item);
            return (
                <div className="machine-groups-metrics-column-wrapper">
                    <VssIcon iconName={targetStatus.iconName} iconType={targetStatus.iconType} className={targetStatus.className}/>
                    <div className="machine-groups-metrics-column">{ Model.DeploymentGroupUIMetrics.getTargetStatus(item)}</div>
                </div>
            );

            case 'deploymentStatus':
                let deploymentStatus = Model.DeploymentGroupUIMetrics.getDeploymentStatusIconClass(item);
                let iconComponent: JSX.Element = !!deploymentStatus ? <VssIcon iconName={deploymentStatus.iconName} iconType={deploymentStatus.iconType} className={deploymentStatus.className}/> : null;
                
                return (
                    <div className="machine-groups-metrics-column-wrapper">
                        {iconComponent}
                        <div className="machine-groups-metrics-column">{ Model.DeploymentGroupUIMetrics.getDeploymentStatus(item)}</div>
                    </div>
                );      
            default:
                return <span>{ fieldContent }</span>;
        }
    }

    private _getState(): State {
        return this.state || { machineGroups: [], deploymentGroupsMetrics: [], dataloaded: false, errorMessage: "", continuationToken: null, availableSharedPoolsSummary: [], filterText: null };
    }

    private _getErrorMessage(): JSX.Element {
        return !!(this._getState().errorMessage) ? 
            (<MessageBar messageBarType={ MessageBarType.error } isMultiline={ true } onDismiss={() => { Events_Services.getService().fire(MGUtils.DeploymentGroupActions.ClearErrorMessage); }} dismissButtonAriaLabel = {Resources.CloseButtonText}>
                {this._getState().errorMessage}
            </MessageBar>) : null;
    }

    private _getMachineGroups(state: State): Model.MachineGroup[] {
        if(state.machineGroups) {
            return state.machineGroups.sort((a: Model.MachineGroup, b: Model.MachineGroup) => { return Utils_String.localeIgnoreCaseComparer(a.name, b.name); });
        }
        return [];
    }

    private _getDeploymentGroupsMetrics(state: State): Model.DeploymentGroupUIMetrics[] {
        if(state.deploymentGroupsMetrics) {
            return state.deploymentGroupsMetrics.sort((a: Model.DeploymentGroupUIMetrics, b: Model.DeploymentGroupUIMetrics) => { return Utils_String.localeIgnoreCaseComparer(a.name, b.name); });
        }
        return [];
    }

    private _getCommandBarItemsForAllTab(): IPivotBarAction[] {
        let items: IPivotBarAction[] = [];

        if (this.props.tab == MGUtils.MachineGroupsConstants.AvailablePoolsTab)
        {
            return items;
        }

        items.push({            
            name: Resources.DeploymentGroupTitleBarAddDeploymentGroup,
            key: "Add",
            important: true,
            ariaLabel: Resources.AddDeploymentGroupText,
            iconProps: { iconName: "Add", iconType: VssIconType.fabric },
            onClick: this._onAddMachineGroup
        });

        items.push({
            name: Resources.DeploymentGroupSecurity,
            key: "Security",
            important: true,
            ariaLabel: Resources.DeploymentGroupSecurityText,
            iconProps: { iconName: "Shield", iconType: VssIconType.fabric },
            onClick: this._showSecurityDialog
        });

        items.push({
            name: Resources.DeploymentGroupTitleBarHelp,
            key: "help",
            important: true,
            ariaLabel: Resources.LearnMoreAboutMachineGroupsText,
            iconProps: { iconName: "bowtie-status-help-outline", iconType: VssIconType.bowtie },
            onClick: (e) => { MGUtils.onExternalLinkClicked(e, MGUtils.MachineGroupsForwardLinks.LearnMoreAboutMachineGroupsLink); }
        });

        return items;
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

    private _machineGroupsActionCreator: MachineGroupsActionCreator.MachineGroupsActionCreator;
    private _machineGroupsStore: MachineGroupsStore.MachineGroupsStore;
    private _machineGroupActionCreator: MachineGroupActionCreator.MachineGroupActionCreator
    
    // Focus related variables
    private _selection: Selection;
    private _isMounted: boolean;
    private _selectedMachineGroupIndex: number;
    private _isDeleting: boolean = false;
    private _eventManager: Events_Services.EventService;
    private readonly _deploymentGroupsNameFilterKey: string = "DeploymentGroupsNameFilter";

    private _hubViewState: IHubViewState;
    private _async: Async;
}
