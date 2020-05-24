// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Navigation_Services = require("VSS/Navigation/Services");
import { VssDetailsList, VssDetailsListRowStyle, VssDetailsListTitleCell } from 'VSSUI/VssDetailsList';
import { VssIconType, VssIcon } from "VSSUI/VssIcon";

import { IColumn, DetailsListLayoutMode, ConstrainMode, SelectionMode } from "OfficeFabric/DetailsList";

import DTContracts = require("TFS/DistributedTask/Contracts");
import { Component, IProps, IStateless } from "DistributedTaskControls/Common/Components/Base";
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")
import MachineGroupActionCreator = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupActionCreator");

import "VSS/LoaderPlugins/Css!RM:ReleasePipeline/Scripts/MachineGroup/Components/AvailableSharedPools";

export interface Props extends IProps {
    availableSharedPoolsSummary: DeploymentPoolCommonModel.DeploymentPoolSummary[];
}

export class AvailableSharedPools extends Component<Props, IStateless> {
    constructor(props: Props) {
        super(props);

        this._machineGroupActionCreator = MachineGroupActionCreator.ActionCreator;
    }

    public render(): JSX.Element {
        let availableSharedPoolList = (
            <VssDetailsList
                items={this.props.availableSharedPoolsSummary}
                selectionPreservedOnEmptyClick={true}
                initialFocusedIndex={0}
                setKey='set'
                selectionMode={SelectionMode.single}
                actionsColumnKey="availabledeploymentpoolname"
                rowStyle={VssDetailsListRowStyle.oneLine}
                constrainMode={ConstrainMode.unconstrained}
                layoutMode={DetailsListLayoutMode.justified}
                columns={this._getColumns()}
                className='availablePool-hub-pivot-content'
                />);

        return <div data-is-scrollable={true} className="availablepool-content-container">
                {availableSharedPoolList}
            </div>;
    }

    private _getColumns(): IColumn[] {
        return [
            {
                key: "name",
                fieldName: Resources.AvailableSharedPoolsColoumnTitleForPools,
                name: Resources.AvailableSharedPoolsColoumnTitleForPools,
                onRender: (item: DeploymentPoolCommonModel.DeploymentPoolSummary) => {
                    return <div className="deployment-pool-name-cell">
                        <VssDetailsListTitleCell
                            primaryAction={RMUtilsCore.UrlHelper.getDeploymentPoolUrl(item.id)}
                            primaryText={item.name}
                            primaryTarget='_blank'
                            iconProps={
                                {
                                    iconName: "EngineeringGroup",
                                    iconType: VssIconType.fabric
                                }
                            }
                            indicators={[
                                {
                                    getItemIndicator: () => {
                                        return {
                                            title: Resources.AvailableSharedPoolPlusIconHelpText,
                                            iconProps: {
                                                iconName: 'Add',
                                                iconType: VssIconType.fabric,
                                                className: "availablePool-adddeploymentgroup-plusIcon"
                                            },
                                            onClick: () => {
                                                this._onclikAddCreateNewDeploymentGroupWithSharedPool(item);
                                            }
                                        };
                                    }
                                }
                            ]}
                        />
                    </div>
                },
                minWidth: 200,
                maxWidth: 350,
                isResizable: true
            },
            {
                key: "targetSummary",
                fieldName: Resources.AvailableSharedPoolsColoumnTitleForPoolsTargetStatus,
                name: Resources.AvailableSharedPoolsColoumnTitleForPoolsTargetStatus,
                onRender: (item: DeploymentPoolCommonModel.DeploymentPoolSummary) => {
                    let status = DeploymentPoolCommonModel.DeploymentPoolSummary.getSummaryStatusIconClass(item);
                    return (
                        <div className= "availablepool-pool-status-wrapper" >
                            <VssIcon iconName={status.iconName} iconType={status.iconType} className={status.className} />
                            <span >{DeploymentPoolCommonModel.DeploymentPoolSummary.getSummaryStatus(item)}</span>
                        </div >
                    );
                },
                minWidth: 100,
                maxWidth: 120,
                isResizable: true
            },
        ];
    }

    private _onclikAddCreateNewDeploymentGroupWithSharedPool = (poolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary) : void => {

        let urlState = Navigation_Services.getHistoryService().getCurrentState();
        urlState.view = MGUtils.MachineGroupsConstants.MachineGroupView;
        urlState.mgid = 0;

        let machineGroup: Model.MachineGroup = new Model.MachineGroup();
        machineGroup.id = 0;
        machineGroup.name = poolSummary.name;
        machineGroup.deploymentMachineGroup = {
            pool: poolSummary.poolSummary.pool
        } as DTContracts.DeploymentGroup;

        this._machineGroupActionCreator.initializeDeploymentGroup(machineGroup);
        Navigation_Services.getHistoryService().addHistoryPoint(undefined, urlState, undefined, false);
    }

    private _machineGroupActionCreator: MachineGroupActionCreator.MachineGroupActionCreator;
}
