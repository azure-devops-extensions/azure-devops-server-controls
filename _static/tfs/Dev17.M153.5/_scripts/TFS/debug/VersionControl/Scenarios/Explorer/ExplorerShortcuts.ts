import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

/**
 * Explorer shortcuts for both Git and TFVC.
 */
export class ExplorerShortcutGroup extends ShortcutGroupDefinition {
    constructor(actionCreator: ActionCreator) {
        super(VCResources.KeyboardShortcutGroup_Explorer);

        this.registerShortcut("1", {
            description: VCResources.Contents,
            action: () => actionCreator.changeTab(VersionControlActionIds.Contents),
        });
        this.registerShortcut("2", {
            description: VCResources.History,
            action: () => actionCreator.changeTab(VersionControlActionIds.History),
        });
        this.registerShortcut("t", {
            description: VCResources.ChangesetListPath,
            action: actionCreator.startPathEditing,
        });
    }
}

/**
 * Explorer shortcuts for Git repositories.
 */
export class GitExplorerShortcutGroup extends ExplorerShortcutGroup {
    constructor(actionCreator: ActionCreator) {
        super(actionCreator);

        this.registerShortcut("w", {
            description: VCResources.KeyboardShortcutDescription_SelectBranch,
            action: actionCreator.openBranchSelector,
        });

        this.registerShortcut("y", {
            description: VCResources.KeyboardShortcutDescription_SwitchToCommit,
            action: () => actionCreator.goToRealCommit("keyboard-shortcut-switch-to-commit"),
        });

        this.registerShortcut("c b", {
            description: VCResources.KeyboardShortcutDescription_CreateBranch,
            action: () => actionCreator.promptCreateBranch(),
        });
    }
}
