/// <reference types="jquery" />

import Q = require("q");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");

import {
IWidgetBladeContext,
IBlade,
IBladeOptions,
IBladeActions,
IWidgetConfigurationContextOption} from  "Dashboards/Scripts/BladeContracts";
import {BladeDimensions, BladeLevelConstants} from "Dashboards/Scripts/BladeConstants";

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

import Controls = require("VSS/Controls");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

var delegate = Utils_Core.delegate;
import WidgetSize = TFS_Dashboards_Contracts.WidgetSize;

enum FocusDirection {
    First,
    Last
}

/**
 * Used between the Preview and the Configuration Blade as a central context where they can share information.
 */
export class WidgetBladeContext implements IWidgetBladeContext {
    /**
     * Required to be able to have access to the widget we are configuring
     */
    public widget: TFS_Dashboards_Contracts.Widget;
        
    /**
     * Required to be later able to "re-render" this one in the grid.
     * This can be null if we are configuring a new widget that is not from the Grid (from catalog for example)
     */
    private widgetHost: Dashboard_Shared_Contracts.IWidgetHost;

    public getWidget(): TFS_Dashboards_Contracts.Widget {
        return this.widget;
    }

    /**
     * Set the Widget Host in to the blade context, if this one is not null, the underlying widget is also taken.
     * @param {IWidgetHost} widgetToWorkWith - The widget host. Can be null
     */
    public setWidgetHost(widgetToWorkWith: Dashboard_Shared_Contracts.IWidgetHost): void {
        this.widgetHost = widgetToWorkWith;
        if (widgetToWorkWith != null) {
            this.widget = widgetToWorkWith.getWidget();
        }
    }

    /**
     * Create a new context from a preview and a widgethost
     * @param {IWidgetConfigurationContextOption} options: Define the option to configure the widget.
     *      2 possibles path: 1) We have a preview and we also have a widget host to update (Case of an existing widget)
     *                        2) We have a preview and NO widget yet so just a WidgetType to pass, not a WidgetHost.
     */
    public constructor(options: IWidgetConfigurationContextOption) {

        this.widgetHost = options.widgetToWorkWith; // This can be null
        if (this.widgetHost != null) {
            this.widget = this.widgetHost.getWidget();
        } else if (options.widgetType != null) {
            this.widget = options.widgetType;
        } else {
            throw new Error("WidgetToWorkWith or widgetType must be defined");
        }
    }
}

/**
 * Represent a single blade (container) inside the menu. This is where the content will be hosted
 * for a single blade. A BladeMenu should have at least one blade but can handle multiple.
 */
export class Blade<T> extends Controls.Control<IBladeOptions> implements IBlade<T> {

    public static BladeGeneralClass: string = "blade-menu-blade";
    public static BladeLevelClass: string = "blade-level-{0}";

     /**
     * This is the width of an open blade.
     */
    public static BladeWidth: number = BladeDimensions.BladeWidth;

    /**
     * The html header element that is 
     */
    private $bladeTitle: JQuery;

    /**
     * The JavaScript Dom element structure of the blade
     */
    public _$bladeContainerElement: JQuery;

    /**
     * Every blade a section for buttons. This is mainly for UI constance between each blade
     */
    public _bladeMenuActions: IBladeActions;

    /**
    * Instance of configuration context that talks to widgetconfigurationhost and contains all callbacks and data
    */
    public _widgetBladeContext: IWidgetBladeContext;

    /**
     * Allow to know if it come from the catalog when we open the configuration for example. 
     */
    protected bladeComeFrom: IBlade<IBladeOptions> = null;
    public constructor(options: IBladeOptions) {
        super(options);
        if (options.level <= 0) {
            throw new Error("Level must be set to 1 minimum");
        }
    }

    /**
     * Initialize the blade with the general html structure and classes.
     * Title and content is added on the initialize. Buttons are added in a later
     * stage
     */
    public initialize(): void {
        //Tab index is set to -1 to be sure that we cannot tab it. We have custom tab management that 
        this._$bladeContainerElement = $("<div>")
            .attr("tabindex", "-1")
            .attr("role", "dialog")
            .attr("aria-label", this._options.heading)
            .css('width', Blade.BladeWidth + 'px' )
            .addClass(Blade.BladeGeneralClass)
            .addClass(Utils_String.format(Blade.BladeLevelClass, this._options.level))
            .appendTo(this.getElement())
            .click(() => {
                this.onClick(this);
            });
        this.renderTitle();
    }

    /**
    * Width provided by an individual blade that the blade menu will use to animate in the blade in the view during editing. 
    */
    public getMenuWidth(): number {
        return Blade.BladeWidth;
    }

    /**
     * The blade that was currently open when the request for the current blade
     * was made. When the blade is opened from the widget configuration or
     * edit mode banner, this will be null.
     */
    public getBladeComeFrom(): IBlade<IBladeOptions> {
        return this.bladeComeFrom;
    }

