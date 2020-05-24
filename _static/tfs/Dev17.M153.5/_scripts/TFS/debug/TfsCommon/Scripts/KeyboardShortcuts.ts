/// <reference types="jquery" />

import * as Context from "VSS/Context";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { HubsService, HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import KeyboardShortcuts = require("VSS/Controls/KeyboardShortcuts");
import Locations = require("VSS/Locations");
import Menus = require("VSS/Controls/Menus");
import Navigation_Location = require("VSS/Navigation/Location");
import Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Page = require("VSS/Events/Page");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import * as UserClaimsService from "VSS/User/Services";

// Modules for compilation/type support only (no direct require statement)
import Engagement_SendASmile_NO_REQUIRE = require("Engagement/SendASmile/UI");

var sas = null;  // send a smile delay-loaded control

export class ShortcutGroupDefinition {

    protected shortcutManager: KeyboardShortcuts.IShortcutManager;
    private _lastShortcutGroupState: KeyboardShortcuts.IShortcutGroup;
    private _lastShortcutState: IDictionaryStringTo<KeyboardShortcuts.IShortcutGroup> = {};
    private _isMemberUser: boolean;

    constructor(protected groupName: string, private preserveLastGroupStateForSameGroupName?: boolean) {
        this.shortcutManager = KeyboardShortcuts.ShortcutManager.getInstance();
        // Preserves the last group state, to support same shortcut group in two views in same page
        if (preserveLastGroupStateForSameGroupName) {
            this._preserveLastShortcutGroupState();
        }

        this._isMemberUser = this.isMemberUser();
    }

    /**
     * Navigates to a URL
     * @param url Full URL to navigate the user to.
     */
    protected navigateToUrl(url: string) {

        window.location.href = url;
    }

    /**
     * Navigates to an action in a controller
     * @param action The action to navigate to
     * @param controller The controller to navigate to
     */
    protected navigateToAction(action: string, controller: string) {
        var url = Locations.urlHelper.getMvcUrl({ action: action, controller: controller });
        this.navigateToUrl(url);
    }

    /** 
    * Navigates to a hub or hub group given its id
     * @param ids The ids of the hub groups or hubs
    */
    protected navigateToHub(...ids: string[]) {

        const hubsService = Service.getLocalService(HubsService);

        let hubGroup: HubGroup = null;
        let hub: Hub = null;
        for (let id of ids) {
            let hg = hubsService.getHubGroupById(id);
            if (hg && hg.uri) {
                hubGroup = hg;
                break;
            }

            let h = hubsService.getHubById(id);
            if (h && h.uri) {
                hub = h;
                break;
            }
        }

        if (hubGroup) {
            hubsService.navigateToHub(hubGroup.id, hubGroup.uri);
        }
        else if (hub) {
            hubsService.navigateToHub(hub.id, hub.uri);
        }
    }

    /**
     * Registers a keyboard shortcut that performs a page navigation. By registering 
     * as page navigation shortcut we ensure it won't get performed more than once
     * @param combo Keyboard combination used to trigger the shortcut.
     * @param options The options to configure this shortcut with
     * @param visibility Defines who can see/use this shortcut
     */
    protected registerPageNavigationShortcut(combo: string, options: KeyboardShortcuts.IShortcutOptions, visibility?: ShortcutVisibility) {

        if ((visibility & ShortcutVisibility.Member) === ShortcutVisibility.Member && !this._isMemberUser) { return; }

        options.isPageNavigationShortcut = true;
        this.shortcutManager.registerShortcut(this.groupName, combo, options);
    }

    /**
     * Registers a keyboard shortcut
     * @param combo Keyboard combination used to trigger the shortcut.
     * @param options The options to configure this shortcut with
     * @param preserveLastShortcutState If true, preserve the last shortcut state, the previous shortcut will only be restored on removeShortcutGroup
     * @param visibility Defines who can see/use this shortcut
     */
    protected registerShortcut(combo: string, options: KeyboardShortcuts.IShortcutOptions, preserveLastShortcutState?: boolean, visibility?: ShortcutVisibility) {

        if ((visibility & ShortcutVisibility.Member) === ShortcutVisibility.Member && !this._isMemberUser) { return; }

        // Preserves the last shortcut state, to supoort same shortcut group in two views in same page
        if (preserveLastShortcutState) {
            this._preserveLastShortcutState([combo]);
        }
        this.shortcutManager.registerShortcut(this.groupName, combo, options);
    }

    /**
    * Registers a keyboard shortcut
    * @param combos Keyboard combinations used to trigger the shortcut.
    * @param options The options to configure this shortcut with
    * @param preserveLastShortcutState If true, preserve the last shortcut state, the previous shortcut will only be restored on removeShortcutGroup
     * @param visibility Defines who can see/use this shortcut
    */
    protected registerShortcuts(combos: string[], options: KeyboardShortcuts.IShortcutOptions, preserveLastShortcutState?: boolean, visibility?: ShortcutVisibility) {

        if ((visibility & ShortcutVisibility.Member) === ShortcutVisibility.Member && !this._isMemberUser) { return; }

        // Preserves the last shortcut state, to supoort same shortcut group in two views in same page
        if (preserveLastShortcutState) {
            this._preserveLastShortcutState(combos);
        }
        this.shortcutManager.registerShortcuts(this.groupName, combos, options);
    }

    /**
     * UnRegisters a keyboard shortcut
     * @param combo Keyboard combination used to trigger the shortcut.
     */
    protected unRegisterShortcut(combo: string) {
        this.shortcutManager.unRegisterShortcut(this.groupName, combo);
    }

    /**
     *  Remove this shortcut group and its bindings
     *  and restores the lastgroup state and last shortcut state
     */
    public removeShortcutGroup() {
        this.shortcutManager.removeShortcutGroup(this.groupName);

        // Restore the last group and shortcut state
        this._restoreLastShortcutGroupState()
        this._restoreLastShortcutState();
    }

    /**
     * Checks if the current user has the member claim
     */
    private isMemberUser(): boolean {
        return UserClaimsService.getService().hasClaim(UserClaimsService.UserClaims.Member);
    }

    /**
     * Preserves the last group states and remove the group from the shortcut group, it will be restored back when the shortcut group with the same name is removed from the a group
     * This is to support same shortcut group in two views in same page. Example: When you have same shortcut group in a dialog and in underlying page
     */
    private _preserveLastShortcutGroupState() {
        let shortcutGroups: KeyboardShortcuts.IShortcutGroup[] = this.shortcutManager.getShortcutGroups();
        let groups = shortcutGroups.filter((shortcutGroup: KeyboardShortcuts.IShortcutGroup) => {
            return Utils_String.equals(shortcutGroup.name, this.groupName);
        });

        if (groups.length > 0) {
            this._lastShortcutGroupState = {
                ...groups[0]
            }
            this.shortcutManager.removeShortcutGroup(this.groupName);
        }
    }

    /**
     * Preserves the last shortcut state, it will be restored back when the shortcut group is removed
     * This is to support same shortcut in two views in same page. Example: When you have same shortcut in a dialog and in underlying page
     */
    private _preserveLastShortcutState(combos: string[]) {
        let shortcutGroups: KeyboardShortcuts.IShortcutGroup[] = this.shortcutManager.getShortcutGroups();
        let breakLoop: boolean;

        shortcutGroups.forEach((shortcutGroup: KeyboardShortcuts.IShortcutGroup) => {
            if (breakLoop) {
                return false;
            }
            shortcutGroup.shortcuts.forEach((shortcut: KeyboardShortcuts.IShortcut) => {
                if (Utils_Array.arrayEquals(combos, shortcut.combos, (a, b) => { return Utils_String.equals(a, b, true); })) {
                    const key = combos.join(",");
                    this._lastShortcutState[key] = {
                        name: shortcutGroup.name,
                        shortcuts: [shortcut]
                    }

                    // remove the existing shortcut
                    this.shortcutManager.unRegisterShortcut(shortcutGroup.name, key);
                    breakLoop = true;
                    return false;
                }
            })
        });
    }

    /**
     * Restore the preserved shortcut group state
     */
    private _restoreLastShortcutGroupState() {

        if (this.preserveLastGroupStateForSameGroupName && this._lastShortcutGroupState && Utils_String.equals(this._lastShortcutGroupState.name, this.groupName)) {
            this._lastShortcutGroupState.shortcuts.forEach((shortcut: KeyboardShortcuts.IShortcut) => {
                this.shortcutManager.registerShortcuts(this._lastShortcutGroupState.name, shortcut.combos, {
                    description: shortcut.description,
                    action: shortcut.action,
                    element: shortcut.element,
                    hideFromHelpDialog: shortcut.hideFromHelpDialog,
                    allowPropagation: shortcut.allowPropagation,
                    globalCombos: shortcut.globalCombos,
                    isPageNavigationShortcut: shortcut.isPageNavigationShortcut
                });
            });

            this._lastShortcutGroupState = null;
        }
    }

    /**
     * Restore the all the preserved shortcut state
     */
    private _restoreLastShortcutState() {
        if (this._lastShortcutState) {

            for (let key in this._lastShortcutState) {
                const shortcutGroup = this._lastShortcutState[key];

                if (shortcutGroup) {
                    const shortcut = shortcutGroup.shortcuts[0];
                    this.shortcutManager.registerShortcuts(shortcutGroup.name, shortcut.combos, {
                        description: shortcut.description,
                        action: shortcut.action,
                        element: shortcut.element,
                        hideFromHelpDialog: shortcut.hideFromHelpDialog,
                        allowPropagation: shortcut.allowPropagation,
                        globalCombos: shortcut.globalCombos,
                        isPageNavigationShortcut: shortcut.isPageNavigationShortcut
                    });

                    delete this._lastShortcutState[key];
                }
            }
        }
    }

}

export class GlobalShortcutGroup extends ShortcutGroupDefinition {
    
    constructor() {
        super(Resources.KeyboardShortcutGroup_Global);

        this.registerShortcut(
            "f n",
            {
                description: Resources.KeyboardShortcutDescription_FocusNext,
                action: () => Utils_UI.sectionManager.nextSection()
            });
        this.registerShortcut(
            "f p",
            {
                description: Resources.KeyboardShortcutDescription_FocusPrevious,
                action: () => Utils_UI.sectionManager.previousSection()
            });
    }
}

/**
 * The visibility of the shortcut
 */
export enum ShortcutVisibility {
    All = 0,
    Member = 1
}

// Only register these key bindings at the project level
let registerGlobalShortcuts = () => {
    if (Context.getPageContext().webContext.project) {
        new GlobalShortcutGroup();
    }
}

// On initial script load register
registerGlobalShortcuts();

// On XHR Navigate re-register shortcuts
Events_Services.getService().attachEvent(HubEventNames.ProcessXHRNavigate, (sender: any, args: IHubEventArgs) => {
    registerGlobalShortcuts();
});

/**
 * 1) Registers the "send-a-smile" command to initialize the SendASmile control
 * 2) Registers the "keyboard-shortcuts" command to launch the keyboard shortcut control
 */
Menus.menuManager.attachExecuteCommand(function (sender, args) {
    function getIconWrapper($menuItem): JQuery {
        var $icon = $('.icon', $menuItem);
        var $iconWrapper = $('<div class="nav-feedback-icon-wrappper"></div>');
        $iconWrapper.appendTo($menuItem);
        $icon.appendTo($iconWrapper);
        return $iconWrapper;
    }

    switch (args.get_commandName()) {
        case "send-a-smile":
            VSS.using(["Engagement/SendASmile/UI"], (SendASmile: typeof Engagement_SendASmile_NO_REQUIRE) => {
                if (!sas) {
                    var $menuItem = args.get_commandSource().getElement();
                    sas = new SendASmile.SendASmile($menuItem, {
                        icon: getIconWrapper($menuItem),
                        textEntryType: SendASmile.FeedbackTextEntryType.Modal
                    });
                    sas.show();
                    sas.popUp();
                }
            });
            return false;
        case "keyboard-shortcuts":
            KeyboardShortcuts.ShortcutManager.getInstance().showShortcutDialog();
            return false;
    }
});

Events_Page.getService().subscribe(Events_Page.CommonPageEvents.InitialScriptsLoaded, (e: Events_Page.IPageEvent) => {
    // Identify sections for each navigation between sections
    Utils_UI.sectionManager.identifySections();
});
