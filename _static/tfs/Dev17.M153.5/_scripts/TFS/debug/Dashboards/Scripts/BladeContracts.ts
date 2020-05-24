import {Widget, WidgetScope, WidgetSize} from "TFS/Dashboards/Contracts";
import {IWidgetHost, ISettings} from "Dashboards/Scripts/Contracts";
import {WidgetSource} from  "Dashboards/Scripts/WidgetSource";
import {WidgetStatus} from  "TFS/Dashboards/WidgetContracts";
import { BladeLevelConstants } from "Dashboards/Scripts/BladeConstants";

/**
 * This represents a single blade of content and is one of potentially many blades in our blade menu.
 * NOTE: This interface is currently incomplete. The desire is for this interface to represent the public
 *       contract for a blade, but refactoring will be required to update this contract and to pass
 *       around IBlade rather than Blade among the code.
 */
export interface IBlade<T> {
    /**
     * Indicate if the blade can be closed. In the case of being dirty, this method can return false;
     * @returns {IPromise<boolean>} Promise of true if can be closed; Promise of false if cannot be closed.
     */
    canBeClosed(): IPromise<boolean>;

    /**
     * Allows for the blade to be focused
     */
    setFocus(): void;

    /**
    * set focus on first visible and reachable element on the blade. 
    */
    focusOnFirstElement(): boolean;

    /**
    * set focus on last visible and reachable element on the blade. 
    */
    focusOnLastElement(): boolean;

     /**
     * Returns whether blade needs curtain to be drawn on grid
     * @returns {boolean} TRUE curtain is drawn, FALSE curtain is not drawn
     */
    withCurtain(): boolean;

    /**
     * Return the Blade general element of the blade
     * @returns {JQuery} Jquery object of the element 
     */
    getJQueryElement(): JQuery;

    /**
     * Action to do whenthe  blade is openned. In that case we 
     * @param {IBlade<IBladeOptions>} bladeComeFrom - Null if come from a widget, otherwise, for example the catalog
     */
    open(bladeComeFrom?: IBlade<IBladeOptions>): void;

    /**
     * This is only for the WidgetConfiguration blade. This one has special needs to have a second control
     * to be updated with some actions on this blade.
     * @param {IWidgetBladeContext} widgetContext - Widget Configuration Widget gives a pointer to the preview control.
     */
    setWidgetContext(widgetContext: IWidgetBladeContext);

    /**
     * Remove all tab stops.
     */
    disableTabStop(): void;

    /**
     * Set back the tab stop by adding the tab index of 0
     */
    enableTabStop(): void;

    /**
     * Define the actions that a blade can do like closing a blade, opening a blade, clicking a blade.
     * @param {IBladeActions} - bladeMenuActions 
     */
    setActions(bladeMenuActions: IBladeActions): void;

    /**
     * Get from the option the initial level assigned to the blade.
     * @returns {number} The blade level which should be between 0 and ... 
     */
    getLevel(): number;

    /**
    * The blade that was currently open when the request for the current blade
    * was made. When the blade is opened from the widget configuration or
    * edit mode banner, this will be null.
    */
    getBladeComeFrom(): IBlade<IBladeOptions>;

    /**
    * Width provided by an individual blade that the blade menu will use to animate in the blade in the view during editing. 
    */
    getMenuWidth(context?: IWidgetBladeContext): number;
}

/**
 * Used between the Preview and the Configuration Blade as a central context where they can share information.
 */
export interface IWidgetBladeContext {
    /**
     * Set the Widget Host in to the blade context, if this one is not null, the underlying widget is also taken.
     * @param {IWidgetHost} widgetToWorkWith - The widget host. Can be null
     */
    setWidgetHost(widgetToWorkWith: IWidgetHost): void;

    /**
    * return the widget being encompassed
    */
    getWidget(): Widget;
}

/**
 * This represent the option for a single blade inside a menu that can contain multiple blades.
 */
export interface IBladeOptions {
    /**
     * Every blade are defined by a level of depth. The first level is 1 and so on. The level 1 is the deeper level 
     * and all subsequent level are above. The reason is to be consistent with z-index. This should be unique
     * within a BladeMenu.
     */
    level: number;

    /**
     * This is trigged when the context change. Required to be able to refresh the preview or act
     * if something changed in the blade for outsider.
     * @param {IWidgetBladeContext} widgetContext - Information about the widget and widget configuration
     */
    onWidgetContextChange?: (widgetContext: IWidgetBladeContext) => void;

    /**
     * This is the heading (H3) of the blade.
     */
    heading: string;

    /**
     * This is trigged when the blade is closed. It allows to do a final action. 
     * For example, for the configuration, to ensure that the preview is closed when we close the configuration.
     * @param {IBlade<IBladeOptions>} closingBlade - The blade that is closing
     */
    onBladeClose: (closingBlade: IBlade<IBladeOptions>) => void;

