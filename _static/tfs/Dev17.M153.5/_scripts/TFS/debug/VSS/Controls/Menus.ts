/// <reference path='../../VSS/References/VSS.SDK.Interfaces.d.ts' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Q = require("q");

import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Controls_PopupContent = require("VSS/Controls/PopupContent");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import VSS_ClientTrace_Contracts = require("VSS/ClientTrace/Contracts");
import VSS_Error = require("VSS/Error");
import VSS_Telemetry = require("VSS/Telemetry/Services");

const delegate = Utils_Core.delegate;
const domElem = Utils_UI.domElem;
const KeyCode = Utils_UI.KeyCode;
const handleError = VSS.handleError;
const getErrorMessage = VSS.getErrorMessage;
export var menuManager: IMenuManager;
/**
 * Amount of time in ms after a blur that a menu waits before closing.
 */
export var BLUR_CLOSE_TIMEOUT = 25;

module Utils {
    export function isMiddleClick(e: JQueryEventObject): boolean {
        return Boolean(e) && e.which === 2;
    }

    export function targetIsMenu(e: JQueryEventObject): boolean {
        return Boolean(e) && $(e.target).is("ul.menu");
    }
}

module MenuOrientation {
    export var Horizontal = 0;
    export var Vertical = 1;

    export function parse(type) {
        if (type === "vertical") {
            return MenuOrientation.Vertical;
        }
        return MenuOrientation.Horizontal;
    }
}

module MenuType {
    export var None = 0;
    export var Normal = 1;
    export var Static = 2;
    export var Popup = 3;
    export var DropDown = 4;
    export var Chevron = 5;
    export var SubMenu = 6;

    export function parse(type) {
        switch (type) {
            case "static":
                return MenuType.Static;
            case "popup":
                return MenuType.Popup;
            case "dropdown":
                return MenuType.DropDown;
            case "chevron":
                return MenuType.Chevron;
        }
        return MenuType.Normal;
    }
}

export enum MenuItemState {
    None = 0,
    Disabled = 0x01,
    Hidden = 0x02,
    Toggled = 0x04,
}

export enum MenuSelectionMode {
    /**
     * No selection available.
     */
    None,

    /**
     * Single item can be selected.
     */
    SingleSelect,

    /**
     * Multiple items can be selected.
     */
    MultiSelect
}

export interface IMenuItemSpec extends IContributedMenuItem {
    /**
     * Id of the menu item. Used to distinguish the menu item when action is executed or when changing command state of a menu item
     */
    id?: string;

    /**
     * The id of the contribution that defines the menu item.
     */
    contributionId?: string;

    rank?: number;
    /**
     * Display text of the menu item
     */
    text?: string;

    /**
     * Display html of the menu item (mutually exclusive with text)
     */
    html?: string | JQuery | (() => string | JQuery);

    /**
     * Text displayed when mouse is hovered on the menu item.
     * @defaultvalue the value of the text option
     */
    title?: string;

    /**
     * Set title to text if not provided.
     * @defaultvalue false, unless showText is specified as false then true
     */
    setDefaultTitle?: boolean;

    /**
     * Set the item's title only when the text overflows and when the mouse is hovering over it
     */
    setTitleOnlyOnOverflow?: boolean;

    /**
     * Icon for the menu item
     */
    icon?: string;

    /**
     * Determines whether the menu item is a separator or not. If specified along with text, menu item acts like a group text
     * @defaultvalue false
     */
    separator?: boolean;

    /**
     * Indicates that this menu item is a separator between menu item groups.
     */
    isGroupSeparator?: boolean;

    /**
     * Determines whether the menu item is initially disabled or not
     * @defaultvalue false
     */
    disabled?: boolean;

    /**
     * If explicitly set to false, menu item will not be focusable via keyboard navigation.
     * Use only for menu items that have alternative means of being focused.
     */
    focusable?: boolean;

    /**
     * Children of this menu item
     */
    childItems?: any; //IMenuItem[];

    /**
     * If childItems is a function and dynamic is true, call the function to update the child items every time they are displayed.
     */
    dynamic?: boolean;

    /**
     * Extra css class name for this menu item
     */
    cssClass?: string;

    groupId?: string;

    /**
     * Determines whether to show text for this item or not.
     * @defaultvalue true
     */
    showText?: boolean;

    /**
     * Determines whether to show html for this item or not.
     * @defaultvalue true
     */
    showHtml?: boolean;

    /**
     * Determines whether to disable icon for this item or not.
     * @defaultvalue false
     */
    noIcon?: boolean;

    arguments?: any;
    action?: (commandArgs: any) => void;

    /**
     * Set to true for menu items that are contributed my an extension.
     */
    isContribution?: boolean;

    /**
     * The id of the extension that contributed the menu item.
     */
    sourceExtensionId?: string;

    /**
     * Extra option overriding default settings
     */
    extraOptions?: any;

    /**
     * Determines whether clicking a menu item with children opens sub menu or not.
     * @defaultValue true
     */
    clickOpensSubMenu?: boolean;

    /**
     *  Option to renders a split drop menu item (eg a chevron or triangle)
     */
    splitDropOptions?: ISplitDropMenuItemSpec;

    /**
     * Options to enable pinning for the menu item.
     */
    pinningOptions?: IMenuItemPinningOptions;

    /**
     * Options to control the pinning behavior of this item's submenu.
     */
    pinningMenuOptions?: IMenuPinningOptions;

    /**
     * If true, item gets 'selected' class.
     */
    selected?: boolean;

    /**
     * If this is true, and there are child items, don't show the
     * drop indicator icon.
     */
    hideDrop?: boolean;

    /**
     * Menu options for any sub menu created by this menu.
     */
    childOptions?: MenuOptions;

    /**
     * By default, a menu item's id will be used as a command id to execute
     * an action. Set this to false if this menu item's action should not
     * default to the item's id.
     */
    idIsAction?: boolean;

    /**
     * Text to be used by screen reader
     */
    ariaLabel?: string;
}

/*
 * SplitDropMenuItemSpec is a special type of MenuItemSpec
 *
 * showText/showHtml: Always false
 *
 * toggled/disabled: Always same as parent menu item
 *
 * splitDropOptions/childItems: Not supported cascading inside a SplitDropMenuItem
 */
export interface ISplitDropMenuItemSpec extends IMenuItemSpec {

}

/**
 * Options for pinnable menu items. This is intended to support the case where there is a menu of
 * pinned items (the target menu), with a submenu that displays all items (the source menu). Every
 * pinnable item should be added to both menus (the id of two items that are the same must match).
 * See also IMenuPinningOptions
 */
export interface IMenuItemPinningOptions {
    /**
     * Set to true if the item is pinnable.
     */
    isPinnable?: boolean;
    /**
     * Whether or not the menu item is pinned.
     */
    isPinned?: boolean;
    /**
     * Set to true to hide the pin button.
     */
    hidePin?: boolean;
    /**
     * Don't hide this item when it would otherwise be hidden due to hidePinnedItems or hideUnpinnedItems
     * setting on parent menu.
     */
    neverHide?: boolean;
    /**
     * Callback to be called when the user pins or unpins the item.
     * menuItem is the MenuItem that was clicked.
     * siblingMenuItem is the matching MenuItem from the other Menu.
     */
    onPinnedChanged?: (menuItem: MenuItem, pinned: boolean, siblingMenuItem?: MenuItem) => void;

    /**
     * Unique identifier for a group of pinnable menu items.
     */
    groupId?: string;
}

/**
 * Options for menus with pinnable items. This is intended to support the case where there is a menu of
 * pinned items (the target menu), with a submenu that displays all items (the source menu). Set
 * isPinnableTarget and hideUnpinnedItems on the target menu, set isPinnableSource and optionally
 * hidePinnedItems on the source menu.
 * See also IMenuItemPinningOptions.
 */
export interface IMenuPinningOptions {
    /**
     * Set to true to hide unpinned items in this item's submenu.
     */
    hideUnpinnedItems?: boolean;
    /**
     * Set to true to hide pinned items in this item's submenu.
     */
    hidePinnedItems?: boolean;
    /**
     * Set to true if this item's submenu is the target pinned items are pinned to. The pinning source should be a submenu of this item's submenu.
     */
    isPinningTarget?: boolean;
    /**
     * Set to true if this item's submenu is where all pinnable items are shown. The pinning target should be the parent menu of this item.
     */
    isPinningSource?: boolean;
    /**
     * Set to true on the pinning target if newly-pinned items should be moved to be after every other pinnable item with the same group id.
     */
    pinItemsToEnd?: boolean;
    /**
     * If true, close this menu when an item is pinned/unpinned.
     */
    closeOnPin?: boolean;
    /**
     * Unique identifier for a group of pinnable menu items.
     */
    groupId?: string;
    /**
     * Set on the target menu to hide the source menu when all items are pinned.
     */
    hideEmptySourceMenu?: boolean;
}

function toMenuItemState(command: ICommand) {
    var state;

    if (command) {
        /*jslint bitwise: false*/ // MenuItemState is a flag used with bitwise operators

        state = (<any>command).state | MenuItemState.None;

        if (command.disabled) {
            state = state | MenuItemState.Disabled;
        }

        if (command.hidden) {
            state = state | MenuItemState.Hidden;
        }

        if (command.toggled) {
            state = state | MenuItemState.Toggled;
        }
        /*jslint bitwise: true*/
    }

    return state;
}

module MenuAlign {
    export var RightBottom = 0;
    export var RightJustify = 1;
    export var LeftBottom = 2;
    export var LeftTop = 3;

    export function parse(type) {
        switch (type) {
            case "right-bottom":
                return MenuAlign.RightBottom;
            case "left-bottom":
                return MenuAlign.LeftBottom;
            case "left-top":
                return MenuAlign.LeftTop;
        }
        return MenuAlign.RightJustify;
    }
}

export interface IMenuManager {
    getCommandState(commandId, context): any;
    updateCommandStates(commands: ICommand[]): void;
    executeCommand(args?): void;
    attachExecuteCommand(handler: IEventHandler): void;
    detachExecuteCommand(handler: IEventHandler): void;
    fire(eventName: string, sender, eventArgs): void;
    attachEvent(eventName: string, handler: IEventHandler): void;
    detachEvent(eventName: string, handler: IEventHandler): void;
}

class MenuManager implements IMenuManager {

    private readonly _executeEvent: string = "execute-command";
    private _commandStates: any = null;
    private _events: Events_Handlers.NamedEventCollection<any, any>;

    /**
     * Menu manager keeps track of command states of all type of menu types
     */
    constructor() {
        this._commandStates = {};
    }

    public getCommandState(commandId, context) {
        var state = this._commandStates && this._commandStates[commandId];

        if ($.isFunction(state)) {
            return state.call(context, commandId, context);
        }

        return state;
    }

    public updateCommandStates(commands: ICommand[]) {
        var that = this;

        if (commands) {
            $.each(commands, function (i, command) {
                that._commandStates[command.id] = toMenuItemState(command);
            });
        }
    }

    /**
     * Execute the command specified in the arguments.
     *
     * @param args The arguments to pass through to the command
     */
    public executeCommand(args?) {

        this._fireEvent(this._executeEvent, this, args);
    }

    /**
     * Attaches handler for the commands executed
     *
     * @param handler Handler to attach to be executed when any command executed
     */
    public attachExecuteCommand(handler: IEventHandler) {
        this.attachEvent(this._executeEvent, handler);
    }

    /**
     * Detaches handler for the commands executed
     *
     * @param handler Handler to detach
     */
    public detachExecuteCommand(handler: IEventHandler) {
        this.detachEvent(this._executeEvent, handler);
    }

