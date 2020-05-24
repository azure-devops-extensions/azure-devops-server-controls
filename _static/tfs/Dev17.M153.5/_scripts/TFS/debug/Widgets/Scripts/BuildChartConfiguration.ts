import Q = require("q");

import BladeConfiguration = require("Dashboards/Scripts/BladeConfiguration");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsField, SettingsFieldOptions } from "Dashboards/Scripts/SettingsField";

import Build_Contracts = require("TFS/Build/Contracts");
import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Artifacts_Services = require("VSS/Artifacts/Services");
import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import BuildDefinitionPicker = require("Dashboards/Controls/Pickers/BuildDefinitionPicker");
import BuildWidget = require("Widgets/Scripts/BuildChart");
import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");


/**
* DOM classes associated with the Build Chart Configuration.
*/
export class BuildChartConfigurationDomClasses {
    public static widgetContainer: string = "buildchartconfiguration-container";
}

export class BuildChartConfiguration
    extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {
    private static DefaultWidgetName = Resources_Widgets.BuildConfiguration_DefaultWidgetName;
    private $container: JQuery = $("<div/>");
    private $containerFields: JQuery = $("<div/>");
    private definitionSettingsField: SettingsField<any>;
    private currentConfiguration: BuildWidget.BuildDefinitionReference = null;
    private liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;
    private newWidgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;
    private buildDefinitionPicker: BuildDefinitionPicker.IBuildDefinitionPicker;  
    private providers: BuildDefinitionPicker.IBuildDefinitionDataProvider[] = [];

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: BuildChartConfigurationDomClasses.widgetContainer
        }, options));
    } 

    public initialize() {
        super.initialize();
        this.providers = (<any>this._options).providers;       
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {
        
        this.newWidgetConfigurationContext = widgetConfigurationContext;

        // parse the current settings of the widget from configuration context. 
        this.parseCurrentConfiguration(widgetSettings);

        // paint initial UI for the configuration. At this time no data calls are made.
        this.render();

        // load the data from the providers and populate the popup control. 
        return  WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
    * parse current configuration into a definition reference object
    */
    public parseCurrentConfiguration(widgetSettings: WidgetContracts.WidgetSettings): void {
        try {
            this.currentConfiguration = <BuildWidget.BuildDefinitionReference>JSON.parse(widgetSettings.customSettings.data);

            // parse the definitionId from the its url if it doesnt already exists. This can happen if the widget was pinned and then configured. 
            this.currentConfiguration.id = parseInt(Artifacts_Services.LinkingUtilities.decodeUri(this.currentConfiguration.uri).id);

            // in case of xaml builds, project Id is not available in the settings, use current project context.
            this.currentConfiguration.projectId =
                this.currentConfiguration.projectId || Context.getDefaultWebContext().project.id;

            // get the name from settings if available, or pull it from the Widget Name field. This will be the default name in case of catalog added 
            // widgets and last definition name in case of pinned widgets. 
            this.currentConfiguration.name = this.currentConfiguration.name || widgetSettings.name;

        }
        catch (e) {
            // we suppress error and assign null for the definition reference.
            this.currentConfiguration = null;
        }
    }

    public render(): void {
        
        // Initializing the live title
        //Live title updates will be driven from selector notifications
        this.liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(
            this.currentConfiguration,
            BuildChartConfiguration.DefaultWidgetName);

        var buildDefinitionPickerOptions: BuildDefinitionPicker.BuildDefinitionPickerOptions = <BuildDefinitionPicker.BuildDefinitionPickerOptions>{};
       
        if (this.currentConfiguration) {
            if (this.currentConfiguration.name) {
                this.liveTitleState.updateTitleOnLatestArtifact(
                    this.configureName,
                    this.currentConfiguration.name);
            }

            buildDefinitionPickerOptions.initialValue = this.convertToPickerFormat(this.currentConfiguration);
        }

        buildDefinitionPickerOptions.onIndexChanged = (def) => this.indexChangedCallback(def);
        (<any>buildDefinitionPickerOptions).dataProviders = this.providers;

        this.buildDefinitionPicker = BuildDefinitionPicker.create(this.getContainer(), buildDefinitionPickerOptions);

        this.definitionSettingsField = SettingsField.createSettingsFieldForJQueryElement({            
            labelText: Resources_Widgets.BuildChartConfiguration_Label,
            initialErrorMessage: Resources_Widgets.BuildChartConfiguration_ErrorNoDefinitionSelected,
        }, this.getContainer(), null);

        this.$containerFields = this.definitionSettingsField.getElement();

        this.getElement().append(this.$containerFields);
    }

    public convertToPickerFormat(original: BuildWidget.BuildDefinitionReference): Build_Contracts.DefinitionReference {
        return <Build_Contracts.DefinitionReference>{
            name: original.name,
            id: original.id,
            type: original.type
        };
    }

    public getPicker(): BuildDefinitionPicker.BuildDefinitionPicker {
        return <any>this.buildDefinitionPicker;
    }

    /**
    * Representation of the container that actually holds the configuration UI.
    * @returns a JQuery element
    */
    public getContainer(): JQuery {
        return this.$container;
    }

    /**
    * Representation of the container fields that actually holds the container UI with error experience.
    * @returns a JQuery element
    */
    public getContainerFields(): JQuery {
        return this.$containerFields;
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
        return { data: JSON.stringify(this.getCurrentConfiguration()) };
    }

    /** 
    * Reports to host on current state of widget 
    */
    public notifyConfigurationChange() {
        this.repaintErrors();
        if (this.isValid()) {
            this.newWidgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
        }
    }

    /**
    * Repaint errors if the validation of the configuration entails as such.
    */
    public repaintErrors(): void {
        this.definitionSettingsField.toggleError(this.hasError());
    }

    /**
    * Operations to perform on callback when the selection of definitions changes. 
    */
    private indexChangedCallback(definition: Build_Contracts.DefinitionReference): void {

        // update current configuration based on selected item.
        this.currentConfiguration = this.convertFromPickerFormat(definition);

        // repaint errors in case of validation issues. 
        this.repaintErrors();

        // send new name to live tile editor to make updates on the Name section as necessary.
        this.liveTitleState.updateTitleOnLatestArtifact(
            this.configureName,
            this.currentConfiguration.name);

        // notify the configuaration host of a change. 
        this.notifyConfigurationChange();
    }

    public convertFromPickerFormat(original: Build_Contracts.DefinitionReference): BuildWidget.BuildDefinitionReference {
        return <BuildWidget.BuildDefinitionReference>{
            name: original.name,
            id: original.id,
            type: original.type,
            uri: original.uri,
            projectId: original.project.id
        };
    }

    /**
    * verify if the current configuration is valid or not. 
    * @returns boolean
    */
    public isValid(): boolean {
        return !Widget_Utils.isUndefinedOrNull(this.currentConfiguration) ? true : false;
    }

    /**
    * verify if experience would have an error
    * @returns boolean
    */
    private hasError(): boolean {
        return !this.isValid();
    }

    /**
    * Get the latest configuration
    * @returns reference to the definition. 
    */
    public getCurrentConfiguration(): BuildWidget.BuildDefinitionReference {
        // update current configuration with current name in the General section if changed by user. 
        this.liveTitleState.appendToSettings(this.currentConfiguration);

        return this.currentConfiguration;
    }

     /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSaveComplete(): void {

        // Create the property payload
        var isCustomName: boolean = this.configureName.getCurrentWidgetName() != this.currentConfiguration.name;
        var properties: IDictionaryStringTo<any> = {
            "IsCustomName": isCustomName
        }

        if (isCustomName) {
            properties["NameLength"] = this.currentConfiguration.name.length;
        }

        // Publish
        Widget_Telemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), properties);
    }
}

SDK.registerContent("dashboards.buildChartConfiguration-init", (context) => {
    return Controls.create(
        BuildChartConfiguration,
        context.$container,
        context.options);
});
