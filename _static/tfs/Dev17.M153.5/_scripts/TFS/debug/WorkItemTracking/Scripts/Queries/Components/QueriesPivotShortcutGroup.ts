import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import {
    KeyboardShortcutGroup_Queries,
    KeyboardShortcutDescription_NewQuery,
    KeyboardShortcutDescription_ToggleFullScreen,
    KeyboardShortcutDescription_FilterResults
} from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

export class QueriesPivotShortcutGroup extends ShortcutGroupDefinition {
    constructor(
        onNewQuery: () => void,
        focusFilterResults: () => void) {
        super(KeyboardShortcutGroup_Queries);

        this.registerShortcut(
            "c q",
            {
                description: KeyboardShortcutDescription_NewQuery,
                action: () => onNewQuery()
            });

        this.registerShortcut(
            "mod+shift+f",
            {
                description: KeyboardShortcutDescription_FilterResults,
                action: () => focusFilterResults()

            });
    }
}
