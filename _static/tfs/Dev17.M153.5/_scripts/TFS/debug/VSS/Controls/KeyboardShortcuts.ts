/// <reference types="mousetrap" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!widget' />

/// Imports of 3rd Party ///
import React = require("react");
import Mousetrap = require("mousetrap");
import VSS = require("VSS/VSS");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Telemetry = require("VSS/Telemetry/Services");
import Events_Services = require("VSS/Events/Services");
import { BrowserCheckUtils } from "VSS/Utils/UI";
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import { registerLWPComponent } from "VSS/LWP";

import Dialogs_NO_REQUIRE = require("VSS/Controls/Dialogs");
import LWP = require("VSS/LWP");

/**
 * Constants for well known shortcut keys.
 *
 * Example combo would be ShortcutKeys.ALT + "+q";
 */
export namespace ShortcutKeys {
    export var ALT = "alt";
    export var CONTROL = "ctrl";
    export var SHIFT = "shift";
}

/**
 * NOTICE:
 * This interface is equivalent to mousetrap's ExtendedKeyboardEvent, but
 * we duplicate it to avoid adding an extra dependency on @types/mousetrap
 * for consumers of the vss sdk.
 */
export interface IEKeyboardEvent extends KeyboardEvent {
    returnValue: boolean;
}
export type KeyboardAction = (e: IEKeyboardEvent, combo: string) => void;

export interface IShortcutGroup {
    /**
     *  The name of the group
     */
    name: string;

    /**
     * The list of shortcuts in the group
     */
    shortcuts: IShortcut[];
}

export interface IShortcut extends IShortcutOptions {
    /**
     * Shortcut combinations that map to this action
     */
    combos: string[];

    /**
     * Shortcut combinations to display on the help dialog
     */
    combosToDisplay: string[];
}

interface IMousetrapShortcutGroup extends IShortcutGroup {
    /**
     * The list of shortcuts in the group
     */
    shortcuts: IMousetrapShortcut[];
}

interface IMousetrapShortcut extends IShortcut {
    /**
     * Mousetrap Instance of wrapped element if applicable
     */
    mousetrapInstance?: MousetrapInstance;
}

export interface IShortcutOptions {
    /**
     * Description of the shortcut
     */
    description: string;

    /**
     * Action which gets called when shortcut is pressed
     */
    action: KeyboardAction;

    /**
     * The Dom Element to bind the shortcut to
     */
    element?: Element;

    /**
     * Defaults to false. Pass in True if you would like the shortcut to be hidden from the help dialog
     */
    hideFromHelpDialog?: boolean;

    /**
     * Defaults to false. Use true in the rare case that you want the last key of the chord to propagate to the focused element
     */
    allowPropagation?: boolean;

    /**
     * List combos which you want to be always active even if the user has focus on an input box
     */
    globalCombos?: string[];

    /**
     * Is this a navigation shortcurt? If so, we will handle reseting shortcuts so
     * if this is an in memory navigation you don't have mixed shortcut state
     */
    isPageNavigationShortcut?: boolean;
}

/**
 * ShortcutManager handles registering multiple groups of keyboard shortcuts
 */
export interface IShortcutManager {
    /**
     * Gets the shortcut groups
     */
    getShortcutGroups(): IShortcutGroup[];

    /**
     * Register a shortcut
     * @param group Name of a shortcut group.
     * @param combo Keyboard combination.
     * @param description Description of the shortcut
     * @param action Action which gets called when shortcut is pressed
     * @param allowPropagation Defaults to false. Use true in the rare case that you want the last key of the chord to propagate to the focused element
     *
     * @returns ShortcutManager
     */
    registerShortcut(group: string, combo: string, description: string, action: KeyboardAction, allowPropagation?: boolean): IShortcutManager;

    /**
     * Unregister a shortcut
     * @param group Name of a shortcut group.
     * @param combo Keyboard combination.
     * @param action Action which gets called when shortcut is pressed
     *
     */
    unRegisterShortcut(group: string, combo: string): void;

    /**
     * Register a group of shortcuts
     * @param group Name of a shortcut group.
     * @param combos Keyboard combinations that all map to same action.
     * @param description Description of the shortcut
     * @param action Action which gets called when shortcut is pressed
     * @param allowPropagation Defaults to false. Use true in the rare case that you want the last key of the chord to propagate to the focused element
     *
     * @returns ShortcutManager
     */
    registerShortcuts(group: string, combos: string[], description: string, action: KeyboardAction, allowPropagation?: boolean): IShortcutManager;

