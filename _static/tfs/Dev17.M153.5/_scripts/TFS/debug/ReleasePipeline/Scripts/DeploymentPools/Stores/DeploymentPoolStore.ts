// Copyright (c) Microsoft Corporation.  All rights reserved.

import Utils_String = require("VSS/Utils/String");
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import DTContracts = require("TFS/DistributedTask/Contracts");
import { DeploymentPoolActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolActions";
import { StoreKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")

export interface IDeploymentPool {
    deploymentPool : DeploymentPoolCommonModel.DeploymentPool;
    updatedDeploymentPoolName?: string;
    projectList: string[];
    selectedProjectList?: string[];
    removedProjectList?: string[];
    hasManagePermission?: boolean
    deploymentPoolSummary : DeploymentPoolCommonModel.DeploymentPoolSummary;
    isPermissionSet?: boolean;
}

export interface IDeploymentPoolWithSummary {
    deploymentPool : DeploymentPoolCommonModel.DeploymentPool;
    deploymentPoolSummary : DeploymentPoolCommonModel.DeploymentPoolSummary;
}

export class DeploymentPoolStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return StoreKeys.DeploymentPoolStore;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._deploymentPoolActions = ActionsHubManager.GetActionsHub<DeploymentPoolActions>(DeploymentPoolActions, instanceId);
        this._deploymentPoolActions.deploymentPoolAdded.addListener(this._ondeploymentPoolAdded);
        this._deploymentPoolActions.deploymentPoolUpdated.addListener(this._onDeploymentPoolUpdated);
        this._deploymentPoolActions.deploymentPoolNameModified.addListener(this._onDeploymentPoolNameModified);
        this._deploymentPoolActions.selectedProjectListModified.addListener(this._onSelectedProjectsModified);
        this._deploymentPoolActions.removedProjectListModified.addListener(this._onRemovedProjectsModified);
        this._deploymentPoolActions.projectListLoaded.addListener(this._onProjectListLoaded);
        this._deploymentPoolActions.deploymentPoolWithSummaryLoaded.addListener(this._onDeploymentPoolWithSummaryLoaded);
        this._deploymentPoolActions.deploymentGroupReferencesUpdated.addListener(this._onDeploymentGroupReferencesUpdated);
        this._deploymentPoolActions.checkPoolManagePermission.addListener(this._onPermissionFetched);
    }

    protected disposeInternal(): void {
        this._deploymentPoolActions.deploymentPoolAdded.removeListener(this._ondeploymentPoolAdded);
        this._deploymentPoolActions.deploymentPoolUpdated.removeListener(this._onDeploymentPoolUpdated);
        this._deploymentPoolActions.deploymentPoolNameModified.removeListener(this._onDeploymentPoolNameModified);
        this._deploymentPoolActions.selectedProjectListModified.removeListener(this._onSelectedProjectsModified);
        this._deploymentPoolActions.removedProjectListModified.removeListener(this._onRemovedProjectsModified);
        this._deploymentPoolActions.projectListLoaded.removeListener(this._onProjectListLoaded);
        this._deploymentPoolActions.deploymentGroupReferencesUpdated.removeListener(this._onDeploymentGroupReferencesUpdated);
        this._deploymentPoolActions.checkPoolManagePermission.removeListener(this._onPermissionFetched);
    }

    public getData(): IDeploymentPool {
        if(!this._deploymentMachineData) {
            this._deploymentMachineData = {deploymentPool: undefined, updatedDeploymentPoolName : undefined, projectList: [], selectedProjectList: [], removedProjectList: [], deploymentPoolCreated: false, hasManagePermission: false, deploymentPoolSummary: undefined, isPermissionSet: false} as IDeploymentPool;
        }
        return this._deploymentMachineData;
    }

    private _onProjectListLoaded = (projectList: DeploymentPoolCommonModel.TeamProjectReference[]): void => {
        var projectNameArray = [];
        var deploymentPoolData = this.getData();
        for (var project of projectList) {
            projectNameArray.push(project.name);
        }

        deploymentPoolData.projectList = projectNameArray.sort(Utils_String.localeIgnoreCaseComparer);
        this.emitChanged();
    }

    private _ondeploymentPoolAdded = (deploymentPool: DeploymentPoolCommonModel.DeploymentPool): void => {
        var deploymentPoolData = this.getData();
        deploymentPoolData.deploymentPool = deploymentPool;
        deploymentPoolData.updatedDeploymentPoolName = deploymentPool.name;        
        this.emitChanged();
    }

    private _onDeploymentPoolUpdated = (deploymentPool: DeploymentPoolCommonModel.DeploymentPool): void => {
        var deploymentPoolData = this.getData();
        deploymentPoolData.deploymentPool = deploymentPool;
        deploymentPoolData.updatedDeploymentPoolName = deploymentPool.name;        
        this.emitChanged();
    }

    private _onDeploymentPoolNameModified = (updatedDeploymentPoolName: string): void => {
        let storeData = this.getData();
        storeData.updatedDeploymentPoolName = updatedDeploymentPoolName;
        this.emitChanged();
    }

    private _onDeploymentPoolWithSummaryLoaded = (dpWithSummary : IDeploymentPoolWithSummary): void => {
        var deploymentPoolData = this.getData();
        deploymentPoolData.deploymentPool = dpWithSummary.deploymentPool;
        deploymentPoolData.deploymentPoolSummary = this._handleEmptyProjectName(dpWithSummary.deploymentPoolSummary);
        deploymentPoolData.updatedDeploymentPoolName = dpWithSummary.deploymentPool.name;
        this.emitChanged();
    }

    private _onDeploymentGroupReferencesUpdated = (dpSummary: DeploymentPoolCommonModel.DeploymentPoolSummary): void => {
        var deploymentPoolData = this.getData();
        deploymentPoolData.deploymentPoolSummary = this._handleEmptyProjectName(dpSummary);
        deploymentPoolData.selectedProjectList = [];
        deploymentPoolData.removedProjectList = [];
        this.emitChanged();
    }

    private _onPermissionFetched = (hasManagePermission: boolean): void => {
        let storeData = this.getData();
        storeData.hasManagePermission = hasManagePermission;
        storeData.isPermissionSet = true;
        this.emitChanged();
    }

    private _onSelectedProjectsModified = (selectedProjectList: string[]): void => {
        let storeData =this.getData();
        storeData.selectedProjectList = selectedProjectList;
        this.emitChanged();
    }

    private _onRemovedProjectsModified = (removedProjectList: string[]): void => {
        let storeData =this.getData();
        storeData.removedProjectList = removedProjectList;
        this.emitChanged();
    }
	
    private _handleEmptyProjectName(dpSummary: DeploymentPoolCommonModel.DeploymentPoolSummary) : DeploymentPoolCommonModel.DeploymentPoolSummary {
        if(!!dpSummary.deploymentGroups){
            dpSummary.deploymentGroups.forEach((dg: DTContracts.DeploymentGroupReference) => {
                if(!!dg.project && !dg.project.name) {
                    // If project name is null or empty we will show project guid in Deployment Pool page
                    dg.project.name = dg.project.id;
                }
            });
        }
        
        return dpSummary;
    }

    private _deploymentMachineData: IDeploymentPool;
    private _deploymentPoolActions: DeploymentPoolActions;
}
