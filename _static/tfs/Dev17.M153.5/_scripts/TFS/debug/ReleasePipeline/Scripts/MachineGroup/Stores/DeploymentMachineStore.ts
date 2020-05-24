import { IClientFactory } from '../../TFS.ReleaseManagement.Types';
// Copyright (c) Microsoft Corporation.  All rights reserved.

import Store_Base = require("VSS/Flux/Store");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import DTContracts = require("TFS/DistributedTask/Contracts");

import Deployment_Machine_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/DeploymentMachineActions");
import DM_Event_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/DeploymentMachineEventActions");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import { ITag } from "OfficeFabric/components/pickers/TagPicker/TagPicker";
import Utils_String = require("VSS/Utils/String");

export interface IDeploymentMachine {
    deploymentGroup: Model.MachineGroup;
    machine: Model.Machine;
    tags?: string[];
    isMachineDeleted?: boolean;
    clearErrorMessage?: boolean;
    currentTags?: string[];
}

export class DeploymentMachineStore extends Store_Base.Store {
    constructor() {
        super();

        Deployment_Machine_Actions.machineGroupLoadedWithSelectedMachine.addListener(this.onDataLoad, this);
        Deployment_Machine_Actions.machinesUpdated.addListener(this.onMachinesUpdated, this);
        Deployment_Machine_Actions.machineDeleted.addListener(this.onMachineDeleted, this);
        Deployment_Machine_Actions.machineTagsUpdated.addListener(this.onMachineTagsUpdated, this);

        DM_Event_Actions.machineConnected.addListener(this.onMachineConnected, this);
        DM_Event_Actions.machineDisconnected.addListener(this.onMachineDisconnected, this);
        DM_Event_Actions.machineDeleted.addListener(this.onMachineDeleted, this);
        DM_Event_Actions.deploymentMachinesUpdated.addListener(this.onDeploymentMachinesUpdated, this);
    }

    public getData(): IDeploymentMachine {
        if(!this._deploymentMachineData) {
            this._deploymentMachineData = { deploymentGroup: undefined, machine: undefined, tags: [], isMachineDeleted: false, clearErrorMessage: true, currentTags: [] };
        }
        return this._deploymentMachineData;
    }

    protected onDataLoad(DeploymentMachineData: IDeploymentMachine) {
        let tags: string[] = DeploymentMachineData.deploymentGroup.machineTags;

        this._deploymentMachineData = {deploymentGroup : DeploymentMachineData.deploymentGroup, 
            machine: DeploymentMachineData.machine, tags: tags, isMachineDeleted: false, clearErrorMessage: true, currentTags: DeploymentMachineData.machine.tags};

        this.emitChanged();
    }

    protected onMachinesUpdated(updatedMachines: Model.Machine[]) {
        let storeData = this.getData();
        let machine = storeData.machine;
        let isValueUpdated = false;

        updatedMachines.forEach((updatedMachine: Model.Machine) => {
            if(machine.id == updatedMachine.id) {
                this._updateMachine(machine, updatedMachine);
                isValueUpdated = true;
            }
        });

        if(isValueUpdated) {
            storeData.clearErrorMessage = true;
            this.emitChanged();
        }
    }

    protected onMachineDeleted(machineId: number) {
        let storeData = this.getData();
        let machine = storeData.machine;
        
        if(machine && machine.id == machineId) {
            this._deploymentMachineData = { deploymentGroup: undefined, machine: undefined, tags: [], isMachineDeleted: true, clearErrorMessage: false, currentTags: []};
            this.emitChanged();
        }
    }

    protected onMachineTagsUpdated(currentTags: ITag[]) {
        let storeData = this.getData();
        let allcurrentTags = currentTags.map((item) => item.key);
        storeData.currentTags = allcurrentTags;
        
        this.emitChanged();
    }

    protected onMachineConnected(machineId: number) {
        let storeData = this.getData();
        let machine = storeData.machine;

        if (machine && machine.id == machineId) {
            machine.online = true;
            storeData.clearErrorMessage = false;
            this.emitChanged();
        }
    }

    protected onMachineDisconnected(machineId: number) {
        let storeData = this.getData();
        let machine = storeData.machine;

        if (machine && machine.id == machineId) {
            machine.online = false;
            storeData.clearErrorMessage = false;
            this.emitChanged();
        }
    }

    protected onDeploymentMachinesUpdated(updatedMachines: DTContracts.DeploymentMachine[]) {
        
        var isValueUpdated: boolean = false;
        let storeData = this.getData();
        let machine = storeData.machine;

        if (machine) {
            updatedMachines.forEach((a: DTContracts.DeploymentMachine) => {
                let updatedMachine = Model.Machine.createFromMachine(a);
                if(updatedMachine.id == machine.id) {
                    this._updateMachine(machine, updatedMachine);
                    isValueUpdated = true;
                }
            });
        }

        if(isValueUpdated) {
            storeData.clearErrorMessage = false;
            this.emitChanged();
        }
    }

    private _updateMachine(oldMachine: Model.Machine, updatedMachine: Model.Machine) {
        oldMachine.tags = updatedMachine.tags;
        let storeData = this.getData();
        storeData.currentTags = updatedMachine.tags;
    }

    protected _deploymentMachineData: IDeploymentMachine;
}

export var DeploymentMachine = new DeploymentMachineStore();