    /**
     * Blade can say whether it needs curtain drawn over grid or not
     * When curtain is drawn, soft dismiss is available and user cannot interactive with grid
     * When curtain is not drawn, soft dismiss is not available and user can drag, initiate configure and remove widgets from grid
     */
    withCurtain: boolean;
}

/**
 * Option for the blade menu
 */
export interface IBladeMenuOptions {
    /**
     * Action triggered when a blade is closed. Useful to notify the view to close the widget preview
     */
    onClose(): void;

    /**
     * Action triggered when a blade is opened.
     */
    onOpen(bladeLevel: BladeLevelConstants): void;

    /**
     * Default blades for the blade meun
     */
    blades: Array<IBlade<IBladeOptions>>;

    onActiveWidgetSizeChange?: () => void;
    onActiveWidgetChanged?: () => void;

    onWidgetSelected: (widget: Widget, source: IBlade<IBladeOptions>) => void;

    /**
     * Change view obscurity
     * @param {boolean} value Pass TRUE to obscure view otherwise FALSE
     */
    obscureView: (value: boolean) => void;
}

/**
 * Public actions that can be used outside the blade menu
 */
export interface IBladeActions {
  
    /**
     * Request to close the blade. This is called to notify the blade to close.
     */
    requestCloseBlades: () => IPromise<any>;

    /**
     * Request to open the blade. This notify the blade to open
     * @param {number} bladeLevel - The blade to open
     * @param {Blade<IBladeOptions>} bladeComeFrom - Blade from where is was open
     * @param {Widget} widgetToWorkWith - widget to work with 
     */
    requestOpenBlade: (
        bladeLevel: number,
        bladeComeFrom?: IBlade<IBladeOptions>,
        widgetToWorkWith?: IWidgetHost,
        canOpenEvenIfAlreadyOpen?: boolean) => IPromise<IBlade<IBladeOptions>>;
}

export interface IBladeMenu extends IBladeActions {
    /**
     * This close every blade possible. We close the whole menu.
     */
    removeEvents(): void;

    /**
     * Return true if the blade is fully closed
     * @returns {boolean} : True if fully closed; False if half-open or open  
     */
    isClosed(): boolean;

    /**
     * Returns the blade that is currently active
     */
     getActiveBlade(): IBlade<IBladeMenuOptions>;
}

/** 
 * Options to create BladeCatalog blade
 */
export interface IBladeCatalogOptions extends IBladeOptions {
    /** Callback to execute when widget requested to be added */
    addWidgetCallback: (widget: Widget, source: WidgetSource) => IPromise<Widget>;
    /** Widget scope, to filter the catalog */
    scope: WidgetScope;
}

/**
 * Options for the WidgetPreview.
 */
export interface IWidgetPreviewOptions {
    /**
     * Callback trigger when the widget preview is closing.
     * @param {boolean} isFromCatalog - Indicate if the widget configured come from the catalog or not.
     */
    onClosing?: (isFromCatalog: boolean) => void;

    /**
     * callback trigger when the widget preview is closed. This is trigged after the preview (clone) widget is gone.
     * This is called when the real widget is on the dashboard.
     * @param {boolean} isFromCatalog - Indicate if the widget configured come from the catalog or not.
     */
    onClosed?: (isFromCatalog: boolean) => void;

    /**
     * Allow to specify a width offset. Used to horizontally position the preview between the left side of the 
     * screen and the left side of the blade menu.
     */
    widthOffset?: number;

    /**
     * callbackgr trigger when the widget preview is totall opened which mean : 1- Visible, 2- Middle of the screen
     * @param {boolean} isFromCatalog - Indicate if the widget configured come from the catalog or not.
     */
    onOpened?: (isFromCatalog: boolean) => void;

    /** The parent container of the preview (optional override for unit testing) */
    $parentContainer?: JQuery;
}

/**
 * Widget context initialization values. Some are optional because the blade system work on existing widget or new one.
 */
export interface IWidgetConfigurationContextOption {

    /**
     * Widget host of the real widget (not the one in the preview)
     */
    widgetToWorkWith?: IWidgetHost;

    /**
     * Type of widget. Not required if using an existing widget because we get it from the Widget Host. Required for catalog
     * because this one does not exist yet.
     */
    widgetType?: Widget;
}

export interface IBladeConfigurationOptions extends IBladeOptions {
    saveWidgetCallback: (bladeSource: IBlade<IBladeOptions>,
        widget: Widget,
        generalSettingsControl: ISettings) => IPromise<void>;
    onBladeClose: (closingBlade: IBlade<IBladeOptions>) => void;
    onSettingChanged: (settings: ISettings) => IPromise<WidgetStatus>;
    onSizeChanged: (settings: WidgetSize) => void;
}