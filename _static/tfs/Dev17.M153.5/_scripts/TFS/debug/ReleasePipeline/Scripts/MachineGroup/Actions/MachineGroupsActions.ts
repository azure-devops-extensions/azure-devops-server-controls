// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import {DeploymentPoolSummary} from "ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model";
import Model = require("ReleasePipeline/Scripts/MachineGroup/TFS.ReleaseManagement.MachineGroup.Model");

export interface IDeploymentGroupsMetricsPayload {
    append: boolean;
    deploymentGroupsMetricsResult: Model.DeploymentGroupsMetricsResult;
}
/**
 * Action for loading Deployment Groups UI Metrics data.
 */
export var deploymentGroupsMetricsLoaded = new Action_Base.Action<IDeploymentGroupsMetricsPayload>();

/**
 * Action for deleting machine group.
 */
export var machineGroupDeleted = new Action_Base.Action<number>();

/**
 * Action for loading Available Shared Pools data.
 */
export var availableSharedPoolsLoaded = new Action_Base.Action<DeploymentPoolSummary[]>();
