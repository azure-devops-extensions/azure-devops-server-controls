// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS = require("VSS/VSS");
import DTContracts = require("TFS/DistributedTask/Contracts");
import Events_Services = require("VSS/Events/Services");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
// Actions
import Deployment_Machine_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/DeploymentMachineActions");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import { ITag } from "OfficeFabric/components/pickers/TagPicker/TagPicker";

export class DeploymentMachineActionCreator {

    constructor(source?: Model.MachineGroups) {
        this._source = source || new Model.MachineGroups();
    }

    public updateMachines(mgid: number, machines: DTContracts.DeploymentMachine[]) {
        let progressId_updateMachines = VSS.globalProgressIndicator.actionStarted("updateMachines", true);
        if (!!machines) {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpdateMachineBegin");
            let getDataPromise = this._source.beginUpdateMachines(mgid, machines);
            getDataPromise.then((updatedMachines: Model.Machine[]) => {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.UpdateMachineComplete");
                Deployment_Machine_Actions.machinesUpdated.invoke(updatedMachines);
                VSS.globalProgressIndicator.actionCompleted(progressId_updateMachines);
            }, (err: any) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.UpdateMachineScenario);
                VSS.globalProgressIndicator.actionCompleted(progressId_updateMachines);
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
            });
        }
    }

    public deleteMachine(mgid: number, machineId: number) {
        let progressId_deleteMachine = VSS.globalProgressIndicator.actionStarted("deleteMachine", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteMachineBegin");
        let deleteMachinePromise = this._source.beginDeleteMachine(mgid, machineId);
        deleteMachinePromise.then(() => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.DeleteMachineComplete");
            Deployment_Machine_Actions.machineDeleted.invoke(machineId);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteMachine);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.DeleteMachineScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_deleteMachine);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public loadDeploymentGroupWithSelectedMachine(mgid: number, machineid: number) {

        let progressId_loadMG = VSS.globalProgressIndicator.actionStarted("loadDeploymentGroupWithSelectedMachine", true);
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentGroupWithSelectedMachineBegin");
        let getDataPromise = this._source.beginGetMachineGroup(mgid, null, DTContracts.DeploymentGroupExpands.Tags);
        getDataPromise.then((machineGroup: Model.MachineGroup) => {
            let getMachineDataPromise = this._source.beginGetMachine(mgid, machineid);

            getMachineDataPromise.then((machine: Model.Machine) => {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetDeploymentGroupWithSelectedMachineComplete");
                Deployment_Machine_Actions.machineGroupLoadedWithSelectedMachine.invoke({deploymentGroup: machineGroup, machine: machine});
                VSS.globalProgressIndicator.actionCompleted(progressId_loadMG);
            }, (err: any) => {
                PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewDeploymentMachineScenario);
                VSS.globalProgressIndicator.actionCompleted(progressId_loadMG);
                Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
            })
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewDeploymentMachineScenario);
            VSS.globalProgressIndicator.actionCompleted(progressId_loadMG);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public machineTagsUpdated(updatedTags: ITag[]) {
        Deployment_Machine_Actions.machineTagsUpdated.invoke(updatedTags);
    }

    private _source: Model.MachineGroups;
}

export var ActionCreator = new DeploymentMachineActionCreator();