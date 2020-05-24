/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />


import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");

import BuildContracts = require("TFS/Build/Contracts");
import Contracts = require("TFS/TestManagement/Contracts");
import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");
import RDPicker = require("TestManagement/Scripts/TestReporting/Widgets/ReleaseDefinitionPicker");
import RMContracts = require("ReleaseManagement/Core/Contracts");
import TMService = require("TestManagement/Scripts/TFS.TestManagement.Service");

import TFS_Dashboard_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboard_WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import BladeConfigQuery = require("Widgets/Scripts/Shared/BladeConfigurationQueryControl");
import QueryScalar = require("Widgets/Scripts/QueryScalar");
import VCPathSelectorControl = require("Widgets/Scripts/Shared/VCPathSelectorControl");

import {SettingsField, SettingsFieldOptions} from "Dashboards/Scripts/SettingsField";
import {DefinitionReference as BuildDefinitionReference} from "TFS/Build/Contracts";
import {BuildDefinitionPickerOptions, BuildDefinitionPicker, create as BuildDefinitionPickerCreator} from "Dashboards/Controls/Pickers/BuildDefinitionPicker";

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

let delegate = Utils_Core.delegate;

export class Constants {
    public static CONFIG_CONTAINER: string = "tr-traceability-config-container";
    public static VERSION_CONTROL_INPUT_CONTAINER: string = "tr-traceability-vc-input-container";
    public static REPOSITORY_INPUT_CONTAINER: string = "tr-traceability-repository-input-container";
    public static BRANCH_INPUT_CONTAINER: string = "tr-traceability-branch-input-container";
    public static BUILD_SELECTOR_CONTAINER: string = "tr-traceability-build-selector-container";
    public static RELEASE_SELECTOR_CONTAINER: string = "tr-traceability-release-selector-container";
    public static QUERY_SELECTOR_CONTAINER = "tr-traceability-wit-query-selector-container";
    public static BRANCH_SELECTOR_CONTAINER = "tr-traceability-branch-selector-container";
}

export interface ITraceabilityWidgetConfigurationOptions {

    /** Width of the chart */
    width: number;

    /** Height of the chart */
    height: number;

    /** The title to be shown for the widget */
    title?: string;

    context?: Contracts.TestResultsContextType;

    /** Reference to the build definition for which quality needs to be shown */
    buildDefinition?: BuildDefinitionReference;

    /** Reference to the release definition for which quality needs to be shown */
    releaseDefinition?: RMContracts.ReleaseDefinition;

    /** Reference to the work item query */
    workItemQuery: QueryScalar.IQueryInformation;

    repoAndBranch: VCPathSelectorControl.VCPathInformation;
}

