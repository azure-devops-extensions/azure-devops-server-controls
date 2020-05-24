import Q = require("q");
import SDK = require("VSS/SDK/Shim");
import Controls = require("VSS/Controls");
import Context = require("VSS/Context");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Service = require("VSS/Service");
import Contribution_Services = require("VSS/Contributions/Services");
import Utils_Url = require("VSS/Utils/Url");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import BaseWidgetConfiguration = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");

export interface IframeControlSettings {
    /**
    * The url the iframe points to. 
    */
    url: string;
}

export class IframeControl
    extends BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
    implements Dashboards_WidgetContracts.IConfigurableWidget {

    /**
    * Container for the iframe
    */
    private $iframe: JQuery = null;

    /**
    * The current settings for the widget. 
    */
    private currentSettings: IframeControlSettings = null;

    /**
    * Refresh the widget when settings are provided by the configuration experience. 
    * @param {WidgetSettings} widgetSettings with name and configuration artifacts used by the widget to render. 
    */
    public reload(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        var newIframeSettings: IframeControlSettings = IframeControl.parseIframeControlSettings(widgetSettings);
        
        // If the new settings are for the same url, that would mean we have changed the size, so we only 
        // resize the frame
        if (newIframeSettings && this.currentSettings
            && newIframeSettings.url === this.currentSettings.url) {
            this.resizeFrame(widgetSettings);
            return WidgetHelpers.WidgetStatusHelper.Success();
        }
        // Otherwise clear existing content and load with new url for the iframe. 
        else {
            this.getElement().empty();
            return this.load(widgetSettings);
        }
    }

    /**
    * Load the widget with any settings data initially available. 
    * @param {WidgetSettings} widgetSettings with name and configuration artifacts used by the widget to render. 
    */
    public load(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.currentSettings = IframeControl.parseIframeControlSettings(widgetSettings);
        
        // If no existing url is available, show the unconfigured control.
        if (!this.currentSettings) {
            this.showUnConfiguredControl(widgetSettings.size, widgetSettings.name);
            return WidgetHelpers.WidgetStatusHelper.Unconfigured();
        }
        else {

            if (IframeControl.isValidProtocol(this.currentSettings.url)) {
                const isHosted = Context.getPageContext().webAccessConfiguration.isHosted;
                const isOnPrem = !isHosted;
                const isSameOrigin = Utils_Url.isSameOrigin(this.currentSettings.url, window.location.href);

                 // Disable plugins, parent location redirection, popups etc., but allow scripts
                let sandboxAttributes = "allow-scripts";

                // we prevent same origin framed content from accessing the parent frame in case of on prem.
                // otherwise we allow calls to be made to the embedded iframe origin for content.
                if (isHosted || (isOnPrem && !isSameOrigin)) {
                    sandboxAttributes += " allow-same-origin";
                }

                this.$iframe = $("<iframe>")
                    .attr("frameborder", "0")
                    .attr("allowfullscreen", "true") // Allow iframe to show fullscreen content (e.g., embedded YouTube videos)
                    .attr("scrolling", "no") // This is deprecated in HTML5, but browsers don't support the alternative yet (overflow:hidden via CSS)
                    .attr("sandbox", sandboxAttributes) 
                    .appendTo(this.getElement());

                // Size the frame. We do this first to avoid relayout once the content starts loading.
                this.resizeFrame(widgetSettings);

                // Source the iframe to the url provided in the configuration.
                this.$iframe.attr("src", this.currentSettings.url);
            }
            else {
                return WidgetHelpers.WidgetStatusHelper.Failure(Resources_Widgets.IframeConfiguration_UrlNoProtocolError, true/*isUserVisible*/);
            }
        }

        this.publishLoadedEvent({});
        return WidgetHelpers.WidgetStatusHelper.Success();
    }
    
    /**
    * Initialize the widget without requiring any calls to the server side.
    * @param {WidgetSettings} widgetSettings with name and configuration artifacts used by the widget to render. 
    */
    public preload(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
     * Parse the settings for the iframe control to use in rendering. 
     * @param widgetSettings
     */
    public static parseIframeControlSettings(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IframeControlSettings {
        var iframeSettings: IframeControlSettings = null;

        try {
            iframeSettings = JSON.parse(widgetSettings.customSettings.data);
        }
        catch (e) {
            // Any exception is a no op as it would mean that the settings structure was invalid and 
            // shouldn't be supported by the widget. 
        }

        return iframeSettings;
    }

    /**
     * Size the iframe to the width and height provided in the settings.
     * @param widgetSettings
     */
    public resizeFrame(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): void {
        if (this.$iframe) {
            this.$iframe
                .width(WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(widgetSettings.size.columnSpan))
                .height(WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(widgetSettings.size.rowSpan));
        }
    }

    public static isValidProtocol(url: string): boolean {
        return /https?:\/\//.test(url);
    }
}

SDK.VSS.register("dashboards.iframeWidget", () => IframeControl);
SDK.registerContent("dashboards.iframeWidget-init", (context) => {
    return Controls.create(IframeControl, context.$container, context.options);
});