    public fire(eventName, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    /**
     * Invoke the specified event passing the specified arguments.
     *
     * @param eventName The event to invoke.
     * @param sender The sender of the event.
     * @param args The arguments to pass through to the specified event.
     */
    public _fireEvent(eventName: string, sender?: any, args?: any) {
        var i, evt;

        if (this._events) {
            // Invoke handlers until a handler returns false to cancel handler chain.
            var eventBubbleCancelled;
            this._events.invokeHandlers(eventName, sender, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    /**
     * Attatch a handler to an event.
     *
     * @param eventName The event name.
     * @param handler The handler to attach.
     */
    public attachEvent(eventName: string, handler: IEventHandler) {
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }
        this._events.subscribe(eventName, <any>handler);
    }

    /**
     * Detatch a handler from an event.
     *
     * @param eventName The event name.
     * @param handler The handler to detach.
     */
    public detachEvent(eventName: string, handler: IEventHandler) {
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }    
}
menuManager = new MenuManager();

export interface MenuBaseOptions {
    type?: string;
    contextInfo?: any;
    arguments?: any;
    updateCommandStates?: Function;
    getCommandState?: Function;
    overflow?: string;
    align?: string;
    useBowtieStyle?: boolean;
    ariaLabel?: string;

    // These should be in enhancementOptions
    cssClass?: string;
    cssCoreClass?: string;

    /**
     * Determines the selection mode of the menu.
     * @default None
     */
    selectionMode?: MenuSelectionMode | ((item: IMenuItemSpec) => MenuSelectionMode);
}

export class MenuBase<TOptions extends MenuBaseOptions> extends Controls.Control<TOptions> {

    public _type: any;
    public _parent: any;
    public _children: any[]; // should be MenuBase[]
    public _commandStates: any;
    public actionArguments: any;

    /**
     * @param options
     */
    constructor(options?: TOptions) {

        super(options);

        this._type = MenuType.parse(this._options.type);
        this._children = [];
    }

    /**
     * Get the root menu of this object. (Not the immediate parent)
     */
    public getOwner(): MenuOwner<MenuOwnerOptions> {
        const val = this._parent ? this._parent.getOwner() : this;
        // Diag.Debug.assert(val instanceof MenuOwner); // this fails unit tests that create menus without a menu owner
        return val;
    }

    public getParent(): MenuBase<TOptions> {
        return this._parent;
    }

    /**
     * Get the parent menu of this.
     */
    public getParentMenu(): Menu<MenuOptions> {
        // implement in subclasses
        return undefined;
    }

    public getContextInfo() {
        return this._options.contextInfo;
    }

    /**
     * @return
     */
    public getActionArguments(): any {
        var args = this._options.arguments || this.actionArguments;

        if (typeof args === "string") {
            // String argument means a URL. We are creating
            // an action object with url as a parameter

            return {
                url: args
            };
        }
        else if ($.isFunction(args)) {
            return args.call(this, this.getOwner().getContextInfo());
        }

        return args;
    }

    /**
     * Returns the menu type. The values are outlines in the MenuType enumeration
     *
     * @return The menu type value
     */
    public getMenuType(): number {
        return this._type;
    }

    public updateCommandStates(commands: ICommand[]) {
        this._updateCommandStates(commands);
    }

    public isMenuBar() {
        return this._type === MenuType.Static;
    }

    public _fireUpdateCommandStates(context) {
        context = context || this;

        if (typeof this._options.updateCommandStates === "function") {
            if (this._options.updateCommandStates.call(context, context) === false) {
                return;
            }
        }

        if (this._parent) {
            this._parent._fireUpdateCommandStates(context);
        }
    }

    public _clear() {
        var i, len = this._children.length;

        for (i = 0; i < len; i++) {
            this._children[i]._clear();
            this._children[i].dispose();
        }

        this._children = [];
    }

    private _updateCommandStates(commands: ICommand[]) {
        var that = this;
        if (!this._commandStates) {
            this._commandStates = {};
        }

        if (commands) {
            $.each(commands, function (i, command) {
                that._commandStates[command.id] = toMenuItemState(command);
            });
        }
    }

    /**
     * Update contributed menu items that have already been added to the menu.
     * @param items
     */
    protected _updateContributedMenuItems(items: IMenuItemSpec[]) {
        if (this._children) {
            this._children.forEach((child: MenuBase<MenuBaseOptions>) => {
                child._updateContributedMenuItems(items);
            });
        }
    }
}

VSS.initClassPrototype(MenuBase, {
    _type: null,
    _parent: null,
    _children: null,
    _commandStates: null,
    actionArguments: null
});

export interface MenuItemOptions extends MenuBaseOptions {
    item?: any;
    immediateShowHide?: boolean;
    clickToggles?: boolean;
}

export class MenuItem extends MenuBase<MenuItemOptions> {

    public static enhancementTypeName: string = "tfs.menu.item";

    public static getScopedCommandId(id: string, scope: string) {
        return scope ? scope + "-" + id : id;
    }

    public _parent: Menu<MenuOptions>;

    private _highlightHover: boolean;
    private _highlightPressed: boolean;
    private _index: number;
    private _isPinned: boolean;
    private _pinElement: JQuery;
    private _isPinFocused = false;
    /**
     * The <li> that represents this MenuItem or the <a> tag inside of it.
     */
    private _$menuItemElement: JQuery;
    private _tooltip: Controls_PopupContent.RichContentTooltip;
    private _closeSubmenuOnMouseLeave: boolean;
    /**
     * ID of pointer event that was handled by the pointer down event.
     */
    private _handledPointerId: number;
    /**
     * Ignore all clicks until after this time.
     */
    private _blockClickUntil: number;
    /**
     * Stop propagation of the next mouse leave event.
     * Useful only when _closeSubmenuOnMouseLeave is
     * set. Use this when we close a menu from under
     * the user's mouse cursor (as when we pin/unpin
     * an item), but we don't want the parent menus to
     * close.
     */
    private _quenchMouseLeave = false;

    /**
     * Don't open sub menus on hover if this is true.
     * This might happen if a menu item is clicked to
     * dismiss the submenu - we don't want to re-show
     * the menu on the next mouse event, (wait until
     * the mouse has left the element first).
     */
    private _blockHoverOpenSubMenu: boolean = false;
    private _isHidden = false;

    public _item: any;
    public _align: any;

    private static PinnedIconClass = "bowtie-unpin";
    private static UnpinnedIconClass = "bowtie-pin-unpin";

    private static _pinDescribedById: string;
    private static _unpinDescribedById: string;

    /**
     * @param options
     */
    constructor(options?: MenuItemOptions) {
        super(options);

        this._item = this._options.item || {};

        this.setEnhancementOptions({
            coreCssClass: this._item.href ? "menu-item-container" : "menu-item",
            tagName: "li"
        });

        try {
            this.actionArguments = this._item.arguments;
        }
        catch (e) {
            // Function.prototype.arguments is restricted in strict mode, can continue without it.
        }

        this._align = MenuAlign.parse(this._options.align);
    }

    /**
     * @param options
     */
    public initializeOptions(options?: MenuItemOptions) {
        super.initializeOptions(options);
    }

    /**
     * Get the parent menu of this menu item.
     */
    public getParentMenu(): Menu<MenuOptions> {
        return (this._parent instanceof Menu) && this._parent;
    }

    public getCommandId() {
        return MenuItem.getScopedCommandId(this._item.id, this._item.scope);
    }

    public getAction() {
        var idIsAction = this._item.idIsAction;
        if (idIsAction === false) {
            return this._item.action;
        }

        return this._item.action || this.getCommandId() || this._item.href;
    }

    public hasAction() {
        var action = this.getAction();
        return action !== null && typeof action !== "undefined";
    }

    public hasSubMenu() {
        return !this.isDefault() && this._item.childItems;
    }

    public isDecorated() {
        return this._item.decorated === true;
    }

    public isDefault() {
        return this._type === MenuType.None;
    }

    public isSeparator() {
        return this._item.separator === true;
    }

    /**
     * Returns if this menu item is a label.  Labels are menu items that aren't actions, like separators, but contain content, such as text.
     *     NOTE: Currently, Labels are implemented using separators.  However, there are plans to revisit this.
     */
    public isLabel() {
        return this.isSeparator() && this._item.isLabel;
    }

    /**
     * Returns the selected state of this menu item (not to be confused with the
     * select() method's notion of state)
     */
    public isSelected() {
        return this._item.selected === true;
    }

    public getCommandState(commandId?: string, context?): MenuItemState {
        var state: any = null;
        commandId = commandId || this._item.id;
        context = context || this;

        if (typeof this._options.getCommandState === "function") {
            state = this._options.getCommandState.call(this, commandId, context);
        }

        if (state === null || typeof state === "undefined") {
            if (this._parent && $.isFunction(this._parent.getCommandState)) {
                state = this._parent.getCommandState(commandId, context);
            }
        }

        if (state === null || typeof state === "undefined") {
            state = menuManager.getCommandState(commandId, context);
        }

        if ((state === null || typeof state === "undefined") && this._item.id === commandId) {
            state = toMenuItemState(context._item);
        }

        if ($.isFunction(state)) {
            // we are trying to obsolete this mechanism of returning state as a function.
            Diag.Debug.fail("MenuItem 'State' should not be a function");
            state = state.call(this, commandId, this);
        }

        return state;
    }

    public getIndex(): number {
        return this._index;
    }

    public setIndex(value: number) {
        this._index = value;
    }

    /**
     * Set to true to hide this menu item.
     *
     * Even if this is set to false, the menu item may be hidden for other reasons. See isHidden().
     * @param value
     */
    public setIsHidden(value: boolean) {
        this._isHidden = value;
        this._updateState();
    }

    public isHidden() {
        if (this.isPinnable() && this._parent && this._parent.getMenuPinningOptions()) {
            const parentPinningOptions: IMenuPinningOptions = this._parent.getMenuPinningOptions();
            if (parentPinningOptions.hidePinnedItems && this._isPinned && !this._item.pinningOptions.neverHide) {
                return true;
            }
            if (parentPinningOptions.hideUnpinnedItems && !this._isPinned && !this._item.pinningOptions.neverHide) {
                return true;
            }
        }

        return Boolean((this.getCommandState() & MenuItemState.Hidden) === MenuItemState.Hidden
            || this._type === MenuType.None
            || (this.isSeparator() && this._item.hidden)
            || this._isHidden);

    }

    public isEnabled() {
        if (this.isHidden()) {
            return false;
        }

        if (!this.isSeparator()) {
            return (this.getCommandState() & (MenuItemState.Disabled | MenuItemState.Hidden)) === MenuItemState.None;
        }
    }

    public isFocusable() {
        return !this.isHidden() && this._item && this._item.focusable !== false;
    }

    public isToggled() {
        var result = false;

        if (!this.isSeparator() && !this.isHidden()) {
            /*jslint bitwise: false*/ // MenuItemState is a flag used with bitwise operators
            result = (this.getCommandState() & MenuItemState.Toggled) === MenuItemState.Toggled;
            /*jslint bitwise: true*/
        }

        return result;
    }

    public isPinnable() {
        return this._item.pinningOptions && this._item.pinningOptions.isPinnable;
    }

    public isPinned() {
        return this._isPinned;
    }

    private getSelectionMode(): MenuSelectionMode {
        let selectionMode = this.getOwner()._options.selectionMode;
        if (typeof selectionMode === "undefined") {
            return MenuSelectionMode.None;
        }
        else if (typeof selectionMode === "function") {
            return selectionMode(this._item);
        }

        return selectionMode;
    }

    public initialize() {
        super.initialize();

        if (this.isPinnable()) {
            const parent = this.getParentMenu();
            const menuPinningOptions = parent && parent.getMenuPinningOptions();
            if (menuPinningOptions && menuPinningOptions.isPinningSource) {
                // we should get our pin state from the target menu because it may have changed before this menu was actually created
                const targetMenu = parent.getParentMenu();
                const siblingItem = Utils_Array.first(targetMenu._menuItems, mi => mi._item && mi._item.id === this._item.id);
                if (siblingItem && siblingItem.isPinnable()) {
                    this._isPinned = siblingItem._isPinned;
                }
                else {
                    this._isPinned = !!this._item.pinningOptions.isPinned;
                }
            }
            else {
                this._isPinned = !!this._item.pinningOptions.isPinned;
            }
        }

        this._decorate();
    }

    public update(item) {
        if (item !== this._item) {
            // instead of replacing this._item, we update it, because our parent Menus and MenuItems
            // keep references to this._item and its best if we try to keep that up-to-date.
            Object.keys(this._item).forEach(k => { delete this._item[k]; });
            $.extend(this._item, item);
        }

        this._clear();
        this._item.decorated = false;
        this._element.empty();
        this._unbind("click mouseenter mouseleave mousedown mouseup keydown");
        this._decorate();
    }

    public updateItems(items) {
        this._clear();
        this._item.childItems = items;
    }

    public _decorate() {
        /** either the <li> that represents this menu item or the <a> within it */
        let decoratedElement = this._element;

        if (!this.isDecorated() && this._item.href) {
            decoratedElement = $('<a class="menu-item" tabindex="-1"/>').appendTo(decoratedElement);
            decoratedElement.attr("href", this._item.href);
        }

        this._$menuItemElement = decoratedElement;

        var hasIcon = this.getOwner()._options.showIcon === true,
            hasChildren = this.hasSubMenu(),
            hasText = this._item.showText !== false,
            hasHtml = this._item.showHtml !== false,
            separatorElement,
            textElement,
            htmlElement,
            dropElement: JQuery,
            containsIcon = false,
            containsText = false,
            containsHtml = false;

        let id = "mi_" + Controls.getId();
        if (this._item.id) {
            id += "_" + this._item.id;
        }

        decoratedElement.attr({
            id: id,
            tabindex: "-1"
        });

        this._element.attr({
            role: this.getAriaRole(),
            tabindex: "-1",
        });

        if (!this.isDecorated()) {
            // Adding core classes for menu item
            decoratedElement
                .addClass(this._options.cssCoreClass)
                .addClass(this._options.cssClass);

            let title: string = this._item.title;
            // If the menu item doesn't have a title explicitly set, and does have plain text content
            // and 1) we are told to set the title to the text by the setDefaultTitle option
            // or 2) the menu item is icon only,
            // then we set the title to the text of the item.
            if (!title && !this._item.encoded && (this._item.setDefaultTitle || this._item.showText === false)) {
                title = this._item.text;
            } else if (!title) {
                title = "";
            }

            // add blank title so that parent's title doesn't show up on hover
            this._element.attr("title", "");
            this.updateTitle(title);

            // add given ariaLabel for screen reader
            if (this._item.ariaLabel) {
                this._element.attr("aria-label", this._item.ariaLabel);
            }

            // This is necessary for tests, current menu item to be identified
            if (this._item.id) {
                decoratedElement.attr("command", this._item.id);
            }

            if (this._item.cssClass) {
                decoratedElement.addClass(this._item.cssClass);
            }

            if (this._item.hidden) {
                decoratedElement.addClass("invisible");
            }

            if (this._item.focusable === false) {
                decoratedElement.addClass("unfocusable");
            }

            if (this.isSeparator()) {
                decoratedElement.addClass("menu-item-separator");
                decoratedElement.attr("role", "separator");
                decoratedElement.removeAttr("tabindex");
                separatorElement = this._createSeparatorElement();
                if (this._item.text) {
                    separatorElement.text(this._item.text);
                    separatorElement.removeClass("separator");
                    separatorElement.addClass("text-separator");
                }

                decoratedElement.append(separatorElement);
            }
            else {
                const label = this._item.ariaLabel || this._item.text || this._item.title;
                if (hasIcon && !this._item.noIcon) {
                    if (typeof this._item.icon === "string" && this._item.icon.match(/^https?:\/\//)) {
                        this._item.icon = this._getExternalIcon.bind(this, this._item.icon);
                    } else if (typeof this._item.icon === "string" && this._item.icon.match(/^css:\/\//)) {
                        this._item.icon = (<string>this._item.icon).substr("css://".length);
                    }
                    const iconElement = this._createIconElement();

                    if ($.isFunction(this._item.icon)) {
                        iconElement.append(this._item.icon.call(this, iconElement));
                    }
                    else if (this._item.icon) {
                        iconElement.addClass(this._item.icon);
                    }
                    if (iconElement.hasClass("bowtie-icon")) {
                        iconElement.removeClass("icon");
                    }
                    if (hasText || (hasHtml && this._item.html)) {
                        iconElement.attr("aria-hidden", "true");
                    } else {
                        iconElement.attr("role", "button")
                            .attr("aria-label", label);
                    }
                    decoratedElement.append(iconElement);
                    containsIcon = true;
                }

                if (hasText) {
                    textElement = this._createTextElement();
                    if (this._item.encoded) {
                        textElement[0].innerHTML = this._item.text || "";
                    }
                    else {
                        if (typeof (this._item.text) === "string") {
                            textElement.text(this._item.text);
                        }
                        else if ($.isFunction(this._item.text)) {
                            textElement.text(this._item.text.call(this) || "");
                        }
                    }

                    if (this._item.textClass) {
                        textElement.addClass(this._item.textClass);
                    }
                    textElement.attr("role", "button");

                    containsText = true;
                    decoratedElement.append(textElement);
                }

                if (hasHtml) {
                    containsHtml = true;
                    htmlElement = this._createHtmlElement();
                    let htmlVal = (<IMenuItemSpec>this._item).html;

                    // Can be string | JQuery | () => string | JQuery
                    if (typeof htmlVal === "function") {
                        htmlVal = htmlVal.call(this);
                    }
                    // Now can be string | JQuery
                    if (htmlVal instanceof jQuery) {
                        htmlElement.append(this._item.html);
                    }
                    else if (typeof (htmlVal) === "string") {
                        htmlElement.html(this._item.html);
                    }
                    else {
                        containsHtml = false;
                    }

                    if (this._item.htmlClass) {
                        htmlElement.addClass(this._item.htmlClass);
                    }
                    decoratedElement.append(htmlElement);
                }

                if (!containsHtml && !containsText && containsIcon) {
                    decoratedElement.addClass('icon-only');
                }

                if (hasChildren) {
                    this._element.attr({
                        "aria-haspopup": "true",
                        "aria-expanded": "false"
                    });
                    if (!this._item.hideDrop) {
                        dropElement = this._createDropElement();

                        // The drop icon in a Popup Menu item is subject to a Firefox bug, 488725: float pushed down one
                        // line with white-space: nowrap; (https://bugzilla.mozilla.org/show_bug.cgi?id=488725)
                        // The workaround is to prepend the floated element. This looks consistent in FF, Chrome, and IE.
                        // We don't want to apply this change to items with display: inline-block since it will cause the drop icon
                        // to appear on the left side of the menu item.
                        let displayValue = this.getElement().css("display");
                        if (displayValue !== "inline-block" && displayValue !== "table-cell") {
                            decoratedElement.prepend(dropElement);
                        }
                        else {
                            decoratedElement.append(dropElement);
                        }
                        decoratedElement.addClass("drop-visible");
                    }
                }

                if (this.isPinnable() && !this._item.pinningOptions.hidePin) {
                    decoratedElement.addClass("pin-visible");
                    this._pinElement = $("<i class='pin bowtie-icon' />");
                    this._pinElement.click(this._onPinClick.bind(this));
                    this._pinElement.attr({
                        id: decoratedElement.attr("id") + "_pin",
                        role: "button",
                        tabindex: "-1"
                    });
                    decoratedElement.append(this._pinElement);
                }
            }
        }
        else {
            dropElement = decoratedElement.children(".drop").eq(0);
        }

        this._updateState();

        let isSelected = this.isSelected();
        // Toggle selected class
        decoratedElement.toggleClass("selected", isSelected);
        if (isSelected) {
            this._element.attr("aria-checked", "true");
        }
        else {
            this._element.removeAttr("aria-checked");
        }


        if (!this.isDefault() && !this.isSeparator()) {
            this._bind("click", delegate(this, this._onClick));
            this._bind("mouseenter", delegate(this, this._onMouseEnter));
            if (!("onpointerdown" in this._element[0])) {
                // only use touchStart in browsers that don't support pointer events
                // can probably be removed once Chrome 55 is released
                this._bind("touchstart", delegate(this, this._onTouchStart));
            }
            this._bind("pointerdown", delegate(this, this._onPointerDown));
            this._bind("pointerup", delegate(this, this._onPointerUp));
            this._bind("mouseleave", delegate(this, this._onMouseLeave));
            this._bind("mousedown", delegate(this, this._onMouseDown));
            this._bind("mouseup", delegate(this, this._onMouseUp));
            this._bind("keydown", this._onKeyDown.bind(this));

            if (hasChildren && dropElement && dropElement.length > 0) {
                this._bind(dropElement, "click", delegate(this, this._onDropClick));
            }
        }
        else if (this.isSeparator()) {
            this._bind("click", (e: JQueryEventObject) => {
                e.stopPropagation();
            });
        }

        if (this.getOwner()._options.markUnselectable === true) {
            Utils_UI.makeElementUnselectable(decoratedElement[0]);
        }
    }

    private _getExternalIcon(url: string): JQuery {
        return $("<img/>").attr("src", url);
    }

    public select(ignoreFocus = false, setKeyboardFocus = true) {
        this._parent._selectItem(this, ignoreFocus, setKeyboardFocus);
        this._parent._clearTimeouts();
    }

    public focusPin(value = true) {
        this._isPinFocused = value;
        if (this._pinElement) {
            this._pinElement.toggleClass('focus', this._isPinFocused);
            if (value) {
                Utils_UI.tryFocus(this._pinElement);
            }
        }
    }

    public deselect() {
        this._parent._selectItem(null);
    }

    public escaped() {
        this.select();
    }

    /**
     * @param options
     */
    public execute(options?: { e: JQueryEventObject, keepHighlight?: boolean }) {

        if (options) {
            Diag.Debug.assertParamIsObject(options, "options");
        }

        var owner = this.getOwner();

        // Recovering UI by hiding any popped up sub menu
        this.collapse({ immediate: true });
        owner.escaped();
        if (owner.isMenuBar() && options && options.keepHighlight) {
            // menu bars continue showing their highlight until the mouse is released.  We don't want popups to keep their highlighting.
            this.showHoverHighlight();
        }
        owner._proceedBlur();

        // Checking to see, if the item has an action
        if (this.hasAction()) {
            // Executing the action by merging own arguments and owner arguments. If
            // there is a conflict in arguments, own arguments always win.
            return this.executeAction($.extend({}, owner.getActionArguments(), this.getActionArguments()), options ? options.e : null);
        }
    }

    public executeAction(args?, e?: JQueryEventObject) {

        // Getting action
        var action = this.getAction(), owner = this.getOwner();
        var isNavigateAction = (action === "navigate" && args.url) || this._item.href;

        // There might be several types of actions
        if (action) {
            // Publish telemetry if it's present
            if (args.telemetry && args.telemetry.area && args.telemetry.feature) {
                VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
                    args.telemetry.area,
                    args.telemetry.feature,
                    {
                        CommandId: this.getCommandId() || "Unknown",
                        GroupId: this._item.groupId,
                        ContributionId: this._item.contributionId
                    }
                ));
            }

            const isCtrlClick = e && (e.ctrlKey || e.metaKey);

            if ($.isFunction(action) && !(isNavigateAction && isCtrlClick)) {
                // If action is a function, executing it by passing
                // the action arguments as parameters
                let actionResult = action.apply(this, [args, e]);
                if (!isNavigateAction || actionResult === false) {
                    // Let navigate actions that were not handled (or rather NOT preventing default/propagation) fall through to the navigate action handler below.
                    return actionResult;
                }
            }

            if (isNavigateAction) {
                // If the action is "navigate", we check the action arguments
                // to find a URL. If that satisfies, we are redirecting to that URL.
                try {
                    let url: string = args.url;
                    if (!url) {
                        url = this._item.href;
                    }

                    let target: string = null;
                    if (args.target) {
                        target = args.target;
                    }
                    if (isCtrlClick) {
                        target = "_blank";
                    }

                    if (target) {
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                            url: url,
                            target: args.target
                        });
                    }
                    else {
                        Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                            url: url
                        });
                    }
                }
                catch (e) {
                    // Eat exception because if the page is modified and the user
                    // presses cancel when prompted about leaving the current page,
                    // an exception is thrown.
                }
                return false;
            }
            else if (owner) {
                return owner.executeAction(new Events_Handlers.CommandEventArgs(action, args, this));
            }
            else {

                // We are executing the command globally which will notify
                // the subscribers about the action executed.
                return menuManager.executeCommand(new Events_Handlers.CommandEventArgs(action, args, this));
            }
        }
    }

    public collapse(options?) {
        var menu = this._parent,
            immediate = options && options.immediate === true;

        while (menu) {
            // The reason we make this check is menu can be menu item
            // here and it cannot be hidden
            if ($.isFunction(menu.hide)) {
                menu.hide({ immediate: immediate });
            }

            // Getting the parent
            menu = menu._parent;
        }

        this.getOwner().ownFocus();
    }

    public setFocus(setKeyboardFocus = true) {
        var element = this._$menuItemElement;
        if (element && !(this.isSeparator() || this.isDefault())) {
            element.addClass("focus");
        }
        if (element) {
            Utils_UI.tryFocus(this._element);
        }
    }

    public removeFocus() {
        var element = this._$menuItemElement;
        if (element && !(this.isSeparator() || this.isDefault())) {
            element.removeClass("focus");
        }
        this.focusPin(false);
    }

    /**
     * Called to show the hover highlight the button
     */
    public showHoverHighlight() {
        this._highlightHover = true;
        this._updateState();
    }

    /**
     * Called to make the button appear to be 'pressed'
     */
    public showPressedHighlight() {
        if (!this.hasSubMenu() || !this.getSubMenu()._visible) {
            this._highlightPressed = true;
            this._updateState();
        }
    }

    /**
     * Called to make the button appear to be 'pressed'
     */
    public removePressedHighlight() {
        if (this._highlightPressed) {
            this._highlightPressed = false;
            this._updateState();
        }
    }

    /**
     * Called to remove all highlighting on the button
     */
    public removeHighlight() {
        this._highlightHover = false;
        this._highlightPressed = false;
        this._updateState();
    }

    /**
     * Updates the title of a menu item using either the specified text or
     * the function provided in the options
     *
     * @param text New title to be displayed
     */
    public updateTitle(title: string) {
        this._setTooltip(null);

        if (!this._item.setTitleOnlyOnOverflow || this._item.showText === false) {
            // always show a tooltip if there is one and the user hasn't told us to only show on overflow or if there is no text
            if (title && !this.getParentMenu().openSubMenuOnHover) {
                // unless the submenu automatically opens on hover, don't show the tooltip then because it overlaps the submenu
                this._setTooltip(title, { setAriaDescribedBy: true });
            }

            if (this._item.showText === false && !this._item.ariaLabel) {
                // if we're not showing any text and the user hasn't already set a label, add one
                this._element.attr("aria-label", title);
            }
        }
        else {
            // only show the tooltip on overflow
            if (!title) {
                title = this._item.text;
            }
            this._setTooltip(title, { onlyShowWhenOverflows: this._$menuItemElement[0], setAriaDescribedBy: true });
        }

        // Update the title option to avoid being erased if decorate is called later
        if (this._options.item) {
            this._options.item.title = title;
        }
    }

    private _setTooltip(title: string | null, tooltipOptions?: Controls_PopupContent.IRichContentTooltipOptions) {
        if (this._tooltip) {
            this._tooltip.dispose();
        }

        if (title) {
            this._tooltip = Controls_PopupContent.RichContentTooltip.add(title, this._element[0], {
                menuContainer: this._element,
                // ignore mouse events that come from a submenu
                mouseEventFilter: event => !(this.hasSubMenu() && this.getSubMenu()._element[0].contains(event.target)),
                ...tooltipOptions
            });
        }
        else {
            this._tooltip = null;
        }
    }

    /**
     * Updates the text of a menu item using either the specified text or
     * the function provided in the options
     *
     * @param text New text to be displayed
     */
    public updateText(text: string) {
        var newText;

        if (typeof (text) === "string") {
            newText = text;
        }
        else if (this._item && $.isFunction(this._item.text)) {
            newText = this._item.text.call(this);
        }

        if (newText) {
            // Tries to find the element between the immediate children
            this._$menuItemElement.children("span.text").text(newText);
        }
    }

    public getSubMenu(create: boolean = true): Menu<MenuOptions> {
        var result = null;

        if (this.hasSubMenu()) {
            if (this._children.length === 0) {
                if (create) {
                    // Chrome has a bug (for some people, sometimes) where a parent with overflow: hidden
                    // will clip its position: fixed children that appear outside of its boundaries even
                    // though it's not supposed to do that. So we make submenus siblings of their parent
                    // menu.
                    var container = (this._parent && this._parent._parent && this._parent._parent._element) || this._$menuItemElement;

                    result = Controls.create<Menu<MenuOptions>, MenuOptions>(
                        Menu,
                        container,
                        <MenuOptions>$.extend({},
                            this._options,
                            this._item.childOptions,
                            { earlyInitialize: false, items: this._item.childItems, type: "submenu", cssCoreClass: "menu sub-menu", tagName: "ul", ariaLabel: this._item.ariaLabel }));
                    result._element.addClass("menu");    // Setting this now, to allow for CSS 0px padding instead of the <ul> default of 40px padding, keeps the parent menu item from widening to 40px before submenu initialization.
                    result._element.attr("data-parent", this._$menuItemElement.attr("id"));
                    result._parent = this;
                    result._type = MenuType.SubMenu;
                    this._children.push(result);
                }
            }
            else {
                result = this._children[0];
            }
        }

        return result;
    }

    public tryShowSubMenu(options?) {
        var immediate = options && options.immediate;
        if (!this.isDefault() && this.isEnabled() && this.getSubMenu()) {
            this.showSubMenu({ immediate: immediate });
            return true;
        }
        return false;
    }

    public showSubMenu(options?) {
        var immediate = options && options.immediate === true;
        var showTimeout = options ? options.showTimeout : undefined;
        var callback = options ? options.callback : undefined;
        var subMenu = this.getSubMenu();
        var parentMenuItem = this._item.splitDropItem ? this._item.splitDropItem : this;
        const setFocus = (options && options.setFocus) !== false;

        Diag.Debug.assert(Boolean(subMenu), "There is no sub menu to show.");

        this._closeSubmenuOnMouseLeave = options && options.closeOnMouseLeave;

        subMenu.show({
            immediate: immediate,
            showTimeout: showTimeout,
            callback: callback,
            element: parentMenuItem._$menuItemElement,
            align: this._align,
            setFocus: setFocus,
        });
    }

    public hideSubMenu(options?: any) {

        if (this.hasSubMenu()) {
            var immediate = options && options.immediate === true,
                hideCallback = options && options.callback,
                subMenu = this.getSubMenu(false);

            if (subMenu && subMenu._parent === this) {
                subMenu.hide({
                    immediate: immediate,
                    callback: () => {
                        this._closeSubmenuOnMouseLeave = false;

                        if (typeof hideCallback === 'function') {
                            hideCallback();
                        }
                    }
                });
            }
        }
    }

    public hideSiblings(options?) {
        this._parent.hideChildren(this, options);
    }

    public getAriaRole(): string {
        switch (this.getSelectionMode()) {
            case MenuSelectionMode.MultiSelect:
                return "menuitemcheckbox";
            case MenuSelectionMode.SingleSelect:
                return "menuitemradio";
        }

        return "menuitem";
    }

    private _attachMenuEvents() {

    }

    private _createIconElement() {
        return $(domElem("span", "icon menu-item-icon"));
    }

    private _createTextElement() {
        return $(domElem("span", "text"));
    }

    private _createHtmlElement() {
        return $(domElem("span", "html"));
    }

    private _createDropElement() {
        return $(domElem("div", "drop"));
    }

    private _createSeparatorElement() {
        return $(domElem("div", "separator"));
    }

    private _updateState() {
        if (this._disposed) {
            return;
        }

        var element = this._$menuItemElement;
        if (element && !(this.isSeparator() || this.isDefault())) {

            var splitDropElement = (this._item.splitDrop || this._item.splitDropItem || {})._$menuItemElement;
            if (this.isEnabled()) {
                element.toggleClass("hover", this._highlightHover);
                element.toggleClass("pressed", this._highlightPressed);

                this._element.attr("aria-disabled", "false");
                element.removeClass("disabled");

                if (splitDropElement) {
                    splitDropElement.toggleClass("split-drop-hover", this._highlightHover);
                }
            }
            else {
                element.addClass("disabled");
                this._element.attr("aria-disabled", "true");
                element.removeClass("hover");
                element.removeClass("pressed");
            }

            if (this._pinElement) {
                this._pinElement.toggleClass('focus', this._isPinFocused);
            }

            element.toggleClass("toggle-on", this.isToggled());
        }

        if (element && !this.isDefault()) {
            element.toggleClass("invisible", this.isHidden());
        }

        if (this._pinElement) {
            this._pinElement.toggleClass(MenuItem.PinnedIconClass, this._isPinned);
            this._pinElement.toggleClass(MenuItem.UnpinnedIconClass, !this._isPinned);

            this._pinElement.attr("title", this._isPinned ? Resources_Platform.MenuItemUnpinButtonLabel : Resources_Platform.MenuItemPinButtonLabel);

            let describedById = null;
            if (this._isPinned) {
                if (!MenuItem._unpinDescribedById) {
                    MenuItem._unpinDescribedById = String(Controls.getId());
                    $(domElem("div"))
                        .attr("id", MenuItem._unpinDescribedById)
                        .addClass("visually-hidden")
                        .text(Resources_Platform.UnpinDescribedByText)
                        .appendTo(document.body);
                }
                describedById = MenuItem._unpinDescribedById;
            }
            else {
                if (!MenuItem._pinDescribedById) {
                    MenuItem._pinDescribedById = String(Controls.getId());
                    $(domElem("div"))
                        .attr("id", MenuItem._pinDescribedById)
                        .addClass("visually-hidden")
                        .text(Resources_Platform.PinDescribedByText)
                        .appendTo(document.body);
                }
                describedById = MenuItem._pinDescribedById;
            }

            this._element.attr("aria-describedby", describedById);
        }
    }

    /**
     * Update contributed menu items that have already been added to the menu.
     * @param items
     */
    protected _updateContributedMenuItems(updatedItems: IMenuItemSpec[]) {
        // first update the model in this._item
        const tempArray: IMenuItemSpec[] = [this._item];
        const updateSpec = (current: IMenuItemSpec, i: number, array: IMenuItemSpec[]) => {
            let changed = false;
            for (let updated of updatedItems) {
                if (current.id === updated.id && current.sourceExtensionId === updated.sourceExtensionId) {
                    array[i] = updated;
                    changed = true;
                    break;
                }
            }
            if (!changed && $.isArray(current.childItems)) {
                (current.childItems as IMenuItemSpec[]).forEach(updateSpec);
            }
        };
        tempArray.forEach(updateSpec);

        if (tempArray[0] !== this._item) {
            // top-level item got updated, we need to update this MenuItem
            this.update(tempArray[0]);
        }
        else {
            // super._updateContributedMenuItems() will update all of this object's children.
            super._updateContributedMenuItems(updatedItems);
        }
    }

    private _onPointerDown(jqueryEvent?: JQueryEventObject) {
        // The mouseEnter event has already been fired. There are four cases we can be in right now
        // 1) This MenuItem doesn't have a submenu
        // 2) This MenuItem has a submenu that was already displayed before the mouse enter event
        // 3) This MenuItem has a submenu that's displayed on hover, and the mouse enter event
        //    caused it to be displayed after a delay, but that hasn't happened yet
        // 4) This MenuItem has a submenu that's displayed on hover, and the mouse enter event
        //    caused it to be displayed recently
        //
        // For cases 2 and 3 we want to block clicks, because the touch's effect was to display the
        // submenu, and we aren't treating it as a click. So we have to block the click event that's
        // going to fire after this
        // For cases 1 and 4, we want the click to be a click on the menu item, we don't have to do
        // anything

        const e = <PointerEvent>jqueryEvent.originalEvent;
        if (e.pointerType === "touch") {
            const submenuDisplayedOnHover = this.hasSubMenu() && this.getParentMenu().openSubMenuOnHover;
            const submenu: Menu<MenuOptions> = this._children && this._children[0];
            const submenuVisible = submenu && submenu._visible;

            if (submenuDisplayedOnHover && (!submenuVisible || submenu.shownTime > Date.now() - 100)) {
                // case 3 or 4
                this._handledPointerId = e.pointerId;
            }
        }
    }

    private _onPointerUp(jqueryEvent?: JQueryEventObject) {
        const e = <PointerEvent>jqueryEvent.originalEvent;

        if (e.pointerId === this._handledPointerId) {
            // 500ms might seem like a long time, but it takes Edge about 350ms to get from the pointerup event to click
            this._blockClickUntil = Date.now() + 500;
        }

        this._handledPointerId = null;
    }

    private _onTouchStart(e?: JQueryEventObject) {
        // If this menu item has a sub menu, but it's not shown, and this menu is set to open sub menus on hover,
        // treat touch events as a hover. Otherwise, treat them as regular click.
        if (this.hasSubMenu() && this.getParentMenu().openSubMenuOnHover && !(this._children && this._children[0] && this._children[0]._visible)) {
            this._onMouseEnter(e);
            e.preventDefault();
        }
        else {
            this._onClick(e);
        }
    }

    private _onMouseEnter(e: JQueryEventObject) {
        Diag.logTracePoint("MenuItem._onMouseEnter.start");

        // find the first parent of the target element that is a <ul>
        let targetParentUl: HTMLElement = <HTMLElement>e.target;
        while (targetParentUl && targetParentUl.tagName.toUpperCase() !== "UL") {
            targetParentUl = targetParentUl.parentElement;
        }

        // if the containing <ul> of the target element is not our ul, it belongs to a submenu and we don't care about it
        if (targetParentUl !== this._parent._element[0]) {
            return;
        }

        const owner = this.getOwner();
        if (!this._blockHoverOpenSubMenu && (owner._active || owner.openSubMenuOnHover)) {
            owner.activate();
            const subMenuVisible = owner._subMenuVisible;
            this.hideSiblings({ immediate: this._options.immediateShowHide });

            // Keep focus if the parent menu is not a menu bar OR if it is a menu bar that already has focus
            this.select(true);

            if (owner !== this._parent || subMenuVisible || owner.openSubMenuOnHover) {
                owner._subMenuVisible = subMenuVisible;
                if (this.isEnabled() && this.hasSubMenu()) {
                    const subMenu = this.getSubMenu();
                    if (subMenu._parent === this) {
                        if (!subMenu._visible) {

                            // For root menu items which open on mouse enter, make sure that they close on mouse leave.
                            var rootMenuOpenedByHover = owner.openSubMenuOnHover && owner === this._parent;

                            this.showSubMenu({
                                immediate: (rootMenuOpenedByHover && !subMenuVisible) ? false : this._options.immediateShowHide,
                                showTimeout: (rootMenuOpenedByHover && !subMenuVisible) ? 200 : undefined,
                                closeOnMouseLeave: rootMenuOpenedByHover,
                                callback: () => {
                                    subMenu.selectDefaultItem(true);
                                },
                                setFocus: false,
                            });
                        }
                    }
                }
            }
        }
        else {
            this.showHoverHighlight();
        }
    }

    private _onMouseLeave(e: MouseEvent) {
        const owner = this.getOwner();

        if (this._quenchMouseLeave) {
            this._quenchMouseLeave = false;
            e.stopPropagation();
            return;
        }

        if (this._closeSubmenuOnMouseLeave) {
            this.hideSubMenu({
                immediate: false,
                hideTimeout: 200,
                callback: () => this.removeHighlight()
            });
        }

        if (owner._active) {
            if (owner !== this._parent) {
                if (this.hasSubMenu()) {
                    const subMenu = this.getSubMenu();
                    if (subMenu._parent === this) {
                        if (!subMenu._visible) {
                            this.deselect();
                            subMenu._clearTimeouts();
                        }
                    }
                    else {
                        this.deselect();
                    }
                }
                else {
                    this.deselect();
                }
            }
            else {
                // owner is parent meaning top level menu item.
                // If submenu exists and not visible, we need to remove highlight in this case
                if (!this.hasSubMenu() || !this.getSubMenu()._visible) {
                    this.removeHighlight();
                }
            }
        }
        else {
            this.removeHighlight();
        }
    }

    private _onMouseDown(e?) {
        this.showPressedHighlight();

        // Menu execution is handled by onclick, but we want to prevent other listeners of
        // mousedown from taking over (such as Grid).
        e.stopPropagation();
        e.preventDefault();
    }

    private _onMouseUp(e?) {
        this.removePressedHighlight();
    }

    private _onClick(e?: JQueryEventObject): boolean | void {
        if (Utils.targetIsMenu(e)) {
            return false;
        }

        if (Utils.isMiddleClick(e)) {
            // Let the browser handle middle-clicks to open links in a new tab or scroll.
            return;
        }

        if (this._blockClickUntil && Date.now() < this._blockClickUntil) {
            // this click has already been handled as a touch event
            e.stopPropagation();
            e.preventDefault();
            return;
        }

        var subMenu: Menu<MenuOptions>,
            actionArgs = this.actionArguments;

        if (!actionArgs) {
            actionArgs = {};
        }
        if (!actionArgs.clickArguments) {
            actionArgs.clickArguments = {};
        }
        $.extend(actionArgs.clickArguments, e);

        if (this.isEnabled()) {
            if (this.hasSubMenu() && this._item.clickOpensSubMenu !== false) {
                subMenu = this.getSubMenu();
                this.select();
                if (subMenu._parent === this && subMenu._visible) {
                    this.getOwner().activate();
                    if (this._options.clickToggles === true) {
                        subMenu.hide({ immediate: true });

                        // Block opening the sub menu again until the mouse has completely left
                        // the menu item.
                        this._blockHoverOpenSubMenu = true;
                        const outHandler = () => {
                            this._blockHoverOpenSubMenu = false;
                            this._unbind("mouseleave", outHandler);
                        };
                        this._bind("mouseleave", outHandler);
                        this.select();
                    }
                    else {
                        subMenu.ownFocus();
                    }
                }
                else {
                    this.getOwner().activate();
                    this.hideSiblings({ immediate: true });
                    this.showSubMenu({ immediate: true });
                    subMenu.selectDefaultItem();
                }
            }
            else if (this.hasAction()) {
                this.select();
                return this.execute({ e: e, keepHighlight: this._parent.getMenuType() !== MenuType.SubMenu }) === true;
            }
        }
        else {
            this.getOwner().activate();
            this.hideSiblings({ immediate: true });
            this.select();
        }

        e.stopPropagation();
        e.preventDefault();
    }

    private _onDropClick(e?) {
        var subMenu;
        if (this.isEnabled()) {
            this.getOwner().activate();

            if (this.hasSubMenu()) {
                subMenu = this.getSubMenu();
                if (subMenu._parent === this && subMenu._visible) {
                    if (this._options.clickToggles === true) {
                        subMenu.hide({ immediate: true });
                        this.select();
                    }
                    else {
                        subMenu.ownFocus();
                    }
                }
                else {
                    this.hideSiblings({ immediate: true });
                    this.showSubMenu({ immediate: true });
                    subMenu.selectDefaultItem();
                }
            }
        }
        return false;
    }

    private _onPinClick(e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();

        this.toggleIsPinned();
    }

    public toggleIsPinned(isPinned = !this._isPinned, options?: { unfocus: boolean }) {
        this._isPinned = isPinned;

        this._updateState();

        const parent = this.getParentMenu();
        const menuPinningOptions = (parent && parent.getMenuPinningOptions()) || {};

        if (parent) {
            parent.updateAriaSetProperties();
        }

        // try to find the menu our pinning sibling may be in
        const siblingsMenus: Menu<MenuOptions>[] = [];
        let targetMenu: Menu<MenuOptions>;
        if (menuPinningOptions.isPinningSource) {
            targetMenu = parent.getParentMenu();
            siblingsMenus.push(targetMenu);
        }
        else if (menuPinningOptions.isPinningTarget) {
            targetMenu = parent;
            for (let i of <MenuItem[]>this._parent._menuItems) {
                if (i.hasSubMenu()) {
                    const menu = i.getSubMenu();
                    const childPinningOptions = menu && menu.getMenuPinningOptions();
                    if (childPinningOptions && childPinningOptions.isPinningSource) {
                        siblingsMenus.push(menu);
                    }
                }
            }
        }

        // find our sibling menu item and update it
        let sibling: MenuItem;
        if (siblingsMenus.length > 0) {
            let lastPinnableItem: MenuItem;
            for (let siblingsMenu of siblingsMenus) {
                for (let i of siblingsMenu._menuItems) {
                    if (i.isPinnable() && i._item.pinningOptions.groupId === this._item.pinningOptions.groupId) {
                        lastPinnableItem = i;
                    }
                    if (i._item.id === this._item.id) {
                        sibling = i;
                    }
                }
                if (sibling) {
                    break;
                }
            }

            if (sibling) {
                sibling._isPinned = this._isPinned;
                sibling._updateState();

                const siblingParentMenu = sibling.getParentMenu();

                if (siblingParentMenu) {
                    siblingParentMenu.updateAriaSetProperties();
                    if (lastPinnableItem && siblingParentMenu.getMenuPinningOptions().pinItemsToEnd) {
                        siblingParentMenu.moveMenuItemAfter(sibling, lastPinnableItem);
                    }
                }
            }
        }

        if (menuPinningOptions.closeOnPin && (!options || options.unfocus)) {
            // Hide sub-menu when pin clicked
            this._quenchMouseLeave = true;
            this._parent.selectLeft();
        }

        if (parent && !menuPinningOptions.closeOnPin) {
            // When an item is pinned or unpinned, try to select sibling item
            const siblingSelected = parent.selectPrevItem() || parent.selectNextItem();
            if (!siblingSelected) {
                // Hide menu since no items left to select
                parent.hide({ immediate: true });

                // Select first item of ancestor menu if exists
                const ancestorMenu = parent.getParentMenu();
                if (ancestorMenu) {
                    ancestorMenu.selectFirstItem();
                }
            }
        }

        targetMenu.updateSourceMenu(this._item.pinningOptions.groupId);

        const pinningOptions: IMenuItemPinningOptions = this._item.pinningOptions;
        if (pinningOptions.onPinnedChanged) {
            pinningOptions.onPinnedChanged(this, this._isPinned, sibling);
        }
    }

    private _onKeyDown(e: JQueryEventObject) {
        var isPlainKey = (): boolean => {
            return !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
        };

        switch (e.keyCode) {
            case KeyCode.RIGHT:
                if (isPlainKey()) {
                    if (!this._isPinFocused
                        && this.isPinnable()
                        && !this._item.pinningOptions.hidePin) {
                        this.focusPin();

                        return false;
                    }
                }

                break;
            case KeyCode.LEFT:
                if (isPlainKey()) {
                    if (this._isPinFocused) {
                        this.focusPin(false);
                        this.select();
                        return false;
                    }
                }

                break;
            case KeyCode.SPACE:
            case KeyCode.ENTER:
                if (this.isEnabled()) {
                    if (this._isPinFocused) {
                        this._element.focus();
                        this.toggleIsPinned();
                    }
                    else if (this.hasAction()) {
                        this.execute({ e: e });
                    }
                    else if (this.hasSubMenu()) {
                        const submenu = this.getSubMenu(/* create: */ false);
                        if (!submenu || !submenu._visible) {
                            this.hideSiblings({ immediate: true });
                            this.showSubMenu({ immediate: true });
                            this.getSubMenu().selectFirstItem();
                        }
                    }
                }
                return false;
        }
    }
}

