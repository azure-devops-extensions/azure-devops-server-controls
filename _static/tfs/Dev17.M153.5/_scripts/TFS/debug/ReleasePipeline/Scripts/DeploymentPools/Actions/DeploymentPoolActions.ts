// Copyright (c) Microsoft Corporation.  All rights reserved.

import Action_Base = require("VSS/Flux/Action");
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import { IDeploymentPoolWithSummary } from 'ReleasePipeline/Scripts/DeploymentPools/Stores/DeploymentPoolStore';
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")

export class DeploymentPoolActions extends ActionsHubBase {

    public initialize(): void {
        this._deploymentPoolAdded = new Action_Base.Action<DeploymentPoolCommonModel.DeploymentPool>();
        this._deploymentPoolUpdated = new Action_Base.Action<DeploymentPoolCommonModel.DeploymentPool>();
        this._deploymentPoolNameModified = new Action_Base.Action<string>();
        this._selectedProjectListModified = new Action_Base.Action<string[]>();
        this._removedProjectListModified = new Action_Base.Action<string[]>();
        this._projectListLoaded = new Action_Base.Action<DeploymentPoolCommonModel.TeamProjectReference[]>();        
        this._deploymentPoolWithSummaryLoaded = new Action_Base.Action<IDeploymentPoolWithSummary>();
        this._updateDeploymentGroupReferences = new Action_Base.Action<DeploymentPoolCommonModel.DeploymentPoolSummary>();
        this._hasManagePermission = new Action_Base.Action<boolean>();
    }

    public static getKey(): string {
        return ActionsKeys.DeploymentPoolActions;
    }

    /**
     * Action for adding new deployment pool
     */
    public get deploymentPoolAdded(): Action_Base.Action<DeploymentPoolCommonModel.DeploymentPool> {
        return this._deploymentPoolAdded;
    }

    /**
     * Action for updating deployment pool
     */
    public get deploymentPoolUpdated(): Action_Base.Action<DeploymentPoolCommonModel.DeploymentPool> {
        return this._deploymentPoolUpdated;
    }

    /**
     * Action to modify deployment pool name
     */
    public get deploymentPoolNameModified(): Action_Base.Action<string> {
        return this._deploymentPoolNameModified;
    }

    /**
     * Action to modify list of selected projects 
     */
    public get selectedProjectListModified(): Action_Base.Action<string[]> {
        return this._selectedProjectListModified;
    }

    /**
     * Action to modify list of removed projects 
     */
    public get removedProjectListModified(): Action_Base.Action<string[]> {
        return this._removedProjectListModified;
    }

    /**
    * Action for getting list of projects 
     */
    public get projectListLoaded(): Action_Base.Action<DeploymentPoolCommonModel.TeamProjectReference[]> {
        return this._projectListLoaded;
    }

    /**
     * Action for getting deployment pool with summary
     */
    public get deploymentPoolWithSummaryLoaded(): Action_Base.Action<IDeploymentPoolWithSummary> {
        return this._deploymentPoolWithSummaryLoaded;
    }

    /**
     * Action for updating deployment pool summary
     */
    public get deploymentGroupReferencesUpdated(): Action_Base.Action<DeploymentPoolCommonModel.DeploymentPoolSummary> {
        return this._updateDeploymentGroupReferences;
    }

    /**
     * Action for checking pool permission
     */
    public get checkPoolManagePermission(): Action_Base.Action<boolean> {
        return this._hasManagePermission;
    }

    private _deploymentPoolAdded: Action_Base.Action<DeploymentPoolCommonModel.DeploymentPool>;
    private _deploymentPoolUpdated: Action_Base.Action<DeploymentPoolCommonModel.DeploymentPool>;
    private _deploymentPoolNameModified: Action_Base.Action<string>;
    private _selectedProjectListModified: Action_Base.Action<string[]>;
    private _removedProjectListModified: Action_Base.Action<string[]>;
    private _deploymentPoolWithSummaryLoaded: Action_Base.Action<IDeploymentPoolWithSummary>;
    private _updateDeploymentGroupReferences: Action_Base.Action<DeploymentPoolCommonModel.DeploymentPoolSummary>;
    private _projectListLoaded: Action_Base.Action<DeploymentPoolCommonModel.TeamProjectReference[]>;
    private _hasManagePermission: Action_Base.Action<boolean>;
}
