import Q = require("q");

import {BuildLinks} from "Build.Common/Scripts/Linking";
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");

import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");

import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");

import * as React from "react";
import * as ReactDOM from "react-dom";
import { LWPComponent } from "VSSPreview/Flux/Components/LWP";
import { DashboardPageContext } from "Dashboards/Scripts/DashboardPageContext";
import { BuildHistogramConfiguration, IBuildHistogramConfiguration } from "./BuildHistogramConfiguration";

/**
* Class that encapsulates business logic and rendering for the build chart widget
* @extends VSS_Control_BaseWidget.BaseWidget
*/
export class BuildHistogramControl
    extends TFS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
    implements WidgetContracts.IConfigurableWidget {

    private configuration: IBuildHistogramConfiguration = null;

    private widgetTitle: string;

    /**
     * The settings for the widget as stored by dashboard service and provided through the widget context.
     */
    private settings: string;

    /**
    * The container that holds the widgets rendered content.
    */
    private container: HTMLAnchorElement;

    private titleElement: HTMLHeadingElement;

    private histogramContainer: HTMLDivElement;

    private containerHasBeenInitialized = false;

   /**
    * Passes relevant options to the BaseWidget control
    * and setup instance properties
    * @constructor
    */
    public constructor(options?: any) {
        super(options);
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions(Object.assign({
            coreCssClass: "buildchart-container"
        }, options));
    }

    /**
    * Paint the widget with whatever initial information was available from the host.
    * No network calls are made at this time.
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    * @returns a promise with the state of the operation.
    */
    public preload(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {

        if (!Widget_Utils.isUndefinedOrNull(settings)) {
            this.settings = settings.customSettings.data;
            this.configuration = BuildHistogramConfiguration.stringToConfiguration(this.settings);
            this.widgetTitle = settings.name;
        }

        if (this.isUnconfigured()) {
            this.showUnConfiguredControl(settings.size, this.widgetTitle);
            return WidgetHelpers.WidgetStatusHelper.Unconfigured();
        } else if (!this.containerHasBeenInitialized) {
            this.initializeContainer()
        }

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
    * Setup data and renders the widget
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    * @returns a promise with the state of the operation.
    */
    public load(): IPromise<WidgetContracts.WidgetStatus> {
        if (this.isUnconfigured()) {
            return WidgetHelpers.WidgetStatusHelper.Success();
        } else {
            this.render(this.configuration);
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
    }

    /**
    * Refresh the widget when settings are provided by the configuration experience.
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    */
    public reload(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        this.widgetTitle = settings.name;

        // if settings hasn't changed (but name or general settings might have) re-render with existing data.
        if (this._isSettingsUnchanged(settings.customSettings.data)) {
            if (this.isUnconfigured()) {
                this.showUnConfiguredControl(settings.size, this.widgetTitle);
                return WidgetHelpers.WidgetStatusHelper.Unconfigured();
            } else {
                this.render(this.configuration);
            }
            return WidgetHelpers.WidgetStatusHelper.Success();

        } else {

            // load latest settings
            this.settings = settings.customSettings.data;

            // parse settings into definition object
            this.configuration = BuildHistogramConfiguration.stringToConfiguration(this.settings);

            // paint and render with the latest settings information.
            return this.preload(settings).then(() => {
                // render histogram and footer with existing data.
                return this.load();
            });
        }
    }

    /**
    * Checks if the widget is in an unconfigured state.
    * @returns boolean
    */
    public isUnconfigured(): boolean {
        return Widget_Utils.isUndefinedOrNull(this.configuration) || Widget_Utils.isUndefinedOrNull(this.configuration.buildDefinition);
    }

    /**
    * Checks if settings has been updated or remain unchanged
    * @param {string} new settings provided to the widget
    * @returns boolean
    */
    public _isSettingsUnchanged(newSettings: string): boolean {

        // if both have valid strings, compare to identify change.
        if (this.settings && newSettings) {
            return this.settings === newSettings;
        }

        // if both are empty or undefined.
        else if (!this.settings && !newSettings) {
            return true;
        }

        // if one if null but not the other, settings has changed.
        else {
            return false;
        }
    }

    private initializeContainer(): void {
        this.getElement().empty();
        // Add the class that enables the widget to take advantage of the styles from the widget sdk
        this.getElement()
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer)
            .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.ClickableWidgetContainer);

        // setup container and add the title to it.
        this.container = document.createElement("a");
        this.container.href = BuildLinks.getDefinitionLink(this.configuration.buildDefinition.id);

        Widget_Telemetry.WidgetTelemetry.setupWidgetClickTelemetry($(this.container), this.getTypeId());


        const titleElement = document.createElement("h2");
        titleElement.classList.add(TFS_Dashboards_Constants.WidgetDomClassNames.Title);
        this.titleElement = titleElement;

        this.histogramContainer = document.createElement("div");

        this.container.appendChild(this.titleElement);
        this.container.appendChild(this.histogramContainer);
        this.getElement().append(this.container);

        this.containerHasBeenInitialized = true;
    }

    private updateWidgetTitle() {
        this.titleElement.innerText = this.widgetTitle;
        this.addTooltipIfOverflow($(this.titleElement));
    }

    /**
    * Renders the widget
    * @param {number} unique identifier for the build definition being rendered.
    * @param {Build_Contracts.Build[]} a list of builds associated with the definition.
    */
    private render(configuration: IBuildHistogramConfiguration): void {
        this.updateWidgetTitle()

        const histogramProps = {
            itemsCount: 10,
            projectId: configuration.buildDefinition.projectId,
            definitionId: configuration.buildDefinition.id
        } as any; // cannot import Histogram prop types from webproj

        if (configuration.fullBranchName) {
            histogramProps.fullBranchName = configuration.fullBranchName;
        }

        ReactDOM.render(<LWPComponent pageContext={DashboardPageContext.getPageContext()}
            wrappedType="build-dashboard-histogram"
            dependencies={["ms.vss-build-web.dashboard"]}
            {...histogramProps}>
        </LWPComponent>, this.histogramContainer);
    }
}

// register control as an enhancement to allow the contribution model to associate it with the widget host.
SDK.registerContent("dashboards.buildHistogram-init", (context) => {
    return Controls.create(BuildHistogramControl, context.$container, context.options);
});
