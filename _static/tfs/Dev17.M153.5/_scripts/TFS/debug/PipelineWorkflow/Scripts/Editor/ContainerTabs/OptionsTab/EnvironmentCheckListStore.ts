
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { IEnvironmentReferencePayload, EnvironmentCheckListActionsHub } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListActions";
import { DataStoreInstanceIds } from "PipelineWorkflow/Scripts/Editor/Constants";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export interface IEnvironmentCheckListState {
    enabled: boolean;
    environmentList: IEnvironmentReference[];
    error: string;
}

export interface IEnvironmentReference {
    environmentId: number;
    environmentName: string;
    status: boolean;
    rank: number;
    badgeUrl?: string;
}

export class EnvironmentCheckListStore extends DataStoreBase {

    constructor() {
        super();
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._currentState = {} as IEnvironmentCheckListState;
        this._originalState = {} as IEnvironmentCheckListState;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._environmentCheckListActionsHub = ActionsHubManager.GetActionsHub<EnvironmentCheckListActionsHub>(EnvironmentCheckListActionsHub, instanceId);

        this._environmentListStore.getDataStoreList().forEach(depStore => depStore.getEnvironmentNameStore().addChangedListener(this._handleEnvironmentNameModification));
        this._environmentListStore.addChangedListener(this._handleEnvironmentListModification);

        this._environmentCheckListActionsHub.updateMasterCheckBoxStatus.addListener(this._handleUpdateMasterCheckBoxStatus);
        this._environmentCheckListActionsHub.updateEnvironmentStatus.addListener(this._handleUpdateEnvironmentStatus);
        this._environmentCheckListActionsHub.updateEnvironments.addListener(this.updateEnvironments);
    }

    protected disposeInternal(): void {
        this._environmentListStore.getDataStoreList().forEach(depStore => depStore.getEnvironmentNameStore().removeChangedListener(this._handleEnvironmentNameModification));
        this._environmentListStore.removeChangedListener(this._handleEnvironmentListModification);

        this._environmentCheckListActionsHub.updateMasterCheckBoxStatus.removeListener(this._handleUpdateMasterCheckBoxStatus);
        this._environmentCheckListActionsHub.updateEnvironmentStatus.removeListener(this._handleUpdateEnvironmentStatus);
        this._environmentCheckListActionsHub.updateEnvironments.removeListener(this.updateEnvironments);
    }

    protected isEnvironmentEnabled(env: DeployEnvironmentStore): boolean{
        return true;
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentCheckListStoreKey;
    }

    public getState(): IEnvironmentCheckListState {
        return this._currentState;
    }

    public isDirty(): boolean {
        return (!this._areEnvironmentCheckListsEquivalent(this._currentState, this._originalState));
    }

    public isValid(): boolean {
        return !this._currentState.enabled || (this.getSelectedEnvironments().length > 0);
    }

    public updateVisitor(): void {
    }

    public getSelectedEnvironments(): IEnvironmentReference[] {

        if (!this._currentState.enabled || !this._currentState.environmentList) {
            return [];
        }

        return this._currentState.environmentList.filter(env => !!env.status);
    }

    public updateEnvironments = (environmentList: IEnvironmentReference[]) => {

        this._currentState.environmentList = [];
        if (environmentList) {
            environmentList.forEach(env => {
                this._currentState.environmentList.push(JQueryWrapper.extendDeep({}, env));
            });
        }
        this._currentState.environmentList = this._currentState.environmentList.sort((env1: IEnvironmentReference, env2: IEnvironmentReference) => env1.rank - env2.rank);
        this._currentState.enabled = this._currentState.environmentList.some(envRef => envRef.status);
        this._currentState.error = this.isValid() ? null : Resources.PublishDeploymentNoEnvironmentsSelected;

        this._originalState = {
            enabled: this._currentState.enabled,
            environmentList: this._currentState.environmentList.map(env => JQueryWrapper.extendDeep({}, env)),
            error: this._currentState.error
        };
    }

    // Equivalent means the resulting env list will be same. For example if the master check box is disabled, the 
    // checklists are equivalent regardless of which environments are selected.
    private _areEnvironmentCheckListsEquivalent = (checkList1: IEnvironmentCheckListState, checkList2: IEnvironmentCheckListState) => {

        if (checkList1.enabled !== checkList2.enabled) {
            return false;
        }

        if (!checkList1.enabled) {
            // Both disabled, ignore the difference in env lists.
            return true;
        }

        // Both enabled. Compare the environment lists.
        return !Utils_Array.first(checkList1.environmentList, env1 => {

            const match = Utils_Array.first(
                checkList2.environmentList,
                env2 => env2.environmentId === env1.environmentId);

            return !match || (match.status !== env1.status);
        });
    }

