


import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import * as Service from "VSS/Service";
import {HubsService} from "VSS/Navigation/HubsService";

import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import TFS_Widgets_CountControl = require("Widgets/Scripts/Shared/CountWidgetControl");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import Utils_String = require("VSS/Utils/String");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

/*
 * Class that has common methods and fields for 1x1 widget like for the CodeScalar and the QueryScalar
 */
export class BaseScalarWidget
    extends TFS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
{

    /**
     * The settings for the widget as stored by dashboard service and provided through the widget context.
     */
    public settings: string;

    /**
    * Name associated with a scalar tile. If added from the dashboard catalog it would be widget contribution name by default.
    * It can be edited through the configuration experience.
    */
    public widgetName: string;

    /**
     * The scalar / number representing an aggregation.
     */
    public scalarResultCount: number;

    /**
    * The JQuery container for the CountControl.
    */
    public countControl: JQuery;

    /**
    * The Count control that backs the widget
    */
    public countWidgetControl: TFS_Widgets_CountControl.CountControl;

    constructor(options: Dashboard_Shared_Contracts.WidgetOptions) {
        if (options == null) {
            throw new Error("Option required");
        }

        super(options);
    }

    /** The name to be *rendered* by the widget.
     *  By default, this is the saved name, but a derived implementation may choose to override this.
     */
    public getWidgetName(): string {
        return this.widgetName;
    }

    /**
     * Derived classes must override this to make ajax call, get required data and load the widget
     */
    public loadAndRender(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus> {
        throw Error("not implemented - Derived classes must handle this.");
    }

    /**
     * derived classes must override this to CountControlOptions from query or code tiles
     */
    public getCurrentOptions(): TFS_Widgets_CountControl.CountControlOptions {
        throw Error("not implemented - Derived classes must handle this.");
    }

    /**
     * Derived classes must override this to return the url that will be used when user clicks on the widget
     */
    public getUrlForWidget(): string {
        throw Error("not implemented - Derived classes must handle this.");
    }
    /**
     * Derived classes must override this to return the of the hub that the url from getUrlForWidget() is targeting. 
     */
    public getUrlHubId(): string {
        throw Error("not implemented - Derived classes must handle this.");
    }

    /**
     * Check if the widget is configured or not
     * Derived widgets can extend this with more complex checks if needed
     */
    public isUnconfigured(settings: string): boolean {
        return settings == null || settings == Utils_String.empty;
    }

    public dispose(): void {
        if (this.countWidgetControl) {
            this.countWidgetControl.dispose();
            this.countWidgetControl = null;
        }
        super.dispose();
    }

    /**
    * Sets up the structure for the widget. No heavy lifting (API calls) should be done here.
    */
    private setUpWidgetStructure() {
        let userHasClickPermission = this.getClickPermission();
        let tagStyle: string = "<a/>"

        if (!userHasClickPermission) {
            tagStyle = "<div/>";
        }

        //Creating the container for the CountControl
        this.countControl = $(tagStyle).appendTo(this.getElement());

        Widget_Telemetry.WidgetTelemetry.setupWidgetClickTelemetry(this.countControl, this.getTypeId());

        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        let element = this.getElement();
        element.addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer);

        if (userHasClickPermission) {
            element.addClass(TFS_Dashboards_Constants.WidgetDomClassNames.ClickableWidgetContainer);
        }
    }

    /**
    * Renders widget composition
    */
    public render(): void {
        // $widgetLink would not be set during first time configuration
        if (!this.countControl) {
            this.setUpWidgetStructure();
        }

        const url = this.getUrlForWidget();
        this.countControl.attr("href", url);

        if (WidgetLinkHelper.mustOpenNewWindow()) {
            this.countControl.attr("target", "_blank");
        } else if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAllowFpsFromScalarWidgets, false)) {
            this.countControl.click(Service.getLocalService(HubsService).getHubNavigateHandler(this.getUrlHubId(), url));
        }

        var options = this.getCurrentOptions();
        this.renderCount(options, this.countControl);
    }

    protected getClickPermission(): boolean {
        return true;
    }

    /** Provides a convenient output point for test monitoring*/
    public renderCount(options: TFS_Widgets_CountControl.CountControlOptions, container: JQuery) {
        if (!this.countWidgetControl) {
            this.countWidgetControl = <TFS_Widgets_CountControl.CountControl>Controls.Control.createIn<TFS_Widgets_CountControl.CountControlOptions>(
                TFS_Widgets_CountControl.CountControl,
                container,
                options);
        } else {
            this.countWidgetControl.setHeader(options.header);
            this.countWidgetControl.setCount(options.count);
        }
    }

    /**
    * If widget is unconfigured, then preload will show the unconfigured state
    * Else, widget structure is set up using just the input state and without making any calls to the server
    */
    public preload(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.settings = state.customSettings.data;
        this.widgetName = state.name;

        if (this.isUnconfigured(this.settings)) {
            this.showUnConfiguredControl(state.size, state.name);
            return WidgetHelpers.WidgetStatusHelper.Unconfigured();
        } else {
            this.setUpWidgetStructure();
        }

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
    * If widget is unconfigured, then load is no-op. preload handles unconfigured state.
    * If widget is configured, then loadAndRender() is called to load the rest of the widget
    */
    public load(state: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        if (this.isUnconfigured(this.settings)) {
            return WidgetHelpers.WidgetStatusHelper.Success();
        }

        this.publishLoadedEvent({});
        return this.loadAndRender(state);
    }

    /**
     * Reload the widget with the settings provided by the configuration experience.
     * @param {WidgetSettings} settings with name, size, and custom settings used by the widget to render.
     */
    public reload(newSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        if (this.isUnconfigured(newSettings.customSettings.data)) {
            this.showUnConfiguredControl(newSettings.size, newSettings.name);
            return WidgetHelpers.WidgetStatusHelper.Unconfigured();
        }

        this.hideUnConfiguredControl();

        var dataReloadNeeded = this.reloadData(newSettings);

        this.widgetName = newSettings.name;
        this.settings = newSettings.customSettings.data;

        if (dataReloadNeeded) {
            return this.loadAndRender(newSettings);
        }

        // Data need not be reloaded. Repainting the widget is enough.
        this.render();

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
    * Returns a boolean that denotes whether the data for the widget needs to be reloaded
    * Derived classes can override this to add more logic to make the decision
    */
    public reloadData(newSettings: Dashboards_WidgetContracts.WidgetSettings): boolean {
        return (this.settings != newSettings.customSettings.data)
    }
}

