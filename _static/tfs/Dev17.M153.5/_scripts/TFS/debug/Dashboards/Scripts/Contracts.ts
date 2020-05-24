
import Dashboard_Services = require("TFS/Dashboards/Services");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");

import { PinArgs } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";

import Controls_Menus = require("VSS/Controls/Menus");
import Performance = require("VSS/Performance");


// NOTE: the file is a reference to widget client contracts, the naming of the file is to match similar patterns for TFS and VSS Client libraries.

/**
* Type of error returned by a widget to the server. 
* TODO: this list should be properly flushed out for public use. 
*/
export enum WidgetErrorType {
    /**
    * Server Side Error when making a REST API Call for data (e.g. bad request, invalid or empty data etc)
    */
    RestCall,
    
    /**
    * Auth issues when connecting to an API.
    */
    RestAuthentication,

    /**
    * Failures when rendering the widget, due to issues while working with the dom.
    */
    Render,

    /**
    * Widget taking too load to load within its allocated time
    */
    Timeout
}

/**
* Provides detailed representation for an error in the widget that is sent to the host by the widget. 
*/
export interface IWidgetErrorDetails extends TFS_Dashboards_WidgetContracts.ErrorMessage{
    /**
    * notify the widget host that this widget failed and provide any errors to be displayed on the error overlay.
    */
    widgetName: string;
}

export interface IWidgetCustomMenu {
    /**
    * Widget Author implements this method to provide additional customer menu
    */
    getMenu(widgetSettings: TFS_Dashboards_WidgetContracts.WidgetSettings): IPromise<Controls_Menus.IMenuItemSpec[]>;
}

export interface IWidgetSettings {
    /**
     * Widget Author implements this method to provide the maximum time to wait in milliseconds (ms) before the load failed due to timeout experience is shown. 
     * The intent is to support long running widgets from the framework like Charts.  
     * @returns time in milliseconds (ms)
     */
    getCustomTimeout(): IPromise<number>;

    /**
    * Widget Author implements this method if they want to control showing or hiding the widget menu.
    */
    canShowWidgetMenu?(): IPromise<boolean>;
}

/**
* Provides API for interactions with the widget hosting container.
*/
export interface IWidgetHost {
    /**
    *  Exposes state information about the Widget, for use by configuration blades. 
    * This member is not intended for consumption directly by widgets.
    */
    getWidget: () => TFS_Dashboards_Contracts.Widget;

    /**
     * Call from the configuration framework to notify that some settings has been changed. This will
     * call the client callback to have this one refresh the way he wants (complete refresh or partial).
     * calling this method before the host has completed initializing will reject the promise with an error. 
     * Use the result of the onInitializationComplete method to queue any requests for reload. 
     * @param {string} setting - All settings
     */
    reload(settings: ISettings): IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus>;

    /**
    * Notify the host that this widget finished loading and is ready to display
    */
    notifyLoadSucceeded: () => void;

    /**
    * notify the host that this widget failed and provide any errors to be displayed on the error overlay.
    */
    notifyLoadFailed: (error: string) => void;

    /**
    * request the host to open the configuration experience for the widget. 
    */
    configure: () => void;

    /**
     * Gets the element associated with this control.
     */
    getElement(): JQuery;

    /**
     * Resizes the element associated with this control.
     */
    resizeWidget(): void;

    /**
     * Tells whether the element associated with this control can be configured
     */
    canConfigure(): boolean;

    /**
     * Gets the container element associated with this control
     */
    getWidgetContainer(): JQuery;

    /**
     * Used when the widget fails to load and an error should be shown.
     * @param errorMessage The user-friendly error message which gives context on the error
     * @param errorCode The error code itself which should have its own message in the resource file
     */
    showUnhandledLoadException(errorMessage: string, errorCode: string): void;

    /**
     * Gets the load state element associated with this control
     */
    getLoadState(): WidgetLoadState;

    /**
     * Called when the mode change. The Widget host can react and change its apperances.
     * @param {boolean} isEditMode : True = Edit Mode, False = View Mode
     */
    onModeChange(isEditMode: boolean);

    /**
    * informs the caller that host initialization is complete (i.e. communication with the widget has been setup) so that they can queue operations as necessary.
    */
    onInitializationComplete(): IPromise<void>;

    /**
    *   Called by the container to inform the widget host that the dashboard has completed loading. 
    */
    onDashboardLoaded: () => void;

    /** Send notification to widget that lightbox has been resized*/
    notifyLightboxResized(size: TFS_Dashboards_WidgetContracts.Size): void;

    /**
    *   performance scenario for widget
    */
    getPerformanceScenario(): Performance.IScenarioDescriptor;


    /** Get current status of the widget */
    getWidgetStatus(): TFS_Dashboards_WidgetContracts.WidgetStatus;

    /**
    * Update the position of widget
    * @param row 
    * @param column 
    */
    rePosition(row: number, column: number): void;

    /**
    * load the widget into the container. 
    */
    load(isInitialLoad: boolean): void;

    /**
    * checks if the widget container has been initialized or not. 
    */
    isInitialized(): boolean;

    /**
    * check if this widget is part of the initial set of widgets loaded for the dashboard. Used to identify the set of widgets
    * to track for marking the performance scenario being complete. 
    */
    isInitialLoad(): boolean;