    /**
     * This render the title. At this moment, the title is inside the Blade container but it
     * can be erased if someone erase the bladecontainer element. This method allows the child   
     * @returns {} 
     */
    protected renderTitle(): void {
        this.$bladeTitle = $('<h3>')
            .addClass("ui-dialog-title")
            .text(this._options.heading)
            .appendTo(this._$bladeContainerElement);
    }

    /**
     * Get from the option the initial level assigned to the blade.
     * @returns {number} The blade level which should be between 0 and ... 
     */
    public getLevel(): number {
        return this._options.level;
    }

    /**
     * Blade can be clicked to be expanded. This is the call back to let know the BladeMenu that
     * one of its child blade has been clicked. 
     *
     * This is set by the BladeMenu during initialization.
     * All blades that the Menu own will proxy in the same place. 
     * @param {Blade<IBladeOptions>} bladeClicked - The clicked blade
     */
    public onClick(bladeClicked: IBlade<IBladeOptions>): void { }

    /**
     * Define the actions that a blade can do like closing a blade, opening a blade, clicking a blade.
     * @param {IBladeActions} - bladeMenuActions 
     */
    public setActions(bladeMenuActions: IBladeActions): void {
        if (bladeMenuActions == null) {
            throw new Error("Action must be defined");
        }
        this._bladeMenuActions = bladeMenuActions;
    }

    /**
     * Action to do whenthe  blade is openned. In that case we 
     * @param {Blade<IBladeOptions>} bladeComeFrom - Null if come from a widget, otherwise, for example the catalog
     */
    public open(bladeComeFrom: IBlade<IBladeOptions> = null): void {
        this.bladeComeFrom = bladeComeFrom;
    }

    /**
     * This can be overrided by the blade to do specific action when the blade is done being open
     */
    public onOpened(): void {
        //This is intentionnaly empty (but could have code later). At this moment, only the blade catalog override this method
        //to resize some elements in the blade.
    }

    /**
     * This is only for the WidgetConfiguration blade. This one has special needs to have a second control
     * to be updated with some actions on this blade.
     * @param {IWidgetBladeContext} widgetContext - Widget Configuration Widget gives a pointer to the preview control.
     */
    public setWidgetContext(widgetContext: IWidgetBladeContext): void {
        if (widgetContext == null) {
            throw new Error("widgetContext cannot be null");
        }
        this._widgetBladeContext = widgetContext;

        if (this._options.onWidgetContextChange) {
            this._options.onWidgetContextChange(widgetContext);
        }
    }

    /**
     * Remove all tab stop. This is required because hidden blade should not be reachable with tab
     */
    public disableTabStop(): void {
        this._$bladeContainerElement
            .attr("tabindex", "-1");
    }

    /**
     * Set back the tab stop by adding the tab index of 0
     */
    public enableTabStop(): void {
        this._$bladeContainerElement
            .attr("tabindex", "0");
    }

    /**
     * Should be overridden by child classes to determine when they can be closed by the blade menu which includes soft-dismiss
     * @returns IPromise<true> because the blade can be closed
     */
    public canBeClosed(): IPromise<boolean> {
        return Q.resolve(true);
    }

    /**
     * Return the Blade general element of the blade
     * @returns {JQuery} Jquery object of the element 
     */
    public getJQueryElement(): JQuery {
        return $(this.getElement().find('.' + Blade.BladeGeneralClass).get(0));
    }

    /**
     * Returns whether blade needs curtain to be drawn on grid
     * @returns {boolean} TRUE curtain is drawn, FALSE curtain is not drawn
     */
    public withCurtain(): boolean {
        return this._options.withCurtain;
    }

    /**
     * This can be override by concrete blade
     */
    public setFocus(): boolean {
        throw "Blade common doesn't implement set focus";
    }

    /**
     * For TAB keyboard event, this will set focus back on the blade
     * @param {JQueryKeyEventObject} - JQuery Keyboard event object
     * @returns {any} : Keeping parity with JQuery return type
     */
    public lastButtonHandler(eventObject: JQueryKeyEventObject): any {
        let keyCode = eventObject.keyCode || eventObject.which;
        if (!eventObject.shiftKey && keyCode === Utils_UI.KeyCode.TAB && this.setFocus()) {
            eventObject.preventDefault();
        }
    }

    public focusOnLastElement(): boolean {
        return this._focusIn(FocusDirection.Last);
    }

    public focusOnFirstElement(): boolean {
        return this._focusIn(FocusDirection.First);
    }

