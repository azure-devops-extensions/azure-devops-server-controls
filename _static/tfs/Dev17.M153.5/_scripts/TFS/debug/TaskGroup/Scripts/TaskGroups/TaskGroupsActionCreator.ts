import * as Q from "q";

import { MessageBarType } from "OfficeFabric/components/MessageBar/MessageBar.types";

import { HubsService } from "VSS/Navigation/HubsService";
import { Uri } from "VSS/Utils/Url";
import { logError } from "VSS/Diag";
import { IdentityRef } from "VSS/WebApi/Contracts";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ImportExportFileUtils } from "DistributedTaskControls/Common/ImportExportFileUtils";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";

import {
    TaskGroupsActionsHub,
    ITaskGroupsPayload,
    ITaskGroupNameFilterPayload
} from "TaskGroup/Scripts/TaskGroups/TaskGroupsActionsHub";
import { getHubUrl } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { getLatestVersion } from "TaskGroup/Scripts/Utils/TaskVersionUtils";
import { handleErrorAndDisplayInMessageBar } from "TaskGroup/Scripts/Utils/ErrorUtils";
import { TaskGroupSource } from "TaskGroup/Scripts/Common/Sources/TaskGroupSource";
import { IdentitiesSource } from "TaskGroup/Scripts/Common/Sources/IdentitiesSource";
import { ActionCreatorKeys, TaskGroupsListMessageBarKeys } from "TaskGroup/Scripts/TaskGroups/Constants";
import { ContributionIds } from "TaskGroup/Scripts/Common/Constants";
import { TaskGroupTelemetry, PerfTelemetryManager, TelemetryScenarios } from "TaskGroup/Scripts/Utils/TelemetryUtils";

export class TaskGroupsActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupsActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._taskGroupActionsHub = ActionsHubManager.GetActionsHub<TaskGroupsActionsHub>(TaskGroupsActionsHub);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public initializeTaskGroups(): void {

        (TaskGroupSource.instance().fetchTaskGroups()
            .then((taskGroups: DTContracts.TaskGroup[]) => {
                const ownerIdsToResolve: string[] = [];
                taskGroups.forEach((taskGroup: DTContracts.TaskGroup) => {
                    if ((!taskGroup.modifiedBy || !taskGroup.modifiedBy.displayName) && !!taskGroup.owner) {
                        ownerIdsToResolve.push(taskGroup.owner);
                    }
                });

                if (ownerIdsToResolve.length > 0) {
                    this._resolveOwnerIdentities(ownerIdsToResolve);
                }

                this._taskGroupActionsHub.initializeTaskGroups.invoke({ taskGroups } as ITaskGroupsPayload);
            },
            (error) => {
                this.handleError(error);
            }) as Q.Promise<any>)
            .fin(() => {
                PerfTelemetryManager.instance.endScenario(TelemetryScenarios.TaskGroupsLanding);
            });
    }

    public filterTaskGroups(filterString): void {
        this._taskGroupActionsHub.filterTaskGroups.invoke({ filterString: filterString } as ITaskGroupNameFilterPayload);
    }

    public exportTaskGroup(taskGroupId: string): void {
        TaskGroupSource.instance().getAllVersionsOfTaskGroup(taskGroupId, false)
            .then((taskGroups: DTContracts.TaskGroup[]) => {
                const latestVersion = getLatestVersion(taskGroups) as DTContracts.TaskGroup;
                const fileName = latestVersion.name + ".json";
                ImportExportFileUtils.downloadExportedJSONFileContent(
                    JSON.stringify(latestVersion),
                    fileName);
                TaskGroupTelemetry.exportTaskGroupSucceeded();
            },
            (error) => {
                TaskGroupTelemetry.exportTaskGroupFailed();
                this.handleError(error);
            });
    }

    public handleError(error: any): void {
        handleErrorAndDisplayInMessageBar(error, this._messageHandlerActionCreator, TaskGroupsListMessageBarKeys.ErrorBarParentKey);
    }

    public taskGroupNameHeaderClick(): void {
        this._taskGroupActionsHub.taskGroupNameHeaderClicked.invoke({});
    }

    public taskGroupModifiedByHeaderClick(): void {
        this._taskGroupActionsHub.taskGroupModifiedByHeaderClicked.invoke({});
    }

    public taskGroupModifiedOnHeaderClick(): void {
        this._taskGroupActionsHub.taskGroupModifiedOnHeaderClicked.invoke({});
    }

    private _resolveOwnerIdentities(identityIds: string[]): void {
        IdentitiesSource.instance().getIdentities(identityIds)
            .then((identities: IdentityRef[]) => {
                this._taskGroupActionsHub.updateResolvedOwnerIdentities.invoke({
                    identities: identities
                });
            });
    }

    private _taskGroupActionsHub: TaskGroupsActionsHub;
    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
}