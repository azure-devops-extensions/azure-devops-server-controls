import { CapacityView } from "Agile/Scripts/Capacity/CapacityView";
import Capacity_ViewModels = require("Agile/Scripts/Capacity/CapacityViewModels");
import SprintPlanningResources = require("Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning");
import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");

export class CapacityShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {
    constructor(protected _capacity: Capacity_ViewModels.TeamCapacityViewModel, protected _view: CapacityView) {
        super(SprintPlanningResources.KeyboardShortcutGroup_Capacity);

        this.registerShortcut(
            "ctrl+s",
            {
                action: () => {
                    if (this._view.isSaveEnabled()) {
                        this._capacity.beginSave();
                    }
                },
                description: SprintPlanningResources.KeyboardShortcutDescription_Save_Capacity,
                element: document.body
            });

        this.registerShortcut(
            "ctrl+z",
            {
                action: () => {
                    if (this._view.isUndoEnabled()) {
                        this._capacity.undo();
                    }
                },
                description: SprintPlanningResources.KeyboardShortcutDescription_Undo_Capacity,
            });
    }
}