    private _focusIn(direction: FocusDirection): boolean {
        let focusables = this._getFocusableElements(this._getFocusableBladeChildren());
        if (focusables.length === 0) {
            return false;
        }

        var index = -1;
        switch (direction)
        {
            case FocusDirection.First:
                index = 0;
                break;
            case FocusDirection.Last:
                index = focusables.length - 1;
                break;
        }

        if (index < 0) {
            return false;
        }

        var element = focusables[index];
        if (element) {
            element.focus();
            return true;
        }
        return false;
    }

    /**
    * Filters out disabled elements, elements that doesn't occupy space in page
    * @param {JQuery} - JQuery elements
    * @returns {JQuery []} : lit of elements that are not disabled and visible. 
    */
    private _getFocusableElements(elements: JQuery): JQuery[] {
        let focusables: JQuery[] = [];
        for (var i = 0; i < elements.length; i++) {
            var element = $(elements[i]);

            //default value for visibility is visible
            var isVisible: boolean = true;
            var visibility = element.css("visibility");
            if (visibility && visibility !== "visible") {
                isVisible = false;
            }

            //:visible returns false if display: none
            if (isVisible
                && !element.prop("disabled")
                && element.is(":visible")) {
                focusables.push(element);
            }
        }

        return focusables;
    }

    private _getFocusableBladeChildren(): JQuery {
        return this._$bladeContainerElement.find("input, select, textarea, button, iframe");
    }
}

/**
 * This is the generic button section at the buttom of the configuration blade. It contains
 * the saving and cancelling button.
 */
export class BladeButtons {

    public static ActionSave: string = 'save';
    public static ActionCancel: string = 'cancel';

    /**
     * Class for the container of all configuration buttons. We do not use a unique identifier since it is used across all blade
     */
    public static BladeConfigurationButtonsClass: string = "blade-configuration-buttons";

    /**
     * All buttons
     */
    private buttons: Array<BladeButton>;

    /**
     * Initialize the blade button are with a list of button to add
     * @param {Array<BladeButton>} buttons - Buttons to add in the Blade Buttons Area
     */
    public constructor(buttons: Array<BladeButton>) {
        this.buttons = buttons;
    }

    /**
     * Render buttons in the order they are located in the array
     */
    public render(): JQuery {
        //Remove the bowtie class when configuration blade is updated to use it - Feat#526064
        var $container = $("<div/>")
            .addClass(TFS_Dashboards_Constants.BowTieClassNames.Bowtie)
            .addClass(BladeButtons.BladeConfigurationButtonsClass);

        var $buttonsContainer = $("<div>");
        $buttonsContainer.appendTo($container);
        for (var iButton = 0; iButton < this.buttons.length; iButton++) {
            var $htmlButton = this.buttons[iButton].render();
            $buttonsContainer.append($htmlButton);
        }

        return $container;
    }
}

/**
 * Define a single button that will go in the BladeButtons bar
 */
export class BladeButton {
    /**
     * This is the text to display in the button
     */
    private caption: string;

    /**
     * Button ID. Mostly for testing purpose
     */
    private uniqueIdentifier: string;

    /**
     * Button's action
     */
    private onClick: () => void;

    /**
     * Html element of the button
     */
    private $button: JQuery;

    /**
     * Event handler for keydown on Button
     */
    private onKeyDown: (eventObject: JQueryKeyEventObject) => any;

    private callToAction: boolean;

    /**
     * Build a single button
     * @param {string} caption 
     * @param {string} uniqueIdentifier 
     * @param onClick - Call back when the button is pressed
     * @param onkeydown - Callback when keydown event occurs
     * @param callToAction true if the button is the call to action, defaults to false
     */
    public constructor(caption: string,
        uniqueIdentifier: string,
        onClick: () => void,
        onkeydown?: (eventObject: JQueryKeyEventObject) => any,
        callToAction: boolean = false
    ) {
        this.caption = caption;
        this.onClick = onClick;
        this.uniqueIdentifier = uniqueIdentifier;
        this.onKeyDown = onkeydown;
        this.callToAction = callToAction;
    }

    public render(): JQuery {
        this.$button = $("<button>")
            .attr('type', 'button')
            .click(() => {
                this.onClick();
                return false;
            })
            .on("keydown", this.onKeyDown)
            .attr('data-action', this.uniqueIdentifier)
            .text(this.caption);

        if (this.callToAction) {
            this.$button.addClass("btn-cta");
        }
        else {
            this.$button.addClass("btn-default");
        }

        return this.$button;
    }

    /**
     * Set the text of the button.
     * @param {string} text - Caption of the button
     */
    public setCaption(text: string) {
        this.$button.text(text);
    }

    public setEnabled(enabled: boolean) {
        if (this.$button == null) {
            throw Error("Render must be called before using setEnabled");
        }

        Utils_UI.enableElement(this.$button, enabled);
    }

    public isEnabled(): boolean {
        return this.$button.attr("disabled") !== "disabled"? true: false;
    }
}
