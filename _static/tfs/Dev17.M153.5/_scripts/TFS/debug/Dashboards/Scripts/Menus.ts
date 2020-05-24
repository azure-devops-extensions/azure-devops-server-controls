import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Controls_Menus = require("VSS/Controls/Menus");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import StringUtils = require("VSS/Utils/String");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import VSS = require("VSS/VSS");
import TFS_Server_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import TFS_Dashboards_PushToDashboard_Async = require("Dashboards/Scripts/Pinning.PushToDashboard");
import TFS_Dashboards_PushToDashboardConstants_Async = require("Dashboards/Scripts/Pinning.PushToDashboardConstants");
import TFS_Dashboards_WidgetDataForPinning_Async = require("Dashboards/Scripts/Pinning.WidgetDataForPinning");
import TFS_Dashboards_PushToDashboardInternal_Async = require("Dashboards/Scripts/Pinning.PushToDashboardInternal");
import { PinArgs } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";

import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";


/**
 * The options for the widget edit menu
 */
export interface WidgetEditMenuOptions {
    /** If the function returns true then a config button is added to the menu */
    canConfigure: () => boolean;

    /** The callback function to use when the config button is clicked */
    configure?: () => void;

    /** The callback function to use when the remove button is clicked */
    remove: () => void;

    /** Info about the widget this menu is bound to. */
    widget: TFS_Dashboards_Contracts.Widget;

    /** Widget edit overlay control - Used to set focus on when SHIFT + TAB is used */
    container?: JQuery;
}

/**
 * Represents a menu shown in a widget host when the dashboard is in edit mode
 */
export class WidgetEditMenu extends Controls.Control<WidgetEditMenuOptions> {
    private _selectorForWidgetEditOverlay = "." + TFS_Dashboards_Common.ClassWidgetEditOverlayControl;
    private _selectorForWidgetHost = "." + TFS_Dashboards_Constants.DomClassNames.WidgetHostInGridster;

    constructor(options?: WidgetEditMenuOptions) {
        super(options);
    }

    public initializeOptions(options?: WidgetEditMenuOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "widget-edit-menu"
        }, options));
    }

    public initialize() {
        let configureControl: WidgetEditMenuButton = null;

        // Configure button
        if (this._options.canConfigure() && this._options.configure) {
            configureControl = <WidgetEditMenuButton>Controls.Control.createIn<WidgetEditMenuButtonOptions>(
                WidgetEditMenuButton,
                this.getElement(), {
                    iconClass: TFS_Dashboards_Constants.DomClassNames.ConfigureWidgetIcon,
                    onClick: this._options.configure,
                    tooltipText: TFS_Dashboards_Resources.WidgetEditMenuConfigureButtonTooltipText,
                    ariaLabelText: StringUtils.format(TFS_Dashboards_Resources.WidgetEditMenuConfigureButtonAriaLabelFormat, this._options.widget.name)
                });
        }

        // Remove button
        let deleteControl = <WidgetEditMenuButton>Controls.Control.createIn<WidgetEditMenuButtonOptions>(
            WidgetEditMenuButton,
            this.getElement(), {
                iconClass: TFS_Dashboards_Constants.DomClassNames.DeleteIcon,
                onClick: this._options.remove,
                tooltipText: TFS_Dashboards_Resources.WidgetEditMenuDeleteButtonTooltipText,
                ariaLabelText: StringUtils.format(TFS_Dashboards_Resources.WidgetEditMenuDeleteButtonAriaLabelFormat, this._options.widget.name)
            });

        if (configureControl) {
            configureControl.getElement().on("keydown", (event: JQueryKeyEventObject) => {
                let key: number = event.keyCode || event.which;
                if (key !== Utils_UI.KeyCode.TAB) {
                    return;
                }

                event.shiftKey
                    ? this._options.container.focus() // widget edit overlay control
                    : deleteControl.getButton().focus();

                return false;
            });
        }

        deleteControl.getElement().on("keydown", (event: JQueryKeyEventObject) => {
            let key: number = event.keyCode || event.which;
            if (key !== Utils_UI.KeyCode.TAB) {
                return;
            }

            if (event.shiftKey) {
                configureControl
                    ? configureControl.getButton().focus()
                    : this._options.container.focus(); // widget edit overlay control
            } else {
                let nextWidget = this.getElement().closest(this._selectorForWidgetHost).next(this._selectorForWidgetHost);
                if (nextWidget && nextWidget.length > 0) {
                    let nextEditOverlayContainer = nextWidget.find(this._selectorForWidgetEditOverlay);
                    nextEditOverlayContainer.focus();
                } else {
                    // No widgets found after the current widget, move focus to the Edit button 
                    $(document).find("." + TFS_Dashboards_Constants.DomClassNames.ToggleForDashboardEdit).focus();
                }
            }
            return false;
        });
    }
}

