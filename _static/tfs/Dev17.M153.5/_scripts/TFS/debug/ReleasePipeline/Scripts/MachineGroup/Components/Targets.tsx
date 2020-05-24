// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types='react' />
/// <reference types='react-dom' />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import * as Utils_Array from "VSS/Utils/Array";
import Utils_String = require("VSS/Utils/String");
import { VssDetailsList, VssDetailsListRowStyle, VssDetailsListTitleCell } from 'VSSUI/VssDetailsList';
import Navigation_Services = require("VSS/Navigation/Services");
import Utils_Date = require("VSS/Utils/Date");
import { KeyCode } from "VSS/Utils/UI";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

import {KeyCodes } from 'OfficeFabric/Utilities';
import { IColumn, CheckboxVisibility, DetailsListLayoutMode, ConstrainMode, SelectionMode } from 'OfficeFabric/DetailsList';
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Selection } from "OfficeFabric/utilities/selection/Selection";
import { Async } from "OfficeFabric/Utilities";

import ActionConfirmationDialog = require("ReleasePipeline/Scripts/Common/Components/ActionConfirmationDialog");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import { MachineContextMenuActions } from "ReleasePipeline/Scripts/MachineGroup/Components/MachineContextMenuActions";
import MachineGroupActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator");
import Tag = require("ReleasePipeline/Scripts/MachineGroup/Components/TargetTags");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import {IIconStatus} from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";
import DTContracts = require("TFS/DistributedTask/Contracts");

export interface Props extends Component_Base.Props {
    mgId: number;
    machineTags: string[];
    selectedMachineId?: number;
    className?: string;
    pagedTargetGroups?: Model.PagedTargetGroups;
    isFilteredApplied?: boolean;
    deploymentGroupMetrics?: Model.DeploymentGroupUIMetrics;
    currentTagsBymachineIds?: Map<number, string[]>
}

export interface State extends Component_Base.State {
}

export class Targets extends Component_Base.Component<Props, any> {
    public refs: {
        [key: string]: React.ReactInstance,
        machinesList: HTMLElement
    };

    constructor(props: Props) {
        super(props);
        this._machineGroupActionCreator = MachineGroupActionCreator.ActionCreator;
    }

    public render(): JSX.Element {
        let className = this.props.className || "machine-list";
        let state = this._getState();
        let targetsList = this.props.isFilteredApplied ? this._getTargetsFilteredView() : this._getTargetsGroupView();
        let pagedTargetsView = (<div ref="machinesList" className={className} role="region" aria-label={Resources.Machines}>
            {targetsList}
        </div>);

        return pagedTargetsView;
    }

    public componentWillUnmount(): void {
        if (this._inputTimeout) {
            clearTimeout(this._inputTimeout);
        }

        super.componentWillUnmount();
    }

