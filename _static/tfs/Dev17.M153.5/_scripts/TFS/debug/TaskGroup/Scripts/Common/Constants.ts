export namespace TaskGroupReferencesStoreKeys {
    export const TaskGroupReferencesStoreKey = "STORE_KEY_TG_REFERENCES_STORE";
}

export namespace TaskGroupReferencesActionKeys {
    export const TaskGroupReferencesActionHub = "ACTION_HUB_KEY_TASK_GROUP_REFERENCES_ACTION_HUB";
}

export namespace TaskGroupReferencesActionCreatorKeys {
    export const TaskGroupReferenceActionCreator = "ACTION_CREATOR_KEY_TASK_GROUP_REFERENCES_ACTION_CREATOR";
}

export namespace DialogActionKeys {
    export const DeleteTaskGroupDialogActionHub = "ACTION_HUB_KEY_DELETE_TG_DIALOG_ACTION_HUB";
    export const SaveTaskGroupDialogActionHub = "ACTION_HUB_KEY_SAVE_TG_DIALOG_ACTION_HUB";
    export const PublishDraftTaskGroupDialogActionHub = "ACTION_HUB_KEY_PUBLISH_DRAFT_TG_DIALOG_ACTION_HUB";
}

export namespace DialogActionCreatorKeys {
    export const DeleteTaskGroupDialogActionCreator = "ACTION_CREATOR_KEY_DELETE_TG_DIALOG_ACTION_CREATOR";
    export const SaveTaskGroupDialogActionCreator = "ACTION_CREATOR_KEY_SAVE_TG_DIALOG_ACTION_CREATOR";
    export const PublishDraftTaskGroupDialogActionCreator = "ACTION_CREATOR_KEY_PUBLISH_DRAFT_TG_DIALOG_ACTION_CREATOR";
}

export namespace DialogStoreKeys {
    export const DeleteTaskGroupDialogStore = "STORE_KEY_DELETE_TG_DIALOG_STORE";
    export const SaveTaskGroupDialogStore = "STORE_KEY_SAVE_TG_DIALOG_STORE";
    export const PublishDraftTaskGroupDialogStore = "STORE_KEY_PUBLISH_DRAFT_TG_DIALOG_STORE";
}

export namespace MessageBarKeys {
    export const DeleteTaskGroupDialog = "delete-tg-message-bar-key";
    export const SavePublishPreviewTaskGroupDialog = "save-publish-preview-tg-message-bar-key";
    export const PublishDraftTaskGroupDialog = "publish-draft-tg-message-bar-key";
}

export namespace DeleteTaskGroupDialogItemKeys {
    export const ReferencesListColumnKey = "delete-tg-dialog-references-list-column-key";
}

export namespace TaskVisibilityFilter {
    export const Build = "Build";
    export const Release = "Release";
}

export namespace SessionStorageKeys {
    export const ImportTaskGroupStorageSessionKey = "ms.vss.distributed-task.imported-task-group";
}

export namespace ContributionIds {
    export const OldTaskGroupHub = "ms.vss-releaseManagement-web.hub-metatask";
    export const TaskGroupHub = "ms.vss-distributed-task.hub-task-groups";
    export const SecurityControl = "ms.vss-admin-web.security-control";
    export const SecurityService = "ms.vss-web.dialog-service";
    export const TaskGroupReferencesType = "ms.vss-distributed-task.task-group-references";
    export const TaskGroupReferencesTarget = "ms.vss-distributed-task.task-group-references-data";
    export const TaskGroupContributionIdentifierKey = "ms.vss-taskgroup.tg-templates";
    export const TaskGroupSystemVariablesTarget = "ms.vss-distributed-task.task-group-system-variables";
}

export namespace TaskGroupsHubDataProviderKeys {
    export const TaskGroupsHubDataProviderId: string = "ms.vss-distributed-task.task-groups-list-hub-data-provider";
    export const TaskGroupEditorHubDataProviderId: string = "ms.vss-distributed-task.task-group-edit-hub-data-provider";
}

export namespace TaskGroupEditorPivotKeys {
    export const TasksPivotItemKey = "tasks";
    export const HistoryPivotItemKey = "history";
    export const ReferencesPivotItemKey = "references";
}

export namespace SpecialCharacters {
    export const CommaSeperator = ", ";
    export const Asterisk = "*";
}