import VSS = require("VSS/VSS");
import DTContracts = require("TFS/DistributedTask/Contracts");
import Events_Services = require("VSS/Events/Services");
import Utils_String = require("VSS/Utils/String");
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeploymentPoolActions } from "ReleasePipeline/Scripts/DeploymentPools/Actions/DeploymentPoolActions";
import { ActionCreatorKeys } from "ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils";
import PerformanceTelemetry = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.PerformanceTelemetry");
import {PerfScenariosConstants} from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import { IDeploymentPoolWithSummary } from 'ReleasePipeline/Scripts/DeploymentPools/Stores/DeploymentPoolStore';
import RMUtilsCore = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core");
import Model = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Model");
import DPUtils = require("ReleasePipeline/Scripts/DeploymentPools/TFS.ReleaseManagement.DeploymentPool.Utils");
import DeploymentPoolCommonModel = require("ReleasePipeline/Scripts/Common/TFS.ReleaseManagement.DeploymentPool.Common.Model")

export class DeploymentPoolActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.DeploymentPoolActionCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<DeploymentPoolActions>(DeploymentPoolActions, instanceId);
        this._source = Model.DeploymentPoolSource.instance();
        this._deploymentPoolCommonSource = DeploymentPoolCommonModel.DeploymentPoolCommonSource.instance();
    }

    public getProjectList() {
        let newDpPromise: IPromise<DeploymentPoolCommonModel.TeamProjectReference[]>;
        //TODO: use smaller top value and show more button for better user experience
        newDpPromise = this._deploymentPoolCommonSource.beginGetProjectList();
        newDpPromise.then((value: DeploymentPoolCommonModel.TeamProjectReference[]) => {
            this._actions.projectListLoaded.invoke(value);
        }, (error) => {
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateCreatePoolFailureMessage, this, error);
        })
    }

    public updateSelectedProjectList(selectedProjectList: string[]) {
        this._actions.selectedProjectListModified.invoke(selectedProjectList);
    }

    public updateRemovedProjectList(removedProjectList: string[]) {
        this._actions.removedProjectListModified.invoke(removedProjectList);
    }

    public addDeploymentPool(poolName: string, projectNameList?: string[]) {
        let newDpPromise: IPromise<DeploymentPoolCommonModel.DeploymentPool>;
        newDpPromise = this._source.beginCreateDeploymentPool(poolName);
        newDpPromise.then((poolData: DeploymentPoolCommonModel.DeploymentPool)  => {
            let newDpPromise: IPromise<any> = this._source.beginCreateDeploymentGroups(projectNameList, poolData);
            newDpPromise.then((value) => {
                this._actions.deploymentPoolAdded.invoke(poolData);
            }, (error) => {
                Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateCreatePoolFailureMessage, this, error);
            });
        }, (error: any) => {
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateCreatePoolFailureMessage, this, error);
        });
    } 

    public modifyDeploymentPoolName(updatedPoolName: string) {
        this._actions.deploymentPoolNameModified.invoke(updatedPoolName);
    }

    public getDeploymentPoolWithSummary(deploymentPoolId: number) {
        PerformanceTelemetry.PerformanceUtil.split("VSO.RM.getDeploymentPool");
        this._source.beginGetDeploymentPool(deploymentPoolId).then((poolData: DeploymentPoolCommonModel.DeploymentPool) => {
            let dpName: string = !!poolData ? poolData.name : null;
            if(!!dpName) {
                PerformanceTelemetry.PerformanceUtil.split("VSO.RM.getDeploymentPoolSummary");
                this._deploymentPoolCommonSource.beginGetDeploymentPoolsSummary(dpName).then((poolSummary: DeploymentPoolCommonModel.DeploymentPoolSummary[]) => {
                    if (!!poolSummary && poolSummary.length > 0 && poolSummary[0].name == dpName) {
                        this._actions.deploymentPoolWithSummaryLoaded.invoke({deploymentPool: poolData, deploymentPoolSummary: poolSummary[0]} as IDeploymentPoolWithSummary);
                        this.checkDeploymentPoolManagePermission(poolData);
                    }
                }, (error: any) => {
                    Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, error);
                });
            }
        }, (error: any) => {
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, error);
        });
    }

    public updateDeploymentPoolAndReferences(deploymentPool: DeploymentPoolCommonModel.DeploymentPool, modifiedDeploymentPoolName: string, dgsToRemove: DTContracts.DeploymentGroupReference[], projectsToAddDG?: string[]) {
        if(Utils_String.equals(modifiedDeploymentPoolName, deploymentPool.name, false)) {
            this.updateDeploymentGroupReferences(deploymentPool, dgsToRemove, projectsToAddDG);
            return;
        }

        let modifiedPool: DTContracts.TaskAgentPool = deploymentPool.pool;
        modifiedPool.name = modifiedDeploymentPoolName;

        this._source.beginUpdateDeploymentPool(modifiedPool).then((pool: DeploymentPoolCommonModel.DeploymentPool) => {
            this._actions.deploymentPoolUpdated.invoke(pool);
            if (dgsToRemove.length > 0 || projectsToAddDG.length > 0) {
                this.updateDeploymentGroupReferences(pool, dgsToRemove, projectsToAddDG);
            }
        }, (error) => {
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, error);
        });
    }

    public updateDeploymentGroupReferences(deploymentPool: DeploymentPoolCommonModel.DeploymentPool, dgsToRemove: DTContracts.DeploymentGroupReference[], projectsToAddDG?: string[]) {
        let updateDPReferencePromise: IPromise<any>;
        updateDPReferencePromise = this._deploymentPoolCommonSource.beginUpdateDeploymentGroupReferences(deploymentPool, dgsToRemove, projectsToAddDG);
        updateDPReferencePromise.then((value)  => {
            let dpSummaryPromise = this._deploymentPoolCommonSource.beginGetDeploymentPoolsSummary(deploymentPool.name);
            dpSummaryPromise.then((poolsData: DeploymentPoolCommonModel.DeploymentPoolSummary[])  => {
                if (!!poolsData && poolsData.length > 0 && poolsData[0].name == deploymentPool.name)
                {
                    this._actions.deploymentGroupReferencesUpdated.invoke(poolsData[0]);
                }
            }, (error) => {
                Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, error);
            });
        });
    }

    public checkDeploymentPoolManagePermission(poolData: DeploymentPoolCommonModel.DeploymentPool) {
        const manageRolesPermission: number = 8;
        RMUtilsCore.SecurityHelper.hasDeploymentPoolPermission(poolData.id, manageRolesPermission).then((hasManagePermission: boolean) => {
            this._actions.checkPoolManagePermission.invoke(hasManagePermission);
        }, (error: any) => {
            Events_Services.getService().fire(DPUtils.DeploymentPoolActions.UpdateErrorMessage, this, error);
        });
    }

    private _source: Model.DeploymentPoolSource;
    private _deploymentPoolCommonSource: DeploymentPoolCommonModel.DeploymentPoolCommonSource;
    private _actions: DeploymentPoolActions;
}