VSS.initClassPrototype(MenuItem, {
    _item: null,
    _align: null,
    _index: 0,
    _highlightHover: false,
    _highlightPressed: false
});

interface ContributionWithSource {
    contribution: Contributions_Contracts.Contribution;
    source?: IContributedMenuSource;
}

export interface MenuContributionProviderOptions {
    defaultTextToTitle?: boolean;
}

export class MenuContributionProvider {

    private static readonly ACTION_TYPE = "ms.vss-web.action";
    private static readonly HYPERLINK_ACTION_TYPE = "ms.vss-web.hyperlink-action";

    private static DEFAULT_CONTRIBUTION_SOURCE_TIMEOUT = 5000;
    private static _contributionGetItemsTimeout = 2000;

    private _webContext: Contracts_Platform.WebContext;
    private _contributionIds: string[];
    private _contributionType: string;
    private _contributionQueryOptions: Contributions_Services.ContributionQueryOptions;
    private _getMenuActionContext: () => any;
    private _contributionsPromise: IPromise<ContributionWithSource[]>;
    private _contributedMenuItems: IContributedMenuItem[];
    private _options: MenuContributionProviderOptions;
    private _menu: Menu<MenuOptions>;

    constructor(menu: Menu<MenuOptions>, webContext: Contracts_Platform.WebContext, contributionIds: string[], contributionType: string, contributionQueryOptions: Contributions_Services.ContributionQueryOptions, getMenuActionContext: () => any, options: MenuContributionProviderOptions) {
        this._menu = menu;
        this._webContext = webContext;
        this._contributionIds = contributionIds;
        this._contributionType = contributionType;
        this._contributionQueryOptions = contributionQueryOptions || Contributions_Services.ContributionQueryOptions.IncludeRecursiveTargets;
        this._getMenuActionContext = getMenuActionContext;
        this._options = options || {};
    }

