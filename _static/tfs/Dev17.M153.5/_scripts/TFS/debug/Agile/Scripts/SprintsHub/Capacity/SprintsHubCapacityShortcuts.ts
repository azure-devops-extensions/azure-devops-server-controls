import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import * as KeyboardShortcuts from "VSS/Controls/KeyboardShortcuts";
import { CapacityPivot } from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import * as CapacityPivotResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.CapacityPivot";

export interface SprintsHubCapacityShortcutActions {
    saveAction: (e: KeyboardShortcuts.IEKeyboardEvent, combo: string) => void;
    undoAction: (e: KeyboardShortcuts.IEKeyboardEvent, combo: string) => void;
}

namespace SprintsHubCapacityShortcutCombos {
    export const SaveKey: string = "ctrl+s";
    export const UndoKey: string = "ctrl+z";
}

export class CapacityShortcut extends ShortcutGroupDefinition {

    private _shortcutsData: IDictionaryStringTo<KeyboardShortcuts.IShortcutOptions>

    constructor(actions: SprintsHubCapacityShortcutActions) {
        super(CapacityPivot);

        this._initializeData(actions);
        this.unregisterAllShortcuts();
        this._registerAllShortcuts();
    }

    private _initializeData(actions: SprintsHubCapacityShortcutActions): void {
        this._shortcutsData = {};

        //  Shortcuts supported by the Agile Directory pages are:
        this._shortcutsData[SprintsHubCapacityShortcutCombos.SaveKey] = {
            action: actions.saveAction,
            description: CapacityPivotResources.Save,
            globalCombos: [SprintsHubCapacityShortcutCombos.SaveKey]
        };

        this._shortcutsData[SprintsHubCapacityShortcutCombos.UndoKey] = {
            action: actions.undoAction,
            description: CapacityPivotResources.Undo,
            globalCombos: [SprintsHubCapacityShortcutCombos.UndoKey]
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