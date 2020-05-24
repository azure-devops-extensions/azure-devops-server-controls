/// <reference types="jquery" />


import Q = require("q");

import TFS_Dashboards_BladeCommon = require("Dashboards/Scripts/BladeCommon");
import {IBladeMenuOptions, IBladeActions, IBlade, IBladeOptions, IWidgetBladeContext} from  "Dashboards/Scripts/BladeContracts";
import { DashboardPageExtension } from "Dashboards/Scripts/Common";
import {IWidgetHost} from "Dashboards/Scripts/Contracts";

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import { BladeLevelConstants } from "Dashboards/Scripts/BladeConstants";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Diag = require("VSS/Diag");
import WidgetSize = TFS_Dashboards_Contracts.WidgetSize; 

var delegate = Utils_Core.delegate;

/**
* This is the core class. This is the Blade Menu. This class contains a collection of blade passed by parameter during the
* creation (in the options). The blade menu must have a specific Html structure. It is not self-dependent:
* 
*    <div id="container-without-scroll">
*		<div id="curtain"></div>
*		<div id="container-with-scroll">
*            // Main container here
*        </div>
*    </div>
*	<div id="blade-menu"></div>
*   The reason is that the blade slide outside the view port of the browser. Without having specific container that handle scrollbar,
*   the browser create an horizontal scrollbar. The fix that, we englobe the main content inside a container that has its own scrollbar
*   handling and we use the menu outside this one as a normal DIV. To not have the browser uses its scrollbar, we override the Html/Body
*   to never  display scroll. We handle it ourself.
*/
export class BladeMenu extends Controls.Control<IBladeMenuOptions> implements IBladeActions {

    /**
     * This must be synchronized with the index.aspx structure
     */
    public static BladeMenuID: string = "blade-menu";

    /**
     * Namespacing keydown event to add and remove specific event handler
     */
    public static KeyDownEventNamespace: string = "keydown.openCurtain";

    /**
     * Namespacing click event to add and remove this event
     */
    public static ClickEventNamespace: string = "click.onElementsOutsideHubContent";

    /*
     * This must be synchronized with WebAccess\Presentation\Views\Shared\Header.ascx
     * Note: we could be using WebPlatformFeatureFlags constants to drive this, however per comments we are not supposed to
     * - so targeting both old and new class names from web platform header
     */
    public static HeaderSectionCSSClass: string = ".header-section, .webplatform-header";

    /**
     * This must be synchronized with the index.aspx structure
     */
    public static CurtainId: string = "#curtain";

    /**
     * When curtain is open, this css class will be added to curtain element
     */
    public static OpenCurtainClass: string = "curtain-open";

    /**
     * Namespacing focusout event to add and remove specific event handler
     */
    public static FocusChangedEvent: string = "focusout.insideBlade";

    /**
     * When using multiple blades, itls possible to collapse the blade but still being able to see it. This is the width
     * of a collapsed blade.
     */
    public static CollapsedBladeWidth: number = 15;

    /**
     * When focusout occurs within blade, this will store the element which lost the focus
     */
    private previousfocusedElement: JQuery = null;

    /**
     * BladeMenu
     */
    public _$bladeMenu: JQuery = null;

    /**
     * The active blade level
     */
    public _activeBladeLevel: BladeLevelConstants;

    /**
     * Starts at Zero and holds which blade is active
     */
    public _activeBladeIndex: number;

    /**
     * Promise for whether blade can be closed
     */
    private canBeClosedPromise: IPromise<boolean>;

    /**
     * Animation delay
     */
    public static DelayBladeMovementAnimationInMs: number = 500;
    
    /**
     * Indicate if a request is already been made to open the blade
     */
    public _isAlreadyInRequestToOpenOrCloseBlade: boolean = false;

    /**
     * Open promise that is returned by the Open method. This is globally declared because the promise is completed on an animation callback event.
     */
    public _opendeferred: Q.Deferred<IBlade<IBladeOptions>>;

    /**
     * Close promise that is returned by the Close method. This is globally declared because the promise is completed on an animation callback event.
     */
    public _closedeferred: Q.Deferred<any>;

    /**
     * Indicate if the blade is open or closed or null (between open and close, in transition)
     */
    private isBladeMenuOpened: boolean = null;