    private _immediateInstanceRequired(contribution: Contributions_Contracts.Contribution) {

        // We need an instance to render the menu item if there is no "text" property on the menu item.
        return contribution.id && Contributions_Services.ExtensionHelper.hasContent(contribution) && !contribution.properties["text"];
    }

    private _getContributions(): IPromise<ContributionWithSource[]> {

        if (!this._contributionsPromise) {
            if (this._contributionIds && this._contributionIds.length) {
                this._contributionsPromise = Service.getService(Contributions_Services.ExtensionService).queryContributions(this._contributionIds, this._contributionQueryOptions, this._contributionType).then((contributions) => {

                    var deferred = Q.defer<ContributionWithSource[]>();
                    var promises: IPromise<ContributionWithSource>[] = [];

                    contributions.forEach((contribution) => {
                        var promise = this._getContributionWithSource(contribution);
                        if (promise) {
                            promises.push(promise);
                        }
                    });

                    // Resolve the deferred once all menu sources are fetched.
                    Q.allSettled(promises).then((resolutions) => {
                        var contributionsWithSources: ContributionWithSource[] = [];
                        resolutions.forEach((resolution) => {
                            if (resolution.state === "rejected") {
                                console.error(resolution.reason);
                            }
                            if (resolution.state === "fulfilled" && resolution.value) {
                                contributionsWithSources.push(resolution.value);
                            }
                        });
                        deferred.resolve(contributionsWithSources);
                    }, deferred.reject);

                    return deferred.promise;
                });
            }
            else {
                this._contributionsPromise = Q.resolve([]);
            }

        }
        return this._contributionsPromise;
    }

    private _getContributionWithSource(contribution: Contributions_Contracts.Contribution): IPromise<ContributionWithSource> {
        const contributionId = contribution.id || "";

        // We need to create a background instance to discover menu items from this contribution
        // if the contribution type is ms.vss-web.action-provider.
        if (this._immediateInstanceRequired(contribution)) {
            return Contributions_Controls.getBackgroundInstance<IContributedMenuSource>(
                contribution,
                contribution.properties["registeredObjectId"] || contributionId,
                this._webContext,
                this._webContext,
                this.getContributionSourceTimeout(),
                "Timed-out waiting for menu source provider for contribution: " + contributionId).then((menuSource) => {
                    return {
                        contribution: contribution,
                        source: menuSource
                    };
                });
        }

        // We should be able to create the menu item from only properties on contributions
        // of type ms.vss-web.action and ms.vss-web.hyperlink-action.
        else if (contribution.type === MenuContributionProvider.ACTION_TYPE || contribution.type === MenuContributionProvider.HYPERLINK_ACTION_TYPE) {
            return Q.resolve({ contribution: contribution });
        }
        else {
            return null;
        }
    }

    private _makeThennable<T>(obj: T | IPromise<T>): IPromise<T> {
        if (obj && $.isFunction((<IPromise<T>>obj).then)) {
            return <IPromise<T>>obj;
        }
        else {
            return Q.resolve(obj);
        }
    }

    private _contributionToMenuItems(contributionWithSource: ContributionWithSource, context: any): IPromise<IMenuItemSpec[]> {

        var contributionId = contributionWithSource.contribution.id || "";

        if (contributionWithSource.source) {
            var deferred = Q.defer<IMenuItemSpec[]>();

            if ($.isFunction(contributionWithSource.source.getMenuItems)) {
                context = $.extend(
                    {
                        updateMenuItems: (items: IContributedMenuItem[]) => {
                            this._updateContributedMenuItems(items, contributionWithSource);
                        }
                    },
                    context);
                this._makeThennable(contributionWithSource.source.getMenuItems(context)).then((menuItems) => {
                    if (menuItems && menuItems.length) {
                        Q.all(menuItems.map(menuItem => this._updateContributedMenuFromSource(menuItem, contributionWithSource.contribution, contributionWithSource.source))).then((items) => {
                            deferred.resolve(items);
                        });
                    } else {
                        deferred.resolve(menuItems);
                    }
                }, deferred.reject);
            }
            else {
                this._getBasicMenuItemFromContribution(contributionId, contributionWithSource.contribution, contributionWithSource.source).then((item: IMenuItemSpec) => {
                    deferred.resolve([item]);
                });
            }

            return Q.timeout(deferred.promise, MenuContributionProvider._contributionGetItemsTimeout, "Timed-out waiting for getMenuItems call from contribution: " + contributionId);
        }
        else if (!this._immediateInstanceRequired(contributionWithSource.contribution)) {
            return this._getBasicMenuItemFromContribution(contributionId, contributionWithSource.contribution, contributionWithSource.source).then(item => [item]);
        }
        else {
            return Q.resolve([]);
        }
    }

    /**
     * Given a contributed menu item, create a menu item with the same properties.
     * Prevents a contributed menu item specifying properties not on the IContributedMenuItem interface
     * @param contributedItem
     * @return IMenuItemSpec
     */
    private static _getMenuItemFromContributedMenuItem(contributedItem: IContributedMenuItem): IMenuItemSpec {

        var menuItem: IMenuItemSpec = {
            id: contributedItem.id,
            text: contributedItem.text,
            title: contributedItem.title,
            separator: contributedItem.separator,
            disabled: contributedItem.disabled,
            hidden: contributedItem.hidden,
            icon: contributedItem.icon,
            noIcon: contributedItem.noIcon,
            groupId: contributedItem.groupId,
            action: contributedItem.action,
            href: contributedItem.href,
            setDefaultTitle: false
        };

        if ((<any>contributedItem).pinningOptions) {
            menuItem.pinningOptions = (<any>contributedItem).pinningOptions;
        }

        if ((<any>contributedItem).pinningMenuOptions) {
            menuItem.pinningMenuOptions = (<any>contributedItem).pinningMenuOptions;
        }

        if (contributedItem.childItems) {
            if ($.isArray(contributedItem.childItems)) {
                menuItem.childItems = (<IContributedMenuItem[]>contributedItem.childItems).map(c => MenuContributionProvider._getMenuItemFromContributedMenuItem(c));
            }
            else if (Q.isPromise(contributedItem.childItems)) {
                menuItem.childItems = (contextInfo, callback, errorCallback) => {
                    (<IPromise<IContributedMenuItem[]>>contributedItem.childItems).then((childItems) => {
                        callback((childItems || []).map(c => MenuContributionProvider._getMenuItemFromContributedMenuItem(c)));
                    }, errorCallback);
                };
            }
        }

        return menuItem;
    }

    private _updateContributedMenuFromSource(contributedMenuItem: IContributedMenuItem, contribution: Contributions_Contracts.Contribution, menuSource: IContributedMenuSource, isRootItem = true): IPromise<IMenuItemSpec> {
        var menuItem: IMenuItemSpec;
        if (isRootItem) {
            menuItem = MenuContributionProvider._getMenuItemFromContributedMenuItem(contributedMenuItem);
        }
        else {
            menuItem = contributedMenuItem;
        }
        menuItem.action = this._getMenuAction(contribution, menuSource, menuItem.action);

        var iconPromise: IPromise<string> = null;
        const baseUri = Service.getService(Contributions_Services.ExtensionService).getBaseUri(contribution);
        const publisherId = Contributions_Services.ExtensionHelper.getPublisherId(contribution);
        const extensionId = Contributions_Services.ExtensionHelper.getExtensionId(contribution);

        if (typeof menuItem.icon === "string") {
            iconPromise = Contributions_Services.ExtensionHelper.resolveUriTemplate(menuItem.icon, Context.getDefaultWebContext(), baseUri);
        }

        menuItem.isContribution = true;
        menuItem.sourceExtensionId = publisherId + "." + extensionId;
        menuItem.contributionId = contribution.id;

        if (menuItem.title && !menuItem.text && menuItem.text !== "") {
            if (this._options.defaultTextToTitle !== false || !menuItem.icon) {
                menuItem.text = menuItem.title;
            }
            else {
                menuItem.showText = false;
                menuItem.showHtml = false;
            }
        }

        if (isRootItem && !menuItem.groupId) {
            menuItem.groupId = contribution.properties["groupId"];
        }

        if ($.isArray(menuItem.childItems)) {
            menuItem.childItems.forEach((childItem) => {
                this._updateContributedMenuFromSource(childItem, contribution, menuSource, false);
            });
        }

        if (iconPromise) {
            return iconPromise.then((iconStr) => {
                menuItem.icon = iconStr;
                return menuItem;
            });
        }
        else {
            return Q.resolve(menuItem);
        }
    }

