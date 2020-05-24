
import Q = require("q");

import Core_Contracts = require("TFS/Core/Contracts");

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import WidgetContracts = require("TFS/Dashboards/WidgetContracts");

import WidgetResources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import BaseConfig = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");

import Controls = require("VSS/Controls");
import Locations = require("VSS/Locations");
import SDK = require("VSS/SDK/Shim");
import VSS_Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import {SettingsField} from "Dashboards/Scripts/SettingsField";

import ChartSDKSamples = require("Charting/Scripts/ChartSDKSamples");
import ChartSDKWidget = require("Widgets/Scripts/ChartSDKWidget");

import Combos = require("VSS/Controls/Combos");
import {TypedCombo} from "Widgets/Scripts/Shared/TypedCombo";

//TODO: This is a pretty routine case to be locally implemented. We should consider a similar default type for the combo.
export interface ConfigModeOptions {
    name: string
    value: ChartSDKSamples.ConfigMode;
}

/** A data driven config UI. The details here should be populated from a shared model owned by the View */
export class ChartSDKWidgetConfiguration
    extends BaseConfig.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {

    public static initializeName = "dashboards.ChartSDKConfiguration-init";

    //UI Elements
    private modeSelectCombo: TypedCombo<ChartSDKSamples.ConfigModeMetadata>;
    private $customDataArea: JQuery;

    //Note: In the present SDK contract, Custom config has no awareness of widget size state, as that is a common property. :(
    private widthCombo: Combos.Combo;
    private heightCombo: Combos.Combo;
    
    //Current version we save as. 
    // V1.0.0 == Newly created Widget
    // V1.0.1 == Current Version, known to be a configured widget.
    public static currentVersion: TFS_Dashboards_Contracts.SemanticVersion = <TFS_Dashboards_Contracts.SemanticVersion>{
        major: 1,
        minor: 0,
        patch: 1
    };

    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext)
        : IPromise<WidgetContracts.WidgetStatus> {

        var chartSettings = ChartSDKSamples.ChartSDKWidgetSettings.parseOrDefault(widgetSettings.customSettings.data);

        //Attempt to determine the initial size of the widget. Unfortunately we can't re-compute when user resizes :(
        var widgetWidth = WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(widgetSettings.size.columnSpan);
        var widgetHeight = WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(widgetSettings.size.rowSpan) - 40;

        try {
            this.renderConfig(widgetWidth, widgetHeight, chartSettings, widgetConfigurationContext);
            return WidgetHelpers.WidgetStatusHelper.Success();
        } catch (e) {
            //An exception here implies Bad data state fouled up rendering...
            VSS_Diag.logError(e.stack);
            return WidgetHelpers.WidgetStatusHelper.Failure(e);
        }
    }


    public renderConfig(widgetWidth: number, widgetHeight: number,
        chartSettings: ChartSDKSamples.ChartSDKWidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): void {

        //Describe choices for different Chart samples
        this.modeSelectCombo = <TypedCombo<ChartSDKSamples.ConfigModeMetadata>>Controls.Control.createIn<Combos.IComboOptions>(
            TypedCombo,
            this.getElement(), {
                change: () => {
                    this.generateTemplate();
                    this.notify(widgetConfigurationContext)
                },
                mode: "drop",
                allowEdit: false
            });
        //Apply data and select current value from prior state.
        this.modeSelectCombo.setSource(ChartSDKSamples.SDKWidgetContentProvider.getModeMetadata(), metadata => metadata.name);
        if (chartSettings.mode != null) {
            this.modeSelectCombo.setSelectedByPredicate(item => item.value == chartSettings.mode, false);
        }

        SettingsField.createSettingsField({ labelText: "Chart Template", control: this.modeSelectCombo }, this.getElement());

        //Provide a text canvas for configuring custom chart XML.
        this.$customDataArea = $("<textarea>")
            .addClass("textbox")
            .attr("wrap", "off")
            .css("height", "800px")
            .css("width", "400px")
            .on("input", () => {
                this.notify(widgetConfigurationContext);
            });
        SettingsField.createSettingsFieldForJQueryElement({ labelText: "Custom JSON", controlElement: this.$customDataArea }, this.$customDataArea, this.getElement());

        //Load existing customization if it exists
        if (chartSettings.payload != null) {
            var jsonString = ChartSDKSamples.ChartSDKWidgetSettings.stringifyForEdit(JSON.parse(chartSettings.payload));
            this.$customDataArea.val(jsonString);
        }
    }

    public generateTemplate() {
        var mode = this.modeSelectCombo.getValue() as ChartSDKSamples.ConfigModeMetadata;
        var optionState = mode.optionFactory();
        this.configureName.setCurrentWidgetName(mode.name);
        var optionsString = ChartSDKSamples.ChartSDKWidgetSettings.stringifyForEdit(optionState);
        this.$customDataArea.val(optionsString);
    }

    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        return WidgetHelpers.WidgetConfigurationSave.Valid(this.getCustomSettings());
    }

    /** Attempts to serialize the customSettings. May return null on data if state is malformed. */
    public getCustomSettings(): WidgetContracts.CustomSettings {
        var chartSettingsString = null;
        try {
            var chartSettings = new ChartSDKSamples.ChartSDKWidgetSettings();
            chartSettings.mode = (this.modeSelectCombo.getValue() as ChartSDKSamples.ConfigModeMetadata).value;
            chartSettings.payload = ChartSDKSamples.ChartSDKWidgetSettings.stringifyForStorage(this.$customDataArea.val());
            chartSettingsString = JSON.stringify(chartSettings);
        }
        catch (e) {
        }

        var customSettings = <WidgetContracts.CustomSettings>{
            data: chartSettingsString,
            version: ChartSDKWidgetConfiguration.currentVersion
        };
        return customSettings;
    }

    private notify(widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): void {
        var settings = this.getCustomSettings();
        //Proceed to notify, only if we are able to provide a coherent payload.
        if (settings.data!=null) {
            widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this.getCustomSettings()));
        }

    }


}

SDK.registerContent(ChartSDKWidgetConfiguration.initializeName, (context) => {
    return Controls.create(ChartSDKWidgetConfiguration, context.$container, context.options);
});
