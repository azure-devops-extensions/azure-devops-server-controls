import Dialogs = require("VSS/Controls/Dialogs");
import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import * as Utils_Array from "VSS/Utils/Array";
import Utils_String = require("VSS/Utils/String");
import { DetailsList, IColumn, CheckboxVisibility, DetailsListLayoutMode, ConstrainMode, SelectionMode } from 'OfficeFabric/DetailsList';
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import Navigation_Services = require("VSS/Navigation/Services");
import DTContracts = require("TFS/DistributedTask/Contracts");
import {KeyCodes } from 'OfficeFabric/Utilities';

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Component, IProps, IState } from "DistributedTaskControls/Common/Components/Base";
import { TargetContextMenu } from "ReleasePipeline/Scripts/DeploymentPools/Components/TargetContextMenu";
import { DeploymentPoolTargetsStore } from "ReleasePipeline/Scripts/DeploymentPools/Stores/DeploymentPoolTargetsStore";
import { DeploymentPoolTargetsActionCreator } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolTargetsActionCreator";
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import { PerfScenariosConstants } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";
import { VssDetailsList, VssDetailsListRowStyle, VssDetailsListTitleCell } from 'VSSUI/VssDetailsList';
import { focusFocusableElement, focusDetailsListRow } from "DistributedTaskControls/Common/ReactFocus";
import { Selection } from "OfficeFabric/utilities/selection/Selection";
import { Async } from "OfficeFabric/Utilities";
import { VssIcon } from "VSSUI/VssIcon";
import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/DeploymentPools/Components/DeploymentPoolTargets";

export interface Props extends IProps {
    deploymentPoolId: number;
    className?: string;
    dpTargetName?: string;
}

export interface State extends IState {
    deploymentPoolTargets: Model.DeploymentPoolTarget[];
    isDataLoaded: boolean
}

export class DeploymentPoolTargets extends Component<Props, State> {
    constructor(props ?: Props) {
        super(props);
        this._deploymentPoolTargetsStore = StoreManager.GetStore<DeploymentPoolTargetsStore>(DeploymentPoolTargetsStore, this.props.instanceId);
        this._deploymentPoolTargetsActionCreator = ActionCreatorManager.GetActionCreator<DeploymentPoolTargetsActionCreator>(DeploymentPoolTargetsActionCreator, this.props.instanceId);
    }

    public render(): JSX.Element {
        let state: State = this._getState();
        if (!state.isDataLoaded) {
            return (<div></div>);
        }

        let offlineTargetsList: JSX.Element = this._getTargetList("offline");
        let onlineTargetsList: JSX.Element = this._getTargetList("online");

        let content: JSX.Element;

        if(!offlineTargetsList && !onlineTargetsList) {
            content = <div className="no-target">
                <span title={Resources.NoMatchingTargets} >{Resources.NoMatchingTargets}</span>
            </div>
        }
        else {
            content = <div>
                {offlineTargetsList}
                {onlineTargetsList}
            </div>
        }

        return (<div className="pool-targets-container">
            {content}
        </div>);
    }

    public componentDidMount() {
        super.componentDidMount();
        this._deploymentPoolTargetsStore.addChangedListener(this._onStoreChange);
        this._deploymentPoolTargetsActionCreator.getDeploymentPoolTargets(this.props.deploymentPoolId);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this._deploymentPoolTargetsStore.removeChangedListener(this._onStoreChange);
        StoreManager.DeleteStore<DeploymentPoolTargetsStore>(DeploymentPoolTargetsStore);
    }

    private _getState(): State {
        return this.state || { deploymentPoolTargets: [], isDataLoaded: false };
    }

    private _onStoreChange = () => {
        let state: State = this._getState();
        let deploymentPoolTargets = this._deploymentPoolTargetsStore.getDeploymentPoolTargets().slice();
        state.deploymentPoolTargets = deploymentPoolTargets;
        state.isDataLoaded = true;
        this.setState(state);
        PerformanceTelemetry.PerformanceUtil.endScenario(PerfScenariosConstants.UpdateDeploymentTargetScenario);
    }

    private _getColumns(IsOnlineTargetsList: boolean, targetsCount: number): IColumn[] {
        let agentsStatus: string = IsOnlineTargetsList == true ? Resources.AgentStatusOnline + " (" + targetsCount + ")" : Resources.AgentStatusOffline + " (" + targetsCount + ")";
        let statusIcon = Model.DeploymentPoolTarget.getDeploymentTargetStateIconClass(IsOnlineTargetsList);
        return [
            {
                key: "agentsStatus",
                name: agentsStatus,
                fieldName: Resources.AgentStatus,
                minWidth: 350,
                maxWidth: 450,
                iconName: statusIcon.iconName,
                iconClassName: statusIcon.className,
                headerClassName: "header-icon-class"
            },
            {
                key: "latestDeployment",
                name: Resources.LatestDeployment,
                fieldName: Resources.LatestDeployment,
                minWidth: 300,
                maxWidth: 400
            }
        ];
    }

