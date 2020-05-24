
import { DeploymentGroupsActions, IRefreshDeploymentGroupsPayload } from "DistributedTaskControls/Actions/DeploymentGroupsActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";

import { DeploymentGroup } from "TFS/DistributedTask/Contracts";

import * as VSS_Context from "VSS/Context";
import * as VSS_HubsService from "VSS/Navigation/HubsService";
import * as VSS_Service from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Url from "VSS/Utils/Url";
import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";

export class DeploymentGroupsStore extends StoreCommonBase.ChangeTrackerStoreBase {

    constructor() {
        super();
        this._permissibleDeploymentGroups = [];
        this._nonPermissibleDeploymentGroups = [];
        this._areDeploymentGroupsInitialized = false;
        this._areRefreshFirstBatch = false;
    }

    public static getKey(): string {
        return StoreKeys.DeploymentGroupsStore;
    }

    public initialize(): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<DeploymentGroupsActions>(DeploymentGroupsActions);
        this._actionsHub.updatePermissibleDeploymentGroups.addListener(this._handleUpdatePermissibleDeploymentGroups);
        this._actionsHub.updateNonPermissibleDeploymentGroups.addListener(this._handleUpdateNonPermissibleDeploymentGroups);
        this._actionsHub.refreshDeploymentGroups.addListener(this._handleRefreshDeploymentGroups);
        this._actionsHub.manageDeploymentGroups.addListener(this._handleManageDeploymentGroups);
        this._actionsHub.addDeploymentGroups.addListener(this._handleAddDeploymentGroups);
    }

    protected disposeInternal(): void {
        this._actionsHub.updatePermissibleDeploymentGroups.removeListener(this._handleUpdatePermissibleDeploymentGroups);
        this._actionsHub.updateNonPermissibleDeploymentGroups.addListener(this._handleUpdateNonPermissibleDeploymentGroups);
        this._actionsHub.refreshDeploymentGroups.removeListener(this._handleRefreshDeploymentGroups);
        this._actionsHub.manageDeploymentGroups.removeListener(this._handleManageDeploymentGroups);
        this._actionsHub.addDeploymentGroups.removeListener(this._handleAddDeploymentGroups);
    }

    public getDeploymentGroups(): DeploymentGroup[] {
        return this._permissibleDeploymentGroups;
    }

    public getDeploymentGroupById(queueId: number): DeploymentGroup {
        if (!queueId || queueId < 0) {
            return null;
        }

        // First search in permissible list, if not found check in all deployment groups list
        let selectedDeploymentMachineGroup: DeploymentGroup = this._getDeploymentGroupFromList(queueId, this._permissibleDeploymentGroups);

        if (!selectedDeploymentMachineGroup) {
            selectedDeploymentMachineGroup = this._getDeploymentGroupFromList(queueId, this._nonPermissibleDeploymentGroups);
        }

        return selectedDeploymentMachineGroup;
    }

    public getDeploymentGroupByName(name: string): DeploymentGroup {
        //In drop down we are showing DG which is coming from Saved RD and DG in which user has permission
        const allDeploymentGroups = [];
        allDeploymentGroups.push(...this._permissibleDeploymentGroups);
        allDeploymentGroups.push(...this._nonPermissibleDeploymentGroups);

        let selectedDeploymentGroup: DeploymentGroup = Utils_Array.first(
            allDeploymentGroups,
            (deploymentGroup: DeploymentGroup) => {
                return (Utils_String.ignoreCaseComparer(name, deploymentGroup.name) === 0);
            }
        );

        return selectedDeploymentGroup;
    }

    public getDeploymentGroupsNameList(queueId?: number): string[] {
        // Get machine groups name on which user has permission
        let machineGroupsNameList: string[] = [];
        if (this._permissibleDeploymentGroups) {
            this._permissibleDeploymentGroups.forEach((deploymentGroup: DeploymentGroup) => {
                machineGroupsNameList.push(deploymentGroup.name);
            });
        }

        // This will get machine group for the given id irrespective of whether user has permission on the given machine group
        let originalDeploymentGroup = this.getDeploymentGroupById(queueId);

        if (originalDeploymentGroup) {
            let index = Utils_Array.findIndex(machineGroupsNameList, (machineGroupName: string) => {
                return (Utils_String.localeIgnoreCaseComparer(machineGroupName, originalDeploymentGroup.name) === 0);
            });

            // If original machine group with queueId not present in the permissible list then append original machine list name
            // We want to show user machine group name even though user doesn't have permission on machine group with which RD got saved
            if (index < 0) {
                machineGroupsNameList.push(originalDeploymentGroup.name);
            }
        }

        return machineGroupsNameList;
    }

    public isDirty(): boolean {
        return false;
    }

    public isValid(): boolean {
        return true;
    }

    public areMachineGroupsInitialized(): boolean {
        return this._areDeploymentGroupsInitialized;
    }

    private _handleAddDeploymentGroups = (deploymentGroups: DeploymentGroup[]) => {
        const deploymentGroups1 = deploymentGroups || [];

        deploymentGroups1.sort((a: DeploymentGroup, b: DeploymentGroup) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });
        this._permissibleDeploymentGroups = Utils_Array.union(this._permissibleDeploymentGroups, deploymentGroups1, (a: DeploymentGroup, b: DeploymentGroup) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });
        this.emitChanged();

    }

    private _getDeploymentGroupFromList(queueId: number, deploymentMachineGroups: DeploymentGroup[]) {
        return Utils_Array.first(
            deploymentMachineGroups,
            (deploymentMachineGroup: DeploymentGroup) => {
                return deploymentMachineGroup.id === queueId;
            }
        );
    }

    private _handleUpdatePermissibleDeploymentGroups = (deploymentMachineGroups: DeploymentGroup[]) => {
        this._areDeploymentGroupsInitialized = true;
        this._permissibleDeploymentGroups = Utils_Array.union(deploymentMachineGroups || [], this._permissibleDeploymentGroups || []);
        // Filling Data in queues
        this._permissibleDeploymentGroups.sort((a: DeploymentGroup, b: DeploymentGroup) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });
    }

    private _handleUpdateNonPermissibleDeploymentGroups = (deploymentMachineGroups: DeploymentGroup[]) => {
        this._nonPermissibleDeploymentGroups = Utils_Array.union(deploymentMachineGroups || [], this._nonPermissibleDeploymentGroups || []);
    }

    private _handleRefreshDeploymentGroups = (refreshDeploymentGroupsPayload: IRefreshDeploymentGroupsPayload) => {
        //FirstBatch is used to represent first Page of DeploymentGroups Pagination API
        this._areDeploymentGroupsInitialized = true;
        this._permissibleDeploymentGroups = refreshDeploymentGroupsPayload.isFirstBatch ?
            refreshDeploymentGroupsPayload.permissibleDeploymentGroups || [] :
            Utils_Array.union(refreshDeploymentGroupsPayload.permissibleDeploymentGroups || [], this._permissibleDeploymentGroups || []);

        this._permissibleDeploymentGroups.sort((a: DeploymentGroup, b: DeploymentGroup) => {
            return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
        });

        this.emitChanged();
    }

    private _handleManageDeploymentGroups = (deploymentGroupId: number) => {
        let actionUrl: string;
        if (!!deploymentGroupId && deploymentGroupId > 0) {
            actionUrl = TaskUtils.ActionUrlResolver.getActionUrl(null, null, "machinegroup", { project: VSS_Context.getDefaultWebContext().project.name, "view": "MachineGroupView", "mgid": deploymentGroupId });
        }
        else {
            actionUrl = TaskUtils.ActionUrlResolver.getActionUrl(null, null, "machinegroup", { project: VSS_Context.getDefaultWebContext().project.name, "view": "MachineGroupsView" });
        }
        UrlUtilities.openInNewWindow(actionUrl, true);
    }

    private _actionsHub: DeploymentGroupsActions;
    private _permissibleDeploymentGroups: DeploymentGroup[];
    private _nonPermissibleDeploymentGroups: DeploymentGroup[];
    private _areDeploymentGroupsInitialized: boolean;
    private _areRefreshFirstBatch: boolean;
}