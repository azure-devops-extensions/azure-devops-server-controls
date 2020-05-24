// Copyright (c) Microsoft Corporation.  All rights reserved.

import VSS = require("VSS/VSS");
import DTContracts = require("TFS/DistributedTask/Contracts");
import Events_Services = require("VSS/Events/Services");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import MGUtils = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Utils");
// Actions
import Machine_Actions = require("ReleasePipeline/Scripts/MachineGroup/Actions/MachineActions");
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

export class MachineActionCreator {

    constructor(source?: Model.MachineGroups) {
        this._source = source || new Model.MachineGroups();
    }

    public loadMachineDeployments(mgid: number, machine: Model.Machine) {
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineDeploymentsBegin");
        let getDataPromise = this._source.beginGetMachineDeployments(mgid, machine.id);
        getDataPromise.then((deployments: Model.MachineDeployment[]) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineDeploymentsComplete");
            Machine_Actions.machineDeploymentsLoaded.invoke({ agentId: machine.deploymentMachine.agent.id, machineDeployments: deployments });
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewMachineDeployemntsScenario);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    public loadMachineConfiguration(mgid: number, machineId: number) {
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineConfigurationsBegin");
        let getDataPromise = this._source.beginGetMachine(mgid, machineId, DTContracts.DeploymentTargetExpands.Capabilities);
        getDataPromise.then((machine: Model.Machine) => {
            PerformanceTelemetry.PerformanceUtil.split("VSO.RM.GetMachineConfigurationsComplete");
            Machine_Actions.machineConfigurationLoaded.invoke(machine.systemConfiguration);
        }, (err: any) => {
            PerformanceTelemetry.PerformanceUtil.abortScenario(PerfScenariosConstants.ViewMachineConfigurationsScenario);
            Events_Services.getService().fire(MGUtils.DeploymentGroupActions.UpdateErrorMessage, this, err);
        });
    }

    private _source: Model.MachineGroups;
}

export var ActionCreator = new MachineActionCreator();
