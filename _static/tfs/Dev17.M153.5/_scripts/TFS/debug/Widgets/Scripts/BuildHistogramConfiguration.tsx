import * as React from 'react';
import * as ReactDOM from 'react-dom';

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsField } from "Dashboards/Scripts/SettingsField";

import Build_Contracts = require("TFS/Build/Contracts");
import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Artifacts_Services = require("VSS/Artifacts/Services");
import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import BuildDefinitionPicker = require("Dashboards/Controls/Pickers/BuildDefinitionPicker");
import BuildWidget = require("Widgets/Scripts/BuildChart");
import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");

import { Checkbox } from "OfficeFabric/Checkbox";

import * as GitRestClient from "TFS/VersionControl/GitRestClient";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { GitVersionSelector } from "VersionControl/Scenarios/Shared/GitVersionSelector";
import { refNameToVersionSpec } from 'VersionControl/Scripts/GitRefUtility';
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { IGitRefVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import "VSS/LoaderPlugins/Css!VersionControlControls";
import "VSS/LoaderPlugins/Css!PivotView";

/**
* DOM classes associated with the Build Chart Configuration.
*/
export class BuildHistogramConfigurationDomClasses {
    public static widgetContainer: string = "buildchartconfiguration-container";
}

interface IBranchPickerProps {
    onBranchChange: (versionSpec: IGitRefVersionSpec) => void;
    tfsContext: TfsContext;
    selectedBranchFullName?: string
}

interface IBranchPickerState {
    repositoryContext: GitRepositoryContext;
    includeAllBranches: boolean;
    selectedVersionSpec: IGitRefVersionSpec;
}

class BranchPicker extends React.Component<IBranchPickerProps, IBranchPickerState> {
    private defaultVersionSpec: IGitRefVersionSpec;

    constructor(props: IBranchPickerProps) {
        super(props);
        this.state = {
            repositoryContext: null,
            includeAllBranches: !props.selectedBranchFullName,
            selectedVersionSpec: props.selectedBranchFullName ? refNameToVersionSpec(props.selectedBranchFullName) : null
        }
    }

    public render() {
        return <div>
            <div className="branch-filter-checkbox-container">
                <Checkbox
                    label={Resources_Widgets.BuildHistogramConfiguration_AllBranchesLabel}
                    onChange={this.handleCheckboxChanged}
                    defaultChecked={this.state.includeAllBranches}
                />
            </div>
            {this.state.repositoryContext && !this.state.includeAllBranches && <div className="build-histogram-configuration-branch-picker">
                <GitVersionSelector
                    repositoryContext={this.state.repositoryContext}
                    versionSpec={this.state.selectedVersionSpec}
                    allowEditing={false}
                    fullPopupWidth={true}
                    onBranchChanged={this.handleBranchChanged}
                />
            </div>}
        </div>
    }

    componentDidMount() {
        const gitRestClient = GitRestClient.getClient();
        gitRestClient.getRepositories(this.props.tfsContext.navigation.projectId).then(repositories => {
            const repository = repositories[0]
            if (repository.defaultBranch) {
                this.defaultVersionSpec = refNameToVersionSpec(repository.defaultBranch);
            }
            const repositoryContext = GitRepositoryContext.create(repository, this.props.tfsContext);
            this.setState({ repositoryContext });
        });
    }

    private handleCheckboxChanged = (e: React.FormEvent<HTMLElement>, isChecked: boolean) => {
        const newState = { includeAllBranches: isChecked } as any;
        if (isChecked) {
            this.props.onBranchChange(null);
        } else if (this.state.selectedVersionSpec) {
            this.props.onBranchChange(this.state.selectedVersionSpec);
        } else {
            newState.selectedVersionSpec = this.defaultVersionSpec
            this.props.onBranchChange(this.defaultVersionSpec);
        }
        this.setState(newState);
    }

    private handleBranchChanged = (newSpec: IGitRefVersionSpec) => {
        this.props.onBranchChange(newSpec);
        this.setState({ selectedVersionSpec: newSpec});
    }
}

export interface IBuildHistogramConfiguration {
    buildDefinition: BuildWidget.BuildDefinitionReference,
    fullBranchName: string
}

export class BuildHistogramConfiguration
    extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {
    public static get DefaultConfiguration(): IBuildHistogramConfiguration {
        return {
            buildDefinition: null,
            fullBranchName: null
        }
    };
    private static DefaultWidgetName = Resources_Widgets.BuildHistogram_DefaultWidgetName;
    private $container: JQuery = $("<div/>");
    private definitionSettingsField: SettingsField<any>;
    private currentConfiguration: IBuildHistogramConfiguration = BuildHistogramConfiguration.DefaultConfiguration;
    private newWidgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;
    private providers: BuildDefinitionPicker.IBuildDefinitionDataProvider[] = [];

    public initializeOptions(options?: any) {
        super.initializeOptions(Object.assign({
            coreCssClass: BuildHistogramConfigurationDomClasses.widgetContainer
        }, options));
    } 

    public initialize() {
        super.initialize();
        this.providers = (this._options as any).providers;       
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {
        
        this.newWidgetConfigurationContext = widgetConfigurationContext;

        // parse the current settings of the widget from configuration context. 
        this.currentConfiguration = BuildHistogramConfiguration.stringToConfiguration(widgetSettings.customSettings.data);

        this.render();

        return  WidgetHelpers.WidgetStatusHelper.Success();
    }

    public static stringToConfiguration(configurationString: string): IBuildHistogramConfiguration {
        let configuration = BuildHistogramConfiguration.DefaultConfiguration;
        try {
            configuration = JSON.parse(configurationString) as IBuildHistogramConfiguration;

            // parse the definitionId from the its url if it doesnt already exists. This can happen if the widget was pinned and then configured. 
            if (configuration.buildDefinition) {
                configuration.buildDefinition.id = parseInt(Artifacts_Services.LinkingUtilities.decodeUri(configuration.buildDefinition.uri).id);

                // get the name from settings if available, or pull it from the Widget Name field. This will be the default name in case of catalog added 
                // widgets and last definition name in case of pinned widgets. 
                configuration.buildDefinition.name = configuration.buildDefinition.name || BuildHistogramConfiguration.DefaultWidgetName;
            }

        }
        catch (e) {
            return BuildHistogramConfiguration.DefaultConfiguration;
        }
        return configuration;
    }

    public render(): void {
        var buildDefinitionPickerOptions = {} as BuildDefinitionPicker.BuildDefinitionPickerOptions;
       
        if (this.currentConfiguration && this.currentConfiguration.buildDefinition) {
            buildDefinitionPickerOptions.initialValue = this.convertToPickerFormat(this.currentConfiguration.buildDefinition);
        }

        buildDefinitionPickerOptions.onIndexChanged = this.handleBuildDefinitionChanged;
        (buildDefinitionPickerOptions as any).dataProviders = this.providers;

        BuildDefinitionPicker.create(this.getContainer(), buildDefinitionPickerOptions);

        this.definitionSettingsField = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources_Widgets.BuildChartConfiguration_Label,
            initialErrorMessage: Resources_Widgets.BuildChartConfiguration_ErrorNoDefinitionSelected,
        }, this.getContainer(), null);

        const branchSettingsFieldElement = SettingsField.createSettingsField({
            labelText: Resources_Widgets.BuildHistogramConfiguration_BranchSectionHeader,
            control: null
        }).getElement()
        // The checkbox component has its own styling that does not work with this class.
        branchSettingsFieldElement.removeClass("bowtie");

        const branchPickerContainer = document.createElement("div");

        const tfsContext = new TfsContext(this.tfsContext);
        ReactDOM.render(<BranchPicker
            tfsContext={tfsContext}
            selectedBranchFullName={this.currentConfiguration.fullBranchName}
            onBranchChange={this.handleBranchChanged}
        />, branchPickerContainer);

        branchSettingsFieldElement.append(branchPickerContainer);

        this.getElement().append(this.definitionSettingsField.getElement());
        this.getElement().append(branchSettingsFieldElement);
    }

    public convertToPickerFormat(original: BuildWidget.BuildDefinitionReference): Build_Contracts.DefinitionReference {
        return {
            name: original.name,
            id: original.id,
            type: original.type
        } as Build_Contracts.DefinitionReference;
    }

    /**
    * Representation of the container that actually holds the configuration UI.
    * @returns a JQuery element
    */
    public getContainer(): JQuery {
        return this.$container;
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

    private titleHasBeenCustomized() {
        const currentTitle = this._options.getCurrentWidgetName();
        if (this.currentConfiguration.buildDefinition) {
            return currentTitle !== this.currentConfiguration.buildDefinition.name;
        }
        return currentTitle !== BuildHistogramConfiguration.DefaultWidgetName;
    }

    /**
    * Operations to perform on callback when the selection of definitions changes. 
    */
    private handleBuildDefinitionChanged = (definition: Build_Contracts.DefinitionReference): void => {
        // update the configuration title input value to the new build definition name if the title has not been customized
        if (!this.titleHasBeenCustomized()) {
            this._options.setCurrentWidgetName(definition.name);
        }

        // update current configuration based on selected item.
        this.currentConfiguration.buildDefinition = this.convertFromPickerFormat(definition);

        // repaint errors in case of validation issues. 
        this.repaintErrors();

        // notify the configuaration host of a change. 
        this.notifyConfigurationChange();
    }

    private handleBranchChanged = (newVersionSpec: IGitRefVersionSpec) => {
        this.currentConfiguration.fullBranchName = newVersionSpec ? newVersionSpec.toFullName() : null;

        this.repaintErrors()
        this.notifyConfigurationChange()
    }

    public convertFromPickerFormat(original: Build_Contracts.DefinitionReference): BuildWidget.BuildDefinitionReference {
        return {
            name: original.name,
            id: original.id,
            type: original.type,
            uri: original.uri,
            projectId: original.project.id
        } as BuildWidget.BuildDefinitionReference;
    }

    /**
    * verify if the current configuration is valid or not. 
    * @returns boolean
    */
    public isValid(): boolean {
        return !Widget_Utils.isUndefinedOrNull(this.currentConfiguration) && !Widget_Utils.isUndefinedOrNull(this.currentConfiguration.buildDefinition);
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
    public getCurrentConfiguration(): IBuildHistogramConfiguration {
        return this.currentConfiguration;
    }

     /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSaveComplete(): void {

        // Create the property payload
        var isCustomName: boolean = this.currentConfiguration.buildDefinition && this.configureName.getCurrentWidgetName() != this.currentConfiguration.buildDefinition.name;
        var properties: IDictionaryStringTo<any> = {
            "IsCustomName": isCustomName
        }

        if (isCustomName) {
            properties["NameLength"] = this.currentConfiguration.buildDefinition.name.length;
        }

        // Publish
        Widget_Telemetry.WidgetTelemetry.onConfigurationSave(this.getWidgetTypeId(), properties);
    }
}

SDK.registerContent("dashboards.buildHistogramConfiguration-init", (context) => {
    return Controls.create(
        BuildHistogramConfiguration,
        context.$container,
        context.options);
});