    /**
     * Initialize the menu with a set of blades
     * @param {IBladeMenuOptions} options - Contains blades
     */
    public constructor(options: IBladeMenuOptions) {
        super(options);

        if (options.blades == null) {
            throw Error("Blades must be defined");
        }
        options.blades.forEach((blade: IBlade<IBladeOptions>) => {
            if (blade == null) {
                throw Error("Blade must be defined");
            }
        });
    }

    /**
     * Setup the curtain click action
     * Setup the blade to be out of sign
     * Setup all blades click action
     * Fix the tab stop by only applying this one at the current blade level
     */
    public initialize() {
        super.initialize();
        this._$bladeMenu = $('#'+BladeMenu.BladeMenuID);
        this.setupAnimations();
        this._setupCurtain();
        this._setBladeRight(-this.getCloseWidth());
        this._setupBlades();
        this._setupBladeContainerFocus();
    }

    /**
     * Setup the animation in TS to be able to use constant value
     */
    private setupAnimations(): void {
        if (!DashboardPageExtension.isNewDashboardExperience()) {
            this._$bladeMenu.get(0).addEventListener("transitionend", (e: TransitionEvent) => { this._animationEnded(e) }, false);
            this._$bladeMenu.get(0).style.transition = "right " + BladeMenu.DelayBladeMovementAnimationInMs + 'ms ease-out 0s';
        }
    }

    /**
     * Called once the animation on the BladeMenu is done
     * @param {TransitionEvent} event - Information about the event.
     */
    public _animationEnded(event?: TransitionEvent): void {
        // We only want to handle animation events for the blade itself (not child elements)
        if (event && event.target != this._$bladeMenu.get(0)) {
            return;
        }

        Diag.Debug.logInfo(new Date() + "BladeMenu>animationEnded");
        var bladeMenuRightPosition = parseInt(this._$bladeMenu.css('right')); //This is the only place we check the right position to see if completely closed/open. Everything else use the method that use the boolean (better for performance)

        //Verify that the position is at completely open which mean that the right position is at the full width of the blade.
        if (bladeMenuRightPosition === -this.getCloseWidth()) {
            $(BladeMenu.CurtainId).removeClass(BladeMenu.OpenCurtainClass);
            this._$bladeMenu.get(0).style.display = "none";
            this.removeEvents();
            this.adjustTabStop(); // Remove all tabstop since the blade menu is closed
            this.isBladeMenuOpened = false;
            if (this._options.onClose) {
                this._options.onClose();
            }
            if (this._closedeferred) {
                this._closedeferred.resolve({});
            }
        }
        else if (bladeMenuRightPosition === 0) {
            this.isBladeMenuOpened = true;
            if (this._options.onOpen) {
                this._options.onOpen(this._activeBladeLevel);
            }
            this.setFocus();
            if (this._opendeferred) {
                this._opendeferred.resolve(this._options.blades[this._activeBladeIndex]);
            }
        }
    }

    private _setBladeRight(amount: number) {
        this._$bladeMenu.css('right', `${amount}px`);
        if (DashboardPageExtension.isNewDashboardExperience()) {
            // In the new dashboard experiment there isn't a transition, so trigger this manually.
            this._animationEnded();
        }
    }

    /**
     * We handle the focus coming into the blade container in a different way. As the focus cannot come from the blade buttons (since they force the focus to go
     * remain inside the container), this can only happen when someone shift tabs from the first active element in the blade. 
     */
    private _setupBladeContainerFocus(): void {
        this._$bladeMenu.on("focusin", "." + TFS_Dashboards_BladeCommon.Blade.BladeGeneralClass, (e) => {
            if ($(e.target).hasClass(TFS_Dashboards_BladeCommon.Blade.BladeGeneralClass)) {
                $(e.target).blur();
                this._options.blades[this._activeBladeIndex].focusOnLastElement();
            }
        });
    }

    /**
     * The curtain is the blur background that restraint any action until the preview/blades are closed
     */
    public _setupCurtain(): void {
        $(BladeMenu.CurtainId).click(() => {
            this._closeCurtain().then(null, () => {
                // no-op if closing is rejected, i.e. user clicked "cancel" on confirmation dialog for dirty state
            });
        });
    }