    private _getBasicMenuItemFromContribution(contributionId: string, contribution: Contributions_Contracts.Contribution, menuSource: IContributedMenuSource): IPromise<IMenuItemSpec> {

        var text = contribution.properties["text"] || null;
        var title = contribution.properties["title"] || null;
        var icon = this._makeThennable<string>("");
        if (typeof contribution.properties["icon"] === "string") {
            icon = Contributions_Services.ExtensionHelper.resolveUriTemplateProperty(contribution, Context.getDefaultWebContext(), "icon");
        }

        return icon.then((icon) => {
            var menuItem: IMenuItemSpec = {
                id: contributionId,
                text: text,
                title: title,
                icon: icon,
                groupId: contribution.properties["groupId"],
                action: this._getMenuAction(contribution, menuSource, null),
                isContribution: true,
                sourceExtensionId: Contributions_Services.ExtensionHelper.getPublisherId(contribution) + "." + Contributions_Services.ExtensionHelper.getExtensionId(contribution),
                contributionId: contributionId
            };

            if (text === null && title) {
                if (this._options.defaultTextToTitle !== false || !icon) {
                    menuItem.text = title;
                }
                else {
                    (<any>menuItem).showText = false;
                    (<any>menuItem).showHtml = false;
                }
            }
            return menuItem;
        });
    }

    private _getMenuAction(contribution: Contributions_Contracts.Contribution, menuSource: IContributedMenuSource, contributedMenuAction: IArgsFunctionR<any>): IArgsFunctionR<any> {

        var action: IArgsFunctionR<any>;

        if (!contributedMenuAction && contribution.type === MenuContributionProvider.ACTION_TYPE) {
            // Instantiate the contribution host to handle the action
            return () => {
                Contributions_Controls.getBackgroundInstance<IContributedMenuSource>(
                    contribution,
                    contribution.properties["registeredObjectId"] || contribution.id,
                    this._webContext,
                    this._webContext,
                    this.getContributionSourceTimeout(),
                    "Timed-out waiting for menu action: " + contribution.id).then((menuSource) => {
                        menuSource.execute(this._getMenuActionContext());
                    });
            };
        }

        if ($.isFunction(contributedMenuAction)) {
            return () => {
                Contributions_Services.ExtensionHelper.publishTraceData(contribution);
                return contributedMenuAction(this._getMenuActionContext());
            };
        }

        if (contribution.properties["targetUri"]) {
            return () => {
                var baseUri = Service.getService(Contributions_Services.ExtensionService).getBaseUri(contribution);
                var uriPromise = Contributions_Services.ExtensionHelper.resolveUriTemplate(contribution.properties["targetUri"], this._getMenuActionContext(), baseUri);
                uriPromise.then((url: string) => {
                    Contributions_Services.ExtensionHelper.publishTraceData(contribution, url);
                    window.location.href = url;
                });
            };
        }

        if (menuSource && $.isFunction(menuSource.execute)) {
            return () => {
                Contributions_Services.ExtensionHelper.publishTraceData(contribution);
                return menuSource.execute(this._getMenuActionContext());
            };
        }

        return action;
    }

    /**
     * Handles an extension calling updateMenuItems() to update its contributions.
     * @param items
     * @param contributionWithSource
     */
    private _updateContributedMenuItems(items: IContributedMenuItem[], contributionWithSource: ContributionWithSource) {
        if (this._menu) {
            Q.all(items.map(item => this._updateContributedMenuFromSource(item, contributionWithSource.contribution, contributionWithSource.source))).then((items) => {
                this._menu.updateContributedMenuItems(items);
            });
        }
    }

    public getContributedMenuItems(context: any): IPromise<IContributedMenuItem[]> {
        return this._getContributions().then((contributionsWithSource) => {
            var promises: IPromise<IContributedMenuItem[]>[] = [];
            contributionsWithSource.forEach((contributionWithSource) => {
                promises.push(this._contributionToMenuItems(contributionWithSource, context));
            });

            return Q.allSettled(promises).then((resolutions) => {
                var menuItems: IContributedMenuItem[] = [];
                resolutions.forEach((resolution) => {
                    if (resolution.value && resolution.value.length) {
                        resolution.value.forEach((menuItem) => {
                            menuItems.push(menuItem);
                        });
                    }
                });
                return menuItems;
            });
        });
    }


    /**
     * Gets the time in ms to wait to get actions from action provider or for the actions to run
     */
    public getContributionSourceTimeout() {
        return this._menu && this._menu._options && this._menu._options.contributionSourceTimeoutMs || MenuContributionProvider.DEFAULT_CONTRIBUTION_SOURCE_TIMEOUT;
    }
}

export interface MenuOptions extends MenuBaseOptions {
    suppressInitContributions?: boolean;
    contributionIds?: string[];
    contributionType?: string;
    contributionQueryOptions?: Contributions_Services.ContributionQueryOptions;

    /**
     * Time to wait in milliseconds for contribution iframes to be loaded.
     */
    contributionSourceTimeoutMs?: number;

    /**
     * Items to be displayed in the menu
     */
    items?: IMenuItemSpec[];

    /**
     * Action executed when a menu item is clicked
     */
    executeAction?: Function;
    getContributionContext?: Function;

    /**
     * Control the behavior of pinnable items in the menu.
     */
    pinningMenuOptions?: IMenuPinningOptions;

    /**
     * If true, any time a menu item w/ a sub-menu is hovered,
     * that sub-menu will be opened. If false, this menu must be
     * in an "active" state to show the sub menu.
     */
    alwaysOpenSubMenuOnHover?: boolean;

    /**
     * If true, do not add a separator between grouped items and
     * ungrouped items.
     */
    doNotSeparateUngroupedItems?: boolean;
}

/**
 * @publicapi
 */
export class Menu<TOptions extends MenuOptions> extends MenuBase<TOptions> {

    public static enhancementTypeName: string = "tfs.menu.menu";
    public static CONTRIBUTION_ITEMS_UPDATED_EVENT: string = "menuContributedItemsUpdated";

    private _items: IMenuItemSpec[];
    private _itemsSource;
    private _childrenCreated: boolean;
    private _popupElement: any;
    private _skipUpdateMenuItemStates: boolean;
    private _positioningRoutine: any;
    private _pinElement: any;
    private _menuContributionProvider: MenuContributionProvider;
    private _asyncLoadingDelay: Utils_Core.DelayedFunction;
    private _contributedItemsDelay: Utils_Core.DelayedFunction;
    private _menuUpdateNeeded: boolean;
    /** True if mouse down event has been received on this menu, and mouse up event has not been received. Only tracked for Edge. */
    private _mouseIsDown = false;
    private _shouldSelectFirstItem = false;
    private _shownTime: number;

    /**
     * Time the Menu was last displayed.
     */
    public get shownTime(): number { return this._shownTime; }

    protected _contributedItems: IContributedMenuItem[];
    protected _contributionProviderOptions: MenuContributionProviderOptions;
    protected _contributionPromise: IPromise<IContributedMenuItem[] | void>;

    public _menuItems: MenuItem[];
    public _selectedItem: MenuItem;
    public _visible: boolean;
    public _active: boolean;
    public _focusItem: MenuItem;
    public openSubMenuOnHover: boolean;

    /**
     * @param options
     */
    constructor(options?) {
        super(options);
        this.setEnhancementOptions({
            role: "menu",
            coreCssClass: "menu" + (this._options.useBowtieStyle ? " bowtie-menus" : ""),
            tagName: "ul"
        });
        this._menuItems = [];
        this._initializeItemsSource();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions(options);
        this.openSubMenuOnHover = options.alwaysOpenSubMenuOnHover;
    }

    public initialize() {
        super.initialize();
        if (!this._options.suppressInitContributions) {
            this.refreshContributedItems();
        }
        this._decorate();
    }

    private _initializeItemsSource(): void {
        this._itemsSource = this._options.items;
    }

    public _decorate() {
        this._element
            .addClass(this._options.cssCoreClass)
            .addClass(this._options.cssClass)
            .attr("tabindex", "-1")
            .attr("aria-label", this._options.ariaLabel);

        this._bind("mousedown", delegate(this, this._onMouseDown));
        this._bind("keydown", this._onMenuKeyDown.bind(this));
        this._itemsSource = this.getGroupedItems();
        this._ensureChildren();
    }

    /**
     * Gets the item which has the specified command id.
     *
     * @param id  Id associated with the menu item.
     * @return {MenuItem}
     * @publicapi
     */
    public getItem(id: string): MenuItem {

        var i, len, item;
        for (i = 0, len = this._menuItems.length; i < len; i++) {
            item = this._menuItems[i];
            if (item && id === item.getCommandId()) {
                return item;
            }
        }

        return null;
    }

    /**
     * Gets an array of all menu items.
     *
     * @return {MenuItem[]}
     * @publicapi
     */
    public getItems(): MenuItem[] {
        return this._menuItems;
    }

    /**
     * Gets the item which has the specified tag
     *
     * @param tag Associated with the menu item
     * @return
     */
    public getItemByTag(tag: string): MenuItem {

        var i, len, item;
        for (i = 0, len = this._menuItems.length; i < len; i++) {
            item = this._menuItems[i];
            if (item && tag === item._item.tag) {
                return item;
            }
        }
        return null;
    }

    public getMenuItemSpecs(): IMenuItemSpec[] {
        return this._items;
    }

    /**
     * Get the parent menu of this menu, if there is one.
     */
    public getParentMenu(): Menu<MenuOptions> {
        return this._parent && (this._parent._parent instanceof Menu) && this._parent._parent;
    }

    /**
     * Get the pinning options for this menu.
     */
    public getMenuPinningOptions(): IMenuPinningOptions {
        const item: IMenuItemSpec = (<any>this._options).item;
        if (item && item.pinningMenuOptions) {
            return item.pinningMenuOptions;
        }
        return this._options.pinningMenuOptions;
    }

    public getCommandState(commandId: string, context?): MenuItemState {
        context = context || this;
        var state: any = null;

        if ($.isFunction(this._options.getCommandState)) {
            state = this._options.getCommandState.call(context, commandId, context);
        }

        if (state === null || typeof state === "undefined") {
            state = this._commandStates && this._commandStates[commandId];
        }

        if (state === null || typeof state === "undefined") {
            if (this._parent && $.isFunction(this._parent.getCommandState)) {
                state = this._parent.getCommandState(commandId, context);
            }
        }

        if ($.isFunction(state)) {
            // we are trying to obsolete this mechanism of returning state as a function.
            Diag.Debug.fail("Menu 'State' should not be a function");
            state = state.call(context, commandId, context);
        }

        return state;
    }

    /**
     * Updates the command states of the items with the specified ids.
     *
     * @param commands List of commands to update.
     * @publicapi
     */
    public updateCommandStates(commands: ICommand[]): void {
        super.updateCommandStates(commands);

        if (!this._skipUpdateMenuItemStates) {
            this._updateMenuItemStates();
        }
    }

    public updateItems(items) {
        this._updateItems(items, true);
    }

    private _updateItems(items: any, refreshContributedMenuItems: boolean) {
        if (this._disposed) {
            return;
        }

        const beforeCount = this._menuItems.length;

        this._updateItemsWithContributions(items, this._contributedItems || []);
        if (refreshContributedMenuItems) {
            this._refreshContributedMenuItems();
        }

        // if we didn't have any elements before, and we do now, and our parent
        // menu item is focused, then we just got populated and we want to take
        // the focus
        if (beforeCount === 0
            && this._menuItems.length > 0
            && this._visible
            && this._parent && this._parent._element
            && this._parent._element[0] === document.activeElement) {
            this.selectFirstItem();
        }
    }

    protected _updateItemsWithContributions(items: any, contributedMenuItems: IContributedMenuItem[]) {
        if (this._disposed) {
            return;
        }

        this._fire("menuUpdatingContributedItems", { source: this, existingItems: items, contributedItems: contributedMenuItems });

        if (!items) {
            items = [];
        }

        if ($.isArray(items)) {
            items = $.grep(items, (item: any) => { return !item.isContribution });
            if (contributedMenuItems && contributedMenuItems.length) {
                items = items.concat(contributedMenuItems);
            }
        }

        this._contributedItems = contributedMenuItems;
        this._updateCombinedSource(items);
        this._fire(Menu.CONTRIBUTION_ITEMS_UPDATED_EVENT, { source: this, existingItems: items, contributedItems: contributedMenuItems });
    }

    protected _updateCombinedSource(items: any) {
        if (this._disposed) {
            return;
        }

        let selectedId: string;
        let refocus = false;

        if (this._element[0].contains(document.activeElement) && document.activeElement instanceof HTMLLIElement) {
            refocus = true;
            selectedId = this._selectedItem && this._selectedItem.getCommandId();
            if (this._parent instanceof MenuBase) {
                this._parent.focus();
            }
        }

        // If we are a submenu, make sure the parent has correct aria-haspopup value
        if (this._parent instanceof MenuBase) {
            if (items) {
                this._parent.getElement().attr({
                    "aria-haspopup": String(items.length > 0),
                    "aria-expanded": this._visible,
                });
            }
        }

        if (this._asyncLoadingDelay || this._contributedItemsDelay) {
            this._menuUpdateNeeded = true;
            this._itemsSource = items;
            this.getOwner().focus();
            return;
        }

        this._clear();
        this._itemsSource = items;

        if (this._initialized) {

            this._menuUpdateNeeded = false;
            this._itemsSource = this.getGroupedItems();
            this._ensureChildren();
            this.updateMenuItemStates();

            // Items are updated, we need to re-position the menu since
            // there might be an overflow
            if ($.isFunction(this._positioningRoutine)) {
                this._positioningRoutine.call(this);
            }

            // try to put the focus back where it was
            if (refocus) {
                const item = selectedId && this.getItem(selectedId);
                if (item) {
                    item.select();
                }
                else {
                    this.selectFirstItem();
                }
            }
            if (this._shouldSelectFirstItem) {
                this._shouldSelectFirstItem = false;
                this.selectFirstItem();
            }
        }
    }

    /**
     * Create a list from itemsSource to reflect the order of items after grouping is done.
     * Groups of items come before all ungrouped items.
     * A separator goes between each group of items.
     * Ungrouped items remain at the end of the menu with their manually-specified separators still in tact.
     * If any groups are defined, separators are guaranteed not to be the first or last item in the menu.
     */
    public getGroupedItems(): IMenuItemSpec[] {
        if (!$.isArray(this._itemsSource)) {
            return this._itemsSource;
        }
        var groupedItems = [];

        // Build up groups: a map from group => MenuItem[]
        // groups will also contain a key __ungrouped__, which points to an array of items without group names specified
        var groups = { "__ungrouped__": [] };
        this._itemsSource.forEach((item) => {
            if (item["groupId"] && (!item.separator || (item.separator && item.text))) {
                if (groups[item["groupId"]]) {
                    groups[item["groupId"]].push(item);
                } else {
                    groups[item["groupId"]] = [item];
                }
            } else {
                // ungrouped items and separators
                groups["__ungrouped__"].push(item);
            }
        });

        // If no groups are defined, don't proceed to process the separators.
        if (groups["__ungrouped__"].length === this._itemsSource.length) {
            return this._itemsSource;
        }

        // Reduce runs of separators in __ungrouped__ to a single separator
        // Also, result will not begin or end with a separator
        var prev = null;
        groups["__ungrouped__"] = groups["__ungrouped__"].reduce((result, next, index, arr) => {
            if (!(next.separator && !next.text && ((prev && prev.separator) || result.length === 0 || index === arr.length - 1))) {
                result.push(next);
            }
            prev = next;
            return result;
        }, []);

        $.each(groups, (group: string, groupItems: any[]) => {
            if (group === "__ungrouped__") {
                return true; // continue; // ungrouped items go at the end of the menu
            }
            Array.prototype.push.apply(groupedItems, groupItems);

            // Separator after each group
            groupedItems.push({ separator: true, isGroupSeparator: true });
        });

        // If there are no ungrouped items, or if we do not want to separate the ungrouped items,
        // since the last item is currently a separator, remove it.
        if (groups["__ungrouped__"].length === 0 || this._options.doNotSeparateUngroupedItems) {
            groupedItems.splice(groupedItems.length - 1, 1);
        }
        Array.prototype.push.apply(groupedItems, groups["__ungrouped__"]);

        // Remove any separators that may have gotten added at the end.
        while (groupedItems.length > 0 && groupedItems[groupedItems.length - 1].separator) {
            groupedItems.splice(groupedItems.length - 1, 1);
        }

        return groupedItems;
    }

    public appendItems(appendedItems) {
        if ($.isArray(appendedItems) && appendedItems.length) {
            this.updateItems((this._itemsSource || []).slice(0).concat(appendedItems));
        }
    }

    public appendItem(item: IMenuItemSpec) {
        this._createChildMenuItem(item);
        this._items.push(item);
    }

