import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import * as KeyboardShortcuts from "VSS/Controls/KeyboardShortcuts";

import { Boards } from "Agile/Scripts/Resources/TFS.Resources.BoardsHub.BoardDirectory";
import {
    KeyboardShortcutDescription_FilterResults
} from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export interface IHubDirectoryFilterShortcutActions {
    filterResultsAction: (e: KeyboardShortcuts.IEKeyboardEvent, combo: string) => void;
}

namespace HubDirectoryFilterShortcutCombos {
    export const FilterResults: string = "mod+shift+f";
}

/**
 * Shortcut group for a directory view in an Agile hub.
 */
export class HubDirectoryFilterShortcutGroup extends ShortcutGroupDefinition {

    private _shortcutsData: IDictionaryStringTo<KeyboardShortcuts.IShortcutOptions>;

    constructor(actions: IHubDirectoryFilterShortcutActions) {
        super(Boards);

        this._initializeData(actions);
        this._unregisterAllShortcuts();
        this._registerAllShortcuts();
    }

    public dispose() {
        this._unregisterAllShortcuts();
    }

    private _initializeData(actions: IHubDirectoryFilterShortcutActions): void {
        this._shortcutsData = {};

        //  Shortcuts supported by the Agile Directory pages are:
        this._shortcutsData[HubDirectoryFilterShortcutCombos.FilterResults] = {
            action: actions.filterResultsAction,
            description: KeyboardShortcutDescription_FilterResults
        };
    }

    private _unregisterAllShortcuts(): void {

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
