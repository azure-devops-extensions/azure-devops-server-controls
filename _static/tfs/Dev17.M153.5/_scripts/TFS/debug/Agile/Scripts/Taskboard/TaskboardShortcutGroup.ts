import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");

export class TaskboardShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {
    constructor() {
        super(AgileControlsResources.KeyboardShortcutkeyDescription_TaskboardGroup);
        this._registerDefaultShortcuts();
    }

    public dispose() {
        this.removeShortcutGroup();
    }

    /**
     *  Register default keyboard shortcuts to framework provided Shortcuts manager
     */
    private _registerDefaultShortcuts() {
        this.registerShortcut(
            "c",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_AddChildForItemInFocus,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                }
            });

        this.registerShortcut(
            "enter",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_OpenItemInFocus,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                },
                allowPropagation: true  // Since Enter key is used for other common shortcuts/buttons also
            });

        this.registerShortcut(
            "mod+up",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemUp,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                }
            });

        this.registerShortcut(
            "mod+down",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemDown,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                }
            });

        this.registerShortcut(
            "mod+left",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemLeft,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                }
            });

        this.registerShortcut(
            "mod+right",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemRight,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                }
            });

        this.registerShortcut(
            "mod+shift+up",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemUpRow,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in Tile class
                }
            });

        this.registerShortcut(
            "mod+shift+down",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemDownRow,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in Tile class
                }
            });

        this.registerShortcut(
            "e",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_ExpandItemInFocus,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                }
            });

        this.registerShortcut(
            "shift+pageup",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_RowUp,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                }
            });

        this.registerShortcut(
            "shift+pagedown",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_RowDown,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in TaskBoardView class
                }
            });
    }
}