    /**
     * If blade has curtain and is open, close it
     * If blade doesn't have curtain, close it
     * @returns {IPromise<void>} Returns promise, so handlers can be invoked after closing curtain
     */
    public _closeCurtain(): IPromise<void> {
        var curtainExists: boolean = this._checkCurtainExistsForOpenedBlade();

        if (!curtainExists || this.checkBladeMenuHasCurtainOpen()) {
            if (this.getActiveBlade() &&
                this.getActiveBlade().getBladeComeFrom() &&
                this.getActiveBlade().getBladeComeFrom().getLevel() === BladeLevelConstants.CatalogBladeLevel) {
                this.requestOpenBlade(BladeLevelConstants.CatalogBladeLevel, this.getActiveBlade());
            }
            else {
                return this.requestCloseBlades();
            }
		}

        return Q.resolve<void>(null);
    }

    /**
     * Checks whether blade menu has an open curtain
     */
    private checkBladeMenuHasCurtainOpen(): boolean {
        return $(BladeMenu.CurtainId).hasClass(BladeMenu.OpenCurtainClass);
    }

    /**
     * Returns whether blade is currently opened has curtain or not
     */
    public _checkCurtainExistsForOpenedBlade(): boolean {
        var openedBlade: IBlade<IBladeOptions> = this._options.blades[this._activeBladeIndex];
        return openedBlade.withCurtain();
    }

    /**
     * Close curtain when given event occurs outside hub content
     * @param {string} - eventName - namespaced event name to listen on
     */
    public _closeCurtainOnEvent(eventName: string): void {
        $(BladeMenu.HeaderSectionCSSClass).on(eventName, () => {
            //Message dialog that shows up during dirty state uses JQuery UI
            //JQuery UI tries to set focus back to focusable elements (input, links) that opened it
            //Which in turn fires focus going out of hub event and triggers dirty state resulting in Message Dialog opening up
            //Keep track of dirty state promise and don't try to close curtain if it is already in process of closing curtain
            if (this.canBeClosedPromise
                && $.isFunction((<Q.Promise<boolean>>this.canBeClosedPromise).isPending)
                && (<Q.Promise<boolean>>this.canBeClosedPromise).isPending()) {
                return;
            }

            this._closeCurtain().then(() => {
                $(BladeMenu.HeaderSectionCSSClass).off(eventName);
            }, () => {
                // no-op if closing is rejected, i.e. user clicked "cancel" on confirmation dialog for dirty state
            });
        });
    }

    /**
     * Close curtain when user clicks outside of hub content
     */
    public _onFocusOutOfHubContent(): void {
        this._closeCurtainOnEvent(BladeMenu.ClickEventNamespace);
    }

    public _removeOnFocusOutOfHubContent(): void {
        $(BladeMenu.HeaderSectionCSSClass).off(BladeMenu.ClickEventNamespace);
    }

    /**
     * Loop all blades and setup a click action to be handled by the menu. The menu
     * is the best to handle every click because it knows them as a group and can move
     * them accordingly.
     */
    public _setupBlades(): void {
        var allBlades = this._options.blades;
        if (allBlades == null) {
            throw Error("Blades from the option must be defined before setuping them");
        }
        for (var iBladeIndex = 0; iBladeIndex < allBlades.length; iBladeIndex++) {
            allBlades[iBladeIndex].setActions(this);
        }

        this.adjustTabStop();

    }

    /**
     * Set tab stop only for the active tab
     * @param {Blade<IBladeOptions>} bladeClicked - The blade that needs to have tab stop
     */
    private adjustTabStop(bladeClicked: IBlade<IBladeOptions> = null): void {
        var allBlades = this._options.blades;
        for (var iBladeIndex = 0; iBladeIndex < allBlades.length; iBladeIndex++) {
            allBlades[iBladeIndex].disableTabStop();
        }
        if (bladeClicked != null) {
            bladeClicked.enableTabStop();
        }
    }

    /**
     * The curtain is the background that stop users to be able to click anything else than the menu.
     * Clicking the curtain close the menu.
     */
    public _close(): IPromise<void> {
        this._closedeferred = Q.defer<void>();

        this._closedeferred.promise.then(() => {
            Utils_Accessibility.announce(TFS_Dashboards_Resources.BladeDialogClosedAnnouncement, true /*assertive*/);
        }, () => { /*blade is still open so we dont need to make an announcement*/ });

        var activeBlade = this._options.blades[this._activeBladeIndex];
        
        if (activeBlade) {
            this.canBeClosedPromise = this._options.blades[this._activeBladeIndex].canBeClosed();
            this.canBeClosedPromise.then((canClose: boolean) => {
                if (canClose) {
                    requestAnimationFrame(() => {
                        this.isBladeMenuOpened = null; //In transition from close to open
                        this._setBladeRight(-this.getCloseWidth());
                        this._closedeferred.resolve(null);
                    });
                }
                else {
                    this._focusOnPreviousElement();
                    this._closedeferred.reject(null);
                }
            });
        }

        return this._closedeferred.promise;
    }

