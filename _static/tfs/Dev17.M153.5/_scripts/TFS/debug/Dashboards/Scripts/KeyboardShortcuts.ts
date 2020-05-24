import {ShortcutGroupDefinition} from "TfsCommon/Scripts/KeyboardShortcuts";
import {
    Dashboards_Title,
    MoveWidgetDown,
    MoveWidgetLeft,
    MoveWidgetRight,
    MoveWidgetUp
} from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";

export class KeyboardShortcuts extends ShortcutGroupDefinition {
    constructor() {
        super(Dashboards_Title);

        this.registerDashboardShortcut("mod+up", MoveWidgetUp);
        this.registerDashboardShortcut("mod+down", MoveWidgetDown);
        this.registerDashboardShortcut("mod+left", MoveWidgetLeft);
        this.registerDashboardShortcut("mod+right", MoveWidgetRight);
    }

    private registerDashboardShortcut(combo: string, description: string) {
        this.registerShortcut(
            combo,
            {
                description: description,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in WidgetEditOverlayControl class
                }
            });
    }

    public dispose() {
        this.removeShortcutGroup();
    }
}