    /**
    * Destroy the widget host object.
    */
    dispose: () => void;

    /*
    * focus on widget configuration menu
    */
    focusConfigurationMenu: () => void;
}

export enum WidgetLoadState {
    Loading = 0,
    Loaded = 1,
    Failed = 2,
    UnhandledException = 3
}

export interface IGeneralSettings {
    WidgetName: string;
    WidgetSize: TFS_Dashboards_Contracts.WidgetSize; 
}

export interface ISettings {
    generalSettings: IGeneralSettings;
    customSettings: TFS_Dashboards_WidgetContracts.CustomSettings;
}

/** Read-Write interface for managing Widget Name in Config UI.*/
export interface IConfigureWidgetName {
    /** returns the current name of the widget, from the General configuration view */
    getCurrentWidgetName(): string;

    /** sets current name of the widget to the General configuration view. */
    setCurrentWidgetName(name: string) : void;
}

/** Read-Only interface for managing Widget Size in Config UI.*/
export interface IConfigureWidgetSize {
    /** returns the current size of the widget, from the General configuration view */
    getCurrentWidgetSize(): TFS_Dashboards_Contracts.WidgetSize;
}

/**
* Init payload container, which allows us to avoid unintentional param collisions.
*/
export interface WidgetOptions extends Dashboard_Services.WidgetOptions{
    /**
    * contribution type Identifier for the widget as in the manifest.
    */
    typeId: string;

   /**
   * loading image as provided in the manifest
   */
    loadingImageUrl: string;

    /**
    *  performance Scenario for widget (provided in cases of first party widgets)
    */
    performanceScenario?: Performance.IScenarioDescriptor;
}

export interface WidgetConfigurationOptions extends IConfigureWidgetName, IConfigureWidgetSize {
    /**
    * contribution type Identifier for the widget as in the manifest.
    */
    widgetTypeId: string;
}

/**
 * Describes contract for initializing controls targeted to Configuration Scenarios in Widgets.
 */
export interface ConfigurationControlOptions<T> {
    initialValue: T;

    /* Provides event notification when the control state changes.*/
    onChange: () => void;

    /* Provides event notification when the control has been initialized with its initialValue.*/
    onInitialized?: () => void;
}

/** A control which exposes error Messages*/
export interface IErrorControl {
    getErrorMessage: () => string;
}

/** Describes contract for composite controls which are used to assemble Widget Configuration UI, involving error standardized error validation. */
export interface IConfigurationControl<T> extends IErrorControl {

    /* Provides the currently selected value */
    getCurrentValue: () => T;

    /* Returns null if control is in a valid state, otherwise returns the error message. */
    getErrorMessage: () => string;
}

export interface IDashboardPermissions {
    /** 
     *{ boolean } canEdit - have the permission to edit the dashboard. THis includes drag and drop and saving the dashboard. 
     */
    canEdit: boolean;
}

export interface Rectangle {
    width: number;
    height: number;
    top: number;
    left: number;
}

export interface WidgetLightboxOptions {
    /** Widget configuration */
    widgetData: TFS_Dashboards_Contracts.Widget;

    /** Injected widget host for UT */
    widgetHost?: IWidgetHost;

    // callback after adding widget to a dashboard
    addToDashboardCallback?: (args: PinArgs) => void;

    animateFromRectangle?: Rectangle;

    // Title for lightbox dialog
    title?: string;

    // Subtitle for lightbox dialog
    subtitle?: string;
}

export class WidgetLightboxDialogConstants {
    static defaultWidth: number = 900;
    static defaultHeight: number = 600;
    static minWidth: number = 330;
    static minHeight: number = 330;

    // Increase the container +18px compared to widget size, so there is padding at the bottom
    static BottomPaddingHeight: number = 18;
}

export interface IActionRequiredControlOptions {
    /**
    * Title to present in the widget overlay
    */
    titleName: string;

	/**
    * Message to present in the widget overlay
    */
    message: string;

	/**
    * A supporting message to present in the widget overlay. 
    */
    subMessage?: string;

	/**
    *  Text for the link in the widget overlay
    */
    linkText?: string;

    /**
    * Text for screen reader support
    */
    ariaLabel?: string;

	/**
    * Optional click handler for the link in the widget overlay
    * Either the click handler or the link url should be provided 
    * 
    */
    clickHandler?: (JQueryEventObject) => boolean;

	/**
    * Optional url for the link in the widget overlay. 
    * Ignored if click handler is provided.
    */
    linkUrl?: string;

    /**
    * Optional css class applied on the widget overlay
    */
    cssClass?: string;

    /**
    * Optional url for image to render in this control. See also, the isImageOptionalBackground.
    */
    imageUrl?: string;

    /**
    * Optional: Specifies if the imageUrl provided should be treated as an img tag (which gets treatment in high contrast) or as a css background.
    * By default, this is false - images are treated as required, and use the img tag.
    */
    isImageOptionalBackground?: boolean;
}

export interface IWidgetNotificationOptions extends IActionRequiredControlOptions {
    /**
    *  Size of the widget for which the notification is being built
    */
    widgetSize: TFS_Dashboards_Contracts.WidgetSize;

    /**
    * Information needed to show the dialog on clicking the widget.
    * If this is provided, clickHandler is set to open a dialog using given data
    */
    dialogOptions?: any;
}
