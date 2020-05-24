// Copyright (c) Microsoft Corporation.  All rights reserved.

import Store_Base = require("VSS/Flux/Store");
import VSS = require("VSS/VSS");

import DTContracts = require("TFS/DistributedTask/Contracts");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import Machine_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineActions");
import DM_Event_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/DeploymentMachineEventActions");

export class MachineReleasesStore extends Store_Base.Store {
    constructor() {
        super();

        Machine_Actions.machineDeploymentsLoaded.addListener(this.onDataLoad, this);
        DM_Event_Actions.deploymentQueued.addListener(this.onDeploymentQueuedToMachine, this);
        DM_Event_Actions.deploymentAssignedToMachine.addListener(this.onDeploymentAssignedToMachine, this);
        DM_Event_Actions.deploymentStarted.addListener(this.onMachineLastDeploymentUpdate, this);
        DM_Event_Actions.deploymentCompleted.addListener(this.onMachineLastDeploymentUpdate, this);
    }

    public getData(): Machine_Actions.IMachineDeployments {
        if(!this._machineReleasesStore){
            this._machineReleasesStore = {machineDeployments: []};
        }
        return this._machineReleasesStore;
    }

    protected onDataLoad(data: Machine_Actions.IMachineDeployments) {
        this._machineReleasesStore = data;
        this.emitChanged();
    }

    protected onDeploymentQueuedToMachine(machineDeployment: Model.MachineDeployment) {
        if(!!this.getData().agentId && !!machineDeployment.request.matchedAgents
        && machineDeployment.request.matchedAgents.some(a => a.id === this.getData().agentId)
        && !this.getData().machineDeployments.some(d => d.request.jobId === machineDeployment.request.jobId)){
            this.getData().machineDeployments.unshift(machineDeployment);
            this.emitChanged();
        }
    }

    protected onDeploymentAssignedToMachine(machineDeployment: Model.MachineDeployment) {
        let storeData = this.getData();
        if(!!storeData.agentId && !!machineDeployment.request.reservedAgent){
            if(machineDeployment.request.reservedAgent.id == storeData.agentId){
                this.onMachineLastDeploymentUpdate(machineDeployment);
            }
            else{
                // job assigned to other agent
                storeData.machineDeployments = storeData.machineDeployments.filter(deployment => deployment.request.jobId !== machineDeployment.request.jobId);
            }

            this.emitChanged();
        }
    }

    protected onMachineLastDeploymentUpdate(machineDeployment: Model.MachineDeployment) {
        let storeData = this.getData();
        if(!!storeData.agentId && !!machineDeployment.request.reservedAgent && machineDeployment.request.reservedAgent.id == storeData.agentId){
            let deployments = storeData.machineDeployments;
            let isNewDeployment = true;
            for (var index = 0; index < deployments.length; index++) {
                if (deployments[index].request.jobId === machineDeployment.request.jobId) {
                    deployments[index] = machineDeployment;
                    isNewDeployment = false;
                    break; //Stop this loop, we found it!
                 }
            }

            if(isNewDeployment){
                deployments.unshift(machineDeployment);
            }
        
            this.emitChanged();
        }
    }

    protected _machineReleasesStore: Machine_Actions.IMachineDeployments;
}

export var Releases = new MachineReleasesStore();