    public onItemInvoked(machine: Model.Machine, event: Event): void {
        // clearing if there is any pending call
        if (this._inputTimeout) {
            clearTimeout(this._inputTimeout);
        }
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { machineid: machine.id });
        event.stopPropagation();
    }

    public onActiveItemChanged(machine: Model.Machine, event: React.FocusEvent<HTMLElement>): void {
        if (this._inputTimeout) {
            clearTimeout(this._inputTimeout);
        }

        // update selected machine after a delay of 400 ms
        this._inputTimeout = setTimeout(() => {
            Navigation_Services.getHistoryService().addHistoryPoint(undefined, { machineid: machine.id });
        }, 400);
        event.stopPropagation();
    }

    private _onTagUpdated = (machineId: number, currentTags: string[]) => {
        PerformanceTelemetry.PerformanceUtil.startScenario(PerfScenariosConstants.UpdateMachineScenario);
        let machine = MGUtils._getAllTargets(this.props.pagedTargetGroups).filter(a => a.id === machineId)[0];
        this._machineGroupActionCreator.deploymentMachineTagsUpdate(machine, currentTags);

    }

    private _getSelectedMachineId(): number {
        let machines = MGUtils._getAllTargets(this.props.pagedTargetGroups);
        if(machines.length === 0){
            return -1;
        }
        if(!this.props.selectedMachineId && this.props.selectedMachineId !== 0){
            return machines[0].id;
        }
        let isCurrentSelectedMachineIncluded: boolean = machines.filter(a => a.id == this.props.selectedMachineId).length > 0;
        // return the selected machine id if it is present in the filtered machines list, else return the first machines id
        return isCurrentSelectedMachineIncluded ? this.props.selectedMachineId : machines[0].id;
    }

    private _getInitialFocusedIndex(): number {
        let selectedMachine = this._getSelectedMachine();
        if(selectedMachine){
            let machines = MGUtils._getAllTargets(this.props.pagedTargetGroups);
            return machines.indexOf(selectedMachine);
        }
        return -1;
    }

    private _onLastDeploymentKeydown(ev: React.KeyboardEvent<HTMLElement>) {
        switch (ev.which) {
            case KeyCodes.enter:
                ev.stopPropagation();
                break;

            default:
                return;
        }
    }

    private _getCurrentTags(propsItem, currentTagsByMachineIds): string[] {
        if(!!currentTagsByMachineIds && currentTagsByMachineIds.has(propsItem.id)) {
            return currentTagsByMachineIds.get(propsItem.id);
        }
        
        return propsItem.tags;
    }

    private _getState(): State {
        return this.state || {machines: []};
    }

    private loadMoreCall(pagedTargetGroup: Model.PagedTargetGroup, targetStatusOptions?: Model.TargetStatusOptions) {
        let isFiltered = targetStatusOptions && targetStatusOptions === Model.TargetStatusOptions.Filtered ? true : false;
        this._machineGroupActionCreator.getMachines(this.props.mgId, true, pagedTargetGroup.tagList, pagedTargetGroup.name, pagedTargetGroup.statusList, pagedTargetGroup.isNeverDeployed, isFiltered, pagedTargetGroup.continuationToken);
    }

    private _getTargetsGroupView(): JSX.Element {
        let targetView: JSX.Element = null;
        let isTargetPresent: boolean = false;
        const failingPagedTargetGroup = this._getTargetGroup(Model.TargetStatusOptions.Failing);
        let failingList = this._getTargetList(failingPagedTargetGroup, Model.TargetStatusOptions.Failing, true);
        isTargetPresent = isTargetPresent || this._isContainTargets(failingPagedTargetGroup);
        const offlinePagedTargetGroup = this._getTargetGroup(Model.TargetStatusOptions.Offline);
        let offlineList = failingPagedTargetGroup.continuationToken ? null : this._getTargetList(offlinePagedTargetGroup, Model.TargetStatusOptions.Offline, !isTargetPresent);
        isTargetPresent = isTargetPresent || this._isContainTargets(offlinePagedTargetGroup) 
        const healthyPagedTargetGroup = this._getTargetGroup(Model.TargetStatusOptions.Healthy);
        let healthyList = failingPagedTargetGroup.continuationToken || offlinePagedTargetGroup.continuationToken ? null : this._getTargetList(healthyPagedTargetGroup, Model.TargetStatusOptions.Healthy, !isTargetPresent);
        isTargetPresent = isTargetPresent || this._isContainTargets(healthyPagedTargetGroup) 
        if (isTargetPresent) {
            targetView = (
                <div>
                    {failingList}
                    {offlineList}
                    {healthyList}
                </div>
            );
        } else {
            targetView = this._getNoMatchingtarget();
        }

        return targetView;
    }

    private _isContainTargets(pagedTargetGroup: Model.PagedTargetGroup): boolean {
        return !!pagedTargetGroup.targets && pagedTargetGroup.targets.length > 0;
    }

    private _getTargetsFilteredView(): JSX.Element {
        let filteredList: JSX.Element = null;
        const filteredPagedTargetGroup = this._getTargetGroup(Model.TargetStatusOptions.Filtered);
        const isTargetPresent = this._isContainTargets(filteredPagedTargetGroup);
        if (isTargetPresent) {
            filteredList = this._getTargetList(filteredPagedTargetGroup, Model.TargetStatusOptions.Filtered, true);
        } else {
            filteredList = this._getNoMatchingtarget();
        }

        return filteredList;
    }

    private _getTargetList(pagedTargetGroup: Model.PagedTargetGroup, targetStatusOptions: Model.TargetStatusOptions, toShowHeader: boolean): JSX.Element {
        let showMoreComponent: JSX.Element = null;
        let targetView: JSX.Element = null;
        if (pagedTargetGroup.targets) {
            if (pagedTargetGroup.continuationToken) {
                showMoreComponent = (
                    <KeyboardAccesibleComponent
                        className={"show-more-metrics"}
                        onClick={() => { this.loadMoreCall(pagedTargetGroup, targetStatusOptions) }}
                        toolTip={Resources.ShowMoreDeploymentTargetsTooltip} >
                        <span role="button"> {Resources.ShowMoreDeploymentTargets}</span>
                    </KeyboardAccesibleComponent>);
            } else {
                showMoreComponent = (<div></div>);
            }
            if (pagedTargetGroup.targets.length !== 0 ) {
                targetView = <div className="target-group">
                    <VssDetailsList
                        rowStyle={VssDetailsListRowStyle.oneLine}
                        items={pagedTargetGroup.targets}
                        initialFocusedIndex={this._getInitialFocusedIndex()}
                        setKey='set'
                        selectionMode={SelectionMode.single}
                        constrainMode={ConstrainMode.unconstrained}
                        layoutMode={DetailsListLayoutMode.justified}
                        columns={this._getColumns(toShowHeader, targetStatusOptions)}
                        ariaLabelForGrid={Resources.Machines}
                        onRenderItemColumn={this._renderItemColumn}
                        checkboxVisibility={CheckboxVisibility.hidden}
                    />
                    {showMoreComponent}
                </div>;
            }
        }

        return targetView;
    }



    private _getNoMatchingtarget(): JSX.Element {
        return (<div className="no-target">
            <span title={Resources.NoMatchingTargets} >{Resources.NoMatchingTargets}</span>
        </div>);
    }

    private _getStatusListFromStatusOptions(targetStatusOptions: Model.TargetStatusOptions) {
        let statusList: string[] = [];
        switch (targetStatusOptions) {
            case Model.TargetStatusOptions.Failing:
                statusList.push(MGUtils.MachineGroupsConstants.failingStatus);
                break;
            case Model.TargetStatusOptions.Offline:
                statusList.push(MGUtils.MachineGroupsConstants.offlineStatus);
                break;
            case Model.TargetStatusOptions.Healthy:
                statusList.push(MGUtils.MachineGroupsConstants.healthyStatus);
                break;
        }

        return statusList;
    }

    private _getTargetGroup(targetStatusOptions: Model.TargetStatusOptions): Model.PagedTargetGroup {
        let resultPagedTargetGroup: Model.PagedTargetGroup;
        let pagedTargetGroups = this.props.pagedTargetGroups ? this.props.pagedTargetGroups : new Model.PagedTargetGroups();

        switch (targetStatusOptions) {
            case Model.TargetStatusOptions.Failing:
                resultPagedTargetGroup = pagedTargetGroups.failedPagedTargetGroup ? pagedTargetGroups.failedPagedTargetGroup : new Model.PagedTargetGroup();
                break;
            case Model.TargetStatusOptions.Offline:
                resultPagedTargetGroup = pagedTargetGroups.offlinePagedTargetGroup ? pagedTargetGroups.offlinePagedTargetGroup : new Model.PagedTargetGroup();
                break;
            case Model.TargetStatusOptions.Healthy:
                resultPagedTargetGroup = pagedTargetGroups.healthyPagedTargetGroup ? pagedTargetGroups.healthyPagedTargetGroup : new Model.PagedTargetGroup();
                break;
            case Model.TargetStatusOptions.Filtered:
                resultPagedTargetGroup = pagedTargetGroups.filteredPagedTargetGroup ? pagedTargetGroups.filteredPagedTargetGroup : new Model.PagedTargetGroup();
                break;
        }

        return resultPagedTargetGroup;
    }

    private _getColumns(toShowHeader: boolean, targetStatusOptions?: Model.TargetStatusOptions): IColumn[] {
        let headerIcon = this._getHeaderIcon(targetStatusOptions);
        return [
            {
                key: "name",
                name: this._getHeaderName(targetStatusOptions),
                fieldName: name,
                minWidth: 350,
                iconName: headerIcon.iconName,
                iconClassName: headerIcon.className,
                maxWidth: 450,
            },
            {
                key: "summary",
                name: toShowHeader ? Resources.Summary :"",
                fieldName: Resources.Summary,
                minWidth: 350,
                maxWidth: 450
            },
            {
                key: "tags",
                name: toShowHeader ? Resources.Tags : "",
                fieldName: Resources.Tags,
                isMultiline: true,
                minWidth: 300,
                maxWidth: 400,
            }
        ];
    }

    private _getHeaderIcon(targetStatusOptions?: Model.TargetStatusOptions): IIconStatus {
        let iconName: string = Utils_String.empty;
        let className: string = Utils_String.empty;
        let iconType = VssIconType.fabric;
        if (targetStatusOptions) {
            switch (targetStatusOptions) {
                case Model.TargetStatusOptions.Failing:
                    iconName = "Clear";
                    className = "target-group-header-icon target-vss-Icon--Clear"
                    break;
                case Model.TargetStatusOptions.Offline:
                    iconName = "Blocked";
                    className = "target-group-header-icon target-vss-Icon--Blocked";
                    break;
                case Model.TargetStatusOptions.Healthy:
                    iconName = "CheckMark";
                    className = "target-group-header-icon target-vss-Icon--CheckMark";
                    break;
                case Model.TargetStatusOptions.Filtered:
                default:
                    className = "target-filter-header";
            }
        }
        return {
            iconName: iconName,
            className: className,
            iconType: iconType
        };
    }

    private _getHeaderName(targetStatusOptions?: Model.TargetStatusOptions): string {
        const deploymentMetrics = this.props.deploymentGroupMetrics;
        let name = Resources.TargetName;
        let count = "0";
        if (targetStatusOptions) {
            switch (targetStatusOptions) {
                case Model.TargetStatusOptions.Failing:
                    count = deploymentMetrics ? "" + deploymentMetrics.onlineAndFailingTargetCount : "";
                    name = " "+Resources.FailingStatus + " (" + count + ")";
                    break;
                case Model.TargetStatusOptions.Offline:
                    count = deploymentMetrics ? "" + deploymentMetrics.offlineTargetCount : "";
                    name = " " + Resources.OfflineStatus + " (" + count + ")";
                    break;
                case Model.TargetStatusOptions.Healthy:
                    count = deploymentMetrics ? "" + (deploymentMetrics.onlineAndPassingTargetCount + deploymentMetrics.onlineAndNotDeployedTargetCount) : "";
                    name = " " + Resources.HealthyStatus + " (" + count + ")";
                    break;
                case Model.TargetStatusOptions.Filtered:
                default:
                    name = Resources.TargetName;
            }
        }

        return name;
    }

    private _renderItemColumn = (item: Model.Machine, index, column) => {
        let fieldContent = item[column.fieldName];
        let machineTagsLabelId: string = "machine-tags-id" + index + item.id;
        switch (column.key) {
            case 'name':
                let machineStatusText: string = Utils_String.format(Resources.MachineStatus, item.online ? Resources.AgentStatusOnline : Resources.AgentStatusOffline);
                let machineStatusAriaLabel: string = Utils_String.format(Resources.MachineNameAndStatus, item.name, item.online ? Resources.AgentStatusOnline : Resources.AgentStatusOffline);
                let disabledBadge: JSX.Element = null;
                if (!item.enabled){
                    disabledBadge = <span className="badge" >{Resources.Disabled}</span>;
                }
                return (
                    <div className= {item.enabled ? "targetgroup-item-name" : "targetgroup-item-name is-disabled"}>
                        <div className="target-item-wrapper">
                            <KeyboardAccesibleComponent className={"deployment-machine-name-column"} onClick={(ev: React.SyntheticEvent<HTMLElement>) => this._onMachineClick(item, ev)} toolTip={ Utils_String.format(Resources.ViewDeploymentTarget, item.name) } >
                                <i className="machine-icon bowtie-icon bowtie-devices" />
                                <span>{item.name}</span>
                            </KeyboardAccesibleComponent>
                            <div className = "target-item-badge-wrapper">{disabledBadge}</div>
                        </div>
                        <MachineContextMenuActions machine={item} dgId={this.props.mgId} />
                    </div>
                );

            case 'summary':
                const isAssignedRequest = item.assignedRequest && item.assignedRequest.ownerName ? true : false;
                const deploymentStatus = isAssignedRequest ? item.assignedRequest : item.lastDeployment;
                if (!deploymentStatus) {
                    return <div>
                        <span className={"never-deployed"} title={Resources.MachineNeverDeployed}>{Resources.NoDeploymentsYet}</span>
                    </div>;
                }
                let status = this._getStatusIconClass(deploymentStatus, isAssignedRequest);
                return (
                    <TooltipHost
                        content={Resources.ViewDeploymentDetailsText}
                        directionalHint={DirectionalHint.bottomLeftEdge}>
                        <div className="target-last-deployment-name">
                            <VssIcon iconName={status.iconName} iconType={status.iconType} className={status.className} />
                            <a
                                onKeyDown={this._onLastDeploymentKeydown}
                                href={deploymentStatus.ownerLink}
                                target="_blank" rel="noopener noreferrer"
                                aria-label={Utils_String.format(Resources.ViewReleaseSummaryText, deploymentStatus.ownerName)}>
                                {deploymentStatus.ownerName}
                            </a>
                            <span>{this._getCompletedTime(deploymentStatus)} </span>
                        </div>
                    </TooltipHost>
                );

            case 'tags':
                return (
                    <div className="target-overview-tags" >
                        <Tag.TagComponent className="tags-border-class" onTagUpdated={this._onTagUpdated} item={item} tags={this.props.machineTags} currentTags={this._getCurrentTags(item, this.props.currentTagsBymachineIds)}/>
                    </div>
                );

            default:
                return <span>{fieldContent}</span>;
        }
    }
    
    private _onMachineClick=(machine: Model.Machine, event: React.SyntheticEvent<HTMLElement>): void => {
        // clearing if there is any pending call
        if (this._inputTimeout) {
            clearTimeout(this._inputTimeout);
        }
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { machineid: machine.id });
        event.stopPropagation();
    }

    private _getCompletedTime(deploymentStatus: Model.MachineDeployment): string {
        const finishTime = deploymentStatus.finishTime;
        let completedTime = "";
        if (finishTime) {
            const finishTimeText = Utils_Date.isGivenDayToday(finishTime) ? finishTime.toLocaleTimeString() : Utils_Date.localeFormat(finishTime, "G");
            var result = deploymentStatus.result;
            switch (result) {
                case DTContracts.TaskResult.Succeeded:
                case DTContracts.TaskResult.SucceededWithIssues:
                    completedTime = " succeeded at " + finishTimeText;
                    break;
                case DTContracts.TaskResult.Abandoned:
                case DTContracts.TaskResult.Canceled:
                    completedTime = " canceled at " + finishTimeText;
                    break;
                case DTContracts.TaskResult.Failed:
                    completedTime = " failed at " + finishTimeText;
                    break;
            }
        }

        return completedTime;
    }

    private _onTargetNameKeydown = (machine: Model.Machine, event: React.KeyboardEvent<HTMLDivElement>): void => {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) {
            this._onMachineClick(machine, event);
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private _getStatusIconClass(deploymentStatus: Model.MachineDeployment, isAssignedRequest: boolean): IIconStatus {
        let result = deploymentStatus.result;
        let iconName: string = Utils_String.empty;
        let className: string = Utils_String.empty;
        let iconType = VssIconType.fabric;
        if (isAssignedRequest) {
            iconName = "TriangleSolidRight12";
            className = "agent-last-job-status-icon machine-group-vss-Icon--TriangleSolidRight12";
        }else {
            switch (result) {
                case DTContracts.TaskResult.Succeeded:
                case DTContracts.TaskResult.SucceededWithIssues:
                    iconName = "CheckMark";
                    className = "agent-last-job-status-icon machine-group-vss-Icon--CheckMark";
                    break;
                case DTContracts.TaskResult.Abandoned:
                case DTContracts.TaskResult.Canceled:
                case DTContracts.TaskResult.Failed:
                    iconName = "Clear";
                    className = "agent-last-job-status-icon machine-group-vss-Icon--Clear";
                    break;
            }
        }

        return {
            iconName: iconName,
            className: className,
            iconType: iconType
        };
    }

    private _getSelectedMachine(): Model.Machine {
        let selectedMachine: Model.Machine = undefined;
        let selectedMachineId = this._getSelectedMachineId();
        if (selectedMachineId >= 0) {
            selectedMachine = MGUtils._getAllTargets(this.props.pagedTargetGroups).filter(a => a.id === selectedMachineId)[0];
        }

        return selectedMachine;
    }

    private _machineGroupActionCreator: MachineGroupActionCreator.MachineGroupActionCreator;
    private _inputTimeout: number;
}