    /**
     * Register a shortcut
     * @param group Name of a shortcut group.
     * @param combo Keyboard combination.
     * @param options The options to configure this shortcut with
     *
     * @returns ShortcutManager
     */
    registerShortcut(group: string, combo: string, options: IShortcutOptions): IShortcutManager;

    /**
     * Register a group of shortcuts
     * @param group Name of a shortcut group.
     * @param combos Keyboard combinations that all map to same action.
     * @param options The options to configure this shortcut with
     *
     * @returns ShortcutManager
     */
    registerShortcuts(group: string, combos: string[], options: IShortcutOptions): IShortcutManager;

    /**
     * Removes a group of shortcuts
     * This is used when a group of shortcuts is no longer applicable and you want to de-register them. For example,
     * if you had a ajax popup that needed its own shortcuts but you want to clear those when it is closed.
     *
     * NOTE: This will remove all shortcuts for a given group regardless of where they were registered from.
     *
     * @param group Name of a shortcut group.
     */
    removeShortcutGroup(group: string);

    /**
     * Show the shortcut dialog
     *
     * @param onClose Optional callback that is called when the shortcut dialog is closed.
     */
    showShortcutDialog(onClose?: () => void): void;
}

export class ShortcutManager implements IShortcutManager {
    private static AREA = "KeyboardShortcuts";
    private static FEATURE = "ShortcutInvoked";

    private static _instance: ShortcutManager;
    public static getInstance(): IShortcutManager {
        if (!ShortcutManager._instance) {
            ShortcutManager._instance = new ShortcutManager();
        }

        return ShortcutManager._instance;
    }

    private _shortcutDialog: any;

    public constructor() {}

    public getShortcutGroups(): IShortcutGroup[] {
        const keyboardService = LWP.getLWPService("IVssKeyboardShortcutService");

        if (keyboardService) {
            return keyboardService.getShortcutGroups();
        } else {
            return [];
        }
    }

    public getGlobalCombos(): string[] {
        const keyboardService = LWP.getLWPService("IVssKeyboardShortcutService");
        if (keyboardService) {
            return keyboardService.getGlobalCombos();
        } else {
            return [];
        }
    }

    public registerShortcut(group: string, combo: string, description: string, action: KeyboardAction, allowPropagation?: boolean): ShortcutManager;
    public registerShortcut(group: string, combo: string, options: IShortcutOptions): ShortcutManager;
    public registerShortcut(
        group: string,
        combo: string,
        descriptionOrOptions: string | IShortcutOptions,
        action?: KeyboardAction,
        allowPropagation?: boolean
    ) {
        var options: IShortcutOptions;

        if (typeof descriptionOrOptions === "string") {
            options = <IShortcutOptions>{
                action: action,
                allowPropagation: allowPropagation,
                description: descriptionOrOptions
            };
        } else {
            options = descriptionOrOptions;
        }

        return this.registerShortcuts(group, [combo], options);
    }

    public registerShortcuts(
        group: string,
        combos: string[],
        description: string,
        action: KeyboardAction,
        allowPropagation?: boolean
    ): ShortcutManager;
    public registerShortcuts(group: string, combos: string[], options: IShortcutOptions): ShortcutManager;
    public registerShortcuts(
        group: string,
        combos: string[],
        descriptionOrOptions: string | IShortcutOptions,
        action?: KeyboardAction,
        allowPropagation?: boolean
    ) {
        var options: IShortcutOptions;

        if (typeof descriptionOrOptions === "string") {
            options = <IShortcutOptions>{
                action: action,
                allowPropagation: allowPropagation,
                description: descriptionOrOptions
            };
        } else {
            options = descriptionOrOptions;
        }

        const keyboardService = LWP.getLWPService("IVssKeyboardShortcutService");

        if (keyboardService) {
            keyboardService.registerShortcut(group, {
                combos: combos,
                ...options
            });
        }

        return this;
    }

    public unRegisterShortcut(group: string, combo: string) {
        const keyboardService = LWP.getLWPService("IVssKeyboardShortcutService");

        if (keyboardService) {
            keyboardService.unRegisterShortcut(group, combo);
        }
    }

    public removeShortcutGroup(group: string) {
        const keyboardService = LWP.getLWPService("IVssKeyboardShortcutService");

        if (keyboardService) {
            keyboardService.removeShortcutGroup(group);
        }
    }

