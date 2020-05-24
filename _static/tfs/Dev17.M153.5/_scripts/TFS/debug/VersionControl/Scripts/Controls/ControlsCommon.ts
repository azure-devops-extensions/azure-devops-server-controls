import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import Navigation_Services = require("VSS/Navigation/Services");

export namespace VersionControlActionIds {
    export const Commits = "commits";
    export const CommitsRemoved = "commitsremoved";
    export const Contents = "contents";
    export const Compare = "compare";
    export const Default = "";
    export const History = "history";
    export const Summary = "summary";
    export const Updates = "updates";
    export const DiffParent = "diffparent";   // Prefix for a diff with a Git merge commit parent (Example: diffparent2)
    export const Annotate = "annotate";
    export const Readme = "readme";
    export const Preview = "preview";
    export const HighlightChanges = "diffedit";

    const explorerFileActionIds = [Contents, History, Compare, Annotate, Preview];
    const explorerFolderActionIds = [Contents, History, Readme];

    export function explorerSupports(versionControlActionId: string, isFolder: boolean): boolean {
        const validActionIds = isFolder ? explorerFolderActionIds : explorerFileActionIds;
        return validActionIds.indexOf(versionControlActionId) >= 0;
    }

    export function supportsFolders(versionControlActionId: string): boolean {
        return versionControlActionId !== VersionControlActionIds.Compare &&
            versionControlActionId !== VersionControlActionIds.Annotate;
    }

    export function isDiffParentActionId(action: string) {
        return action.toLowerCase().indexOf(DiffParent) === 0;
    }

    export function isCompareAction(action: string): boolean {
        return action === VersionControlActionIds.HighlightChanges ||
            action === VersionControlActionIds.Compare;
    }
}

export namespace VersionControlExtensionEndPoints {
    export let FILE_VIEWER = "tfs.source-control.file-viewer";
    export let DIFF_VIEWER = "tfs.source-control.diff-viewer";
    export let VIEWER_CONFIGURER = "tfs.source-control.viewer-configurer";
}

export namespace VersionControlExtensionActionIds {
    export let GET_FILE_CONTENT = "vc-get-content";
    export let NEXT_DIFFERENCE = "vc-next-diff";
    export let PREVIOUS_DIFFERENCE = "vc-prev-diff";
    export let NAVIGATE_TO_POSITION = "vc-navigate-to-position";
    export let UPDATE_DIFF_STATUS = "vc-update-diff-status";
    export let UPDATE_DIFF_LINES = "vc-update-diff-lines";
    export let GET_EDITOR_CONTENT = "vc-get-editor-content";
    export let RESET_EDITOR_DIFF_CONTENT = "vc-reset-editor-diff-content";
    export let EDITOR_CONTENT_CHANGED = "vc-editor-content-changed";
    export let EDITOR_DIRTY_STATE_CHANGED = "vc-editor-dirty-state-changed";
    export let GET_SCROLL_POSITION = "vc-editor-get-scroll-position";
    export let SET_SCROLL_POSITION = "vc-editor-set-scroll-position";
    export let SCROLL_POSITION_CHANGED = "vc-editor-scroll-position-changed";
    export let GET_SELECTION = "vc-editor-get-selection";
    export let SELECTION_CHANGED = "vc-editor-selection-changed";
    export let REFRESH_LAYOUT = "vc-editor-refresh-layout";
    export let DISCUSSION_THREAD_UPDATED = "vc-discussion-thread-updated";
    export let EDITOR_KEY_PRESSED = "vc-editor-key-pressed";
    export let EDITOR_CONTEXT_MENU_ITEM_CLICKED = "vc-editor-context-menu-item-clicked";
    export let EDITOR_ADD_CONTEXT_MENU_ITEM = "vc-editor-add-context-menu-item";
    export let EDITOR_CREATED = "vc-editor-created";
    export let EDITOR_ESCAPE_EDIT = "vc-editor-escape-edit";
    export let EDITOR_PREFERENCES_CHANGED = "vc-editor-preferences-changed";
}

export namespace ConfigurerExtensionActionIds {
    export let UPDATE_EDITOR_CONFIG = "vc-configurer-update-editor-config";
}

export namespace DiscussionExtensionActionIds {
    export let CREATE_THREAD = "discussion-create-thread";
    export let CREATE_COMMENT = "discussion-create-comment";
    export let UPDATE_COMMENT = "discussion-update-comment";
    export let SAVE_COMMENT = "discussion-save-comment";
    export let DELETE_COMMENT = "discussion-delete-comment";
    export let SET_SELECTED_THREAD = "discussion-thread-selected";
    export let CREATE_WORK_ITEM = "discussion-create-work-item";
    export let GET_WORK_ITEM_TYPES = "discussion-get-work-item-types";
    export let UPDATE_DISCUSSION = "discussion-update-discussion";
}

export function getFragmentAction(action: string, path: string, version: string, extra?: any) {
    /// <summary>Get a fragment url for the given action, path, and version information</summary>
    /// <param name="extra" type="any" optional="true" />

    let actionParams: any = {};
    let historySvc = Navigation_Services.getHistoryService();
    let currentState = historySvc.getCurrentState();
    if (currentState) {

        // Keep existing change-scope context parameters
        if (currentState.ss) {
            actionParams.ss = currentState.ss;
        }
        else if (currentState.cs) {
            actionParams.cs = currentState.cs;
        }
        else if (currentState.commitId) {
            actionParams.commitId = currentState.commitId;
        }

        if (currentState.repository) {
            actionParams.repository = currentState.repository;
        }

        if (currentState.fullScreen) {
            actionParams.fullScreen = currentState.fullScreen;
        }
    }

    if (typeof path !== "undefined" && path !== null) {
        actionParams.path = path;
    }

    if (typeof version !== "undefined" && version !== null) {
        actionParams.version = version;
    }

    if (extra) {
        actionParams = $.extend(actionParams, extra);
    }

    return historySvc.getFragmentActionLink(action, actionParams);
}

/**
* Branch creation parameters collected from the user and returned in the CreateBranchDialog result
*/
export interface CreateBranchParameters {
    branchName: string;
    newObjectId?: string;
    switchToBranch?: boolean;
    createPullRequest?: boolean;
    repositoryContext?: GitRepositoryContext;
    workItemIdsToLink?: number[];
    error?: Error;
}

/**
*Check project information for the tfsContext.
*
* @param tfsContext TfsContext to check whether contains project information
*/
export function hasProjectContext(tfsContext: TFS_Host_TfsContext.TfsContext): boolean {

    let hasProjectContext: boolean = true;

    if (tfsContext && tfsContext.navigation) {
        hasProjectContext = !!tfsContext.navigation.project;
    }
    else {
        hasProjectContext = false;
    }

    return hasProjectContext;
}