    /**
     * Move a menu item to appear immediately after the other given menu item.
     * @param item
     * @param after
     */
    public moveMenuItemAfter(item: MenuItem, after: MenuItem) {
        if (item === after) {
            return true;
        }

        const sourceChildIndex = this._children.indexOf(item);
        const sourceMenuItemIndex = this._menuItems.indexOf(item);
        const sourceItemIndex = this._items.indexOf(item._item);
        const destinationChildIndex = this._children.indexOf(after) + 1;
        const destinationMenuItemIndex = this._menuItems.indexOf(after) + 1;
        const destinationItemIndex = this._items.indexOf(after._item) + 1;

        if (sourceChildIndex < 0 || sourceMenuItemIndex < 0 || sourceItemIndex < 0
            || destinationChildIndex < 0 || destinationMenuItemIndex < 0 || destinationItemIndex < 0) {
            return false;
        }

        Utils_Array.reorder(this._children, sourceChildIndex, destinationChildIndex, 1);
        Utils_Array.reorder(this._menuItems, sourceMenuItemIndex, destinationMenuItemIndex, 1);
        Utils_Array.reorder(this._items, sourceItemIndex, destinationItemIndex, 1);

        for (let i = Math.min(sourceMenuItemIndex, destinationMenuItemIndex); i < this._menuItems.length; i++) {
            this._menuItems[i].setIndex(i);
        }

        item._element.detach();
        item._element.insertAfter(after._element);

        return true;
    }

    public removeItem(item: IMenuItemSpec) {
        for (let child of this._children) {
            if (child instanceof MenuItem && child._item === item) {
                return this.removeMenuItem(child);
            }
        }
        return false;
    }

    public removeMenuItem(menuItem: MenuItem) {
        const childIndex = this._children.indexOf(menuItem);
        const menuItemIndex = this._menuItems.indexOf(menuItem);
        const itemIndex = this._items.indexOf(menuItem._item);

        if (childIndex < 0 || itemIndex < 0) {
            return false;
        }

        this._children.splice(childIndex, 1);
        if (menuItemIndex >= 0) {
            this._menuItems.splice(menuItemIndex, 1);
        }
        this._items.splice(itemIndex, 1);

        menuItem.dispose();

        return true;
    }

    private _updateAllSourceMenus() {
        const updatedGroupIds: string[] = [];
        this._items.forEach(i => {
            if (i.pinningOptions && updatedGroupIds.indexOf(i.pinningOptions.groupId) < 0) {
                updatedGroupIds.push(i.pinningOptions.groupId);
                this.updateSourceMenu(i.pinningOptions.groupId);
            }
        });
    }

    /**
     * If all items in a group are pinned, hide its source menu.
     * If they're not all pinned, unhide the source menu.
     * @param pinningGroupId
     * @internal
     */
    public updateSourceMenu(pinningGroupId: string) {
        const menuPinningOptions = this.getMenuPinningOptions() || {};
        if (!menuPinningOptions.isPinningTarget || !menuPinningOptions.hideEmptySourceMenu) {
            return;
        }

        // see if we have any unpinned items
        const unpinnedExist = Utils_Array.first(this._menuItems, mi => {
            return mi._item
                && mi._item.pinningOptions
                && mi._item.pinningOptions.groupId === pinningGroupId
                && !mi.isPinned();
        });

        // find the source menu
        const sourceMenuItem = Utils_Array.first(this._menuItems, mi => {
            const submenu = mi.getSubMenu();
            const sourcePinningOptions: IMenuPinningOptions = submenu && submenu.getMenuPinningOptions();
            return sourcePinningOptions && sourcePinningOptions.isPinningSource && sourcePinningOptions.groupId === pinningGroupId;
        });
        if (!sourceMenuItem) {
            return;
        }
        sourceMenuItem.setIsHidden(!unpinnedExist);
    }

    /**
     * @param element
     */
    public _enhance(element: JQuery) {

        super._enhance(element);
        this._enhanceChildren();
    }

    /**
     * @return
     */
    public _getMenuItemType(): any {

        return MenuItem;
    }

    /**
     * @param extraOptions
     * @return
     */
    public getMenuItemOptions(item, extraOptions?): any {

        return $.extend({
            earlyInitialize: false,
            item: item,
            align: this.getMenuItemAlignment(),
            overflow: this._options.overflow
        }, extraOptions);
    }

    public _getFirstMenuItem(): MenuItem {
        return this._getNextEnabledItem(0);
    }

    /**
     * @param item
     * @param ignoreFocus
     */
    public _selectItem(item?: MenuItem, ignoreFocus = false, setKeyboardFocus = true) {
        if (this._selectedItem && this._selectedItem !== item) {
            this._selectedItem.removeHighlight();
            this._selectedItem.removeFocus();
        }

        this._selectedItem = item;

        if (!item) {
            return;
        }

        item.showHoverHighlight();

        // Setting the item as the selected item

        if (!ignoreFocus) {
            const owner = this.getOwner();
            owner._focusItem = item;
            this._selectedItem.setFocus(setKeyboardFocus);
        }
    }

    public selectDefaultItem(ignoreFocus?: boolean) {
        if (!ignoreFocus) {
            Utils_UI.tryFocus(this._element);
        }
    }

    public selectFirstItem() {
        var firstItem = this._getFirstMenuItem();

        if (firstItem) {
            // Selecting the first item
            this._selectItem(firstItem);

            return true;
        }
        else {
            // if no menu items have loaded yet, select the first one once they have loaded.
            this._shouldSelectFirstItem = true;
        }

        return false;
    }

    public selectLastItem() {
        const lastItem = this._getPrevEnabledItem(-1, { rollOver: true });
        if (lastItem) {
            this._selectItem(lastItem);
        }
    }

    public selectNextItem() {
        let index = 0,
            menuItems = this._menuItems,
            selectedItem = this._selectedItem;

        if (menuItems.length > 0) {
            if (selectedItem) {
                index = selectedItem.getIndex() + 1;
            }

            let newItem = this._getNextEnabledItem(index);
            if (newItem) {
                newItem.select();
                return true;
            }
        }
        return false;
    }

    public selectPrevItem() {
        let index = -1,
            menuItems = this._menuItems,
            selectedItem = this._selectedItem;

        if (menuItems.length > 0) {
            if (selectedItem) {
                index = selectedItem.getIndex() - 1;
            }

            let newItem = this._getPrevEnabledItem(index);
            if (newItem) {
                newItem.select();
                return true;
            }
        }

        return false;
    }

    /**
     * @param options
     * @return
     */
    public selectDown(options?): boolean {
        if (this._menuItems.length > 0) {
            let newItem = this._getNextFocusableItem(this._selectedItem ? this._selectedItem.getIndex() + 1 : 0, { rollOver: true });
            if (newItem) {
                newItem.select();
                this._ensureVisible(newItem);
                return true;
            }
        }

        return false;
    }

    /**
     * @param options
     * @return
     */
    public selectUp(options?): boolean {
        if (this._menuItems.length > 0) {
            let newItem = this._getPrevFocusableItem(this._selectedItem ? this._selectedItem.getIndex() - 1 : -1, { rollOver: true });
            if (newItem) {
                newItem.select();
                this._ensureVisible(newItem);
                return true;
            }
        }

        return false;
    }

    /**
     * @param options
     * @return
     */
    public selectRight(options?): boolean {

        if (this._selectedItem && this._selectedItem.tryShowSubMenu({ immediate: true })) {
            this._selectedItem.getSubMenu().selectFirstItem();
            return true;
        }
        else if (<Menu<any>>this.getOwner() !== this) {
            return this.getOwner().selectRight({ redirected: true });
        }
    }

    /**
     * @param options
     * @return
     */
    public selectLeft(options?): boolean {

        if (this._parent && this._parent._parent !== this.getOwner()) {
            this.hide({ immediate: true });
            this._parent.select();
            return true;
        }
        else if (<Menu<any>>this.getOwner() !== this) {
            return this.getOwner().selectLeft({ redirected: true });
        }
    }

    /**
     * Show the menu.
     *
     * Options:
     *  immediate: whether to show the menu immediately or after a short delay (default false)
     *  showTimeout: optional number of milliseconds to wait before showing when immediate is false
     *  callback: function to call after menu is shown
     *  align: how to align the menu with its parent
     *  setFocus: whether to set the focus to the menu (default true)
     */
    public show(options?) {
        const immediate = options && options.immediate === true,
            showTimeout = options ? options.showTimeout : undefined,
            callback: Function = options && options.callback,
            element = options ? options.element : null,
            align = options ? options.align : MenuAlign.RightJustify,
            setFocus = (options && options.setFocus) !== false;

        if (!element) {
            throw new Error("options.element is required.");
        }

        if (immediate) {
            this._showPopup(element, align, setFocus);
            if (callback) {
                callback();
            }
        }
        else {
            this._startShowTimeout(element, align, setFocus, showTimeout || this.getOwner()._options.showTimeout, callback);
        }
        return true;
    }

    /**
     * @param options
     */
    public hide(options?) {
        var immediate = options && options.immediate === true;
        var hideTimeout = options ? options.hideTimeout : undefined;
        var callback = options ? options.callback : undefined;
        if (immediate) {
            this._hidePopup();
            if (callback) {
                callback();
            }
        }
        else {
            this._startHideTimeout(hideTimeout || this.getOwner()._options.hideTimeout, callback);
        }
    }

    public hideChildren(excludedItem: MenuItem, options?) {
        var i, len, item;
        var children = this._children;
        var immediate = options && options.immediate === true;
        var splitDrop: MenuItem = excludedItem && excludedItem._item && excludedItem._item.splitDrop;

        if ($.isArray(children)) {
            for (i = 0, len = children.length; i < len; i++) {
                item = children[i];
                if (item !== excludedItem && item !== splitDrop) {
                    item.hideSubMenu({ immediate: immediate });
                }
            }
        }
    }

    /**
     * @param options
     * @return
     */
    public escape(options?): boolean {
        this.hide({ immediate: true });

        if (this._parent) {
            this._parent.escaped();
        }

        return true;
    }

    public ownFocus() {
        this._selectItem(this._selectedItem);
    }

    public attach(parent) {
        if (this._parent !== parent) {
            if (this._visible) {
                this.hide({ immediate: true });
            }
        }
        this._parent = parent;
    }

    /**
     * @return
     */
    public getMenuItemAlignment(): string {
        return "right-justify";
    }

    public updateMenuItemStates() {
        try {
            this._skipUpdateMenuItemStates = true;
            this._fireUpdateCommandStates(this);
        }
        finally {
            this._skipUpdateMenuItemStates = false;
        }

        this._updateMenuItemStates();
    }

    public executeAction(eventArgs) {
        var result;

        if ($.isFunction(this._options.executeAction)) {
            result = this._options.executeAction.call(this, eventArgs);
        }

        if (result !== false) {
            result = menuManager.executeCommand(eventArgs);
        }

        return result;
    }

    /**
     * Scrolls to ensure that the MenuItem is visible
     *
     * @param item MenuItem which is to be shown
     */
    private _ensureVisible(item: MenuItem) {
        if (item && item.getElement()) {
            const itemElement = item.getElement(),
                menuElement = this.getElement();

            const outerHeight = itemElement.outerHeight(true);
            const top = item.getIndex() * outerHeight;
            const bottom = top + outerHeight;

            if (top < menuElement.scrollTop()) {
                menuElement.scrollTop(top);
            }
            else if ((bottom - menuElement.height()) > menuElement.scrollTop()) {
                menuElement.scrollTop(bottom - menuElement.height());
            }
        }
    }

    private _getItems(): IMenuItemSpec[] {
        var items: IMenuItemSpec[], finished = false;
        if (!this._items) {
            if (this._itemsSource) {
                if ($.isFunction(this._itemsSource)) {
                    items = this._itemsSource.call(this, this.getOwner().getContextInfo(), (items: IMenuItemSpec[]) => {
                        if (this._asyncLoadingDelay) {
                            this._asyncLoadingDelay.cancel();
                            this._asyncLoadingDelay = null;
                        }
                        this._items = items || [];
                        if (finished) {
                            if (!this._disposed) {
                                this._updateItems(this._items, false);
                            }
                        }
                        else {
                            finished = true;
                        }
                    }, (error) => {
                        if (this._asyncLoadingDelay) {
                            this._asyncLoadingDelay.cancel();
                            this._asyncLoadingDelay = null;
                        }
                        this._items = [{ text: getErrorMessage(error), icon: "icon-tfs-build-failed" }];
                        if (finished) {
                            if (!this._disposed) {
                                this._updateItems(this._items, false);
                            }
                        }
                        else {
                            finished = true;
                        }

                        handleError(error);
                    });

                    if (!finished) {
                        finished = true;
                        if (!items) {
                            items = [];
                            this._asyncLoadingDelay = Utils_Core.delay(this, 200, () => {
                                this._asyncLoadingDelay = null;
                                this._updateItems([{ text: Resources_Platform.MenuItemsLoading }], false);
                            });
                        }

                        this._items = items;
                    }
                }
                else {
                    this._items = this._itemsSource;
                }
            }
            else {
                this._items = [];
            }
        }

        return this._items;
    }

    public _clear() {
        if (this._element[0].contains(document.activeElement)) {
            // Check to see if one of our children has the focus, because sometimes (especially in
            // Firefox) if we remove the element with focus, we don't get a blur event which leaves
            // the menu owner removed from the tab order.
            Utils_UI.tryFocus(this._element);
        }

        super._clear();

        this._menuItems = [];
        this._items = null;
        this._childrenCreated = false;
    }

    /**
     * @param menuItemElement
     */
    private _createChildMenuItem(item: IMenuItemSpec, menuItemElement?: JQuery) {

        var menuItem: MenuItem, options;

        options = this.getMenuItemOptions(item, item ? item.extraOptions : undefined);

        if (menuItemElement) {
            menuItem = <MenuItem>Controls.Enhancement.enhance(this._getMenuItemType(), menuItemElement, options);
        }
        else {
            menuItem = <MenuItem>Controls.BaseControl.createIn(this._getMenuItemType(), this._element, options);
        }

        // Setting the parent
        menuItem._parent = this;

        // Adding the item to the children
        this._children.push(menuItem);

        if (!menuItem._item.separator) {
            menuItem.setIndex(this._menuItems.length);
            this._menuItems.push(menuItem);
        }

        // If it has childItems and using a splitDrop, then create a separate splitDrop menuItem with the childItems
        if (item.splitDropOptions && (item.childItems || item.splitDropOptions.childItems)) {
            this._createSplitDropMenuItem(item, menuItem);
        }

        menuItem.initialize();
        return menuItem;
    }

    private _createSplitDropMenuItem(item: IMenuItemSpec & any, menuItem: MenuItem) {
        var splitDropMenuItemSpec = $.extend(item.splitDropOptions, <IMenuItemSpec>{
            splitDropItem: menuItem,
            childItems: item.splitDropOptions.childItems || item.childItems, // item.childItems is set to null, save this so when updateContribution renders again it won't be lost
            showText: false,
            showHtml: false,
            toggled: item.toggled,
            disabled: item.disabled,
            title: item.splitDropOptions && item.splitDropOptions.title,
            noIcon: item.splitDropOptions.noIcon !== undefined ? item.splitDropOptions.noIcon : true,
            cssClass: item.splitDropOptions.cssClass || <any>"split-drop",
            splitDropOptions: null
        });
        item.splitDrop = this._createChildMenuItem(splitDropMenuItemSpec);
        item.childItems = null;
        menuItem._element.addClass("split-drop-item");
    }

    private _ensureChildren() {
        var that = this;

        if (!this._childrenCreated) {
            $.each(this._getItems(), function (i, item) {
                that._createChildMenuItem(item);
            });

            this._childrenCreated = true;

            const pinningOptions = this.getMenuPinningOptions();
            if (pinningOptions && pinningOptions.isPinningTarget) {
                this._updateAllSourceMenus();
            }

            this.updateAriaSetProperties();
        }
    }

    private _enhanceChildren() {
        const items = this._getItems();
        this._element.children("li").each((i, li) => {
            this._createChildMenuItem($.extend({}, items[i], { decorated: true }), $(li));
        });

        this._childrenCreated = true;

        this.updateAriaSetProperties();
    }

    /**
     * Updates aria set related properties, use after modifying the child items of the menu.
     */
    public updateAriaSetProperties() {
        if (this._menuItems) {
            let count = 0;
            for (const item of this._menuItems) {
                if (item.isFocusable()) {
                    count++;
                }
            }
            let posinset = 0;
            for (let i = 0; i < this._menuItems.length; ++i) {
                if (this._menuItems[i].isFocusable()) {
                    this._menuItems[i].getElement().attr({
                        "aria-posinset": ++posinset, // 1-based index
                        "aria-setsize": count,
                    });
                }
            }
        }
    }

    /**
     * Get the first item at or after the given index that is focusable.
     * @param index
     * @param options
     */
    protected _getNextFocusableItem(index: number, options?: { rollOver: boolean }) {
        return this._getNextItem(item => item.isFocusable(), index, options);
    }

    /**
     * Get the first item at or after the given index that is enabled.
     * @param index
     * @param options
     */
    private _getNextEnabledItem(index: number, options?: { rollOver: boolean }) {
        return this._getNextItem(item => item.isEnabled(), index, options);
    }

    /**
     * Get the next item at or after the given index that meets the given condition.
     * @param condition
     * @param index
     * @param options
     */
    private _getNextItem(condition: (item: MenuItem) => boolean, index: number, options?: { rollOver: boolean }) {
        let rollOver = options && options.rollOver === true,
            item: MenuItem,
            menuItems = this._menuItems;

        function getItem(start: number, end: number) {
            let i: number, result: MenuItem;
            for (i = start; i <= end; i++) {
                result = menuItems[i];
                if (condition(result)) {
                    return result;
                }
            }
            return null;
        }

        index = index || 0;

        item = getItem(index, menuItems.length - 1);
        if (item) {
            return item;
        }

        if (rollOver) {
            item = getItem(0, index);
            if (item) {
                return item;
            }
        }

        return null;
    }