    public showShortcutDialog(onClose?: () => void) {
        // Only launch dialog if it is not already open
        if ($(".keyboard-shortcut-dialog").length <= 0) {
            VSS.using(["VSS/Controls/Dialogs"], (_dialog: typeof Dialogs_NO_REQUIRE) => {
                var shortcutGroups = ShortcutManager.getInstance().getShortcutGroups();

                // Make a best guess at a good dialog width based on the number of groups
                // Give 300px per group up to 900px and then let it wrapped. Add 50px to account for padding
                // In the future we should do this dynamically based on the actual width each group takes up
                // when rendered
                var estimatedDialogWidth = 300 * Math.min(shortcutGroups.length, 4) + 50;

                // Make a best guess at a good dialog height. We find the max number of shortcuts in any group and assume each
                // will take up about 32 height plus an extra 100 pixels to handle the headers and overall margins and padding
                // This is not percise but will be close in most cases. In the furture we can do something more complex
                var visibleShortcutCountPerGroup = shortcutGroups.map(
                    group => group.shortcuts.filter(shortcut => shortcut.combosToDisplay.length > 0).length
                );
                var maxVisibleShortcutGroupShortcutCount = Math.max(...visibleShortcutCountPerGroup);
                var estimatedDialogHeight = 35 * maxVisibleShortcutGroupShortcutCount + 150;

                this._shortcutDialog = _dialog.show(_dialog.ModalDialog, {
                    width: estimatedDialogWidth,
                    height: estimatedDialogHeight,
                    minWidth: 300,
                    minHeight: 300,
                    resizable: false,
                    buttons: [],
                    cssClass: "keyboard-shortcut-dialog",
                    title: Resources_Platform.KeyboardShortcutDialogTitle,
                    content: this.renderDialogContent(shortcutGroups),
                    close: () => {
                        if (onClose) {
                            onClose();
                        }
                        this._shortcutDialog = null;
                    }
                });
            });
        }
    }

    private renderDialogContent(shortcutGroups: IShortcutGroup[]): JQuery {
        var wrapper = $("<div />").addClass("keyboard-shortcut-container");

        wrapper.append(this.renderShortcutGroups(shortcutGroups));
        wrapper.append(this.renderHelpLink());

        return wrapper;
    }

    private renderShortcutGroups(shortcutGroups: IShortcutGroup[]): JQuery {
        var wrapper = $("<div />").addClass("keyboard-shortcut-groups");

        for (const group of shortcutGroups.filter(g => g.shortcuts.length > 0)) {
            wrapper.append(this.renderGroup(group));
        }

        return wrapper;
    }

    private renderShortcut(shortcut: IShortcut): JQuery {
        const usesCommandKey = BrowserCheckUtils.isMacintosh() || BrowserCheckUtils.isIOS();
        var comboElem = $("<span />");

        // For each shortcut make elements for the combos it contains
        shortcut.combosToDisplay.forEach((combo, index) => {
            // If mod is given then it means its a wildcard for Command or Control based on your OS
            // Change the help based on what key it will be.
            combo = combo.replace(/\bmod\b/gi, usesCommandKey ? "⌘" : "ctrl");

            if (index > 0) {
                comboElem.append("/ ");
            }

            combo.split(" ").forEach(key => {
                $("<kbd />")
                    .text(key)
                    .appendTo(comboElem);
            });
        });

        var keyRow = $("<tr />");
        $("<td class='keys-definition' />")
            .append(comboElem)
            .appendTo(keyRow);
        $("<td class='keys-description' />")
            .text(shortcut.description)
            .appendTo(keyRow);

        return keyRow;
    }

    private renderGroup(group: IShortcutGroup): JQuery {
        var groupElem = $("<div />").addClass("keyboard-shortcut-group");

        var comboList = $("<table />");

        var headerRow = $("<tr />");
        headerRow.append("<th />");
        $("<th />")
            .text(group.name)
            .attr("scope", "col")
            .appendTo(headerRow);
        headerRow.appendTo(comboList);

        group.shortcuts.forEach(shortcut => {
            if (shortcut.combosToDisplay.length > 0) {
                this.renderShortcut(shortcut).appendTo(comboList);
            }
        });

        groupElem.append(comboList);
        return groupElem;
    }

    private renderHelpLink(): JQuery {
        var helpLinkElement = $("<div />").addClass("keyboard-shortcut-helplink");

        $("<a />")
            .attr("href", "https://go.microsoft.com/fwlink/?LinkID=708466")
            .attr("target", "_blank")
            .text(Resources_Platform.KeyboardShortcutHelpLinkText)
            .appendTo(helpLinkElement);

        return helpLinkElement;
    }
}

interface IShortcutDialogProps {
    onClose: () => void;
}

class ShortcutDialog extends React.Component<IShortcutDialogProps, {}> {
    public render(): null {
        ShortcutManager.getInstance().showShortcutDialog(this.props.onClose);
        return null;
    }
}

registerLWPComponent("shortcutDialog", ShortcutDialog);
