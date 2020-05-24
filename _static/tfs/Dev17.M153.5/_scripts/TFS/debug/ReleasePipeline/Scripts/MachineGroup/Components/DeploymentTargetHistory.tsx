// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import { VssDetailsList, VssDetailsListRowStyle, VssDetailsListTitleCell } from 'VSSUI/VssDetailsList';
import { VssIconType, VssIcon } from "VSSUI/VssIcon";

import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

import DTContracts = require("TFS/DistributedTask/Contracts");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import ReleasesStore = require("ReleasePipeline/Scripts/MachineGroup/Stores/MachineReleasesStore");
import MachineActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineActionCreator");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";
import {ReleaseInfoTitleCell} from "ReleasePipeline/Scripts/Common/Components/ReleaseInfoTitleCell";
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/DeploymentTargetHistory";

export interface Props extends Component_Base.Props {
    mgid: number;
    machine: Model.Machine;
    showRecentDeployments?: boolean;
    records?: number;
    actionCreator?: MachineActionCreator.MachineActionCreator;
}

export interface State extends Component_Base.State {
    machineDeployments: Model.MachineDeployment[];
    dataLoaded: boolean;
}

export class MachineReleases extends Component_Base.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this._machineActionCreator = this.props.actionCreator || MachineActionCreator.ActionCreator;
        this._machineReleasesStore = ReleasesStore.Releases;
    }

    public render(): JSX.Element {
        if(!!this.props.showRecentDeployments) {
            return  this._renderRecentDeployments();
        }

        let deploymentTimeLine = this._getDeploymentTimeline(new Date(Date.now()), this._getMachineDeployments());
        let noDeployments = (this._getState().dataLoaded && this._getState().machineDeployments.length == 0) ? this._noDeploymentList(Resources.History, Resources.MachineNeverDeployed): null;
        let todayDeployments = (deploymentTimeLine.today.length > 0) ? this._getReleasesDetailsList(deploymentTimeLine.today, Resources.TodayDeployments, "release-today-history-cell"): null;
        let thisWeekDeployments = (deploymentTimeLine.thisweek.length > 0) ? this._getReleasesDetailsList(deploymentTimeLine.thisweek, Resources.ThisWeekDeployments, "release-old-history-cell"): null;
        let lastWeekDeployments = (deploymentTimeLine.lastweek.length > 0) ? this._getReleasesDetailsList(deploymentTimeLine.lastweek, Resources.LastWeekDeployments, "release-old-history-cell"): null;
        let oldDeployments = (deploymentTimeLine.olddeployments.length > 0) ? this._getReleasesDetailsList(deploymentTimeLine.olddeployments, Resources.OldDeployments, "release-old-history-cell"): null;

        return  (<div className="machine-releases-view" role="tabpanel" aria-labelledby="pivotview-header-Releases">
                    <div className="machine-releases-left-view">
                        {noDeployments}
                        {todayDeployments}
                        {thisWeekDeployments}
                        {lastWeekDeployments}
                        {oldDeployments}
                    </div>
                </div>);
    }

    public componentDidMount() {
        super.componentDidMount();
        this._machineReleasesStore.addChangedListener(this._onStoreChange);
        if(this.props.machine.id){
            this._machineActionCreator.loadMachineDeployments(this.props.mgid, this.props.machine);
        }
    }
    
    public componentWillUpdate(nextProps: Props) {
        if(nextProps.machine && this.props.machine.id !== nextProps.machine.id){
            this.setState({machineDeployments: [], dataLoaded: false})
            this._machineActionCreator.loadMachineDeployments(nextProps.mgid, nextProps.machine);
        }
    }

    public componentWillUnmount() {
        this._machineReleasesStore.removeChangedListener(this._onStoreChange);
        super.componentWillUnmount();
    }

    private _renderLeftReleaseColumn(item) {
        return <ReleaseInfoTitleCell 
                    releaseName = {item.ownerName} releaseLink = {item.ownerLink}
                    releaseDefinition = {item.definitionName} releaseDefinitionLink = {item.definitionLink}
                    artifacts = {item.releaseInfo? item.releaseInfo.artifacts: []}  iconName = {item.releaseStatusIconClass.iconName}
                    iconClassName = {item.releaseStatusIconClass.className} iconType = {item.releaseStatusIconClass.iconType} 
                    error = {item.error}
                />
    }

    private _renderRightReleaseColumn(item) {
        let startTimeText = item.startTimeText;
        let startTimeResource = !!startTimeText ? Utils_String.localeFormat("{0} : {1}", Resources.StartTime, startTimeText) : null;

        let queueTimeText = item.queueTimeText;
        let queueTimeResource = !!queueTimeText ? Utils_String.localeFormat("{0} : {1}", Resources.QueuedTime, queueTimeText) : null;

        let durationTimeText = item.durationText;
        let durationTimeResource = !!durationTimeText ? Utils_String.localeFormat("{0} : {1}", Resources.Duration, durationTimeText) : null;

        let startTimeElement: JSX.Element = item.startTime ? <div className="start-time-element">{Utils_Date.isGivenDayToday(item.startTime) ? 
                                item.queueTime.toLocaleTimeString() : Utils_Date.localeFormat(item.startTime, "G")} <VssIcon iconName="Clock" iconType={VssIconType.fabric} /></div> : null;
        
        startTimeElement = startTimeElement ? <TooltipHost content={startTimeResource} directionalHint={DirectionalHint.rightCenter}>{startTimeElement}</TooltipHost>: null;

        let queueTimeElement: JSX.Element = !startTimeElement ? <div className="queue-time-element">{Utils_Date.isGivenDayToday(item.queueTime) ? 
                                item.queueTime.toLocaleTimeString() : Utils_Date.localeFormat(item.queueTime, "G")} <VssIcon iconName="Clock" iconType={VssIconType.fabric} /></div> : null;
        
        queueTimeElement = queueTimeElement ? <TooltipHost content={queueTimeResource} directionalHint={DirectionalHint.rightCenter}>{queueTimeElement}</TooltipHost> : null;

        let durationTimeElement: JSX.Element = item.durationText ? <div className="duration-time-element">{item.durationText} <VssIcon iconName="Stopwatch" iconType={VssIconType.fabric} /></div> : null;

        durationTimeElement = durationTimeElement ? <div className="duration-time-element-wrapper"><TooltipHost content={durationTimeResource} directionalHint={DirectionalHint.rightCenter}>{durationTimeElement}</TooltipHost></div> : null;
        
        var identityComponent: JSX.Element = null;
        let userImageUrl = Utils_String.empty;
        if(item.releaseInfo && item.releaseInfo.createdBy._links.avatar && item.releaseInfo.createdBy._links.avatar.href) {
            userImageUrl = item.releaseInfo.createdBy._links.avatar.href;
        } 
        else if(item.releaseInfo && item.releaseInfo.createdBy.imageUrl) {
            userImageUrl = item.releaseInfo.createdBy.imageUrl;
        }

        if(item.releaseInfo) {
            identityComponent = (<KeyboardAccesibleComponent onClick={()=>{}} toolTip={Utils_String.format(Resources.ReleaseTriggeredBy, item.releaseInfo.createdBy.displayName)}>
                    <img src={userImageUrl} className="release-identity-image" alt={Utils_String.format(Resources.ReleaseTriggeredBy, item.releaseInfo.createdBy.displayName)} />
            </KeyboardAccesibleComponent>);
        }
        return  (<div className="recent-deployments-time-cell-wrapper">
            <div className="recent-deployments-time-cell">
                    {queueTimeElement}
                    {startTimeElement}
                    {durationTimeElement}
                </div>
                <div className="recent-deployments-identity-cell">
                    {identityComponent}
                </div>
            </div>);
        
    }

    private _renderRecentDeployments(): JSX.Element {
        
        if(!this._getState().dataLoaded) {
            return null;
        }
        var recentDeploymentElement: JSX.Element = null;
        if(this._getState().machineDeployments.length === 0) {
            recentDeploymentElement = this._noDeploymentList(Resources.RecentDeployments, Resources.MachineNeverDeployed);
        }
        else {
            recentDeploymentElement = (<div><div className="deployment-target-deployments-description">{Resources.RecentDeployments}</div>
            <VssDetailsList
                    className="deployment-target-recent-deployments-list"
                    items={this._getMachineDeployments()} 
                    rowStyle={VssDetailsListRowStyle.twoLine}
                    isHeaderVisible= {false}
                    columns={
                        [
                            {
                                key: Resources.RecentDeployments,
                                fieldName: Resources.RecentDeployments,
                                name: Resources.RecentDeployments,
                                onRender: this._renderLeftReleaseColumn,
                                minWidth: 500,
                                isResizable: true
                            },
                            {
                                key: "",
                                fieldName: "",
                                ariaLabel: Resources.DeploymentTime,
                                name: "",
                                onRender: this._renderRightReleaseColumn,
                                minWidth: 200
                            }
                        ]
                    }
                /></div>);
        }

        recentDeploymentElement = (
            <div className="deployment-target-recent-deployments">
                {recentDeploymentElement}
            </div>
        );
        return recentDeploymentElement;
    }

    private _getReleasesDetailsList(items: Model.MachineDeployment[], columnName: string, columnClassName?: string): JSX.Element {
        
        return <div><div className="deployment-target-deployments-description">{columnName}</div>
            <VssDetailsList
            className="deployment-target-full-deployments-list"
            items={items} 
            rowStyle={VssDetailsListRowStyle.twoLine}
            isHeaderVisible= {false}
            columns={
                [
                    {
                        key: columnName,
                        fieldName: columnName,
                        name: columnName,
                        onRender: this._renderLeftReleaseColumn,
                        minWidth: 500,
                        isResizable: true
                    },
                    {
                        key: "",
                        fieldName: "",
                        name: "",
                        ariaLabel: Resources.DeploymentTime,
                        onRender: this._renderRightReleaseColumn,
                        minWidth: 200,
                        className: columnClassName
                    }
                ]
            }
        /></div>;
    }

    private _getDeploymentTimeline(currentDate: Date, machineDeployments: Model.MachineDeployment[]) {
        let timeLine = {'today' : [], 'thisweek': [], 'lastweek': [], 'olddeployments': []};

        let dayOfWeek: number = currentDate.getDay();
        for(let machineDeployment of machineDeployments) {
            let deploymentTime = machineDeployment.startTime ? machineDeployment.startTime : machineDeployment.queueTime;
            let dateDiff = Utils_Date.daysBetweenDates(Utils_Date.convertClientTimeToUserTimeZone(deploymentTime, false), currentDate);

            if(Utils_Date.isGivenDayToday(deploymentTime)) {
                timeLine.today.push(machineDeployment);
            }
            else if(dayOfWeek - dateDiff >= 0) {
                timeLine.thisweek.push(machineDeployment);
            }
            else if(dateDiff - dayOfWeek <= 7) {
                timeLine.lastweek.push(machineDeployment);
            }
            else {
                timeLine.olddeployments.push(machineDeployment);
            }
        }

        return timeLine;

    }

    private _onStoreChange = () => {
        let state = this._getState();
        state.machineDeployments = this._machineReleasesStore.getData().machineDeployments;
        state.dataLoaded = true;
        this.setState(state);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.ViewMachineDeployemntsScenario);
    }

    private _noDeploymentList(columnName: string, columnContent: string) {
        return <VssDetailsList
            className="no-deployment-list"
            items={[{content: columnContent}]}
            columns={[{
                key: columnName,
                fieldName: columnName,
                name: columnName,
                onRender: (item) => {
                    return <div className="never-deployed-cell">{item.content}</div>;
                },
                minWidth: 200
            }]}
        />
    }
    private _getState(): State {
        if (this.state) {
            return this.state;
        }
        return { machineDeployments: [], dataLoaded: false};
    }

    private _getMachineDeployments(): Model.MachineDeployment[] {
        if(!this._getState().dataLoaded){
            return [];
        }

        let deployments = this._getState().machineDeployments;
        let isNewDeployment: boolean = true;

        let machineDeploymentCount = deployments.length;

        if(this.props.showRecentDeployments) {
            machineDeploymentCount = this.props.records ? this.props.records : 5;
        }

        return deployments.slice(0, machineDeploymentCount);
    }

    private _machineActionCreator: MachineActionCreator.MachineActionCreator;
    private _machineReleasesStore: ReleasesStore.MachineReleasesStore;
}
