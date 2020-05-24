import { KeyboardShortcutDescription_FilterResults } from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import TriageView = require("WorkItemTracking/Scripts/Controls/TriageView");

export class FilterShortcutGroup extends ShortcutGroupDefinition {

    private static SHORTCUT_KEY = "mod+shift+f";

    constructor(groupName: string, private _triageView: TriageView) {
        super(groupName);

        this.registerShortcut(
            FilterShortcutGroup.SHORTCUT_KEY,
            {
                description: KeyboardShortcutDescription_FilterResults,
                action: () => {
                    this._triageView.activateFilter();
                },
                globalCombos: [FilterShortcutGroup.SHORTCUT_KEY]
            }
        );
    }

    dispose() {
        this.unRegisterShortcut(FilterShortcutGroup.SHORTCUT_KEY);
        this._triageView = null;
    }
}