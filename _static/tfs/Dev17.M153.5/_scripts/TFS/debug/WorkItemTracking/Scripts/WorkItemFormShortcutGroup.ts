import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import { WorkItemFormView } from "WorkItemTracking/Scripts/Controls/WorkItemFormView";
import CopyWorkItemLinkControl = require("WorkItemTracking/Scripts/Controls/WorkItemForm/CopyWorkItemLinkControl");
import { WorkItemFormTabsControl } from "WorkItemTracking/Scripts/Form/Tabs";
import Utils_UI = require("VSS/Utils/UI");
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export interface IWorkItemFormShortcutOptions {
    workItemFormView: WorkItemFormView;
    copyControl: CopyWorkItemLinkControl;
    tabsControl: WorkItemFormTabsControl;
    dialogOptions?: {
        maximizeToggle: () => void;
    }
}
/**
 * Defines the shortcuts for the Work Item Form View Area
 */
export class WorkItemFormShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {
    private readonly _preserveState: boolean;

    constructor(options: IWorkItemFormShortcutOptions) {
        const preserveState: boolean = !!options.dialogOptions;
        super(Resources.KeyboardShortcutGroup_WorkItemForm, preserveState);
        this._preserveState = preserveState;
        const isReadOnly: boolean = options.workItemFormView.workItem.isReadOnly();

        if (!isReadOnly) {
            this.registerShortcut(
                "alt+i",
                {
                    description: Resources.KeyboardShortcutDescription_AssignToMe,
                    action: () => options.workItemFormView.assignItemToCurrentIdentity(),
                    globalCombos: ["alt+i"]
                });
        }

        this.registerShortcut(
            "mod+shift+d",
            {
                description: Resources.KeyboardShortcutDescription_Discussion,
                action: () => options.workItemFormView.navigateToAndFocusOnDiscussion(),
                globalCombos: ["mod+shift+d"]
            });

        if (!isReadOnly) {
            // Dummy Mod+s behavior is defined through JQuery event in the Workitemformview
            this.registerShortcut(
                "mod+s",
                {
                    description: Resources.KeyboardShortcutDescription_Save,
                    action: () => true
                });
        }

        this.registerShortcut(
            "shift+alt+c",
            {
                description: Resources.KeyboardShortcutDescription_CopyWorkItemTitle,
                action: () => options.copyControl.copyWorkItemLink(),
                globalCombos: ["shift+alt+c"]
            });

        // If you change the shortcut to any other character, make sure it is correctly handled in rich editor _buildSyntheticKeyboardEvent
        // currently it is hardcoded in richeditor
        this.registerShortcut(
            "mod+shift+,",
            {
                description: Resources.KeyboardShortcutDescription_LeftTab,
                action: () => options.tabsControl.navigateTabs(Resources.KeyboardShortcutDescription_LeftTab),
                globalCombos: ["mod+shift+,"]
            });

        this.registerShortcut(
            "mod+shift+.",
            {
                description: Resources.KeyboardShortcutDescription_RightTab,
                action: () => options.tabsControl.navigateTabs(Resources.KeyboardShortcutDescription_RightTab),
                globalCombos: ["mod+shift+."]
            });

        if (options.dialogOptions) {
            this.registerShortcut(
                "z",
                {
                    description: Resources.KeyboardShortcutDescription_ToggleFullScreen,
                    action: () => options.dialogOptions.maximizeToggle()
                },
                true);

            if (!isReadOnly) {
                // Dummy handler for WorktItemFormView mod+enter event to save and close
                this.registerShortcut(
                    "mod+enter",
                    {
                        description: Resources.KeyboardShortcutDescription_SaveAndClose,
                        action: () => true
                    });
            }
        }

    }
}

export namespace KeyboardShortcuts {
    export const AltShortcuts: number[] = [Utils_UI.KeyCode.I];
    export const CtrlShortcuts: number[] = [Utils_UI.KeyCode.D, Utils_UI.KeyCode.S];
}
