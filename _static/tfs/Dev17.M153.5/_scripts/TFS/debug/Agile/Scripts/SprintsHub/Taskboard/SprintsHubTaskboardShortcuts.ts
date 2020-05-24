import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import * as KeyboardShortcuts from "VSS/Controls/KeyboardShortcuts";
import { TaskboardPivot } from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import { KeyboardShortcutkeyDescription_AddNewItem } from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export interface SprintsHubTaskboardShortcutActions {
    newItem: (e: KeyboardShortcuts.IEKeyboardEvent, combo: string) => void;
    activateFilter: (e: KeyboardShortcuts.IEKeyboardEvent, combo: string) => void;
}

namespace SprintsHubTaskboardShortcutCombos {
    export const newItem: string = "n";
    export const activateFilter: string = "mod+shift+f";
}

export class TaskboardShortcut extends ShortcutGroupDefinition {

    private _shortcutsData: IDictionaryStringTo<KeyboardShortcuts.IShortcutOptions>

    constructor(actions: SprintsHubTaskboardShortcutActions) {
        super(TaskboardPivot);

        this._initializeData(actions);
        this.unregisterAllShortcuts();
        this._registerAllShortcuts();
    }

    private _initializeData(actions: SprintsHubTaskboardShortcutActions): void {
        this._shortcutsData = {};

        this._shortcutsData[SprintsHubTaskboardShortcutCombos.newItem] = {
            action: actions.newItem,
            description: KeyboardShortcutkeyDescription_AddNewItem
        };

        this._shortcutsData[SprintsHubTaskboardShortcutCombos.activateFilter] = {
            action: actions.activateFilter,
            description: WITResources.KeyboardShortcutDescription_FilterResults
        };

    }

    public unregisterAllShortcuts(): void {

        Object.keys(this._shortcutsData).forEach((combo: string) => {
            this.unRegisterShortcut(combo);
        });
    }

    private _registerAllShortcuts(): void {

        Object.keys(this._shortcutsData).forEach((combo: string) => {
            this.registerShortcut(combo, this._shortcutsData[combo]);
        });
    }
}