import Q = require("q");
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK from "VSS/SDK/Shim";
import { autobind } from "OfficeFabric/Utilities";
import { WidgetSettings, WidgetStatus, IWidgetConfiguration, SaveStatus, IWidgetConfigurationContext, CustomSettings } from "TFS/Dashboards/WidgetContracts";
import { WidgetOptions } from "Dashboards/Scripts/Contracts";
import { WidgetStatusHelper, WidgetConfigurationSave } from "TFS/Dashboards/WidgetHelpers";
import * as WidgetConfigHelpers from "TFS/Dashboards/WidgetConfigHelpers";

import { TestVisualWidgetSettings, TestVisualWidgetSettingsSerializer } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetSettings";
import { TestVisualWidgetSettingsManager } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetSettingsManager";
import { TestVisualConfigViewComponent } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualConfigViewComponent";

/**
 * The configuration layer mediates between Widget Config contract and React based Config Renderer Component
 */
export class TestVisualConfiguration extends React.Component<WidgetOptions, {}> implements IWidgetConfiguration {
    private container: HTMLElement;
    private widgetConfigurationContext: IWidgetConfigurationContext;
    private currentSettings: TestVisualWidgetSettings;

    constructor(container: HTMLElement, widgetOptions: WidgetOptions) {
        super(widgetOptions);
        this.container = container;
    }

    /**
     * Framework Required: This is a one-time event to start the config UI. 
     * After initial status change, the framework waits on notify() from config and cancel/save buttons.
     */
    public load(widgetSettings: WidgetSettings, widgetConfigurationContext: IWidgetConfigurationContext): IPromise<WidgetStatus> {
        this.widgetConfigurationContext = widgetConfigurationContext;
        const settingsManager = new TestVisualWidgetSettingsManager();
        const wasConfigured = settingsManager.isConfigured(widgetSettings.customSettings);
        let settingsPromise = settingsManager.ensureInitialSettings(widgetSettings.customSettings).then(
            (customSettings) => {
                this.currentSettings = customSettings;
                ReactDOM.render(<TestVisualConfigViewComponent onChanged={this.onChange} settings={customSettings} onError={this.onFailure} />, this.container);
                return WidgetStatusHelper.Success();
            },
            (reason) => {
                return WidgetStatusHelper.Failure(reason);
            });

        //Provide change notification to render if default-generated settings are valid.
        settingsPromise.then((success) => {
            if (!wasConfigured && TestVisualWidgetSettingsSerializer.isValid(this.currentSettings)) {
                this.onChange(this.currentSettings);
            }
        });

        return settingsPromise;
    }

    /**
     * Passes UI driven config changes up to dashboard framework. 
     * NOTE: You must to call notify() for framework to know when to save your changes.
     */
    @autobind
    public onChange(settings: TestVisualWidgetSettings) {
        this.currentSettings = settings;
        const notifyPayload = WidgetConfigHelpers.ConfigurationEvent.Args(TestVisualWidgetSettingsManager.formatAsCustomSettings(settings));
        this.widgetConfigurationContext.notify(WidgetConfigHelpers.ConfigurationEvent.ConfigurationChange, notifyPayload);
    }

    /**
     * Passes UI driven config changes up to dashboard framework. 
     * NOTE: You must to call notify() for framework to know when to save your changes.
     */
    @autobind
    public onFailure(error: string) {
        const errorPayload = WidgetConfigHelpers.ConfigurationEvent.Args(error);
        this.widgetConfigurationContext.notify(WidgetConfigHelpers.ConfigurationEvent.ConfigurationError, errorPayload);
    }


    /**
     * Framework Required: When the user requests a save, verify state is good, and pass it back to framework as valid.
     */
    public onSave(): IPromise<SaveStatus> {
        if (TestVisualWidgetSettingsSerializer.isValid(this.currentSettings)) {
            return WidgetConfigurationSave.Valid(TestVisualWidgetSettingsManager.formatAsCustomSettings(this.currentSettings));
        } else {
            return WidgetConfigurationSave.Invalid();
        }
    }
}

SDK.VSS.register("testManagement.testVisualConfiguration", () => TestVisualConfiguration);
SDK.registerContent("testManagement.testVisualConfiguration-init", (context) => {
    return new TestVisualConfiguration(context.container, context.options);
});