export class TraceabilityConfigurationView
    extends Base.BaseWidgetConfiguration<Dashboards_UIContracts.WidgetConfigurationOptions>
    implements TFS_Dashboard_WidgetContracts.IWidgetConfiguration {

    public initializeOptions(options?: Dashboards_UIContracts.WidgetConfigurationOptions) {
        super.initializeOptions($.extend({
            coreCssClass: Constants.CONFIG_CONTAINER
        }, options));
    }

    public load(
        widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings,
        widgetConfigurationContext: TFS_Dashboard_WidgetContracts.IWidgetConfigurationContext):
        IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {

        this._widgetConfigurationContext = widgetConfigurationContext;

        try {
            this._widgetConfigurationOptions = JSON.parse(widgetSettings.customSettings.data) || this._defaultWidgetConfigurationOptions;
        } catch (e) {
            Diag.logWarning("[TestResultsTraceabilityConfiguration.load]: Unable to parse widget configuration option.");
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(e);
        }

        this._renderConfigurationBlade();

        return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
    }

    public onSave(): IPromise<TFS_Dashboard_WidgetContracts.SaveStatus> {
        return TFS_Dashboard_WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
    }

    public onSaveComplete(): void {
        Diag.logVerbose("Save complete");
    }
    
    private _renderConfigurationBlade() {
        this._drawWorkItemQuerySelector();
        this._$qualityDataContainer.appendTo(this.getElement());
        this._addQualityDataLabel();
        this._buildDefinitionRadioButton(this._$qualityDataContainer, true);
        this._releaseDefinitionRadioButton(this._$qualityDataContainer, false);
        this._drawBuildDefinitionDropdown();
        this._drawRepoAndBranchSelector();
        //adding input and label element of html for Repository and Branch but hiding them unless repo type is TfsVersionControl or TfsGit
        this._drawRepoAndBranchInputContainer();
        this._drawReleaseDefinitionDropdown();
        this._selectDefaultRadio();
    }

    private _addQualityDataLabel(): void {
        this._$qualityDataContainer.addClass("tr-traceability-quality-data-container");
        $("<label>")
            .addClass("tr-traceability-quality-data-label")
            .text(Resources.QualityDataText)
            .appendTo(this._$qualityDataContainer);
    }

    private _buildDefinitionRadioButton($container: JQuery, enabled: boolean = false): void {
        let buildDefinitionRadioContainer: JQuery = $("<div />").addClass("tr-traceability-build-radio-container");
        // Add the radio button
        this._$buildWorkflowSelector = $("<input>")
            .addClass("tr-traceability-build-radio")
            .attr("type", "radio")
            .attr("id", Resources.FromBuildText)
            .prop("checked", enabled)
            .click(() => {
                this._$releaseWorkflowSelector.prop("checked", false);
                this._buildSettingsField.showElement();
                this._widgetConfigurationOptions.context = Contracts.TestResultsContextType.Build;
                if (this._repoType && (this._repoType !== "TfsGit" && this._repoType !== "TfsVersionControl")) {
                    this._branchAndRepoInputContainer.show();
                    this._vcSelectorContainer.hide();
                }
                else {
                    this._vcSelectorContainer.show();
                }
                this._releaseSettingsField.hideElement();
                this._notifyConfigurationChange();
            })
            .appendTo(buildDefinitionRadioContainer);

        // Add the label for the radio button
        $("<label>")
            .text(Resources.FromBuildText)
            .appendTo(buildDefinitionRadioContainer);

        buildDefinitionRadioContainer.appendTo($container);
    }

    private _releaseDefinitionRadioButton($container: JQuery, enabled: boolean = false): void {
        let releaseDefinitionRadioContainer: JQuery = $("<div />").addClass("tr-traceability-release-radio-container");
        // Add the radio button
        this._$releaseWorkflowSelector = $("<input>")
            .addClass("tr-traceability-release-radio")
            .attr("type", "radio")
            .attr("id", Resources.FromReleaseText)
            .prop("checked", enabled)
            .click(() => {
                this._$buildWorkflowSelector.prop("checked", false);
                this._buildSettingsField.hideElement();
                this._widgetConfigurationOptions.context = Contracts.TestResultsContextType.Release;
                if (this._branchAndRepoInputContainer) {
                    this._branchAndRepoInputContainer.hide();
                }
                this._vcSelectorContainer.hide();
                this._releaseSettingsField.showElement();
                this._notifyConfigurationChange();
            })
            .appendTo(releaseDefinitionRadioContainer);

        // Add the label for the radio button
        $("<label>")
            .text(Resources.FromReleaseText)
            .appendTo(releaseDefinitionRadioContainer);

        releaseDefinitionRadioContainer.appendTo($container);
    }

    private _selectDefaultRadio(): void {
        if (this._widgetConfigurationOptions.context === Contracts.TestResultsContextType.Release) {
            this._$buildWorkflowSelector.prop("checked", false);
            this._buildSettingsField.hideElement();
            if (this._branchAndRepoInputContainer) {
                this._branchAndRepoInputContainer.hide();
            }
            this._vcSelectorContainer.hide();
            this._$releaseWorkflowSelector.prop("checked", true);
        }
        else {
            this._releaseSettingsField.hideElement();
        }
    }

    private _getCustomSettings(): TFS_Dashboard_WidgetContracts.CustomSettings {
        return { data: JSON.stringify(this._widgetConfigurationOptions) };
    }
    
    private _notifyConfigurationChange(): void {
        if (!this._widgetConfigurationOptions.context) {
            Diag.logInfo("Either build definition or release definition should be seleceted, skipping notify");
            return;
        }

        try {
            this._widgetConfigurationContext.notify(TFS_Dashboard_WidgetHelpers.WidgetEvent.ConfigurationChange, TFS_Dashboard_WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
        } catch (e) {
            Diag.logWarning("Unable to stringify widget configuration option");
        }
    }

    private _drawWorkItemQuerySelector(): void {
        let $querySelectorContainer = $("<div>").addClass(Constants.QUERY_SELECTOR_CONTAINER).addClass("settings-field");

        this._querySelector = this._createQuerySelector($querySelectorContainer);

        SettingsField.createSettingsField(<SettingsFieldOptions<BladeConfigQuery.QuerySelectorControl>>{
            labelText: Resources.QuerySectionHeader,
            control: this._querySelector,            
            toolTipText: Resources.NoQuerySelectedMsg,
            controlElement: $querySelectorContainer,
            hasErrorField: true
        }, this.getElement());
    }

    private _createQuerySelector($querySelectorContainer: JQuery): BladeConfigQuery.QuerySelectorControl {

        return <BladeConfigQuery.QuerySelectorControl>Controls.BaseControl.createIn(
            BladeConfigQuery.QuerySelectorControl,
            $querySelectorContainer,
            <BladeConfigQuery.QuerySelectorOptions>{
                onChange: delegate(this, this._onWorkItemQueryChange),
                initialValue: this._widgetConfigurationOptions.workItemQuery,
                webContext: Context.getDefaultWebContext()
            }
        );
    }

    private _onWorkItemQueryChange(): void {
        let newValue: QueryScalar.IQueryInformation = this._querySelector.getCurrentValue();
        this._widgetConfigurationOptions.workItemQuery = newValue;
        this._notifyConfigurationChange();
    }

    private _drawRepoAndBranchSelector(): void {
        this._vcSelectorContainer = $("<div>").addClass(Constants.BRANCH_SELECTOR_CONTAINER);

        this._vcSelector = this._createRepoAndBranchSelector(this._vcSelectorContainer);

        this._vcSelectorContainer.appendTo(this.getElement());
    }

    private _drawRepoAndBranchInputContainer(): void {
        this._branchAndRepoInputContainer = $("<div>").addClass(Constants.VERSION_CONTROL_INPUT_CONTAINER);

        let $repoInputContainer = this._createRepoAndBranchInputContainer(Constants.REPOSITORY_INPUT_CONTAINER, Resources.Repository); 
        $repoInputContainer.appendTo(this._branchAndRepoInputContainer);
        // adding branch container with input and label elements
        let $branchInputContainer = this._createRepoAndBranchInputContainer(Constants.BRANCH_INPUT_CONTAINER, Resources.BranchText);
        $branchInputContainer.appendTo(this._branchAndRepoInputContainer);

        this._branchAndRepoInputContainer.appendTo(this.getElement());
    }

    private _createRepoAndBranchInputContainer(className: string, labelName: string): JQuery {
        let $repoBranchLayout: JQuery = this._createRepoAndBranchLayout(className);
        $repoBranchLayout.find(".testresults-traceability-vc-label").text(labelName);

        /*focusChangedHandler is called whenever focus from input box is out, i.e. after writing something and clicking outside input box or
        when switching between elements through keyboard*/
        let $inputName = $repoBranchLayout.find(".testresults-traceability-vc-inputbox");
        switch (labelName) {
            case Resources.Repository:
                $inputName.focusout(delegate(this, this._repoIdChangedByInputContainer));
                break;
            case Resources.BranchText:
                $inputName.focusout(delegate(this, this._branchChangedByInputContainer));
                break;
            default:
                Diag.logError("Value should either be Repository or Branch");
                break;
        }

        return $repoBranchLayout;
    }

    private _createRepoAndBranchLayout(className: string): JQuery {
        return $(
            `<div class="${className}" >
                  <label class="testresults-traceability-vc-label"/>
                  <input type="text" class="testresults-traceability-vc-inputbox"/>
            </div>`
        );
    }

    private _repoIdChangedByInputContainer(eventObject: JQueryEventObject) {
        this._widgetConfigurationOptions.repoAndBranch.repositoryId = Utils_Html.HtmlNormalizer.normalize((eventObject.target as HTMLInputElement).value);
        this._notifyConfigurationChange();
    }

    private _branchChangedByInputContainer(eventObject: JQueryEventObject) {
        this._widgetConfigurationOptions.repoAndBranch.path = Utils_Html.HtmlNormalizer.normalize((eventObject.target as HTMLInputElement).value);
        this._notifyConfigurationChange();
    }

    private _createRepoAndBranchSelector($repoAndBranchSelectorContainer: JQuery): VCPathSelectorControl.PathSelectorControl {

        return <VCPathSelectorControl.PathSelectorControl>Controls.BaseControl.createIn(
            VCPathSelectorControl.PathSelectorControl,
            $repoAndBranchSelectorContainer,
            <VCPathSelectorControl.VCPathSelectorOptions>{
                onChange: delegate(this, this._onRepoAndBranchChange),
                initialValue: this._widgetConfigurationOptions.repoAndBranch,
                filter: this._filterVCItems,
                hideGitPathSelector: true
            }
        );
    }

    private _filterVCItems(item: VCLegacyContracts.ItemModel): boolean {
        let node = <VCLegacyContracts.TfsItem>item;
        return node && (node.isBranch || node.isFolder);
    }

    private _onRepoAndBranchChange(): void {
        let newValue: VCPathSelectorControl.VCPathInformation = this._vcSelector._VCsettings;
        this._widgetConfigurationOptions.repoAndBranch = newValue;
        this._notifyConfigurationChange();
    }

    private _drawBuildDefinitionDropdown(): void {
        let $container = $("<div>").addClass(Constants.BUILD_SELECTOR_CONTAINER).addClass("settings-field");

        this._buildSettingsField = SettingsField.createSettingsField(<SettingsFieldOptions<BuildDefinitionPicker>>{
            labelText: Resources.BuildDefinitionText,
            control: <BuildDefinitionPicker>BuildDefinitionPickerCreator($container, <BuildDefinitionPickerOptions>{
                onIndexChanged: delegate(this, this._onBuildDefinitionChanged),
                initialValue: this._widgetConfigurationOptions.buildDefinition
            }),
            controlElement: $container,
            hasErrorField: true
        }, this.getElement());
    }

    private _drawReleaseDefinitionDropdown(): void {
        let $container = $("<div>").addClass(Constants.RELEASE_SELECTOR_CONTAINER).addClass("settings-field");

        this._releaseSettingsField = SettingsField.createSettingsField(<SettingsFieldOptions<RDPicker.ReleaseDefinitionPicker>>{
            labelText: Resources.ReleaseDefinitionText,
            control: <RDPicker.ReleaseDefinitionPicker>Controls.BaseControl.createIn(RDPicker.ReleaseDefinitionPicker, $container, {
                onIndexChanged: delegate(this, this._onReleaseDefinitionChanged),
                initialValue: this._widgetConfigurationOptions.releaseDefinition
            }),
            controlElement: $container,
            hasErrorField: true
        }, this.getElement());
    }

    private _onBuildDefinitionChanged(newValue: BuildDefinitionReference): void {
        this._widgetConfigurationOptions.buildDefinition = newValue;
        this._widgetConfigurationOptions.context = Contracts.TestResultsContextType.Build;
        let buildService = TMService.ServiceManager.instance().buildService2();
        buildService.getDefinition(newValue.id).then((buildDefinitionInfo: BuildContracts.BuildDefinition) => {
            this._repoType = (buildDefinitionInfo && buildDefinitionInfo.repository) ? buildDefinitionInfo.repository.type : this._repoType;
            this._populateBranchRepoSection(this._repoType);       
        }, (error) => {
            Diag.logError(Utils_String.format("Unable to fetch Build Definition object for BuildDefinitionId: {0}", newValue.id));
        });
        this._notifyConfigurationChange();
    }

    private _onReleaseDefinitionChanged(newValue: RMContracts.ReleaseDefinition): void {

        this._widgetConfigurationOptions.releaseDefinition = newValue;
        this._widgetConfigurationOptions.context = Contracts.TestResultsContextType.Release;
        this._notifyConfigurationChange();
    }

    private _populateBranchRepoSection(repoType: string): void {
        /*if _buildRepo is TfsGit or TfsVersionControl then we hide Repository and Branch input container otherwise
            we hid Repository and Branch input selector */
        if (this._repoType === TraceabilityConfigurationView._tfsGitRepo || this._repoType === TraceabilityConfigurationView._tfsVersionControlRepo) {
            this._branchAndRepoInputContainer.hide();
            this._vcSelectorContainer.show();
        }
        else {
            this._branchAndRepoInputContainer.show();
            this._vcSelectorContainer.hide();
        }
    }

    private _defaultWidgetConfigurationOptions: ITraceabilityWidgetConfigurationOptions = {
        width: 500,
        height: 500,
        title: Resources.RequirementsQuality,
        context: null,
        buildDefinition: null,
        releaseDefinition: null,
        workItemQuery: null,
        repoAndBranch: null
    };

    private _widgetConfigurationOptions: ITraceabilityWidgetConfigurationOptions;
    private _widgetConfigurationContext: TFS_Dashboard_WidgetContracts.IWidgetConfigurationContext;
    private _querySelector: BladeConfigQuery.QuerySelectorControl;
    private _vcSelector: VCPathSelectorControl.PathSelectorControl;
    private _repoType: string = Utils_String.empty;
    private _branchAndRepoInputContainer: JQuery;
    private _vcSelectorContainer: JQuery;
    private static _tfsGitRepo: string = "TfsGit";
    private static _tfsVersionControlRepo: string = "TfsVersionControl";
    private _$buildWorkflowSelector: JQuery;
    private _$releaseWorkflowSelector: JQuery;
    private _buildSettingsField: SettingsField<BuildDefinitionPicker>;
    private _releaseSettingsField: SettingsField<RDPicker.ReleaseDefinitionPicker>;
    private _$qualityDataContainer: JQuery = $("<div />");
}

SDK.registerContent("testresults.traceability.configure", (context) => {
    return Controls.create(TraceabilityConfigurationView, context.$container, context.options);
});
