/// <amd-dependency path='VSS/LoaderPlugins/Css!widgets' />


import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");

import Dashboard_Services = require("TFS/Dashboards/Services");
import Tfs_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import StringUtils = require("VSS/Utils/String");
import Performance = require("VSS/Performance");
import { addTooltipIfOverflow } from "Presentation/Scripts/TFS/TFS.UI.Controls.Accessibility.Utils";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import UnconfiguredControl = require("Widgets/Scripts/Shared/UnconfiguredControl");
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

/**
 * Controls for widgets to extend from. It provides the widget context and tfs context as base properties over
 * the base control contract.
 */
export class BaseWidgetControl<T extends Dashboard_Shared_Contracts.WidgetOptions> extends Controls.Control<T> {
    protected unconfiguredControl: UnconfiguredControl.UnconfiguredControl;
    public webContext: Contracts_Platform.WebContext;
    public teamContext: Contracts_Platform.TeamContext;
    protected performanceScenario: Performance.IScenarioDescriptor;

    /*
     * BaseWidget need to define all context during the construction because context can be used during initialization of child
     */
    constructor(options: T) {
        super(options);
        this.webContext = Context.getDefaultWebContext();
        this.teamContext = TFS_Dashboards_Common.getDashboardTeamContext();
        this.performanceScenario = this._options.performanceScenario;
    }

    public initialize(): void {
        super.initialize();
        this.addSplitTiming(TFS_Dashboards_Telemetry.WidgetSplits.WidgetInitialized);
    }

    public getElement(): JQuery {
        if (this.isDisposed()) {
            throw Error("this.getElement() called on a disposed widget:" + this._options.typeId);
        } else {
            return super.getElement();
        }
    }

    public dispose(): void {

        if (this.unconfiguredControl) {
            this.unconfiguredControl.dispose();
            this.unconfiguredControl = null;
        }

        super.dispose();
    }

    /**
     * Shows the experiences that informs the user that they need to configure the widget.
     * @param size - How big the unconfigured control should be
     * @param name - The title of the control to display
     * @param message - (Optional) The message to show the user. Defaults to a simple message if none is provided.
     * @param linkText - (Optional) The text of the link to show the user. Defaults to empty string if none is provided.
     */
    public showUnConfiguredControl(size: Tfs_Dashboards_Contracts.WidgetSize, name: string, message?: string, linkText?: string): void {
        if (this.unconfiguredControl) {
            this.unconfiguredControl.remove();
        }
        this.createUnconfiguredControl(size, name, message, linkText);
        this.unconfiguredControl.show();
    }

    /**
     * Removes the unconfigured control
     */
    public hideUnConfiguredControl(): void {
        if (this.unconfiguredControl) {
            this.unconfiguredControl.hide();
        }
    }

    protected addSplitTiming(name: string, elapsedTime?: number) {
        if (this.performanceScenario) {
            this.performanceScenario.addSplitTiming(name, elapsedTime);
        }
    }

    /**
    * Return the typeId for the widget. 
    * @returns string
    */
    public getTypeId(): string {
        return this._options.typeId;
    }

    /**
     * Handles routine details of WidgetLoaded event logging - Insulates UT's from universal concern of providing a stub WidgetService & getWidgetId()
     */
    protected publishLoadedEvent(customProperties: {}) {
        this.addSplitTiming(TFS_Dashboards_Telemetry.WidgetSplits.WidgetRendered);
        if (this._options.widgetService) {
            this._options.widgetService.then((service) => {
                service.getWidgetId().then((widgetId) => {
                    WidgetTelemetry.onWidgetLoaded(this._options.typeId, widgetId, customProperties);
                });
            });            
        }
    }

    /**
    * Return the loading image for the widget. 
    * @returns string
    */
    protected getLoadingImageUrl(): string {
        return this._options.loadingImageUrl;
    }

    /**
    * Creates the control informing the user about the widget's unconfigured state.
    */
    private createUnconfiguredControl(size: Tfs_Dashboards_Contracts.WidgetSize, name: string, message?: string, linkText?: string): void {
        var options: UnconfiguredControl.UnconfiguredControlOptions = {
            containingControl: this.getElement(),
            widgetSize: size,
            widgetName: name,
            clickHandler: (e) => this._unconfiguredControlClickHandler(e)
        };

        if (message != null) {
            options.message = message;
        }

        if (linkText != null) {
            options.linkText = linkText;
        }

        this.unconfiguredControl = new UnconfiguredControl.UnconfiguredControl(options);
    }

    /**
     * Handles the event fired when the user clicks on the unconfigured control
     * @param e The event object
     * @returns False to stop the event from bubbling up
     */
    public _unconfiguredControlClickHandler(e: JQueryMouseEventObject): boolean {
        e.preventDefault();

        Dashboard_Services.WidgetHostService.getService(this._options).then(
            (service: Dashboard_Services.IWidgetHostService) => {
                service.showConfiguration();
            });

        return false;
    }

    /**
     * Helper method that caches the promise returned by a call so that the call is made at most once
     * per cache instance. This way, many callers can use the promise without multiple calls being made.
     *
     * @param {string} key The key to associate the promise with.
     * @param {IDictionaryStringTo<IPromise<T>>} cache An object which will store the cached promise.
     * @param {() => IPromise<T>} makeCall A function which returns a promise. This function will only
     *     be called if the cache does not contain an entry pertaining to the key.
     * @returns {IPromise<T>} The promise returned by makeCall (either directly or via the cache).
     */
    protected cachePromise<T>(key: string, cache: IDictionaryStringTo<IPromise<T>>, makeCall: () => IPromise<T>): IPromise<T> {
        var promise: IPromise<T>;

        if (cache.hasOwnProperty(key)) {
            promise = cache[key];
        } else {
            promise = makeCall();
            cache[key] = promise;
        }

        return promise;
    }

    /**
    * Returns an <a> with given href and tooltip. The <a> will contain a <span> each for icon, text and sub text
    * @param hrefValue  -   Url to use as href for the <a>
    * @param tooltip    -   string to use as tooltip for the <a>
    * @param text       -   string to use as main link text for the <a>
    * @param subText    -   string to use as sub text for the <a>
    * @param bowtieIconClass  - one of the bowtie icon classes that will be used to create the icon. 
                                If none is provided the <span> for icon-container will be empty
    * @returns JQuery for the <a> created using the given input
    */
    public getLinkWithIconAndText(hrefValue: string, tooltip: string, text: string, subText: string, bowtieIconClass?: string): JQuery {
        var $link = $('<a/>')
            .attr("href", hrefValue)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.LinkWithIconAndText);

        if (WidgetLinkHelper.mustOpenNewWindow()) {
            $link.attr("target", "_blank");
        }

        if (!StringUtils.equals(tooltip, text, true /* ignore case */)) {
            RichContentTooltip.add(tooltip, $link);
        }

        var $text = $("<div/>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title)
            .text(text);
        var $subText = $("<div/>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.SubTitle)
            .text(subText);
        $text.append($subText);
        var $iconContainer = $("<span/>")
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.IconContainer);

        if (bowtieIconClass && bowtieIconClass.trim()) {
            var $icon = $("<span/>")
                .addClass(TFS_Dashboards_Constants.BowTieClassNames.Icon)
                .addClass(bowtieIconClass);
            $iconContainer.append($icon);
        }

        $link.append($iconContainer).append($text);
        return $link;
    }

    protected addTooltipIfOverflow(element: JQuery) {
        addTooltipIfOverflow(element);
    }
}
