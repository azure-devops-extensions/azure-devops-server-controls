// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
export interface IMachineDeployments {
    agentId?: number;
    machineDeployments?: Model.MachineDeployment[];
}

/**
 * Action for loading Machine Configuration.
 */
export var machineConfigurationLoaded = new Action_Base.Action<Model.MachineConfiguration[]>();

/**
 * Action for loading Machine Deployments.
 */
export var machineDeploymentsLoaded = new Action_Base.Action<IMachineDeployments>();