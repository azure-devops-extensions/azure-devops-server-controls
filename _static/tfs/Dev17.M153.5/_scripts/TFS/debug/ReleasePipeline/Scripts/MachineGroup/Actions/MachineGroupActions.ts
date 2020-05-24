// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model");
import DTContracts = require("TFS/DistributedTask/Contracts");
import { ISecurityPermissions, IMachineTagsInfo } from 'ReleasePipeline/Scripts/MachineGroup/Stores/MachineGroupStore';

export interface IMachinesFilter
{
    name: string;
    tagList: string[];
    statusList: string[];
}

export interface IMachineGroupData {
    machineGroup: Model.MachineGroup;
    deploymentGroupMetrics: Model.DeploymentGroupUIMetrics;
}

/**
 * Action for adding machine group.
 */
export var machineGroupAdded = new Action_Base.Action<Model.MachineGroup>();

/**
 * Action for loading Machine Group.
 */
export var machineGroupLoaded = new Action_Base.Action<IMachineGroupData>();

/**
 * Action for update Machine Group.
 */
export var machineGroupUpdated = new Action_Base.Action<Model.MachineGroup>();

/**
 * Action for modify Machine Group name.
 */
export var machineGroupNameModified = new Action_Base.Action<string>();

/**
 * Action for modify Machine Group description.
 */
export var machineGroupDescriptionModified = new Action_Base.Action<string>();

/**
 * Action for updating deployment machines.
 */
export var machinesUpdated = new Action_Base.Action<Model.Machine[]>(); 

/**
 * Action for loading mretrics for deployment group.
 */
export var deploymentGroupMetricsLoaded = new Action_Base.Action<Model.DeploymentGroupUIMetrics>();

/**
 * Action for loading targets.
 */
export var targetsLoaded = new Action_Base.Action<Model.PagedTargetGroups>();

/**
 * Action for checking deployment group permissions.
 */
export var checkManagePermission = new Action_Base.Action<ISecurityPermissions>();

export var targetsLoadMore = new Action_Base.Action<Model.PagedTargetGroups>();

/**
 * Action for updating the pool details for deployment group
 */
export var deploymentGroupInitialized = new Action_Base.Action<Model.MachineGroup>();

/**
 * Action for getting deployment pool with summary
 */
export var deploymentPoolSummaryLoaded = new Action_Base.Action<DeploymentPoolCommonModel.DeploymentPoolSummary>();

/**
 * Action for getting list of projects 
 */
export var projectListLoaded = new Action_Base.Action<DeploymentPoolCommonModel.TeamProjectReference[]>();

/**
 * Action for updating deployment pool summary
 */
export var deploymentGroupReferencesUpdated = new Action_Base.Action<DeploymentPoolCommonModel.DeploymentPoolSummary>();

/**
 * Action for updating tags of deployment machine
 */
export var deploymentMachineTagsUpdated = new Action_Base.Action<IMachineTagsInfo>();