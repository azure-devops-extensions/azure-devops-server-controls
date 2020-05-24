import Q = require("q");

import BladeConfiguration = require("Dashboards/Scripts/BladeConfiguration");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsUtilities } from "Dashboards/Scripts/SettingsUtilities";

import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");

export class AssignedToMeConfiguration
    extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {
    private static DefaultWidgetName = Resources_Widgets.AssignedToMeWidget_DefaultTitle;
    private $container: JQuery = $("<div/>");
    private $containerFields: JQuery = $("<div/>");

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "assigned-to-me-configuration-container"
        }, options));
    } 

    public initialize() {
        super.initialize();
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {
        
        // paint initial UI for the configuration. At this time no data calls are made.
        this.render();

        // load the data from the providers and populate the popup control. 
        return  WidgetHelpers.WidgetStatusHelper.Success();
    }
    public render(): void {
        
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        this.repaintErrors();

        if (this.isValid()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }       
    }

    public _getCustomSettings(): WidgetContracts.CustomSettings {
        return { data: null };
    }

    /** 
    * Reports to host on current state of widget 
    */
    public notifyConfigurationChange() {        
    }

    /**
    * Repaint errors if the validation of the configuration entails as such.
    */
    public repaintErrors(): void {
        SettingsUtilities.setInputValidationState(
            this.$containerFields,
            !this.hasError());
    }

    /**
    * verify if the current configuration is valid or not. 
    * @returns boolean
    */
    public isValid(): boolean {
        return true;
    }

    /**
    * verify if experience would have an error
    * @returns boolean
    */
    private hasError(): boolean {
        return !this.isValid();
    }

     /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSaveComplete(): void {

    }
}

SDK.registerContent("dashboards.assignedToMeConfiguration-init", (context) => {
    return Controls.create(AssignedToMeConfiguration, context.$container, context.options);
});