    /**
     * Get the closest item at or before the given index that is focusable.
     * @param index
     * @param options
     */
    private _getPrevFocusableItem(index: number, options?: { rollOver: boolean }) {
        return this._getPrevItem(item => item.isFocusable(), index, options);
    }

    /**
     * Get the closest item at or before the given index that is enabled.
     * @param index
     * @param options
     */
    private _getPrevEnabledItem(index: number, options?: { rollOver: boolean }) {
        return this._getPrevItem(item => item.isEnabled(), index, options);
    }

    /**
     * Get the closest item at or before the given index that meets the given condition.
     * @param condition
     * @param index
     * @param options
     */
    private _getPrevItem(condition: (item: MenuItem) => boolean, index: number, options?: { rollOver: boolean }) {
        let rollOver = options && options.rollOver === true,
            item: MenuItem,
            menuItems = this._menuItems;

        function getItem(start: number, end: number) {
            let i: number, result: MenuItem;
            for (i = end; i >= start; i--) {
                result = menuItems[i];
                if (condition(result)) {
                    return result;
                }
            }
            return null;
        }

        index = index || 0;

        item = getItem(0, index);
        if (item) {
            return item;
        }

        if (rollOver) {
            item = getItem(index, menuItems.length - 1);
            if (item) {
                return item;
            }
        }

        return null;
    }

    private _ensurePopup() {
        if (this._ensureInitialized()) {
            this._popupElement = this._element;
        }

        this._ensureChildren();
    }

    private _getPopupAlign(align) {
        switch (align) {
            case MenuAlign.RightJustify:
                return ["left-top", "right-top"];
            case MenuAlign.RightBottom:
                return ["right-top", "right-bottom"];
            case MenuAlign.LeftTop:
                return ["left-bottom", "left-top"];
        }

        return ["left-top", "left-bottom"];
    }

    private _showPopup(element, align, setFocus: boolean) {

        this._clearTimeouts();
        this._ensurePopup();
        this.updateAriaSetProperties();

        this._pinElement = element;

        // A scroll event may be triggered after this function in the case clicking on the item at top
        // There is no way to prevent the event get triggered so attach the scroll event listener a bit later
        Utils_Core.delay(this, 300, () => {
            this._attachAncestorScroll(element);
        });

        this.updateMenuItemStates();

        var popupAlign = this._getPopupAlign(align);
        this._element.show();

        if (this._parent instanceof MenuBase) {
            this._parent.getElement().attr("aria-expanded", "true");
        }

        // We need to have a reference to our positioning routine in case the
        // items are loaded asynchronously. In that case, the popup menu should
        // be repositioned with the new elements (scrollbar might be needed)
        this._positioningRoutine = function () {
            var elementAlignmentMarker, baseAlignmentMarker;

            if (this._options.alignToMarkerVertical || this._options.alignToMarkerHorizontal) {
                if ($.isFunction(this._options.getAlignmentMarkers)) {
                    let markers = this._options.getAlignmentMarkers.call(this, this._element, element);
                    elementAlignmentMarker = markers.elementAlignmentMarker;
                    baseAlignmentMarker = markers.baseAlignmentMarker;
                }
                else {
                    elementAlignmentMarker = this._element.find(".alignment-marker").first();
                    baseAlignmentMarker = element.find(".alignment-marker:not(.sub-menu .alignment-marker)").first();
                }
            }

            let overflow: string = this._options.overflow;
            if (!overflow) {
                let grandparent = this._parent && this._parent._parent;
                if (grandparent instanceof Menu
                    && !(grandparent instanceof PopupMenuO)
                    && !(grandparent instanceof MenuBarO)) {
                    overflow = "flip-flip";
                }
                else {
                    overflow = "fit-flip";
                }
            }

            Utils_UI.Positioning.position(this._element, element,
                {
                    elementAlign: popupAlign[0],
                    baseAlign: popupAlign[1],
                    overflow: overflow,
                    supportScroll: true,
                    scrollByMarker: this._options.scrollByMarker,
                    alignToMarkerHorizontal: this._options.alignToMarkerHorizontal,
                    alignToMarkerVertical: this._options.alignToMarkerVertical,
                    elementAlignmentMarker: elementAlignmentMarker,
                    baseAlignmentMarker: baseAlignmentMarker
                });
        };

        // remove previous position because it may render weird if we're at the edge of the screen
        // default position is set in css and is far off screen
        this._element[0].style.removeProperty('left');
        this._element[0].style.removeProperty('top');

        // Positioning popup menu
        this._positioningRoutine.call(this);

        this._visible = true;
        this._shownTime = Date.now();
        this.getOwner()._updateSubMenuVisibleState();
        if (setFocus) {
            this.ownFocus();
        }
    }

    public _hidePopup() {
        if (this._parent instanceof MenuBase && this._parent.getElement() != null) {
            this._parent.getElement().attr("aria-expanded", "false");
        }

        if (this._visible && (<any>this._options).item.dynamic) {
            this._clear();
        }

        this._clearTimeouts();
        this._visible = false;

        if (this._pinElement) {
            this._detachAncestorScroll(this._pinElement);
            this._pinElement = null;
        }

        if (this._popupElement) {
            this._popupElement.hide();
        }

        delete this._positioningRoutine;

        this.hideChildren(null, { immediate: true });
        this.getOwner()._updateSubMenuVisibleState();
    }

    private _updateMenuItemStates() {
        // variables to track whether the current separator should be visible or not
        let separator: MenuItem;
        let subsequentTextItem = false;
        let sawSeparator = false;
        let precedingTextItem = false;
        /**
         * Only show separators that are directly between 2 visible text items.
         * If the separator is next to a visible separator or is not both followed and preceded by a text item then it should be hidden
         */
        function isSeparatorVisible() {
            return subsequentTextItem && precedingTextItem;
        }
        /** Check if the current separator should be visible and update accordingly */
        function updateSeparator() {
            const visible = isSeparatorVisible();
            if (separator && separator.isHidden() === visible) {
                // We need to use the existing item as a base because it might contain
                // different properties other than separator and hidden (like text)
                separator.update($.extend(separator._item, { separator: true, hidden: !visible }));
            }
        }

        for (const child of this._children) {
            if (child.isSeparator() && !child.isLabel()) {
                sawSeparator = true
                separator = child;
                updateSeparator();
            } else {
                if (!child.isHidden() && !sawSeparator) {
                    precedingTextItem = true;
                }
                else if (!child.isHidden() && sawSeparator) {
                    subsequentTextItem = true;
                }

                if (separator && isSeparatorVisible() && !child.isHidden()) {
                    updateSeparator();
                    separator = null;
                    sawSeparator = false;
                    precedingTextItem = true;
                    subsequentTextItem = false;
                }

                child._updateState();
                child.updateText();
            }
        }

        updateSeparator();
    }

    private _startShowTimeout(element, align, setFocus: boolean, showTimeout: number, callback: Function) {
        this._clearTimeouts();
        this.delayExecute("show", showTimeout, true, () => {
            if (!this.isDisposed()) {
                this._showPopup(element, align, setFocus);
                if (callback) {
                    callback();
                }
            }
        });
    }

    private _startHideTimeout(hideTimeout: number, callback: Function) {
        this._clearTimeouts();
        this.delayExecute("hide", hideTimeout, true, () => {
            this._hidePopup();
            if (callback) {
                callback();
            }
        });
    }

    /**
     * @internal
     */
    public _clearTimeouts() {
        this.cancelDelayedFunction("show");
        this.cancelDelayedFunction("hide");
    }

    private _attachAncestorScroll(element) {
        this._bind($(element).parents(), "scroll", delegate(this, this._onParentScroll));
    }

    private _detachAncestorScroll(element) {
        this._unbind($(element).parents(), "scroll");
    }

    protected _dispose() {
        if (this._pinElement) {
            this._detachAncestorScroll(this._pinElement);
        }
        if (this._asyncLoadingDelay) {
            this._asyncLoadingDelay.cancel();
            this._asyncLoadingDelay = null;
        }
        if (this._contributedItemsDelay) {
            this._contributedItemsDelay.cancel();
            this._contributedItemsDelay = null;
        }

        // Clear the actions
        this._options.executeAction = null;

        super._dispose();
    }

    public _onParentScroll(e: Event) {
        // Edge has a bug where it sends spurious scroll events when we click a menu item for the first time
        // causing the menu to close before the item is clicked.
        if (!Utils_UI.BrowserCheckUtils.isEdge() || !this._mouseIsDown) {
            this._hidePopup();
        }
    }

    private _onMouseDown(e: MouseEvent) {
        // When the popup menu container is clicked, blur is blocked
        // for a specific period of time (50ms) to be able to catch the click events
        // of the elements inside the popup menu.
        if (Utils_UI.BrowserCheckUtils.isEdge()) {
            this._mouseIsDown = true;
            this._bind(window.document, "mouseup", () => {
                this._mouseIsDown = false;
                this._unbind(window.document, "mouseup");
            }, true);
        }
    }

    private _onMenuKeyDown(e: KeyboardEvent) {
        const isPlainKey = !e.ctrlKey && !e.altKey && !e.shiftKey;

        switch (e.keyCode) {
            case KeyCode.DOWN:
                if (isPlainKey) {
                    this.selectDown();
                    return false;
                }
                break;

            case KeyCode.UP:
                if (isPlainKey) {
                    this.selectUp();
                    return false;
                }
                break;

            case KeyCode.RIGHT:
                if (isPlainKey) {
                    this.selectRight();
                    return false;
                }
                break;

            case KeyCode.LEFT:
                if (isPlainKey) {
                    this.selectLeft();
                    return false;
                }
                break;

            case KeyCode.ESCAPE:
                if (this.escape()) {
                    return false;
                }
                break;

            case KeyCode.HOME:
                if (isPlainKey) {
                    this.selectFirstItem();
                    return false;
                }
                break;

            case KeyCode.END:
                if (isPlainKey) {
                    this.selectLastItem();
                    return false;
                }
                break;
        }
    }

    /**
     * Change the contribution options for this menu and reload the contributed menu items
     *
     * @param contributionIds The contribution ids to query for this menu
     * @param contributionType Optional type of contributions to include
     * @param contributionQueryOptions Optional contribution query options
     */
    public setContributedItemOptions(contributionIds: string[], contributionType?: string, contributionQueryOptions?: Contributions_Services.ContributionQueryOptions) {

        let anyChange = false;

        if ((this._options.contributionIds || []).join(";") !== contributionIds.join(";")) {
            this._options.contributionIds = contributionIds;
            anyChange = true;
        }

        if (typeof contributionType !== "undefined" && this._options.contributionType !== contributionType) {
            this._options.contributionType = contributionType;
            anyChange = true;
        }

        if (typeof contributionQueryOptions !== "undefined" && this._options.contributionQueryOptions !== contributionQueryOptions) {
            this._options.contributionQueryOptions = contributionQueryOptions;
            anyChange = true;
        }

        if (anyChange) {
            this._menuContributionProvider = null;
            this._menuUpdateNeeded = true;
            this.refreshContributedItems();
        }
    }

    /**
     * Load contributed menu items.
     */
    public refreshContributedItems() {

        if (!this._menuContributionProvider && this._options.contributionIds) {
            this._menuContributionProvider = new MenuContributionProvider(this, Context.getDefaultWebContext(), this._options.contributionIds, this._options.contributionType, this._options.contributionQueryOptions, this._getContributionContext.bind(this), this._contributionProviderOptions);

            // Allow up to 100 ms for contributed menu items to come in. This prevents flickering caused by showing primary menu items, then repainting
            // the menu for contributed items a few ms later.
            this._contributedItemsDelay = Utils_Core.delay(this, 100, () => {
                this._contributedItemsDelay = null;
                this._updateItems(this._items, false);
            });
        }

        this._refreshContributedMenuItems();
    }

    /**
     * Load contributed menu items.
     */
    private _refreshContributedMenuItems() {

        if (this._menuContributionProvider) {
            // Fetch contributions
            this._contributionPromise = this._menuContributionProvider.getContributedMenuItems(this._getContributionContext())
                .then((contributedMenuItems) => {
                    if (this._contributedItemsDelay) {
                        this._contributedItemsDelay.cancel();
                        this._contributedItemsDelay = null;
                    }
                    if (this._menuUpdateNeeded || (contributedMenuItems && contributedMenuItems.length)) {
                        this._updateItemsWithContributions(this._itemsSource, contributedMenuItems);
                    }
                }, (error: Error) => {
                    error.name = Utils_String.format("{0}.GetContributedMenuItemsError", (error.name || ""));
                    error.message = "getContributedMenuItems() failed in Menu._refreshContributedMenuItems: " + VSS.getErrorMessage(error);

                    VSS_Error.publishErrorToTelemetry(error, false, VSS_ClientTrace_Contracts.Level.Warning, {
                        thirdParty: true
                    });
                });
        }
    }

    /**
     * Update contributed menu items that have already been added to this menu.
     *
     * Menu items must have an id set in order to be updated. Extensions can only update menu items that they contributed.
     *
     * Exposed to extensions as the updateMenuItems() method on the context object passed to getMenuItems().
     * @param contributedMenuItems
     */
    public updateContributedMenuItems(contributedMenuItems: IMenuItemSpec[]) {
        this._contributionPromise.then((value) => {
            // subclasses of Menu may have rearranged our items so we're just going to have to propagate all the updates through all the children

            // flatten updated items into one array
            var contributedMenuItemList: IMenuItemSpec[] = [];
            (function appender(items: IMenuItemSpec[]) {
                Array.prototype.push.apply(contributedMenuItemList, items);
                items.forEach((item) => {
                    if (item.childItems && item.childItems.length > 0) {
                        appender(item.childItems);
                    }
                });
            }(contributedMenuItems));

            // we can only update items that have an id
            contributedMenuItemList = contributedMenuItemList.filter(item => !!item.id);

            this._updateContributedMenuItems(contributedMenuItemList);
        });
    }

    /**
     * Creates context object to be passed to extensions.
     */
    private _getContributionContext(): any {
        var context: any = this._options.contextInfo ? $.extend({}, this._options.contextInfo.item) : {};
        if ($.isFunction(context.getContributionContext)) {
            context = context.getContributionContext();
        } else if ($.isFunction(this._options.getContributionContext)) {
            context = this._options.getContributionContext();
        }

        return context;
    }
}

VSS.initClassPrototype(Menu, {
    _items: null,
    _itemsSource: null,
    _menuItems: null,
    _selectedItem: null,
    _focusItem: null,
    _childrenCreated: false,
    _popupElement: null,
    _visible: false,
    _active: false,
    _skipUpdateMenuItemStates: false,
    _positioningRoutine: null,
    _pinElement: null
});

export interface MenuOwnerOptions extends MenuOptions {
    /**
     * Determines whether icons are visible or not
     * @defaultvalue true
     */
    showIcon?: boolean;
    markUnselectable?: boolean;
    showTimeout?: number;
    hideTimeout?: number;
    popupAlign?: string;
    onActivate?: Function;
    onDeactivate?: Function;
    /**
     * If true, put the menu the tab order so that it is accessible by tabbing.
     * Defaults to true.
     */
    inTabOrder?: boolean;
    /**
     * If true, include empty menu with no items in tab order.
     * If false, add tabIndex only if menu has items.
     * Use with inTabOrder = true.
     * Defaults to true.
     */
    emptyMenuInTabOrder?: boolean;
}

export class MenuOwner<TOptions extends MenuOwnerOptions> extends Menu<TOptions> {

    private _focusElement: JQuery;
    private _activating: boolean;
    private _canBlur: boolean;
    private _immediateBlur: boolean;
    private _focusing = false;

    public _subMenuVisible: boolean;
    public _align: any;

    /**
     * @param options
     */
    constructor(options?: TOptions) {
        super(options);

        this.setEnhancementOptions({ role: "menu" });

        this._align = MenuAlign.parse(this._options.align);
    }

    /**
     * @param options
     */
    public initializeOptions(options?: TOptions) {
        super.initializeOptions($.extend({
            markUnselectable: true,
            showIcon: true,
            showTimeout: 500,
            hideTimeout: 500
        }, options));
    }

    /**
     * Sets showIcon option.
     *
     * @param showIcon New state for the showIcon option.
     */
    public setShowIcon(showIcon: boolean) {
        Diag.Debug.assertParamIsBool(showIcon, "showIcon");
        this._options.showIcon = showIcon;
    }

    public initialize() {
        super.initialize();
        this._fire("menuInitialized", { menu: this });
    }

    public _decorate() {
        super._decorate();

        this._updateTabIndex(true /*setDefault*/);
        this._bind(this._element, "keydown", this._onKeyDown.bind(this));
        this._bind(this._element, "focus", this._onFocus.bind(this));
        // bind to these events directly so that we can capture events in the capture phase
        this._element[0].addEventListener('blur', this._onChildBlur.bind(this), true);
        this._element[0].addEventListener('focus', this._onChildFocus.bind(this), true);

        if (this._options.emptyMenuInTabOrder === false) {
            // Add event to update tab index if contributions change the number of items
            this._bind(Menu.CONTRIBUTION_ITEMS_UPDATED_EVENT, () => {
                if (!this._isOwned(document.activeElement)) {
                    this._updateTabIndex();
                }
            });
        }
    }

    /**
     * @return
     */
    public getMenuItemAlignment(): string {

        return this._options.popupAlign || super.getMenuItemAlignment();
    }

    /**
     * @param extraOptions
     */
    public getMenuItemOptions(item, extraOptions?) {

        return super.getMenuItemOptions(item, $.extend({ immediateShowHide: true, clickToggles: true, type: "static" }, extraOptions));
    }

