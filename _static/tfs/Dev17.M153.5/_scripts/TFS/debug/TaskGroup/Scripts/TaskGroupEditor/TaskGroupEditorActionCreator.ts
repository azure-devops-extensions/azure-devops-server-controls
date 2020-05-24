import *as Q from "q";

import { isEmptyGuid, localeFormat } from "VSS/Utils/String";
import { getRunningDocumentsTable, RunningDocumentsTableEntry } from "VSS/Events/Document";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ImportExportFileUtils } from "DistributedTaskControls/Common/ImportExportFileUtils";

import { getLatestVersion } from "TaskGroup/Scripts/Utils/TaskVersionUtils";
import { navigateToTaskGroupEditor } from "TaskGroup/Scripts/Utils/TaskGroupUrlUtils";
import { prepareTaskGroupForImport } from "TaskGroup/Scripts/Utils/TaskGroupUtils";
import { TaskGroupTelemetry } from "TaskGroup/Scripts/Utils/TelemetryUtils";
import { TasksTabActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabActionCreator";
import { TaskGroupSource } from "TaskGroup/Scripts/Common/Sources/TaskGroupSource";
import { TaskGroupHistoryActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistoryActionCreator";
import { TaskGroupReferencesActionCreator } from "TaskGroup/Scripts/Common/TaskGroupReferences/TaskGroupReferencesActionCreator";
import { SaveTaskGroupDialogActionCreator } from "TaskGroup/Scripts/Common/SaveTaskGroupDialog/SaveTaskGroupDialogActionCreator";
import { PublishDraftTaskGroupDialogActionCreator } from "TaskGroup/Scripts/Common/PublishDraftTaskGroupDialog/PublishDraftTaskGroupDialogActionCreator";
import { TaskGroupVersionsActionCreator } from "TaskGroup/Scripts/TaskGroupEditor/Versions/TaskGroupVersionsActionCreator";
import { ActionCreatorKeys, MessageAreaKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import { SessionStorageKeys } from "TaskGroup/Scripts/Common/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class TaskGroupEditorActionCreator extends ActionCreatorBase {
    public static getKey(): string {
        return ActionCreatorKeys.TaskGroupEditorActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._taskGroupTasksTabActionCreator = ActionCreatorManager.GetActionCreator<TasksTabActionCreator>(TasksTabActionCreator, instanceId);
        this._taskGroupHistoryActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupHistoryActionCreator>(TaskGroupHistoryActionCreator);
        this._taskGroupReferencesActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupReferencesActionCreator>(TaskGroupReferencesActionCreator);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._taskGroupReferencesActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupReferencesActionCreator>(TaskGroupReferencesActionCreator);
        this._taskGroupVersionsActionCreator = ActionCreatorManager.GetActionCreator<TaskGroupVersionsActionCreator>(TaskGroupVersionsActionCreator, instanceId);
    }

    public initializeTaskGroup(taskGroupId: string, forceUpdate: boolean = false): void {
        // Initialize the task groups for the given id
        this._fetchTaskGroup(taskGroupId, forceUpdate);

        // Initialize History
        this._taskGroupHistoryActionCreator.fetchTaskGroupRevisions(taskGroupId);

        // Initialize References
        this._taskGroupReferencesActionCreator.resetAllReferences();
        this._taskGroupReferencesActionCreator.getAllContributedReferences(taskGroupId);
    }

    public initializeTaskGroupForImport() {
        TaskGroupSource.instance().getTaskDefinitions(null, true).then(() => {
            const taskGroupString = ImportExportFileUtils.getAndRemoveFileContentFromSessionStorage(SessionStorageKeys.ImportTaskGroupStorageSessionKey);

            try {
                const taskGroup: DTContracts.TaskGroup = JSON.parse(taskGroupString) as DTContracts.TaskGroup;
                if (!taskGroup) {
                    this._taskGroupTasksTabActionCreator.updateErrorMessage(Resources.ImportedTaskGroupNotFound);
                    return;
                }

                prepareTaskGroupForImport(taskGroup);

                TaskGroupTelemetry.importTaskGroupSucceeded();

                this._taskGroupVersionsActionCreator.updateVersionsList([taskGroup]);
                this._taskGroupVersionsActionCreator.updateSelectedVersion(taskGroup);

            }
            catch (error) {
                TaskGroupTelemetry.importTaskGroupFailed();
                const errorMessage = localeFormat(Resources.ImportTaskGroupFailedFormat, error);
                this._taskGroupTasksTabActionCreator.updateErrorMessage(errorMessage);
            }
        });
    }

    public resetTaskGroup(taskGroup: DTContracts.TaskGroup): void {
        this._taskGroupVersionsActionCreator.updateTaskGroup(taskGroup, true);
    }

    // TODO - Revisit the design once, and think if this is the best set of parameters
    // Other options may be updating the store to make it not dirty, before navigating (but that is useless script processing)
    public saveTaskGroup(taskGroup: DTContracts.TaskGroup, comment: string, rdtEntry?: RunningDocumentsTableEntry): void {
        const saveTaskGroupDialogActionCreator = ActionCreatorManager.GetActionCreator<SaveTaskGroupDialogActionCreator>(SaveTaskGroupDialogActionCreator);

        let taskGroupSavePromise = null;
        if (!taskGroup.id) {
            taskGroupSavePromise = TaskGroupSource.instance().addTaskGroup(taskGroup);
        }
        else {
            taskGroupSavePromise = TaskGroupSource.instance().saveTaskGroup(taskGroup, comment);
        }

        saveTaskGroupDialogActionCreator.notifySaveStarted();

        taskGroupSavePromise
            .then((savedTaskGroup: DTContracts.TaskGroup) => {

                saveTaskGroupDialogActionCreator.notifySaveCompleteSuccessfully();

                if (!taskGroup.id) {

                    // We have to remove the running document table entry before navigating
                    // Otherwise, there will a prompt because the editor is not updated, so it remains dirty
                    if (rdtEntry) {
                        getRunningDocumentsTable().remove(rdtEntry);
                    }

                    navigateToTaskGroupEditor(savedTaskGroup.id);
                }

                this._taskGroupHistoryActionCreator.fetchTaskGroupRevisions(savedTaskGroup.id);

                this._taskGroupVersionsActionCreator.updateTaskGroup(savedTaskGroup, false);
            },
            (error) => {
                if (!taskGroup.id) {
                    // Import case. Dialog won't be shown
                    this._taskGroupTasksTabActionCreator.updateErrorMessage(error);
                }
                else {
                    saveTaskGroupDialogActionCreator.notifySaveCompleteWithError(error);
                }
            });
    }

    // TODO - Revisit the design once, and think if this is the best set of parameters
    // Other options may be updating the store to make it not dirty, before navigating (but that is useless script processing)
    public saveTaskGroupAsDraft(taskGroup: DTContracts.TaskGroup, rdtEntry?: RunningDocumentsTableEntry): void {
        TaskGroupSource.instance().addTaskGroup(taskGroup)
            .then((savedTaskGroup: DTContracts.TaskGroup) => {
                TaskGroupTelemetry.saveTaskGroupAsDraftSucceeded();

                // We have to remove the running document table entry before navigating
                // Otherwise, there will a prompt because the editor is not updated, so it remains dirty
                if (rdtEntry) {
                    getRunningDocumentsTable().remove(rdtEntry);
                }

                navigateToTaskGroupEditor(savedTaskGroup.id);
            },
            (error) => {
                TaskGroupTelemetry.saveTaskGroupAsDraftFailed();
                this._taskGroupTasksTabActionCreator.updateErrorMessage(error);
            });
    }

    public publishDraftTaskGroup(taskGroup: DTContracts.TaskGroup, comment: string, isPreview: boolean): void {
        const publishDraftTaskGroupDialogActionCreator = ActionCreatorManager.GetActionCreator<PublishDraftTaskGroupDialogActionCreator>(PublishDraftTaskGroupDialogActionCreator);

        publishDraftTaskGroupDialogActionCreator.notifyPublishStarted();

        TaskGroupSource.instance().publishDraftTaskGroup(taskGroup, comment, isPreview)
            .then((taskGroups: DTContracts.TaskGroup[]) => {
                TaskGroupTelemetry.publishDraftSucceeded(isPreview);
                publishDraftTaskGroupDialogActionCreator.notifyPublishCompleteSuccessfully();
                navigateToTaskGroupEditor(taskGroups[0].id); // All returned task groups have the same id
            },
            (error) => {
                TaskGroupTelemetry.publishDraftFailed(isPreview);
                publishDraftTaskGroupDialogActionCreator.notifyPublishCompleteWithError(error);
            });
    }

    public publishPreviewTaskGroup(taskGroup: DTContracts.TaskGroup, comment: string, disablePriorVersions: boolean): void {
        const saveTaskGroupDialogActionCreator = ActionCreatorManager.GetActionCreator<SaveTaskGroupDialogActionCreator>(SaveTaskGroupDialogActionCreator);

        saveTaskGroupDialogActionCreator.notifySaveStarted();

        TaskGroupSource.instance().publishPreviewTaskGroup(taskGroup, comment, disablePriorVersions)
            .then((taskGroups: DTContracts.TaskGroup[]) => {
                saveTaskGroupDialogActionCreator.notifySaveCompleteSuccessfully();
                TaskGroupTelemetry.publishTaskGroupPreviewSucceeded();
                this._invokeActionsWithFetchedTaskGroups(taskGroups);

                this._taskGroupHistoryActionCreator.fetchTaskGroupRevisions(taskGroups[0].id);

            },
            (error) => {
                saveTaskGroupDialogActionCreator.notifySaveCompleteWithError(error);
            });
    }

    private _fetchTaskGroup(taskGroupId: string, forceUpdate: boolean): void {
        const getTaskDefinitionsPromise = TaskGroupSource.instance().getTaskDefinitions(taskGroupId, forceUpdate);
        const getAllTaskGroupVersionsPromise = TaskGroupSource.instance().getAllVersionsOfTaskGroup(taskGroupId, false, forceUpdate);

        Q.all(
            [
                getTaskDefinitionsPromise,
                getAllTaskGroupVersionsPromise
            ])
            .spread((taskDefinitions: DTContracts.TaskDefinition[], taskGroups: DTContracts.TaskGroup[]) => {

                if (!!taskGroups && taskGroups.length > 0) {
                    this._invokeActionsWithFetchedTaskGroups(taskGroups);
                }
                else {
                    const error = localeFormat(Resources.TaskGroupWithIdNotFound, taskGroupId);
                    this._taskGroupTasksTabActionCreator.updateErrorMessage(error);
                }
            },
            (error) => {
                // Displaying this error in the tasks tab, as this data is used for the most part in there
                this._taskGroupTasksTabActionCreator.updateErrorMessage(error);
            });
    }

    private _invokeActionsWithFetchedTaskGroups(taskGroups: DTContracts.TaskGroup[]): void {
        const latestVersion = getLatestVersion(taskGroups) as DTContracts.TaskGroup;

        this._taskGroupVersionsActionCreator.updateVersionsList(taskGroups);
        this._taskGroupVersionsActionCreator.updateSelectedVersion(latestVersion);
    }

    private _taskGroupTasksTabActionCreator: TasksTabActionCreator;
    private _taskGroupHistoryActionCreator: TaskGroupHistoryActionCreator;
    private _taskGroupReferencesActionCreator: TaskGroupReferencesActionCreator;
    private _taskGroupVersionsActionCreator: TaskGroupVersionsActionCreator;
    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
}