import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import Navigation = require("VSS/Controls/Navigation");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { IVssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";

/**
 * Defines the shortcuts for the Work area
 */
export class WorkShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    constructor(hideToggleFullScreen?: boolean) {
        super(WorkItemTrackingResources.KeyboardShortcutGroup_Work);

        this.registerPageNavigationShortcut(
            KeyboardShortcuts.OpenBacklog,
            {
                description: WorkItemTrackingResources.KeyboardShortcutDescription_OpenBacklog,
                action: () => {
                    this._navigateToBacklog();
                }
            }, TfsCommon_Shortcuts.ShortcutVisibility.Member);

        this.registerPageNavigationShortcut(
            KeyboardShortcuts.OpenBoard,
            {
                description: PresentationResources.KeyboardShortcutDescription_OpenBoard,
                action: () => {
                    this._navigateToBoard();
                }
            }, TfsCommon_Shortcuts.ShortcutVisibility.Member);

        this.registerPageNavigationShortcut(
            KeyboardShortcuts.OpenCurrentIteration,
            {
                description: WorkItemTrackingResources.KeyboardShortcutDescription_OpenCurrentIteration,
                action: () => {
                    this._navigateToIteration();
                }
            }, TfsCommon_Shortcuts.ShortcutVisibility.Member);

        this.registerPageNavigationShortcut(
            KeyboardShortcuts.OpenTaskboard,
            {
                description: WorkItemTrackingResources.KeyboardShortcutDescription_OpenTaskBoard,
                action: () => this.navigateToAction("taskboard", "backlogs")
            }, TfsCommon_Shortcuts.ShortcutVisibility.Member);

        this.registerPageNavigationShortcut(
            KeyboardShortcuts.OpenQueries,
            {
                description: PresentationResources.KeyboardShortcutDescription_OpenQueries,
                action: () => this.navigateToAction("", "queries")
            }, TfsCommon_Shortcuts.ShortcutVisibility.Member);

        if (!hideToggleFullScreen) {
            this.registerShortcut(
                KeyboardShortcuts.ToggleFullScreen,
                {
                    description: WorkItemTrackingResources.KeyboardShortcutDescription_ToggleFullScreen,
                    action: () => this._toggleFullScreen()
                });
        }
    }

    /**
     * Called when the user presses the "Open Sprints" hotkey
     */
    protected _navigateToIteration(){
        this.navigateToAction("iteration", "backlogs");
    }

    /**
     * Called when the user presses "z" shortcut to toggle full screen
     */
    protected _toggleFullScreen() {
        Navigation.FullScreenHelper.setFullScreen(!Navigation.FullScreenHelper.getFullScreen())
    }

    /**
     * Called when the user presses the "Navigate to Backlog" hotkey
     */
    protected _navigateToBacklog() {
        this.navigateToAction("backlog", "backlogs");
    }

    /**
     * Called when the user presses the "Navigate to Board" hotkey
     */
    protected _navigateToBoard() {
        this.navigateToAction("board", "backlogs");
    }
}


/**
 * Work Shortcut group class to be used by hubs which uses New hub pattern
 */
export class WorkHubShortcutGroup extends WorkShortcutGroup {
    constructor(private viewState: IVssHubViewState) {
        super();
    }

    protected _toggleFullScreen() {
        const isFullScreen = this.viewState.viewOptions.getViewOption(HubViewOptionKeys.fullScreen);
        this.viewState.viewOptions.setViewOption(HubViewOptionKeys.fullScreen, !isFullScreen);
    }
}

/**
 * Keyboard shortcuts supported in this area.
 */
export namespace KeyboardShortcuts {
    export const OpenBacklog: string = "l";
    export const OpenBoard: string = "b";
    export const OpenCurrentIteration: string = "i";
    export const OpenTaskboard: string = "t";
    export const OpenQueries: string = "q";
    export const ToggleFullScreen: string = "z";
}