    /**
     * Dynamically calculate the menu width when one blade is open which take in consideration other blade collapsed.
     * @returns {number} Pixel
     */
    public getMenuWidth(context?: IWidgetBladeContext): number {
        let activeBlade = this._options.blades[this._activeBladeIndex];
        return !!activeBlade ? activeBlade.getMenuWidth(context) : TFS_Dashboards_BladeCommon.Blade.BladeWidth;
    }

    public getMenuWidthClass(context?: IWidgetBladeContext): string {
        return this.getMenuWidth(context) == TFS_Dashboards_BladeCommon.Blade.BladeWidth ? "normal" : "wide";
    }

    public getCloseWidth(context?: IWidgetBladeContext): number {
        return (this.getMenuWidth(context) + 10);
    }

    /**
     * This close every blade possible. We close the whole menu.
     */
    public removeEvents(): void {
        this._removeEscKeyEvent();
        this._removeFocusChangedEvent();
        this._removeOnFocusOutOfHubContent();
    }

    /**
     * Open a specific blade while having the others collapsed (but visible)
     * @param {number} activeBladeLevel - Based on a one index. Cannot be 0.
     * @param {boolean} isOtherBladeVisible - Open 1 blade only or all blade in collapsed mode
     * @param {Blade<IBladeOptions>} bladeComeFrom - Give some information about where this blade come from. Useful for example between catalog to configuration to know where to come back if we cancel
     * @param {WidgetBladeContext} context - Context information about the blade for the blade to open
     * @return {Blade<IBladeOptions>} The openned blade
     */
    public _openBladeMenu(
        activeBladeLevel: number,
        bladeComeFrom: IBlade<IBladeOptions> = null,
        context: IWidgetBladeContext = null) : IPromise<IBlade<IBladeOptions>> {

        Diag.Debug.logInfo(new Date() + "BladeMenu>_openBladeMenu");
        this._opendeferred = Q.defer<IBlade<IBladeOptions>>();

        var blades = this._options.blades;
        if (activeBladeLevel <= 0 || activeBladeLevel > blades.length) {
            throw new Error("Active Blade Level is invalid");
        }

        var totalBlade = blades.length;
        //-1 Because level is base 1, not 0.
        this._activeBladeLevel = activeBladeLevel;
        this._activeBladeIndex = activeBladeLevel - 1;
        var openedBlade: IBlade<IBladeOptions> = blades[this._activeBladeIndex];
        openedBlade.open(bladeComeFrom);
       
        for (var iBladeIndex = 0; iBladeIndex < totalBlade; iBladeIndex++) {
            var $blade = blades[iBladeIndex].getJQueryElement();
            $blade.get(0).style.display = "none";
            $blade.parent().get(0).style.display = "none"; //VSS' Control Div
            $blade.removeClass("normal");
            $blade.removeClass("wide");
        }

        //Display the active blade
        var currentBlade: JQuery = openedBlade.getJQueryElement();
        const menuWidth = this.getMenuWidth(context);

        this._$bladeMenu.get(0).style.display = "block";
        this._$bladeMenu.get(0).style.width = menuWidth + "px";
        currentBlade.get(0).style.width = menuWidth + "px";
        currentBlade.get(0).style.display = "block";
        currentBlade.parent().get(0).style.display = "block"; //VSS' Control Div
        currentBlade.addClass(this.getMenuWidthClass(context));

        var bladeWasClosed = bladeComeFrom === null;

        //Animation occurs only if no blade was already open. E.g. Open catalog or  Configure an existing widget
        if (bladeWasClosed) {
            //In case of configuring when the blade is open (E.g. Catalog)
            if (this.isOpened()) {
                this._animationEnded();
            } else {
                //In current frame, this anonymous function is fired, no styles are updated so nothing happens but we are queuing what should happen in next frame
                requestAnimationFrame(() => {
                    Diag.Debug.logInfo(new Date() + "BladeMenu>_openBladeMenu>requestAnimationFrame 1> in");
                    //Next frame, this set the final value + lets subsequent frame doing the transition to that value
                    requestAnimationFrame(() => {
                        Diag.Debug.logInfo(new Date() + "BladeMenu>_openBladeMenu>requestAnimationFrame 2> in");
                        this.isBladeMenuOpened = null; //In transition from close to open
                        this._setBladeRight(0);
                        Diag.Debug.logInfo(new Date() + "BladeMenu>_openBladeMenu>requestAnimationFrame 2> out");
                    });
                    Diag.Debug.logInfo(new Date() + "BladeMenu>_openBladeMenu>requestAnimationFrame 1> out");
                });
            }
        } else { //No animation because the blade menu is already open. E.g. Catalog is open and we configure a widget before adding.
            this._isAlreadyInRequestToOpenOrCloseBlade = false; // No animation if already in a blade so we allow new request on the BladeMenu for open/close.
            this.isBladeMenuOpened = true; // The blade remained open
            this._options.onClose(); //Close preview (This could be improved with a new callback method for onBladeSwitch)
            // Usually this event is triggered when the animation is complete. However since we're switching blades, there
            // is no animation, so we have to trigger the event here.
            this._options.onOpen(this._activeBladeLevel); 
            this._opendeferred.resolve(this._options.blades[this._activeBladeIndex]);
        }

        this._setViewObscurity(openedBlade);

        //In the case of configuration for example, we have some changes of context for the blade
        if (context != null) {
            openedBlade.setWidgetContext(context);
            this._options.onWidgetSelected(context.getWidget(), bladeComeFrom);
        }

        //Set focus on the underlying blade (probably configuration) if the blade was already open. This needs to happen
        //after the widget context has been set, otherwise we are focusing on the old DOM (before it is repaved by the new
        //configuration).
        if (!bladeWasClosed) {
            this.setFocus();
        }

        this._addEscKeyEvent();

        if (!DashboardPageExtension.isNewDashboardExperience()) {
            this._onFocusOutOfHubContent();
        }

        this._addFocusChangedEvent();
        this.adjustTabStop(openedBlade);

        return this._opendeferred.promise;
    }

