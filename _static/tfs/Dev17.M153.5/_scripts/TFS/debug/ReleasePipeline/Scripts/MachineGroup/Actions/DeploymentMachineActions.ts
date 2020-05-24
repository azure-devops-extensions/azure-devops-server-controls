// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import DeploymentMachineStore = require("ReleasePipeline/Scripts/MachineGroup/Stores/DeploymentMachineStore");
import { ITag } from "OfficeFabric/components/pickers/TagPicker/TagPicker";

/**
 * Action for updating deployment machines.
 */
export var machinesUpdated = new Action_Base.Action<Model.Machine[]>();

/**
 * Action for deleting machine.
 */
export var machineDeleted = new Action_Base.Action<number>();

/**
 * Action for loading Machine Group with selected Machine
 */
export var machineGroupLoadedWithSelectedMachine = new Action_Base.Action<DeploymentMachineStore.IDeploymentMachine>();

/**
 * Action for tag update
 */
export var machineTagsUpdated = new Action_Base.Action<ITag[]>();