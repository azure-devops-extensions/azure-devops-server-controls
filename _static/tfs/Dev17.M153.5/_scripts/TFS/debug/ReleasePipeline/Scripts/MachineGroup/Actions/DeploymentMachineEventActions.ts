// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import DTContracts = require("TFS/DistributedTask/Contracts");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");

/**
 * Action for machine updated.
 */
export var deploymentMachinesUpdated = new Action_Base.Action<DTContracts.DeploymentMachine[]>();

/**
 * Action for deleting machine.
 */
export var machineDeleted = new Action_Base.Action<number>();

/**
 * Action for machine become online.
 */
export var machineConnected = new Action_Base.Action<number>();

/**
 * Action for machine become offline.
 */
export var machineDisconnected = new Action_Base.Action<number>();

/**
 * Action for job request queued to machine group.
 */
export var deploymentQueued = new Action_Base.Action<Model.MachineDeployment>();

/**
 * Action for job request assigned to machine.
 */
export var deploymentAssignedToMachine = new Action_Base.Action<Model.MachineDeployment>();

/**
 * Action for job request started.
 */
export var deploymentStarted = new Action_Base.Action<Model.MachineDeployment>();

/**
 * Action for job request completed.
 */
export var deploymentCompleted = new Action_Base.Action<Model.MachineDeployment>();