    /**
     * Set the focus on the underlying blade
     */
    private setFocus(): void {
        var openedBlade: IBlade<IBladeOptions> = this._options.blades[this._activeBladeIndex];
        Diag.Debug.logInfo(new Date() + "BladeMenu>setFocus> Call Blade to set the focus");
        openedBlade.setFocus();
    }

    /**
     * Check if the view needs to be obscured for this blade and inform the view
     * Add curtain if the view is obscured
     * @param {openedBlade} - blade that is currently open
     */
    public _setViewObscurity(openedBlade: IBlade<IBladeOptions>) {
        var addCurtain: boolean = openedBlade.withCurtain();

        if ($.isFunction(this._options.obscureView)) {
            this._options.obscureView(addCurtain);
        }

        $(BladeMenu.CurtainId).toggleClass(BladeMenu.OpenCurtainClass, addCurtain);
    }

    /**
     * When moving the blade the main hub container can be moved if the focus is set to the blade.
     * The reason is that a Dom element out of the view port can get focus if visible. However, the container will make
     * this Dom element (the blade menu) in the view port, thus moving the whole HUB CONTENT to the right.
     * 
     * This method should be called every time we end changing the blade menu position to be sure that the HUB CONTENT is reseted.
     * This is not perfect since we need to 
     */
    private resetHubScrollBar(): void {
        $('.hub-content').scrollLeft(0);
    }

    /**
     * When Blade menu is open, hitting ESC key should ignore all the changes made in blade and close it
     */
    public _addEscKeyEvent(): void {
        //When configuration is opened from Catalog, two events are getting attached to the document
        //This results in two confirmation dialog opening up, so remove before adding one
        this._removeEscKeyEvent();
        $(document).on(BladeMenu.KeyDownEventNamespace, (eventObject: JQueryKeyEventObject): any => {
            var keyCode = eventObject.keyCode || eventObject.which;
            if (keyCode === Utils_UI.KeyCode.ESCAPE) {
                const isCurrentBladeConfig = this.getActiveBlade().getLevel()
                    === BladeLevelConstants.CatalogConfigurationLevel;
                const arePreviousBladesConfigComingFromCatalog = this._options.blades
                    .filter(b => b.getLevel() === BladeLevelConstants.CatalogConfigurationLevel)
                    .every(b => b.getBladeComeFrom() != null && b.getBladeComeFrom().getLevel()
                        === BladeLevelConstants.CatalogBladeLevel);

                if (isCurrentBladeConfig && arePreviousBladesConfigComingFromCatalog) {
                    this._openBladeMenu(
                        BladeLevelConstants.CatalogBladeLevel,
                        this.getActiveBlade(),
                        null);
                }                   
                else{
                    this._closeCurtain();
                }
            }
        });
    }