/**
 * The options for a widget edit menu button
 */
export interface WidgetEditMenuButtonOptions {
    /** The class to use for the button's icon */
    iconClass: string;

    /** The callback function to use when the button is clicked */
    onClick: () => void;

    /** When defined, display a popup text when hovering the button  */
    tooltipText?: string;

    /** When defined, add an aria-label attribute to the button with the given text. */
    ariaLabelText?: string;
}

/**
 * Represents a button in the widget edit menu
 */
export class WidgetEditMenuButton extends Controls.Control<WidgetEditMenuButtonOptions> {
    private _button: JQuery;

    constructor(options?: WidgetEditMenuButtonOptions) {
        super(options);
    }

    public initializeOptions(options?: WidgetEditMenuButtonOptions) {
        super.initializeOptions($.extend({
            coreCssClass: TFS_Dashboards_Constants.DomClassNames.WidgetEditMenuButtonContainer
        }, options));
    }

    public initialize() {
        super.initialize();

        // Button
        this._button = $("<button>")
            .addClass(TFS_Dashboards_Constants.DomClassNames.WidgetEditMenuButton);

        if (this._options.iconClass) {
            $("<i>")
                .addClass(this._options.iconClass)
                .appendTo(this._button);
        }

        if (this._options.tooltipText) {
            RichContentTooltip.add(this._options.tooltipText, this._button);
        }

        if (this._options.ariaLabelText) {
            this._button.attr("aria-label", this._options.ariaLabelText);
        }

        // Attach click event handler
        if ($.isFunction(this._options.onClick)) {
            this._button.on("click", this._options.onClick);
        }

        this.getElement().append(this._button);
    }

    public getButton(): JQuery {
        return this._button;
    }
}

export interface WidgetViewMenuOptions {
    // icon for the menu
    menuIconType: string;

    // additional menu items to add to the built-in list
    menuItems?: Controls_Menus.IMenuItemSpec[];

    // parent hosting container for the widget menu whose box region drives the widget visbility
    $ancestorContainer: JQuery;

    // Widget data
    widgetData: TFS_Dashboards_Contracts.Widget;

    // callback after adding widget to a dashboard
    addToDashboardCallback?: (args: PinArgs) => void;

    // callback to remove the widget
    removeCallback?: () => void;

    // callback to configure the widget
    // if defined a "configure" menu item will be added to the widget menu
    configureCallback?: () => void;

    // callback to open widget lightbox 
    openLightboxCallback?: () => void;
}

/**
 * The menu that appears when the ellipsis is clicked in the upper right corner of a widget
 * on a dashboard in view mode.
 */
export class WidgetViewMenu extends Controls.Control<WidgetViewMenuOptions> {

    // underlying sub menu
    private _menuBar: Controls_Menus.MenuBar;

    private _lightBoxButton: JQuery;

    // control items available in the sub menu
    private mainMenuItems: Controls_Menus.IMenuItemSpec[] = [];

    private $ancestor: JQuery;

    private ConfigMenuRank = 10;
    private RemoveMenuRank = 20;
    private PiningMenuRank = 15;

    /**
     * Build the menu with required option which is mostly used to pass click callback
     * @param options : WidgetMenuOptions 
     */
    constructor(options: WidgetViewMenuOptions) {
        super(options);
    }

