import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import {
    KeyboardShortcutGroup_Queries,
    KeyboardShortcutDescription_NewQuery,
    KeyboardShortcutDescription_RefreshQuery,
    KeyboardShortcutDescription_ReturnToQuery,
    KeyboardShortcutDescription_Next_Item,
    KeyboardShortcutDescription_Previous_Item,
    KeyboardShortcutDescription_ToggleFullScreen
} from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { TriageViewPivotsKey } from "WorkItemTracking/Scripts/Queries/Models/Constants";

export class QueriesShortcutGroup extends ShortcutGroupDefinition {
    constructor(private context: IQueriesHubContext, private currentQueryId: string,
        navigateNext: () => void,
        navigatePrev: () => void,
        goBackToQuery: () => void) {
        super(KeyboardShortcutGroup_Queries);

        this.registerShortcut(
            "c q",
            {
                description: KeyboardShortcutDescription_NewQuery,
                action: () => this.context.navigationActionsCreator.navigateToNewQuery(true)
            });

        this.registerShortcuts(
            ["r", "alt+r"],
            {
                description: KeyboardShortcutDescription_RefreshQuery,
                action: () => {
                    if (this.context.queryHubViewState.selectedPivot.value === TriageViewPivotsKey.QueryResults) {
                        this.context.triageViewActionCreator.onCommandExecute("refresh-work-items");
                    } else if (this.context.queryHubViewState.selectedPivot.value === TriageViewPivotsKey.QueryEdit) {
                        this.context.triageViewActionCreator.onCommandExecute("run-query");
                    }
                },
                globalCombos: ["alt+r"]
            });

        this.registerShortcut(
            "alt+q",
            {
                description: KeyboardShortcutDescription_ReturnToQuery,
                action: () => {
                    goBackToQuery();
                },
                globalCombos: ["alt+q"]
            });

        this.registerShortcuts(
            ["j", "alt+n"],
            {
                description: KeyboardShortcutDescription_Next_Item,
                action: () => {
                    navigateNext();
                },
                globalCombos: ["alt+n"]
            });

        this.registerShortcuts(
            ["k", "alt+p"],
            {
                description: KeyboardShortcutDescription_Previous_Item,
                action: () => {
                    navigatePrev();
                },
                globalCombos: ["alt+p"]
            });
    }
}