    /**
     * When curtain is closed, remove the ESC key event listener
     */
    public _removeEscKeyEvent(): void {
        $(document).off(BladeMenu.KeyDownEventNamespace);
    }

    /**
     * After blade is opened, when focus changes inside blade, store the element that lost focus
     */
    public _addFocusChangedEvent(): void {
        this._$bladeMenu.on(BladeMenu.FocusChangedEvent, (eventObject: JQueryEventObject): any => {
            this.previousfocusedElement = $(eventObject.target);
        });
    }

    /**
     * When blade is closed, remove the focusout event listener
     */
    public _removeFocusChangedEvent(): void {
        this._$bladeMenu.off(BladeMenu.FocusChangedEvent);
    }

    /**
     * Focus on previously focused element
     */
    public _focusOnPreviousElement(): void {
        if (this.previousfocusedElement) {
            this.previousfocusedElement.focus();
        }
    }

    /**
     * Close the Blade menu
     */
    public requestCloseBlades(): IPromise<void> {
        if (!this._isAlreadyInRequestToOpenOrCloseBlade && this.isOpened()) {
            return this._close();
        } else {
            return Q.resolve<void>(null);
        }

    }


    /**
     * Open a specific blade
     * @param {number} bladeLevel - Based on a one index. Cannot be 0.
     * @param {Blade<IBladeOptions>} bladeComeFrom - Give some information about where this blade come from. Useful for example between catalog to configuration to know where to come back if we cancel
     * @param {IWidgetHost} widgetToWorkWith - widget we are opening the blade for.
     * @returns {} 
     */
    public requestOpenBlade(bladeLevel: number,
        bladeComeFrom: IBlade<IBladeOptions> = null,
        widgetToWorkWith: IWidgetHost = null,
        canOpenEvenIfAlreadyOpen: boolean = false): IPromise<IBlade<IBladeOptions>> {

        var context: IWidgetBladeContext = null;
        
        if (widgetToWorkWith) {
            context = new TFS_Dashboards_BladeCommon.WidgetBladeContext({
                widgetToWorkWith: widgetToWorkWith
            });
        }

        // TODO: We need to rethink the logistics here. First, the return type on the interface 
        // doesn't match the implementation. Second, the promise is only consumed by one of many 
        // callers. This means any Q rejections are unhandled and cause noise in our client errors. 

        if (this._isAlreadyInRequestToOpenOrCloseBlade || (!this.isClosed() && bladeComeFrom === null && !canOpenEvenIfAlreadyOpen)) {
            return Q.reject("There is already a request to open a blade");
        } else {
            this._isAlreadyInRequestToOpenOrCloseBlade = true;
            return this._openBladeMenu(bladeLevel, bladeComeFrom, context).then((blade: IBlade<IBladeOptions>) => {
                this._isAlreadyInRequestToOpenOrCloseBlade = false;
                return blade;
            }, () => {
                this._isAlreadyInRequestToOpenOrCloseBlade = false;
            });

        }
    }

    /**
     * Indicate if the blade menu is open
     * @returns {boolean} : True if fully open; False if half-open or close 
     */
    public isOpened(): boolean {
        return this.isBladeMenuOpened == null ? false : this.isBladeMenuOpened;
    }

    /**
     * Return true if the blade is fully closed
     * @returns {boolean} : True if fully closed; False if half-open or open  
     */
    public isClosed(): boolean {
        return this.isBladeMenuOpened == null ? false : !this.isBladeMenuOpened;
    }

    /**
     * Returns the blade that is currently active
     */
    public getActiveBlade(): IBlade<IBladeMenuOptions> {
        if (this.isOpened()) {
            return this._options.blades[this._activeBladeIndex];
        }
        else {
            return null;
        }
    }
}

