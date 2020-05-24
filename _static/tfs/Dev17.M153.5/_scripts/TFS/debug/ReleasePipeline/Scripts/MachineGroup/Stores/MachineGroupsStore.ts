// Copyright (c) Microsoft Corporation.  All rights reserved.

import Store_Base = require("VSS/Flux/Store");
import VSS = require("VSS/VSS");

import {DeploymentPoolSummary} from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MachineGroups_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineGroupsActions");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");

export interface IDeploymentGroupsStoreData {
    _deploymentGroupsMetrics: Model.DeploymentGroupUIMetrics[];
    availableSharedPoolsSummary: DeploymentPoolSummary[];
    continuationToken: string;
}

export class MachineGroupsStore extends Store_Base.Store {
    constructor() {
        super();
        this._deploymentGroupsData = {
            continuationToken: "",
            _deploymentGroupsMetrics: [],
            availableSharedPoolsSummary: []
        };
        MachineGroups_Actions.deploymentGroupsMetricsLoaded.addListener(this.onMetricsDataLoad, this);
        MachineGroups_Actions.machineGroupDeleted.addListener(this.onMachineGroupDeleted, this);
        MachineGroups_Actions.availableSharedPoolsLoaded.addListener(this._onAvailableSharedPoolsLoaded, this);
    }
    
    public getMetricsData(): Model.DeploymentGroupUIMetrics[] {
        return this._deploymentGroupsData._deploymentGroupsMetrics;
    }

    public getAvailableSharedPoolsSummary(): DeploymentPoolSummary[] {
        return this._deploymentGroupsData.availableSharedPoolsSummary;
    }

    public getContinuationToken(): string {
        return this._deploymentGroupsData.continuationToken;
    }

    protected onMetricsDataLoad(deploymentGroupsMetricsPayload: MachineGroups_Actions.IDeploymentGroupsMetricsPayload) {
        if (deploymentGroupsMetricsPayload.append == true) {
            deploymentGroupsMetricsPayload.deploymentGroupsMetricsResult.deploymentGroupsMetrics.forEach((dgMetrics) => { this._deploymentGroupsData._deploymentGroupsMetrics.push(dgMetrics) });
        } else {
            this._deploymentGroupsData._deploymentGroupsMetrics = deploymentGroupsMetricsPayload.deploymentGroupsMetricsResult.deploymentGroupsMetrics;
        }
        this._deploymentGroupsData.continuationToken = deploymentGroupsMetricsPayload.deploymentGroupsMetricsResult.continuationToken;
        this.emitChanged();
    }
    
    protected onMachineGroupDeleted(mgid: number) {

        if (!this._deploymentGroupsData._deploymentGroupsMetrics) {
            this._deploymentGroupsData._deploymentGroupsMetrics = [];
        }

        let deletedDg = this._deploymentGroupsData._deploymentGroupsMetrics.filter(mg => mg.id === mgid);
        if(deletedDg.length > 0){
            let newAvailablePool = Model.DeploymentGroupUIMetrics.getPoolSummary(deletedDg[0]);
            
            if(!!newAvailablePool){
                this._deploymentGroupsData.availableSharedPoolsSummary.push(newAvailablePool);       
            }
        }

        this._deploymentGroupsData._deploymentGroupsMetrics = this._deploymentGroupsData._deploymentGroupsMetrics.filter(mg => mg.id !== mgid);

        this.emitChanged();
    }

    private _onAvailableSharedPoolsLoaded(pools: DeploymentPoolSummary[]) {
        this._deploymentGroupsData.availableSharedPoolsSummary = pools;
        this.emitChanged();
    }

    protected _deploymentGroupsData: IDeploymentGroupsStoreData;
}

export var MachineGroups = new MachineGroupsStore();