    private _handleEnvironmentListModification = (): void => {
        let deploymentStores: DeployEnvironmentStore[] = this._environmentListStore.getDataStoreList();

        if (deploymentStores) {
            if (!!this._originalState && !!this._originalState.environmentList &&
                deploymentStores.length !== this._originalState.environmentList.length) {

                let addedEnvironments: DeployEnvironmentStore[] = [];
                deploymentStores.forEach(depStore => {
                    if (!this._originalState.environmentList.some(status => status.environmentId === depStore.getEnvironmentId())) {
                        addedEnvironments.push(depStore);
                    }
                });

                if (addedEnvironments.length > 0) {
                    addedEnvironments.forEach(addedEnvironment => {
                        let newEnvStatus;
                        // TO DO: We should set it through some other means. We'll take that up later.
                        if (this.getInstanceId() === DataStoreInstanceIds.BadgeStatus) {
                            newEnvStatus = false;
                        } else {
                            newEnvStatus = this.isEnvironmentEnabled(addedEnvironment);
                        }
                        // In case the first environment is being added, set master status from environment status (true)
                        if (this._currentState.environmentList.length === 0) {
                            this._currentState.enabled = newEnvStatus;
                        }
                        else {
                            // Pick master status for subsequent additions.
                            newEnvStatus = this._currentState.enabled;
                        }

                        let newEntry = {
                            environmentId: addedEnvironment.getEnvironmentId(),
                            environmentName: addedEnvironment.getEnvironmentName(),
                            rank: addedEnvironment.getEnvironmentRank(),
                            status: newEnvStatus
                        };

                        this._originalState.environmentList.push(newEntry);
                        this._currentState.environmentList.push(newEntry);
                        addedEnvironment.getEnvironmentNameStore().addChangedListener(this._handleEnvironmentNameModification);
                    });
                }
                else {
                    this._removeDeletedEnvironmentsFromList(this._originalState.environmentList, deploymentStores);
                    this._removeDeletedEnvironmentsFromList(this._currentState.environmentList, deploymentStores);

                    this._currentState.enabled = this._currentState.enabled && this._currentState.environmentList.some(status => status.status);
                    this._originalState.enabled = this._originalState.environmentList.some(status => status.status);
                }

                this.emitChanged();
            }
            else if (deploymentStores.length > 0 && (!this._originalState || !this._originalState.environmentList)) {
                // This means that the state is currently not created yet.
                // But the environment name stores are created. So we should add listeners right away
                deploymentStores.forEach(depStore => {
                    // first remove the handler if exists. We shouldn't create multiple subscriptions
                    depStore.getEnvironmentNameStore().removeChangedListener(this._handleEnvironmentNameModification);
                    depStore.getEnvironmentNameStore().addChangedListener(this._handleEnvironmentNameModification);
                });
            }
            else if (this._currentState && this._currentState.environmentList && this._currentState.environmentList.length > 0 && this._isAnyEnvironmentRankChanged(deploymentStores)) {
                this._currentState.environmentList.forEach((env) => {
                    const matchingDepStore = Utils_Array.first(deploymentStores, (depStore) => depStore.getEnvironmentId() === env.environmentId);
                    env.rank = matchingDepStore.getEnvironmentRank();
                });

                this._currentState.environmentList = this._currentState.environmentList.sort((env1: IEnvironmentReference, env2: IEnvironmentReference) => env1.rank - env2.rank);

                this.emitChanged();
            }
        }
    }

    private _removeDeletedEnvironmentsFromList = (listOfEnvironmentStatuses: IEnvironmentReference[], deployStores: DeployEnvironmentStore[]) => {
        let deletedEnvironments: IEnvironmentReference[] = [];
        listOfEnvironmentStatuses.forEach(status => {
            if (!deployStores.some(depStore => depStore.getEnvironmentId() === status.environmentId)) {
                deletedEnvironments.push(status);
            }
        });

        if (deletedEnvironments.length > 0) {
            deletedEnvironments.forEach(deletedEnvironment =>
                Utils_Array.remove(listOfEnvironmentStatuses, deletedEnvironment));
        }
    }

    private _isAnyEnvironmentRankChanged(deploymentStores: DeployEnvironmentStore[]): boolean {
        return deploymentStores.some((depStore) => depStore.hasRankChanged());
    }

    private _handleEnvironmentNameModification = (): void => {

        const updateEnvironmentName = (environmentList: IEnvironmentReference[], env: CommonTypes.PipelineDefinitionEnvironment): void => {
            let match = Utils_Array.first(environmentList, status => status.environmentId === env.id);
            if (match) {
                match.environmentName = env.name;
            }
        };

        let environments = this._environmentListStore.getCurrentState();
        environments.forEach(env => {
            updateEnvironmentName(this._originalState.environmentList, env);
            updateEnvironmentName(this._currentState.environmentList, env);
        });

        this.emitChanged();
    }

    private _handleUpdateMasterCheckBoxStatus = (newValue: boolean): void => {

        this._currentState.enabled = newValue;

        // If none of the environments have property checked, and if the master checkbox is selected, select all.
        let environments = this._currentState.environmentList;
        if (this._currentState.enabled && environments && !(environments.some(env => env.status))) {
            environments.forEach(env => {
                env.status = true;
            });

            if (environments.length > 0) {
                this._currentState.error = Utils_String.empty;
            }
        }

        this.emitChanged();
    }

    private _handleUpdateEnvironmentStatus = (payload: IEnvironmentReferencePayload) => {

        let affectedEnvironment = Utils_Array.first(this._currentState.environmentList, env => env.environmentId === payload.environmentId);
        if (!!affectedEnvironment) {
            affectedEnvironment.status = payload.status;
        }

        this._currentState.error = this.isValid() ? null : Resources.PublishDeploymentNoEnvironmentsSelected;

        this.emitChanged();
    }

    private _currentState: IEnvironmentCheckListState;
    private _originalState: IEnvironmentCheckListState;
    private _environmentListStore: EnvironmentListStore;
    private _environmentCheckListActionsHub: EnvironmentCheckListActionsHub;
}