    private _renderItemColumn = (item: Model.DeploymentPoolTarget, index, column) => {
        switch (column.key) {
            case 'agentsStatus':
                let DisabledBadge: JSX.Element = null;
                if (!item.enabled){
                    DisabledBadge = <span className="badge" >{Resources.Disabled}</span>;
                }
                return (
                    <div className = {item.enabled ? "deployment-pool-agent-column" : "deployment-pool-agent-column is-disabled"}>
                        <div className = "agent-name-wrapper">
                            <KeyboardAccesibleComponent onClick={(ev: React.SyntheticEvent<HTMLElement>) => this._onTargetClick(item, ev)} className={"deployment-pool-agent-column-name"}>
                                <i className={Model.DeploymentPoolTarget.getDeploymentTargetIconClass()} />
                                <span>{item.name}</span>
                            </KeyboardAccesibleComponent>
                            <div className = "agent-item-badge-wrapper">{DisabledBadge}</div>
                        </div>
                        <TargetContextMenu instanceId = {this.props.instanceId} poolId={this.props.deploymentPoolId} target={item}/>
                    </div>
                );
            case 'latestDeployment':
                if (!item.latestDeployment) {
                    return <div>
                        <span className={"never-deployed"} title={"never deployed"}>{Resources.NoDeploymentsYet}</span>
                    </div>;
                }
                let status = Model.DeploymentPoolTarget.getJobStatusIconClass(item);
                return (
                    <TooltipHost
                        directionalHint={DirectionalHint.bottomLeftEdge} content={Resources.ViewDeploymentSummary}>
                        <div>
                            <VssIcon iconName={status.iconName} iconType={status.iconType} className={status.className} />
                            <a href={item.latestDeployment.owner._links.web.href} target="_blank" rel="noopener noreferrer" aria-label={Utils_String.format(Resources.ViewReleaseSummaryText, item.latestDeployment.owner.name) }>{item.latestDeployment.owner.name}</a>
                        </div>
                    </TooltipHost>
                );
        }
    }

    private _onTargetClick=(target: Model.DeploymentPoolTarget, event: React.SyntheticEvent<HTMLElement>): void => {
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, { targetid: target.id });
        event.stopPropagation();
    }

    private _getTargetList(targetStatus: string): JSX.Element {
        let state = this._getState();
        let isOnlineTargetsList: boolean = targetStatus === "online";
        let className: string = this.props.className || "deployment-pool-targets";
        let deploymentPoolTargets: Model.DeploymentPoolTarget[] = state.deploymentPoolTargets;
        let filteredTargets: Model.DeploymentPoolTarget[] = deploymentPoolTargets.filter((deploymentPoolTarget: Model.DeploymentPoolTarget) => {
            return deploymentPoolTarget.status.toLowerCase() == targetStatus;
        });

        if(!!this.props.dpTargetName){
            filteredTargets = filteredTargets.filter((deploymentPoolTarget: Model.DeploymentPoolTarget) => {
                return deploymentPoolTarget.name.toLowerCase().indexOf(this.props.dpTargetName.toLowerCase()) > -1;
            });
        }

        filteredTargets.sort((target1: Model.DeploymentPoolTarget, target2: Model.DeploymentPoolTarget) => { 
            return Utils_String.localeIgnoreCaseComparer(target1.name, target2.name);
        });

        let ariaLabel: string = isOnlineTargetsList ? Resources.DeploymentPoolTargetsOnline : Resources.DeploymentPoolTargetsOffline;
        let noTarget: JSX.Element = null;
        if(filteredTargets.length === 0) {
            return null;
        }
        let targetsList = (<div className={className} role="region" aria-label={ariaLabel}>
            <VssDetailsList
                rowStyle={VssDetailsListRowStyle.oneLine}
                items={filteredTargets}
                selectionPreservedOnEmptyClick={true}
                initialFocusedIndex={-1}
                setKey='set'
                selectionMode={SelectionMode.single}
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.justified}
                columns={this._getColumns(isOnlineTargetsList, filteredTargets.length) }
                ariaLabelForGrid={ariaLabel}
                onRenderItemColumn={this._renderItemColumn}
                checkboxVisibility={CheckboxVisibility.hidden} />
        </div>);

        return targetsList;
    }

    private _deploymentPoolTargetsActionCreator: DeploymentPoolTargetsActionCreator;
    private _deploymentPoolTargetsStore: DeploymentPoolTargetsStore;
}