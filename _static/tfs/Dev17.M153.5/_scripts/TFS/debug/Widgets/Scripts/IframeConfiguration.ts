import Q = require("q");
import SDK = require("VSS/SDK/Shim");
import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import {DelayedFunction} from "VSS/Utils/Core";
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsField, SettingsFieldOptions } from "Dashboards/Scripts/SettingsField";

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import IframeWidget = require("Widgets/Scripts/Iframe");
import BaseWidgetConfiguration = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");

export class IframeConfigurationControl extends
    BaseWidgetConfiguration.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements Dashboards_WidgetContracts.IWidgetConfiguration {

    public static UrlInputTimerIntervalMs = 500;

    public static CssClass = "iframe-configuration";

    private static IframeFWLink = "http://go.microsoft.com/fwlink/?LinkId=808035";

    private urlSettingsField: SettingsField<UrlControl>;

    private widgetConfigurationContext: Dashboards_WidgetContracts.IWidgetConfigurationContext;

    /**
     * @implements {IWidgetConfiguration}
     */
    public load(widgetSettings: Dashboards_WidgetContracts.WidgetSettings,
        widgetConfigurationContext: Dashboards_WidgetContracts.IWidgetConfigurationContext):
        IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        this.widgetConfigurationContext = widgetConfigurationContext;

        this.getElement().addClass(IframeConfigurationControl.CssClass);

        var iframeSettings = IframeWidget.IframeControl.parseIframeControlSettings(widgetSettings);
        var urlControl = this.createUrlControl(iframeSettings && iframeSettings.url || "")
        this.urlSettingsField = this.addUrlSettingsField(urlControl);

        var $disclaimer = $("<div>")
            .addClass("url-disclaimer")
            .html(Utils_String.format(Resources_Widgets.IframeConfiguration_UrlDisclaimer, IframeConfigurationControl.IframeFWLink))
            .insertAfter(urlControl.getElement());

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
     * Called when the user clicks save in the configuration.
     * @implements {IWidgetConfiguration}
     */
    public onSave(): IPromise<Dashboards_WidgetContracts.SaveStatus> {
        if (this.validate()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this.getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    /**
     * Get the settings for the widget in the desired serialization form.
     */
    private getCustomSettings(): Dashboards_WidgetContracts.CustomSettings {
        return {
            data: JSON.stringify(<IframeWidget.IframeControlSettings>{
                url: this.urlSettingsField.getControl().getValue()
            })
        };
    }

    private createUrlControl(url: string): UrlControl {
        // We use a dirty timer so that the onUrlChange is called at most
        // once per interval so that the preview doesn't constantly flicker
        // when the user is typing
        var inputTimer = new DelayedFunction(this,
            IframeConfigurationControl.UrlInputTimerIntervalMs,
            "onUrlChange",
            this.onUrlChange);

        return UrlControl.createUrlControl({
            watermark: Resources_Widgets.IframeConfiguration_UrlWatermark,
            value: url,
            change: () => inputTimer.reset()
        });
    }

    private addUrlSettingsField(control: UrlControl) {
        return SettingsField.createSettingsField(<SettingsFieldOptions<UrlControl>>{
            labelAlign: "top",
            hasErrorField: true,

            labelText: Resources_Widgets.IframeConfiguration_Url,
            control: control
        }, this.getElement());
    }

    private onUrlChange() {
        if (this.validate()) {
            this.widgetConfigurationContext.notify(
                WidgetHelpers.WidgetEvent.ConfigurationChange,
                WidgetHelpers.WidgetEvent.Args(this.getCustomSettings()));
        }
    }

    /**
     * Validates configuration controls, displays error messages where required and returns true if valid.
     */
    private validate(): boolean {
        var isValid = true;

        var urlError = this.urlSettingsField.getControl().validate();
        if (urlError) {
            isValid = false;
            this.urlSettingsField.setErrorMessage(urlError);
            this.urlSettingsField.showError();
        } else {
            this.urlSettingsField.hideError();
        }

        return isValid;
    }
}

export interface UrlControlOptions extends Combos.IComboOptions {
    watermark: string;
}

/**
 * A control that handles Url input and fires an onchange event when the value changes.
 */
export class UrlControl extends Combos.ComboO<UrlControlOptions> {
    /**
     * Using factory method for stubbing in unit tests
     */
    public static createUrlControl(options: UrlControlOptions): UrlControl {
        return <UrlControl>Controls.Control.createIn<UrlControlOptions>(UrlControl, null, options);
    }

    public initializeOptions(options?: UrlControlOptions) {
        super.initializeOptions($.extend(<Combos.IComboOptions>{
            mode: "text"            
        }, options));
    }

    public initialize() {
        super.initialize();

        Utils_UI.Watermark(this._input, { watermarkText: this._options.watermark });
    }
    
    /**
     * Validates the url, returning an error message if invalid and null otherwise
     */
    public validate(): string {
        var errorMessage = null;

        var url = this.getValue<string>();

        if (url) {
            if (!IframeWidget.IframeControl.isValidProtocol(url)) {
                errorMessage = Resources_Widgets.IframeConfiguration_UrlNoProtocolError;
            }
        } else {
            errorMessage = Resources_Widgets.IframeConfiguration_NoUrlError;
        }

        return errorMessage;
    }
}

SDK.VSS.register("dashboards.iframeWidgetConfiguration", () => IframeConfigurationControl);
SDK.registerContent("dashboards.iframeWidgetConfiguration-init", (context) => {
    return Controls.create(IframeConfigurationControl, context.$container, context.options);
});
