import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import * as Resources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { EditPageContainer } from "Wiki/Scenarios/Overview/Components/EditPageContainer";
import { OverviewModule } from "Wiki/Scenarios/Overview/Components/OverviewModule";
import { OverviewContainer } from "Wiki/Scenarios/Overview/Components/OverviewContainer";

export enum ShortcutCode {
    /* create sub page, edit page, filter page, new page and PrintPage shortcuts implemented in OverviewContainer */
    CreateSubPage,
    EditPage,
    FilterPages,
    NewPage,
    PrintPage,
    /*  Esc, Save, Save and close shortcut implemented in EditPageContainer */
    Esc,
    Save,
    SaveAndClose,
}

export interface ShortcutListener {
    onShortcutPressed: (shortcut: ShortcutCode) => void;
}

export class WikiHubShortcutGroup extends ShortcutGroupDefinition {

    constructor() {
        const preserveState = false;
        super(Resources.WikiHubKeyboardShortcutGroup, preserveState);
    }

    public dispose() {
        this.removeShortcutGroup();
    }

    public registerWikiShortcuts(onShortcutPressed: (shortcut: ShortcutCode) => void): void {
        this.registerShortcut(
            "n",
            {
                description: Resources.KeyboardShortcutDescription_NewPage,
                action: () => onShortcutPressed(ShortcutCode.NewPage),
            });
        this.registerShortcut(
            "e",
            {
                description: Resources.KeyboardShortcutDescription_EditPage,
                action: () => onShortcutPressed(ShortcutCode.EditPage),
            });
        this.registerShortcut(
            "c",
            {
                description: Resources.KeyboardShortcutDescription_CreateNewSubpage,
                action: () => onShortcutPressed(ShortcutCode.CreateSubPage),
            });
        this.registerShortcut(
            "mod+up",
            {
                description: Resources.KeyboardShortcutDescription_MovePageUp,
                action: () => true,
            });
        this.registerShortcut(
            "mod+down",
            {
                description: Resources.KeyboardShortcutDescription_MovePageDown,
                action: () => true,
            });
        this.registerShortcut(
            "mod+p",
            {
                description: Resources.KeyboardShortcutDescription_PrintPage,
                action: () => onShortcutPressed(ShortcutCode.PrintPage),
            });
        this.registerShortcut(
            "mod+shift+f",
            {
                description: Resources.KeyboardShortcutDescription_FilterPage,
                action: () => onShortcutPressed(ShortcutCode.FilterPages),
            });
    }
}

export class WikiEditModeShortcutGroup extends ShortcutGroupDefinition {

    constructor() {
        const preserveState = false;
        super(Resources.WikiEditModeKeyboardShortcutGroup, preserveState);
    }

    public dispose() {
        this.removeShortcutGroup();
    }

    public registerWikiShortcuts(onShortcutPressed, element: Element): void {
        this.registerShortcut(
            "mod+s",
            {
                description: Resources.KeyboardShortcutDescription_QuickSave,
                action: () => onShortcutPressed(ShortcutCode.Save),
                globalCombos: ["mod+s"],
                element: element,
            });
        this.registerShortcut(
            "mod+enter",
            {
                description: Resources.KeyboardShortcutDescription_SaveAndClose,
                action: () => onShortcutPressed(ShortcutCode.SaveAndClose),
                globalCombos: ["mod+enter"],
                element: element,
            });
        this.registerShortcut(
            "esc",
            {
                description: Resources.KeyboardShortcutDescription_Close,
                action: () => onShortcutPressed(ShortcutCode.Esc),
                globalCombos: ["esc"],
                element: element,
            });
    }
}