    /**
     * @param options
     * @return
     */
    public escape(options?): boolean {
        return false;
    }

    public escaped(options?) {
    }

    public isActive() {
        return this._active;
    }

    public activate(tryFocus: boolean = true) {
        if (!this._activating) {
            this._activating = true;

            try {
                this._clearBlurTimeout();
                this._active = true;

                if (tryFocus) {
                    Utils_UI.tryFocus(this._focusElement);
                }

                if ($.isFunction(this._options.onActivate)) {
                    this._options.onActivate.call(this);
                }
            }
            finally {
                this._activating = false;
            }
        }
    }

    private _hide() {
        if (this._active) {
            this.hide({ immediate: true });
            this.ownFocus();
        }
    }

    private _blur() {
        this._clearBlurTimeout();
        this.hide({ immediate: true });

        if (!this._disposed) {
            this._selectItem(null);
        }

        this._active = false;

        if ($.isFunction(this._options.onDeactivate)) {
            this._options.onDeactivate.call(this);
        }

        if (!this._disposed) {
            this._updateTabIndex();
        }
    }

    /**
     * @internal
     */
    public _updateSubMenuVisibleState() {
        var i, len,
            menuItem,
            menuItems = this._menuItems,
            subMenu;

        this._subMenuVisible = false;
        if ($.isArray(menuItems)) {
            for (i = 0, len = menuItems.length; i < len; i++) {
                menuItem = menuItems[i];
                if (menuItem.hasSubMenu()) {
                    subMenu = menuItem.getSubMenu(false);
                    if (subMenu && subMenu._parent === menuItem && subMenu._visible) {
                        this._subMenuVisible = true;
                        break;
                    }
                }
            }
        }
    }

    private _updateTabIndex(setDefault?: boolean) {
        // Check if tab option is true, or empty menu option met
        if (this._options.inTabOrder !== false
            && (this._options.emptyMenuInTabOrder !== false || this._menuItems.length > 0)) {
            // Set tabIndex to 0
            this._element.attr("tabIndex", 0);
        }
        else if (setDefault) {
            this._element.attr("tabIndex", -1);
        }
    }

    private _onKeyDown(e?) {
        if (e.keyCode === KeyCode.TAB) {
            // We are about to lose focus
            this._immediateBlur = true;
        }
        else if (e.keyCode === KeyCode.F10) {
            if (e.shiftKey) {
                return this._onContextMenu(e);
            }
        }
    }

    private _onFocus(e?) {
        if (!this._focusing) {
            this._focusing = true;
            this.activate(false);
            if (!this._selectedItem || this._selectedItem.getIndex() < 0 || !this._selectedItem._element) {
                // try to focus the first enabled item, failing that include disabled items in the search
                const firstItem = this._getFirstMenuItem() || this._getNextFocusableItem(0);
                if (firstItem) {
                    // delay focus to work around Edge bug where it won't tell Narrator about the focus change from MenuBar to MenuItem
                    Utils_Core.delay(null, 0, () => { this._selectItem(firstItem) });
                }
            }
            else {
                // delay focus to work around Edge bug where it won't tell Narrator about the focus change from MenuBar to MenuItem
                Utils_Core.delay(null, 0, () => { this._selectedItem && this._selectedItem.select(); });
            }
            this._focusing = false;
        }
    }

    /**
     * Returns true if the given element's focus is controlled by this MenuOwner.
     * Returns false when the given element is inside a MenuItem marked unfocusable.
     * @param element
     */
    private _isOwned(element: Element): boolean {
        if (this._element[0].contains(element)) {
            for (let x = element; x !== this._element[0] && x !== document.body; x = x.parentElement) {
                if (x.classList.contains('unfocusable')) {
                    return false;
                }
            }
            return true;
        }
        else {
            return false;
        }
    }

    private _onChildFocus(e?: FocusEvent) {
        // make menuowner unfocusable while child is focused so that shift-tab goes to the previous control
        if (this._isOwned(<Element>e.target)) {
            this._element.attr("tabindex", "-1");

            // try to make sure the newly focused element is selected
            const item = <MenuItem>Controls.Enhancement.getInstance(MenuItem, $(e.target));
            const menu = item && item.getParentMenu();
            if (item && menu) {
                menu._selectItem(item);
            }
        }
    }

    private _onChildBlur(e?: Event) {
        Utils_Core.delay(this, BLUR_CLOSE_TIMEOUT, () => {
            if (!this._disposed && (!this._isOwned(document.activeElement) || !document.hasFocus())) {
                if (this._options.inTabOrder !== false) {
                    this._updateTabIndex();
                }
                if (this._immediateBlur) {
                    this._immediateBlur = false;
                    this._blur();
                }
                else {
                    this._blur();
                }
            }
        });
    }

    /**
     * @internal
     */
    public _proceedBlur() {
        this._canBlur = true;
    }

    private _clearBlurTimeout() {
        this.cancelDelayedFunction("blur");
    }

    public _onParentScroll(e?) {
        this._hide();
    }

    private _onResize(e?) {
        this._hide();
    }

    private _onContextMenu(e?) {
        return this.showSubMenuOnFocusedItem();
    }

    /**
     * Attempt to open the submenu on the focused item
     * @param e
     * @return
     */
    public showSubMenuOnFocusedItem() {
        var focusItem = this._focusItem;
        if (focusItem && focusItem.tryShowSubMenu({ immediate: true })) {
            return false;
        }
        return false;
    }
}

VSS.initClassPrototype(MenuOwner, {
    _focusItem: null,
    _focusElement: null,
    _activating: false,
    _subMenuVisible: false,
    _align: null,
    _canBlur: false,
    _immediateBlur: false
});

/**
 * @publicapi
 */
export interface MenuBarOptions extends MenuOwnerOptions {
    /**
     * Orientation of the menubar (horizontal or vertical)
     * @defaultvalue "horizontal"
     */
    orientation?: string;
}

export class MenuBarO<TOptions extends MenuBarOptions> extends MenuOwner<TOptions> {

    public static enhancementTypeName: string = "tfs.menu.menubar";

    private _orientation: any;

    /**
     * @param options
     */
    constructor(options?: TOptions) {
        super(options);
        this.setEnhancementOptions({
            role: "menubar",
            coreCssClass: "menu-bar" + (this._options.useBowtieStyle ? " bowtie-menus" : "")
        });
        this._orientation = MenuOrientation.parse(this._options.orientation);
        this._type = MenuType.Static;

        this._contributionProviderOptions = {
            defaultTextToTitle: false
        };
    }

    /**
     * @param options
     */
    public initializeOptions(options?: TOptions) {
        super.initializeOptions(options);
    }

    /**
     * @return
     */
    public getMenuItemAlignment(): string {

        return this._orientation === MenuOrientation.Horizontal ? "left-bottom" : "right-justify";
    }

    /**
     * @param options
     * @return
     */
    public selectUp(options?): boolean {
        if (this._orientation === MenuOrientation.Vertical) {
            return super.selectUp();
        }
        else {
            return super.selectLeft(options);
        }
    }

    /**
     * @param options
     * @return
     */
    public selectDown(options?): boolean {
        if (this._orientation === MenuOrientation.Vertical) {
            return super.selectDown();
        }
        else {
            return super.selectRight(options);
        }
    }

    /**
     * @param options
     * @return
     */
    public selectLeft(options?): boolean {
        if (this._orientation === MenuOrientation.Vertical) {
            return super.selectLeft();
        }
        else {
            var subMenuVisible = this._subMenuVisible;

            this.hideChildren(null, { immediate: true });
            super.selectUp();

            if (subMenuVisible) {
                this._subMenuVisible = true;
                if (this._selectedItem.tryShowSubMenu({ immediate: true })) {
                    this._selectedItem.getSubMenu().selectFirstItem();

                    return true;
                }
            }

            return false;
        }
    }

    /**
     * @param options
     * @return
     */
    public selectRight(options?): boolean {
        if (this._orientation === MenuOrientation.Vertical) {
            return super.selectRight();
        }
        else {
            var subMenuVisible = this._subMenuVisible;

            this.hideChildren(null, { immediate: true });
            super.selectDown();

            if (subMenuVisible) {
                this._subMenuVisible = true;
                if (this._selectedItem.tryShowSubMenu({ immediate: true })) {
                    this._selectedItem.getSubMenu().selectFirstItem();

                    return true;
                }
            }

            return false;
        }
    }

    /**
     * Tries to activate the menubar associated with the element matched by the selector.
     * @param selector Selector to match the element.
     * @returns Menu activated or not.
     */
    public static tryActivate(selector: string): boolean {
        var menuBar = this._getMenuBar(selector);
        if (menuBar) {
            menuBar.focus();
            return true;
        }

        return false;
    }

    /**
     * Tries to activate and open the menubar associated with the element matched by the selector.
     * @param selector Selector to match the element.
     * @returns Menu shown or not.
     */
    public static tryShowSubMenu(selector: string): boolean {
        var menuBar = this._getMenuBar(selector);
        if (menuBar) {
            menuBar.focus();
            Utils_Core.delay(this, 0, () => {
                menuBar.showSubMenuOnFocusedItem();
            });
            return true;
        }

        return false;
    }

    /**
     * Sets focus to the control
     */
    public focus(): void {
        this.activate();
    }


    private static _getMenuBar(selector: string): MenuBar {
        var $element = $(selector);
        return <MenuBar>Controls.Enhancement.getInstance(MenuBar, $element);
    }
}

export class MenuBar extends MenuBarO<MenuBarOptions> {

}

export interface ToolbarOptions extends MenuBarOptions {

}

/**
 * Toolbar widget wrapped around the menubar.
 * https://www.w3.org/TR/wai-aria-practices/#toolbar
 */
export class Toolbar extends MenuBar {
    constructor(options: ToolbarOptions) {
        super(options);
        this.setEnhancementOptions({
            role: "toolbar"
        });
    }

    public _getMenuItemType(): any {

        return ToolbarMenuItem;
    }
}

class ToolbarMenuItem extends MenuItem {
    public getAriaRole(): string {
        return "button";
    }
}

VSS.initClassPrototype(MenuBarO, {
    _orientation: MenuOrientation.Horizontal
});

class PopupMenuItem extends MenuItem {
    public _parent: PopupMenu;

    public escaped() {
        super.escaped();
        this._parent.escaped();
    }
}

export interface PopupMenuOptions extends MenuOwnerOptions {
    hidden?: boolean;
    onPopupEscaped?: Function;
    onHide?: Function;
    /**
     * If the menu should take focus when it appears. Defaults to true.
     */
    setFocus?: boolean;
}

export class PopupMenuO<TOptions extends PopupMenuOptions> extends MenuOwner<TOptions> {

    public static enhancementTypeName: string = "tfs.menu.popup";

    private _floating: boolean;
    private _escapeFocusReceiver: any;
    private _popupPinElement: JQuery;
    private _onHide: Function;

    public _hidden: boolean;

    constructor(options?: TOptions) {
        super($.extend(<PopupMenuOptions>{ inTabOrder: false }, options));

        this.setEnhancementOptions({
            coreCssClass: "menu-popup" + (this._options.useBowtieStyle ? " bowtie-menus" : ""),
            hidden: true
        });
        this._type = MenuType.Popup;
        this._hidden = this._options.hidden === true;
        this._onHide = this._options.onHide;
    }

    /**
     * @param options
     */
    public initializeOptions(options?: TOptions) {
        super.initializeOptions(options);
    }

    /**
     * @return
     */
    public _getMenuItemType(): any {

        return PopupMenuItem;
    }

    public _decorate() {
        super._decorate();
        if (this._hidden === true) {
            this._element.addClass("invisible");
        }
    }

    public popup(focusElement, pinElement) {
        this._escapeFocusReceiver = focusElement;
        this._popupPinElement = pinElement;
        this._floating = true;

        if (this._active) {
            this.escaped();
        }
        else {
            let delayedFunction: Utils_Core.DelayedFunction = null;
            let shown = false;
            const showPopup = () => {
                if (delayedFunction) {
                    delayedFunction.cancel();
                    delayedFunction = null;
                }
                if (!this._active && !shown) {
                    this.activate();
                    this._showPopupMenu();
                    shown = true;
                }
            };
            // wait for contributed menu items to load
            if (this._contributionPromise) {
                this._contributionPromise.then(showPopup);
                delayedFunction = Utils_Core.delay(this, 500, showPopup);  // after 500ms give up and show anyway
            }
            else {
                showPopup();
            }
        }
    }

    private _showPopupMenu() {
        const firstMenuItem = this._getFirstMenuItem();
        const subMenu = firstMenuItem.getSubMenu();
        const setFocus = this._options.setFocus !== false;

        if (subMenu) {
            subMenu.show({ immediate: true, element: this._popupPinElement, align: this._align, setFocus: setFocus });
            if (setFocus) {
                subMenu.selectDefaultItem();
            }
        }
    }

    protected _updateItemsWithContributions(items: any, contributedMenuItems: IContributedMenuItem[]) {

        this._contributedItems = contributedMenuItems;

        if (items && items.length > 0 && items[0].childItems) {
            var nonContributionItems = $.grep(items[0].childItems, (item: any) => { return !item.isContribution });
            items[0].childItems = nonContributionItems.concat(contributedMenuItems);
        }
        else {
            items = [{ childItems: contributedMenuItems }];
        }

        this._updateCombinedSource(items);
    }

    protected _updateCombinedSource(items: any) {
        super._updateCombinedSource(items);
        if (this._active) {
            this._showPopupMenu();
        }
    }

    /**
     * @param options
     * @return
     */
    public selectUp(options?): boolean {

        return true;
    }

    /**
     * @param options
     * @return
     */
    public selectDown(options?): boolean {

        var redirected = options && options.redirected;
        if (!redirected) {
            if (this._align !== MenuAlign.RightJustify) {
                return super.selectRight();
            }
        }

        return false;
    }

    /**
     * Selects the first item of the child menu.
     * Override of Menu.selectFirstItem()
     */
    public selectFirstItem() {
        const firstMenuItem = this._getFirstMenuItem();
        const subMenu = firstMenuItem.getSubMenu();
        if (subMenu._visible) {
            return subMenu.selectFirstItem();
        }
        return false;
    }

    /**
     * @param options
     * @return
     */
    public selectLeft(options?): boolean {

        return true;
    }

    /**
     * @param options
     * @return
     */
    public selectRight(options?): boolean {

        var redirected = options && options.redirected;
        if (!redirected) {
            if (this._align === MenuAlign.RightJustify) {
                return super.selectRight();
            }
        }

        return false;
    }

    public escaped() {
        if (this._floating) {
            this._floating = false;

            if (this._escapeFocusReceiver) {
                this._escapeFocusReceiver.focus();
                this._escapeFocusReceiver = null;

                if ($.isFunction(this._options.onPopupEscaped)) {
                    this._options.onPopupEscaped.call(this);
                }
            }
        }
    }

    public _hidePopup() {
        if (this._onHide) {
            this._onHide(this._escapeFocusReceiver);
        }

        super._hidePopup();
    }
}

export class PopupMenu extends PopupMenuO<PopupMenuOptions> { }

VSS.initClassPrototype(PopupMenuO, {
    _align: MenuAlign.RightJustify,
    _floating: false,
    _hidden: false,
    _escapeFocusReceiver: null
});

class SingleCommand extends Controls.BaseControl {

    /**
     * Represents an action element which ensures the execution once until command completes
     * by disabling itself after click (and enables back, when gets enable notification)
     */
    constructor(options?) {
        super(options);
    }

    public initialize() {
        var options = this._element.data();

        super.initialize();

        this._bind(options.commandAction || "click", delegate(this, this.onCommandExecute));

        if (options.commandCompleteEvent) {
            this._bind(window, options.commandCompleteEvent, delegate(this, this.onCommandComplete));
        }
    }

    public onCommandExecute(e?) {
        var options = this._element.data();

        if (options.commandName) {
            this._element.prop("disabled", true);
            this._element.prop("aria-disabled", true);
            menuManager.executeCommand(new Events_Handlers.CommandEventArgs(options.commandName, options.commandArg, this));
        }
        return false;
    }

    public onCommandComplete(e?) {
        this._element.removeAttr("disabled");
        this._element.prop("aria-disabled", false);
    }
}

/**
 * The command id.
 */
export interface ICommand {
    /**
     * Optional disabled state.  True makes it visible in the menu but not selectable or clickable.
     */
    id: string;

    /**
     * Optional hidden state.  True hides it from the menu.
     */
    disabled?: boolean;

    /**
     * Optional toggled state.  True shows the item as toggled.
     */
    hidden?: boolean;

    toggled?: boolean;
}

Controls.Enhancement.registerEnhancement(MenuBar, ".menu-bar.enhance")

Controls.Enhancement.registerEnhancement(PopupMenu, ".menu-popup.enhance")

Controls.Enhancement.registerEnhancement(SingleCommand, ".single-command")

/**
 * Sort the menu items by rank, pushing those without a rank to the bottom of the list.
 */
/**
 * Sort the menu items by rank, pushing those without a rank to the bottom of the list.
 */
export function sortMenuItems(items): any {
    const stableSorter = new Utils_Array.StableSorter<IMenuItemSpec>((a, b) => {
        const leftRank = (a.rank ? a.rank : 9999),
            rightRank = (b.rank ? b.rank : 9999);

        return leftRank - rightRank;
    });
    return stableSorter.sort(items, false);
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls.Menus", exports);