    // setups the menu bar and relevant control events.
    public initialize() {
        super.initialize();

        this.$ancestor = this._options.$ancestorContainer;

        // setup menu bar
        var $hostTitle = $("<div/>")
            .addClass(TFS_Dashboards_Constants.DomClassNames.WidgetMenuContainer)
            .attr("aria-label", TFS_Dashboards_Resources.WidgetEditMenuConfigureButtonTooltipText)
            .appendTo(this.getElement());

        if (typeof this._options.openLightboxCallback === "function") {
            this._lightBoxButton = $("<button />")
                .addClass(TFS_Dashboards_Constants.DomClassNames.LightboxButton)
                .attr("type", "button")
                .attr("aria-label", TFS_Dashboards_Resources.LightboxButton_AriaLabel)
                .attr("tabindex", "0")
                .append(
                $("<span />")
                    .addClass("bowtie-icon")
                    .addClass("bowtie-view-full-screen")
                )
                .click(() => { this._openLightbox(); })
                .appendTo($hostTitle);

            this._lightBoxButton.addClass(TFS_Dashboards_Constants.DomClassNames.WidgetHideMenu);

            RichContentTooltip.add(TFS_Dashboards_Resources.LightboxButtonTooltipText, this._lightBoxButton);

            this._lightBoxButton
                .focusin((e) => {
                    this._lightBoxButton.addClass("focus");
                    this._toggleWidgetButtons(true);
                })
                .focusout((e) => {
                    this._lightBoxButton.removeClass("focus");
                    this._toggleWidgetButtons(false);
                });
        }

        if (this.$ancestor == null) {
            throw new Error("Ancestor must be present");
        }
        this.mainMenuItems.push({
            id: "options",
            title: TFS_Dashboards_Resources.WidgetEditMenuConfigureButtonTooltipText,
            idIsAction: false,
            hideDrop: true,
            showText: false,
            showHtml: false,
            icon: this._options.menuIconType,
            childItems: this._createMenubarItems()
        });

        // Create menu bar but only if we have menu items
        if (this.mainMenuItems[0].childItems && this.mainMenuItems[0].childItems.length > 0) {
            this._menuBar = <Controls_Menus.MenuBar>Controls.BaseControl.createIn(
                Controls_Menus.MenuBar,
                $hostTitle, {
                    cssClass: TFS_Dashboards_Constants.DomClassNames.WidgetMenuSubMenuContainer,
                    items: this.mainMenuItems,
                    onActivate: Utils_Core.delegate(this, this._onMenubarActivate),
                    onDeactivate: Utils_Core.delegate(this, this._onMenubarDeactivate),
                    executeAction: Utils_Core.delegate(this, this._onMenubarItemClick),
                    useBowtieStyle: true
                });

            this._menuBar.getElement().addClass(TFS_Dashboards_Constants.DomClassNames.WidgetHideMenu);
        }

        // parent is the holding container which is the tile or widget.
        this.$ancestor.hover(
            () => {
                this._toggleWidgetButtons(true);
            },
            () => {
                this._toggleWidgetButtons(false);
            });
    }

    private _openLightbox() {
        if (this._options.openLightboxCallback && typeof this._options.openLightboxCallback === "function") {
            this._toggleWidgetButtons(false);
            this._options.openLightboxCallback();
        }
    }

    // creates the sub menu items.
    private _createMenubarItems(): Controls_Menus.IMenuItemSpec[] {
        var items = this._options.menuItems || [];
        let canEdit = UserPermissionsHelper.CanEditDashboard();
        if (this._options.configureCallback) {
            items.push({
                id: TFS_Dashboards_Constants.TfsCommands.WidgetConfigurationAction,
                text: TFS_Dashboards_Resources.ConfigureWidgetOnDashboardTitle,
                icon: `${TFS_Dashboards_Constants.DomClassNames.ConfigureWidgetIcon}`,
                action: this._options.configureCallback,
                rank: this.ConfigMenuRank,
                disabled: !canEdit,
                title: canEdit ? undefined : TFS_Dashboards_Resources.WidgetContextMenu_DisabledConfigureTooltip
            });
        }

        VSS.requireModules([
            "Dashboards/Scripts/Pinning.PushToDashboard",
            "Dashboards/Scripts/Pinning.PushToDashboardConstants",
            "Dashboards/Scripts/Pinning.WidgetDataForPinning",
            "Dashboards/Scripts/Pinning.PushToDashboardInternal"
        ]).spread(
            (TFS_Dashboards_PushToDashboard: typeof TFS_Dashboards_PushToDashboard_Async,
                TFS_Dashboards_PushToDashboardConstants: typeof TFS_Dashboards_PushToDashboardConstants_Async,
                TFS_Dashboards_WidgetDataForPinning: typeof TFS_Dashboards_WidgetDataForPinning_Async,
                TFS_Dashboards_PushToDashboardInternal: typeof TFS_Dashboards_PushToDashboardInternal_Async) => {
                if (this._options.widgetData) {
                    const context = Context.getDefaultWebContext();

                    var widgetData = TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning.fromWidget(this._options.widgetData);
                    var pinningMenuItem = TFS_Dashboards_PushToDashboard.PushToDashboard.createMenu(
                        context,
                        widgetData,
                        (args) => {
                            if (this._options.addToDashboardCallback !== null && typeof this._options.addToDashboardCallback === "function") {
                                this._options.addToDashboardCallback(args);
                            }
                        },
                        TFS_Dashboards_Resources.CopyToDashboardTitle,
                        TFS_Dashboards_PushToDashboardConstants.Dashboards_Source_Area
                    );
                    pinningMenuItem.rank = this.PiningMenuRank;
                    items.push(pinningMenuItem);
                }
            });

        if (this._options.removeCallback) {
            items.push({
                id: TFS_Dashboards_Constants.TfsCommands.WidgetRemoveAction,
                text: TFS_Dashboards_Resources.DeleteWidgetOnDashboardTitle,
                icon: `${TFS_Dashboards_Constants.DomClassNames.DeleteIcon}`,
                action: this._options.removeCallback,
                rank: this.RemoveMenuRank,
                disabled: !canEdit,
                title: canEdit ? undefined : TFS_Dashboards_Resources.WidgetContextMenu_DisabledDeleteTooltip
            });
        }

        return items;
    }

    // handles the click actions on sub menu operations.
    private _onMenubarItemClick(command): boolean {
        command = command.get_commandName();
        switch (command) {
            // Currently we have no menu items to take action on
        }
        return true;
    }

    // provide access to menubar for testing purpose
    public getMenuBar() {
        return this._menuBar;
    }

    public _onMenubarActivate() {
        // We increase the z-index value so that the menu is not hidden behind other widgets. The default z-index
        // is 2 while a widget in hover state has a z-index of 3 (so that tooltips etc. are not obscurred) so we go
        // to 4 in order to be above these two cases.
        this.$ancestor.css('z-index', 4);
        // Want to fine tune the menu selection order, so we are sorting the menu item before display it.
        var activeMenu = this._menuBar.getMenuItemSpecs()
        if (activeMenu) {
            var list = <Controls_Menus.IMenuItemSpec[]>activeMenu[0].childItems;
            list.sort(function (a, b) { return a.rank - b.rank });
            $.extend(this.mainMenuItems[0], { childItems: list });
        }
        this._toggleWidgetButtons(true);
    }

    private _onMenubarDeactivate() {
        // Once the menu is gone, we return the widget to its default z-index so it doesn't obscure other widget menus.
        this.$ancestor.css('z-index', '');

        // menu deactivate has a delay of 25ms (Menus.BLUR_CLOSE_TIMEOUT)
        // In case of shift-tabbing, light focus-in event is triggered before deactivate happens
        // so don't toggle since lightbox already toggled buttons
        let lightBoxHasFocus = this._lightBoxButton && this._lightBoxButton.is(":focus");
        if (!lightBoxHasFocus) {
            this._toggleWidgetButtons(false);
        }
    }

    public removeLightboxButton() {
        if (this._lightBoxButton) {
            this._lightBoxButton.remove();
        }
    }

    /*
     * _toggleWidgetButtons add/remove a specific class to make the html control visible.
     * This method fix a problem with CSS Stacking Context with Gridster's control.
     */
    private _toggleWidgetButtons(enabled: boolean): void {
        if (enabled) {
            if (this._lightBoxButton) {
                this._lightBoxButton.removeClass(TFS_Dashboards_Constants.DomClassNames.WidgetHideMenu);
            }

            if (this._menuBar) {
                this._menuBar.getElement().removeClass(TFS_Dashboards_Constants.DomClassNames.WidgetHideMenu);
            }
        }
        else {
            this.$ancestor.removeClass('player-revert'); //Remove possible Gridster's animation attribute that set a z-index of 10

            if (this._lightBoxButton) {
                this._lightBoxButton.addClass(TFS_Dashboards_Constants.DomClassNames.WidgetHideMenu);
            }

            if (this._menuBar) {
                this._menuBar.hideChildren(null);
                this._menuBar.getElement().addClass(TFS_Dashboards_Constants.DomClassNames.WidgetHideMenu);
            }
        }
    }
}


