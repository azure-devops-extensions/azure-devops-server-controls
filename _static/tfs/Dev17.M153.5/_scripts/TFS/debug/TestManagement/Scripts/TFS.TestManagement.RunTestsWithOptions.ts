/// <reference types="jquery" />

import ko = require("knockout");
import ksb = require("knockoutSecureBinding");
import Q = require("q");

import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import VSS = require("VSS/VSS");
import VSS_Controls = require("VSS/Controls");
import VSS_Dialogs = require("VSS/Controls/Dialogs");
import VSS_Combos = require("VSS/Controls/Combos");
import VSS_Utils_Core = require("VSS/Utils/Core");
import VSS_Utils_UI = require("VSS/Utils/UI");
import VSS_Utils_Strings = require("VSS/Utils/String");
import VSS_Adapters_Knockout = require("VSS/Adapters/Knockout");
import VSS_Artifacts_Services = require("VSS/Artifacts/Services");

import BuildContracts = require("TFS/Build/Contracts");
import RMContracts = require("ReleaseManagement/Core/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import WIT_Integration = require("Build/Scripts/WorkItemIntegration.Linking");

import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TFS_RMService_LAZY_LOAD = require("TestManagement/Scripts/Services/TFS.ReleaseManagement.Service");
import Services_LAZY_LOAD = require("TestManagement/Scripts/Services/Services.Common");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;
let domElem = VSS_Utils_UI.domElem;
let delegate = VSS_Utils_Core.delegate;
let LinkingUtilities = VSS_Artifacts_Services.LinkingUtilities;
let TelemetryService = TCMTelemetry.TelemetryService;
let keyCode = VSS_Utils_UI.KeyCode;
let options = { attribute: "data-bind", globals: window, bindings: ko.bindingHandlers, noVirtualElements: false };
ko.bindingProvider.instance = new ksb(options);

export interface RunWithDialogOptions extends VSS_Dialogs.IModalDialogOptions {

    /**
   * Test Point which needs to run
   */
    testPoints: TestsOM.ITestPointModel[];

    // controls whether to show exploratory testing option
    showXTRunner: boolean;

    // requirement of the suite
    requirementId: number;

    dtrCallBack: (viewModel: RunWithOptionsDialogViewModel) => void;

    oldmtrCallBack: (viewModel: RunWithOptionsDialogViewModel) => void;

    newmtrCallBack: (viewModel: RunWithOptionsDialogViewModel) => void;

    webRunnerCallBack: (viewModel: RunWithOptionsDialogViewModel) => void;

    xtRunnerCallBack: (viewModel: RunWithOptionsDialogViewModel) => void;

    automatedTestRunnerCallBack: (viewModel: RunWithOptionsDialogViewModel) => void;
}

export interface RunWithDialogViewModelOptions extends RunWithDialogOptions {

    /**
   * Control for checklist dropdown
   */
    checklistDropdown: DropdownChecklist;
    updateOkButtonCallback: (enabled: boolean) => void;
    updateReleaseDefinitionsCallBack: (data: string[]) => void;
    updateReleaseEnvironmentsCallBack: (data: string[]) => void;
}

export interface IRunWithOptionsRegistrySettings {
    selectedRunner: string;
    dataCollectorsIndex?: number[];
}


export class RunWithOptionsDialog extends VSS_Dialogs.ModalDialog {

    private static _templateId: string = "run-with-options";

    private _dropdownCheckList: DropdownChecklist;
    private _runnerDropDown: VSS_Combos.Combo;
    private _releaseDefinitionCombo: VSS_Combos.Combo;
    private _releaseEnvironmentCombo: VSS_Combos.Combo;
    private _xtCallback: (viewModel: RunWithOptionsDialogViewModel) => void;
    private _dtrCallback: (viewModel: RunWithOptionsDialogViewModel) => void;
    private _mtrCallback: (viewModel: RunWithOptionsDialogViewModel) => void;
    private _webRunnerCallback: (viewModel: RunWithOptionsDialogViewModel) => void;
    private _xtRunnerCallBack: (viewModel: RunWithOptionsDialogViewModel) => void;
    private _automatedTestRunnerCallBack: (viewModel: RunWithOptionsDialogViewModel) => void;
    private showXTRunner: boolean;
    private requirementId: number;
    private _webSettingsService: any;

    public viewModel: RunWithOptionsDialogViewModel;

    public initializeOptions(options?: RunWithDialogOptions): void {
        super.initializeOptions($.extend({
            dialogClass: "run-with-options-dialog-root-class",
            attachResize: false,
            width: 540,
            title: Resources.RunWithOptionDialogTitle
        }, options));
        this._xtCallback = options.newmtrCallBack;
        this._dtrCallback = options.dtrCallBack;
        this._mtrCallback = options.oldmtrCallBack;
        this._webRunnerCallback = options.webRunnerCallBack;
        this._xtRunnerCallBack = options.xtRunnerCallBack;
        this._automatedTestRunnerCallBack = options.automatedTestRunnerCallBack;
        this.showXTRunner = options.showXTRunner;
        this.requirementId = options.requirementId;
    }

    public initialize(): void {
        super.initialize();
        this._webSettingsService = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(TFS_WebSettingsService.WebSettingsService);
        let template = TFS_Knockout.loadHtmlTemplate(RunWithOptionsDialog._templateId);

        this._dropdownCheckList = <DropdownChecklist>VSS_Controls.Control.createIn(DropdownChecklist, $(domElem("div")), {
            data: this._getDataCollectorTypes()
        });
        this.viewModel = new RunWithOptionsDialogViewModel(<RunWithDialogViewModelOptions>$.extend(this._options, {
            checklistDropdown: this._dropdownCheckList,
            updateOkButtonCallback: delegate(this, this.updateOkButton),
            updateReleaseDefinitionsCallBack: delegate(this, (data: string[]) => {
                if (this._releaseDefinitionCombo) {
                    this._releaseDefinitionCombo.setSource(data);
                    this._releaseDefinitionCombo.setText(VSS_Utils_Strings.empty);
                    this.viewModel.selectedReleaseDefinition(VSS_Utils_Strings.empty);
                }
            }),
            updateReleaseEnvironmentsCallBack: delegate(this, (data: string[]) => {
                if (this._releaseEnvironmentCombo) {
                    this._releaseEnvironmentCombo.setSource(data);
                    this._releaseEnvironmentCombo.setText(VSS_Utils_Strings.empty);
                    this.viewModel.selectedReleaseEnvironment(VSS_Utils_Strings.empty);
                }
            })
        }));
        ko.applyBindings(this.viewModel, template[0]);
        this.getElement().append(template);

        let runnerSelectorElement = this.getElement().find(".select-runner-dropdown");

        let enhancementOptions = <VSS_Controls.EnhancementOptions>{
            ariaAttributes: {
                label: Resources.RunWithOptionsDialogSelectRunnerComboLabel
            }
        };

        this._runnerDropDown = <VSS_Combos.Combo>VSS_Controls.BaseControl.create(VSS_Combos.Combo, runnerSelectorElement, $.extend({
            allowEdit: false,
            change: () => {
                if (this._runnerDropDown.getSelectedIndex() >= 0) {
                    this.viewModel.selectedRunner(this._runnerDropDown.getText());
                }
            }, 
            maxAutoExpandDropWidth: runnerSelectorElement.width() 
        }, enhancementOptions));
        this._runnerDropDown.setSource(this.viewModel.availableRunners);

        let releaseDefinitionElement = this.getElement().find(".select-RD-dropdown");
        this._releaseDefinitionCombo = <VSS_Combos.Combo>VSS_Controls.BaseControl.createIn(VSS_Combos.Combo, releaseDefinitionElement, {
            allowEdit: false,
            change: () => {
                if (this._releaseDefinitionCombo.getSelectedIndex() >= 0) {
                    this.viewModel.selectedReleaseDefinition(this._releaseDefinitionCombo.getText());
                }
            },
            ariaAttributes: {
                label: Resources.ReleaseDefinitionLabel
            }
        });
        
        let releaseEnvironmentElement = this.getElement().find(".select-release-environment-dropdown");
        this._releaseEnvironmentCombo = <VSS_Combos.Combo>VSS_Controls.BaseControl.createIn(VSS_Combos.Combo, releaseEnvironmentElement, {
            allowEdit: false,
            change: () => {
                if (this._releaseEnvironmentCombo.getSelectedIndex() >= 0) {
                    this.viewModel.selectedReleaseEnvironment(this._releaseEnvironmentCombo.getText());
                }
            },
            ariaAttributes: {
                label: Resources.StageDropdownLabel
            }
        });

        //Push data collector control to DOM 
        let $dataSelectorDiv = this.getElement().find(".data-collector-selector");
        this._dropdownCheckList.getElement().appendTo($dataSelectorDiv);
        let that = this;
        this._readRunWithOptionsSettings()
            .then(() => {
                that._runWithOptionsSettingsLoaded();
            });
    }

    //If Automated test runner is selected we should enable ok button only on release environment selection
    private _runWithOptionsSettingsLoaded() {
        this._runnerDropDown.setText(this.viewModel.selectedRunner());
        if (this.viewModel.selectedRunner() !== Resources.RunWithOptionDialogOnDemandTesting) {
            this.updateOkButton(true);
        }
    }

    public onOkClick(e: any) {

        // write registry settings for selected options
        this._writeRunWithOptionsSettings();

        //Adding telemetry for options selected by user
        this._publishTelemetryData();

        switch (this.viewModel.selectedRunner()) {
            case Resources.RunWithOptionDialogWebRunnerLabel:
                {
                    if (this._webRunnerCallback) {
                        this._webRunnerCallback(this.viewModel);
                    }
                    break;
                }
            case Resources.RunWithOptionDialogMtr2015AndBelowRunner:
                {
                    if (this._mtrCallback) {
                        this._mtrCallback(this.viewModel);
                    }
                    break;
                }
            case Resources.RunWithOptionDialogMtr2017AndAboveRunner:
                {
                    if (this._xtCallback) {
                        this._xtCallback(this.viewModel);
                    }
                    break;
                }
            case Resources.RunWithOptionDialogXT2017AndAboveRunner:
                {
                    if (this._xtRunnerCallBack) {
                        this._xtRunnerCallBack(this.viewModel);
                    }
                    break;
                }
            case Resources.RunWithOptionDialogOnDemandTesting:
                {
                    if (this._automatedTestRunnerCallBack) {
                        this._automatedTestRunnerCallBack(this.viewModel);
                    }
                    break;
                }
            case Resources.RunWithOptionDialogTestRunnerLabel: {
                if (this._dtrCallback) {
                    this._dtrCallback(this.viewModel);
                }
                break;
            }
        }
        this.onCancelClick();
    }

    private _getDataCollectorTypes(): string[] {
        let dataCollectorTypes: string[] = [];
        dataCollectorTypes.push(Resources.DataCollectorEventLogText);
        dataCollectorTypes.push(Resources.DataCollectorImageActionLogText);
        dataCollectorTypes.push(Resources.DataCollectorScreenRecorderText);
        dataCollectorTypes.push(Resources.DataCollectorSystemInformationText);
        return dataCollectorTypes;
    }

    private _geRunWithOptionsSettingsKey(): string {
        return "RunWithOptionsSettings";
    }

    private _getDefaultRunnerIfRunnerNotFound(runner: string): string {
        switch (runner) {
            case Resources.RunWithOptionDialogWebRunnerLabel:
                return Resources.RunWithOptionDialogWebRunnerLabel;
            case Resources.RunWithOptionDialogMtr2017AndAboveRunner:
                return Resources.RunWithOptionDialogMtr2017AndAboveRunner;
            case Resources.RunWithOptionDialogMtr2015AndBelowRunner:
                return Resources.RunWithOptionDialogMtr2015AndBelowRunner;
            case Resources.RunWithOptionDialogOnDemandTesting:
                return Resources.RunWithOptionDialogOnDemandTesting;
            case Resources.RunWithOptionDialogTestRunnerLabel:
                if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
                    return Resources.RunWithOptionDialogTestRunnerLabel;
                }
        }

        return Resources.RunWithOptionDialogWebRunnerLabel;
    }

    // reading registry settings for runWithOptions
    private _readRunWithOptionsSettings(): IPromise<void> {
        let deferred = Q.defer<void>();
        let settingsKey = this._geRunWithOptionsSettingsKey();
        let that = this;
        this._webSettingsService.beginReadSetting(settingsKey, TFS_WebSettingsService.WebSettingsScope.User, (settings: any) => {
            // control can be disposed before the callback in case cancel is clicked 
            // while waiting for the ajax call to complete
            // hence checking for _disposed
            if (!that._disposed) {
                if (settings && settings.value !== "") {
                    let settingsValue: IRunWithOptionsRegistrySettings = JSON.parse(settings.value);
                    let selectedRunner = that._getDefaultRunnerIfRunnerNotFound(settingsValue.selectedRunner);
                    
                    let dataCollectorsArray = settingsValue.dataCollectorsIndex;

                    if (dataCollectorsArray) {
                        $.each(dataCollectorsArray, function (index, value) {
                            that._element.find(".checkbox-" + value).click();
                        });
                    }
                    if (selectedRunner) {
                        that.viewModel.selectedRunner(selectedRunner);
                    }
                }
            }
            deferred.resolve(null);
        }, () => {
            deferred.reject;
        });

        return deferred.promise;
    }

    // writting registry settings for runWithOptions
    private _writeRunWithOptionsSettings() {
        let settingsKey = this._geRunWithOptionsSettingsKey();
        let settings: IRunWithOptionsRegistrySettings = {
            selectedRunner: this.viewModel.selectedRunner(),
            dataCollectorsIndex: this._dropdownCheckList.getSelectedIndexes()
        };
        this._webSettingsService.beginWriteSetting(settingsKey, JSON.stringify(settings), TFS_WebSettingsService.WebSettingsScope.User);
    }

    private _publishTelemetryData() {

        TelemetryService.publishEvents(TelemetryService.featureRunWithOptionsSettings, {
            "SelectedRunner": this._getMapSelectedRunnerForTelemetry(this.viewModel.selectedRunner()),
            "SelectedDataCollector": this._getMapSelectedDataCollectorForTelemetry(this._dropdownCheckList.getSelectedCheckboxesLabel()),
            "IsBuildSelected": this.viewModel.selectedBuild() === VSS_Utils_Strings.empty ? false : true
        });
    }

    

    private _getMapSelectedRunnerForTelemetry(runner: string): string {
        switch (runner) {
            case Resources.RunWithOptionDialogWebRunnerLabel:
                return "WebRunnner";
            case Resources.RunWithOptionDialogMtr2017AndAboveRunner:
                return "Mtr2017AndAboveRunner";
            case Resources.RunWithOptionDialogMtr2015AndBelowRunner:
                return "Mtr2015AndBelowRunner";
            case Resources.RunWithOptionDialogXT2017AndAboveRunner:
                return "XT2017AndAboveRunner";
            case Resources.RunWithOptionDialogOnDemandTesting:
                return "OnDemandTestRunner";
            case Resources.RunWithOptionDialogTestRunnerLabel:
                return "TestRunnerATP";
        }
    }

    private _getMapSelectedDataCollectorForTelemetry(labels: string[]): IDictionaryStringTo<boolean> {
        let dataCollectorsMap: IDictionaryStringTo<boolean> = {};
        let collectors = this._getDataCollectorTypes();
        for (let i = 0; i <= collectors.length; i++) {
            let dataCollectorKey;
            switch (collectors[i]) {
                case Resources.DataCollectorEventLogText:
                    dataCollectorKey = "Event Log";
                    break;
                case Resources.DataCollectorImageActionLogText:
                    dataCollectorKey = "Action Log";
                    break;
                case Resources.DataCollectorScreenRecorderText:
                    dataCollectorKey = "Screen Recorder";
                    break;
                case Resources.DataCollectorSystemInformationText:
                    dataCollectorKey = "System Info";
                    break;
            }

            if (dataCollectorKey) {
                if (labels.indexOf(collectors[i]) >= 0 && !this._dropdownCheckList.isDisabled()) {
                    dataCollectorsMap[dataCollectorKey] = true;
                }
                else {
                    dataCollectorsMap[dataCollectorKey] = false;
                }
            }
        }

        return dataCollectorsMap;
    }
}

export class RunWithOptionsDialogViewModel extends VSS_Adapters_Knockout.TemplateViewModel {

    private _checklistDropdown: DropdownChecklist;
    private _selectedBuildObject: BuildContracts.Build;

    public selectedBuild: KnockoutObservable<string> = ko.observable(VSS_Utils_Strings.empty);
    public selectedBuildUsingId: KnockoutObservable<number> = ko.observable(0);
    public selectedReleaseDefinition: KnockoutObservable<string> = ko.observable(VSS_Utils_Strings.empty);
    public selectedReleaseEnvironment: KnockoutObservable<string> = ko.observable(VSS_Utils_Strings.empty);
    public selectedTestRunParameter: KnockoutObservable<string> = ko.observable(VSS_Utils_Strings.empty);
    public selectedRunner: KnockoutObservable<string> = ko.observable(Resources.RunWithOptionDialogWebRunnerLabel);   
    public testPoints: TestsOM.ITestPointModel[];
    public requirementId: number;
    public showXTRunner: boolean;
    public shouldShowDataCollectorOption: KnockoutObservable<boolean> = ko.observable(false);
    public shouldShowReleaseDefinitionOption: KnockoutObservable<boolean> = ko.observable(false);
    public shouldShowReleaseEnvironmentOption: KnockoutObservable<boolean> = ko.observable(false);
    public shouldShowTestRunParameters: KnockoutObservable<boolean> = ko.observable(false);
    public shouldShowTestRunnerDownloadInfo: KnockoutObservable<boolean> = ko.observable(false);

    public availableRunners: KnockoutObservableArray<string> = ko.observableArray<string>([]);
    public runnerHelpText: KnockoutObservable<string> = ko.observable(Resources.RunWithOptionDialogWebRunnerHelpText);
    public dataCollectorHelpText: KnockoutObservable<string> = ko.observable(Resources.SupportedBrowserWebRunnerDataCollectorHelpText);
    public disableBuildInput: KnockoutObservable<boolean> = ko.observable(false);
    public buildInputPlaceHolder: KnockoutObservable<string> = ko.observable(Resources.BuildInputPlaceHolderSelectBuildText);
    public selectBuildInfoText: KnockoutObservable<string> = ko.observable(Resources.SelectBuildInfoDefaultInfoText);
    public testRunnerDownloadInfoText: KnockoutObservable<string> = ko.observable(Resources.TestRunnerDialogInstallationInfoText);
    public testRunnerGetItNowText: KnockoutObservable<string> = ko.observable(Resources.GetItNowText);
    public testRunnerLearnMoreLinkText: KnockoutObservable<string> = ko.observable(Resources.LearnMoreText);
    public testRunnerGetItNowLink: string = "https://aka.ms/ATPTestRunnerDownload";
    public testRunnerLearnMoreLink: string = "https://aka.ms/ATPTestRunnerLearnMore";
    public availableTestRunParameters: KnockoutObservableArray<string> = ko.observableArray<string>([]);
    public _updateOkButtonCallback: any;
    public _updateReleaseDefinitionsCallBack: any;
    public _updateReleaseEnvironmentsCallBack: any;

    private rdNameToRDObjectMap: TFS_Core_Utils.Dictionary<RMContracts.ReleaseDefinition> = new TFS_Core_Utils.Dictionary<RMContracts.ReleaseDefinition>();
    private rdEnvNameToRDEnvObjectMap: TFS_Core_Utils.Dictionary<RMContracts.ReleaseDefinitionEnvironment> = new TFS_Core_Utils.Dictionary<RMContracts.ReleaseDefinitionEnvironment>();

    constructor(options?: RunWithDialogViewModelOptions) {
        super();
        this.showXTRunner = options.showXTRunner;
        this.requirementId = options.requirementId;
        this.testPoints = options.testPoints;
        this._checklistDropdown = options.checklistDropdown;
        this._updateOkButtonCallback = options.updateOkButtonCallback;
        this._updateReleaseDefinitionsCallBack = options.updateReleaseDefinitionsCallBack;
        this._updateReleaseEnvironmentsCallBack = options.updateReleaseEnvironmentsCallBack;
        this._setAvailableRunners();     
          
        this.selectedRunner.subscribe(() => {
            this._onRunnerChanged();
        });
        this._onRunnerChanged();

        this.selectedBuildUsingId.subscribe(() => {
            this._buildChanged();
        });
        this.selectedReleaseDefinition.subscribe(() => {
            this._releaseDefinitionChanged();
        });
        this.selectedReleaseEnvironment.subscribe(() => {
            this._releaseEnvironmentChanged();
        });
    }

    /**
     * Fetches the requirementId
     */
    getRequirementId(): number {
        return this.requirementId;
    }

    /**
     *  Get the Uri of selected build
     */
    public getBuildUri(): string {
        let buildUri: string = VSS_Utils_Strings.empty;
        if (this.selectedBuild() !== VSS_Utils_Strings.empty && !this.disableBuildInput()) {
            if (this._selectedBuildObject && this._selectedBuildObject.uri) {
                buildUri = this._selectedBuildObject.uri;
            }
        }
        return buildUri;
    }

    public getSelectedBuild(): BuildContracts.Build {
        return this._selectedBuildObject;
    }

    public getSelectedReleaseDefinition(): RMContracts.ReleaseDefinition {
        if (this.selectedReleaseDefinition()) {
            return this.rdNameToRDObjectMap.get(this.selectedReleaseDefinition());
        }
        return null;
    }

    public getSelectedReleaseEnvironment(): RMContracts.ReleaseDefinitionEnvironment {
        if (this.selectedReleaseEnvironment()) {
            return this.rdEnvNameToRDEnvObjectMap.get(this.selectedReleaseEnvironment());
        }
        return null;
    }

    /**
     * Returns the data collectors checked by user
     */
    public getEnabledDataCollectors(): string[] {
        let selectedDataCollectors: string[] = this._checklistDropdown.getSelectedCheckboxesLabel();
        return selectedDataCollectors;
    }

    /**
     * Opens the Find build dialog when click of build text box
     */
    public openFindBuildDialog() {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let model = new WIT_Integration.BuildPickerDialogModel(tfsContext, (build: BuildContracts.Build) => {
            this._setSelectedBuild(build);
        });
        let dialog = VSS_Dialogs.show(WIT_Integration.BuildPickerDialog, model);
    }

    /**
     * Clears the build text box
     */
    public clearBuildDetails() {
        this.selectedBuild(VSS_Utils_Strings.empty);
        this._selectedBuildObject = null;
        this.selectedBuildUsingId(0);
    }

    private _onRunnerChanged(): void {
        this._updateOkButtonCallback(true);
        if (this.selectedRunner() === Resources.RunWithOptionDialogWebRunnerLabel) {
            this.selectedBuild(VSS_Utils_Strings.empty);
            this.selectedBuildUsingId(0);
            let isDataCollectionEnabled: boolean = TMUtils.isDataCollectionEnabled();
            let dataCollectorText: string = isDataCollectionEnabled ? Resources.SupportedBrowserWebRunnerDataCollectorSelectionText : Resources.NonSupportedBrowserWebRunnerDataCollectorSelectionText;
            let dataCollectorHelpText: string = isDataCollectionEnabled ? Resources.SupportedBrowserWebRunnerDataCollectorHelpText : Resources.NonSupportedBrowserWebRunnerDataCollectorHelpText;
            this._setDependentOptions(Resources.RunWithOptionDialogWebRunnerHelpText, false, true,
                dataCollectorHelpText, dataCollectorText, Resources.BuildInputPlaceHolderSelectBuildText, Resources.SelectBuildInfoDefaultInfoText,
                false, false, false, false);
        } else if (this.selectedRunner() === Resources.RunWithOptionDialogOnDemandTesting) {
            this.clearBuildDetails();
            if (this._updateReleaseDefinitionsCallBack) {
                this._updateReleaseDefinitionsCallBack([]);
            }
            if (this._updateReleaseEnvironmentsCallBack) {
                this._updateReleaseEnvironmentsCallBack([]);
            }
            this._setDependentOptions(Resources.RunWithOptionDialogOnDemandTestingHelpText, false, true,
                Resources.Mtr2015AndBelowDataCollectorHelpText, Resources.Mtr2015OrEarlierDataCollectorSelectionText,
                Resources.BuildInputPlaceHolderSelectBuildText, Resources.SelectBuildInfoForAutomatedTestText, false, true, true, false);
            this._updateOkButtonCallback(false);
        }
        else if (this.selectedRunner() === Resources.RunWithOptionDialogMtr2017AndAboveRunner) {
            this._setDependentOptions(Resources.RunWithOptionDialogMtr2017AndAboveClientHelpText, false, false,
                Resources.Mtr2017AndAboveDataCollectorHelpText, VSS_Utils_Strings.empty, Resources.BuildInputPlaceHolderSelectBuildText, Resources.SelectBuildInfoDefaultInfoText, true, false, false, false);
        }
        else if (this.selectedRunner() === Resources.RunWithOptionDialogMtr2015AndBelowRunner) {
            this.selectedBuild(VSS_Utils_Strings.empty);
            this.selectedBuildUsingId(0);
            this._setDependentOptions(Resources.RunWithOptionDialogMtr2015AndBelowClientHelpText, true, true,
                Resources.Mtr2015AndBelowDataCollectorHelpText, Resources.Mtr2015OrEarlierDataCollectorSelectionText, Resources.BuildInputPlaceHolderMtr2015BelowText, Resources.SelectBuildInfoMtr2015BelowInfoText, false, false, false, false);
        } if (this.selectedRunner() === Resources.RunWithOptionDialogXT2017AndAboveRunner) {
            this.selectedBuild(VSS_Utils_Strings.empty);
            this.selectedBuildUsingId(0);
            this._setDependentOptions(Resources.RunWithOptionDialogXT2017AndAboveClientHelpText, true, false,
                Resources.Mtr2017AndAboveDataCollectorHelpText, VSS_Utils_Strings.empty, Resources.BuildInputPlaceHolderXT2017AndAboveClientText, Resources.SelectBuildInfoXT2017AndAboveClientInfoText, true, false, false, false);
        } if (this.selectedRunner() === Resources.RunWithOptionDialogTestRunnerLabel) {
            this.selectedBuild(VSS_Utils_Strings.empty);
            this.selectedBuildUsingId(0);
            this._setDependentOptions(Resources.RunWithOptionDialogTestRunnerHelpText, true, true,"","", "","", false, false, false, false, true);
        }
    }

    private _setDependentOptions(runnerHelpText: string, disableBuild: boolean, disableDataCollector: boolean,
        dataCollectorHelpText: string, dataCollectorDropDownLabel: string, buildPlaceHolder: string, buildInfoText: string,
        shouldShowDataCollectorOption: boolean, shouldShowReleaseDefinitionOption: boolean, shouldShowReleaseEnvironmentOption: boolean, shouldShowTestRunParameters: boolean, shouldShowTestRunnerDownloadInfo: boolean = false): void {
        this._checklistDropdown.disableControl(disableDataCollector);
        this._checklistDropdown.setSelectionName(dataCollectorDropDownLabel);
        this.dataCollectorHelpText(dataCollectorHelpText);
        this.runnerHelpText(runnerHelpText);
        this.disableBuildInput(disableBuild);
        this.buildInputPlaceHolder(buildPlaceHolder);
        this.selectBuildInfoText(buildInfoText);
        this.shouldShowDataCollectorOption(shouldShowDataCollectorOption);
        this.shouldShowReleaseDefinitionOption(shouldShowReleaseDefinitionOption);
        this.shouldShowReleaseEnvironmentOption(shouldShowReleaseEnvironmentOption);
        this.shouldShowTestRunParameters(shouldShowTestRunParameters);
        this.shouldShowTestRunnerDownloadInfo(shouldShowTestRunnerDownloadInfo);
    }

    private _setAvailableRunners(): void {
        this.availableRunners.push(Resources.RunWithOptionDialogWebRunnerLabel);
        if (LicenseAndFeatureFlagUtils.isDesktopTestRunnerOptionEnabled()) {
            this.availableRunners.push(Resources.RunWithOptionDialogTestRunnerLabel);
        }
        this.availableRunners.push(Resources.RunWithOptionDialogOnDemandTesting);
        if (LicenseAndFeatureFlagUtils.AreAdvancedTestManagementFeaturesEnabled()) {
            this.availableRunners.push(Resources.RunWithOptionDialogMtr2017AndAboveRunner);

            if (this.showXTRunner) {
                this.availableRunners.push(Resources.RunWithOptionDialogXT2017AndAboveRunner);
            }
            this.availableRunners.push(Resources.RunWithOptionDialogMtr2015AndBelowRunner);
        }
    }

    private _setSelectedBuild(build: BuildContracts.Build) {
        this._selectedBuildObject = build;
        this.selectedBuild(build.buildNumber);
        this.selectedBuildUsingId(build.id);  // to notify subscriber for the build change on the basis of change in build Id.
    }

    private _buildChanged() {
        if (this._selectedBuildObject && this.selectedRunner() === Resources.RunWithOptionDialogOnDemandTesting) {
            let buildDefinitionId = this._selectedBuildObject.definition.id;
            VSS.using(["TestManagement/Scripts/Services/TFS.ReleaseManagement.Service", "TestManagement/Scripts/Services/Services.Common"], 
            (TFS_RMService: typeof TFS_RMService_LAZY_LOAD, Services: typeof Services_LAZY_LOAD) => {
                let releaseService = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);
                releaseService.then((service: TFS_RMService_LAZY_LOAD.ReleaseService) => {
                    service.getReleaseDefinitionsForBuildDefinition(buildDefinitionId)
                    .then((releaseDefinitions: RMContracts.ReleaseDefinition[]) => {
                        this._populateRDOptions(releaseDefinitions);
                    });
                });
            });
        }
    }

    private _populateRDOptions(releaseDefinitions: RMContracts.ReleaseDefinition[]) {
        this.rdNameToRDObjectMap.clear();
        let availableRDNames = [];
        for (let releaseDefinition of releaseDefinitions) {
            availableRDNames.push(releaseDefinition.name);
            this.rdNameToRDObjectMap.add(releaseDefinition.name, releaseDefinition);
        }
        this._updateReleaseDefinitionsCallBack(availableRDNames);
        this._releaseDefinitionChanged();
    }

    private _releaseDefinitionChanged() {
        this.rdEnvNameToRDEnvObjectMap.clear();
        if (this.selectedReleaseDefinition()) {
            let selectedReleaseDefinitionObject: RMContracts.ReleaseDefinition = this.rdNameToRDObjectMap.get(this.selectedReleaseDefinition());
            if (!selectedReleaseDefinitionObject.environments) {
                this._fetchFullReleaseDefinitionAndUpdateMap(selectedReleaseDefinitionObject.id);
            } else {
                this._populateReleaseEnvironmentOptions(selectedReleaseDefinitionObject.environments);
            }
        } else {
            this._updateReleaseEnvironmentsCallBack([]);
        }
    }

    private _fetchFullReleaseDefinitionAndUpdateMap(releaseDefinitionId: number) {
        VSS.using(["TestManagement/Scripts/Services/TFS.ReleaseManagement.Service", "TestManagement/Scripts/Services/Services.Common"],
            (TFS_RMService: typeof TFS_RMService_LAZY_LOAD, Services: typeof Services_LAZY_LOAD) => {
                let releaseService = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);
                releaseService.then((service: TFS_RMService_LAZY_LOAD.ReleaseService) => {
                    service.getReleaseDefinition(releaseDefinitionId)
                        .then((releaseDefinition: RMContracts.ReleaseDefinition) => {
                            this.rdNameToRDObjectMap.set(this.selectedReleaseDefinition(), releaseDefinition);
                            this._populateReleaseEnvironmentOptions(releaseDefinition.environments);
                        });
                });
            });
    }

    private _populateReleaseEnvironmentOptions(environments: RMContracts.ReleaseDefinitionEnvironment[]) {
        let availableRDEnvs = [];
        for (let releaseEnvironment of environments) {
            availableRDEnvs.push(releaseEnvironment.name);
            this.rdEnvNameToRDEnvObjectMap.add(releaseEnvironment.name, releaseEnvironment);
        }
        this._updateReleaseEnvironmentsCallBack(availableRDEnvs);
    }

    private _releaseEnvironmentChanged() {
        if (this.selectedReleaseEnvironment()) {
            this._updateOkButtonCallback(true);
        } else {
            this._updateOkButtonCallback(false);
        }
    }

}

export interface CheckListDropdownOptions {
    labelName: string;
    data: string[];
}

/**
 * Create a dropdown list of checkboxes.
 *This is Generic control which take list of string as input and render them as
 *checkbox with passed label
 */
export class DropdownChecklist extends VSS_Controls.Control<CheckListDropdownOptions> {

    private _dropDownControl: JQuery;
    private _dropdownVisible: boolean;
    private _selectionName: JQuery;
    private _labelName: string = VSS_Utils_Strings.empty;
    private _data: string[] = [];
    private _selectedIndexes: number[] = [];
    private _isDisabled: boolean = false;
    private _contentSelector: JQuery;

    constructor(options?: CheckListDropdownOptions) {
        super(options);
        this._labelName = options.labelName ? options.labelName : VSS_Utils_Strings.empty;
        this._data = options.data;
    }

    public initializeOptions(options?: CheckListDropdownOptions): void {
        super.initializeOptions(options);
    }

    public initialize() {
        /// <summary>creates a drop down control with each item as checkbox</summary>
        super.initialize();
        let $container = $(domElem("div")).addClass("checklist-dropdown-container");
        let $label: JQuery = $(domElem("div")).addClass("control-label").text(this._labelName);
        this._contentSelector = this._createCollapsedRow();

        $label.appendTo($container);
        this._contentSelector.appendTo($container);
        $container.appendTo(this._element);

        this._createCheckboxes();
        //Hide the drop down at initialization
        this._hideDropDown();
    }

    /**
     * Disable/Enable the Data collector dropdown
     * @param disabled
     */
    public disableControl(disabled: boolean) {
        this._hideDropDown();
        this._setSelectedText();
        if (disabled) {
            this._contentSelector.addClass("content-disabled");
            this._isDisabled = true;
        }
        else {
            this._contentSelector.removeClass("content-disabled");
            this._isDisabled = false;
        }
    }

    /**
     * Set the name of selection dropdown when dropdown is collapsed
     * @param name
     */
    public setSelectionName(name: string) {
        if (this._isDisabled) {
            this._selectionName.val(name);
        }
        else {
            this._setSelectedText();
        }
    }

    /**
     * Return the labels of all checkboxes selected by user
     */
    public getSelectedCheckboxesLabel(): string[] {
        let selectedCheckboxes: string[] = [];
        for (let i = 0; i < this._selectedIndexes.length; i++) {
            selectedCheckboxes.push(this._data[this._selectedIndexes[i]]);
        }
        return selectedCheckboxes;
    }

    /**
     * Return the indexes of all checkboxes selected by user
     */
    public getSelectedIndexes(): number[] {
        return this._selectedIndexes;
    }

    /**
     * Return true if control is disabled
     */
    public isDisabled(): boolean {
        return this._isDisabled;
    }

    private _createCollapsedRow(): JQuery {

        let $content: JQuery = $(domElem("div")).addClass("control-content");
        $content.attr("id", "select-datacollectors-combo-id");

        let $dataTable: JQuery = $(domElem("table"));
        // Add row to show the collapsed drop down view
        let $collapsedSelectorRow: JQuery = $(domElem("tr")).addClass("collapsed-selector").appendTo($dataTable);
        let $selector: JQuery = $(domElem("td")).appendTo($collapsedSelectorRow).addClass("selector");

        this._selectionName = $(domElem("input")).addClass("selection-name").attr({
            "id": "selection-name-input-id",
            "readonly": "true",
            "aria-readonly": "true",
            "role": "listbox",
            "aria-label": Resources.RunWithOptionDialogDataCollectorLabel,
            "autocomplete": "off",
            "aria-autocomplete": "off",
            "aria-expanded": "false"
        }).appendTo($selector);

        let $dropButton: JQuery = $(domElem("div", "drop")).addClass("img_expand").appendTo($selector);

        this._bind(this._selectionName, "click", delegate(this, this._onDropClick));
        this._bind($dropButton, "click", delegate(this, this._onDropClick));

        this._bind(this._selectionName, "keydown", delegate(this, this._onInputKeyDown));

        this._bind(this._selectionName, "focus", delegate(this, this._onInputFocus));
        this._bind(this._selectionName, "focusout", delegate(this, this._onInputFocusOut));
        this._bind($content, "focusout", delegate(this, this._onInputFocusOut));

        $dropButton.on("mousedown", function (event) {
            event.preventDefault();
        });
        $content.on("mousedown", function (event) {
            event.preventDefault();
        });
        this._selectionName.on("mousedown", function (event) {
            event.preventDefault();
        });

        // Add row that will show checkbox list
        let $expandedSelector = $(domElem("tr")).addClass("expanded-selector").appendTo($dataTable);
        this._dropDownControl = $(domElem("td")).addClass("checkbox-list-parent").appendTo($expandedSelector);
        this.$checkboxList = $(domElem("ul")).addClass("checkbox-list").appendTo(this._dropDownControl);


        $dataTable.appendTo($content);
        return $content;
    }

    private _onInputKeyDown(e?: JQueryEventObject) {
        switch (e.keyCode) {
            case keyCode.BACKSPACE:
                e.stopPropagation();
                e.preventDefault();
                break;
            case keyCode.ENTER:
                e.stopPropagation();
                e.preventDefault();
                this._openDropDown();
                break;
            case keyCode.DOWN:
                if (e.altKey) {
                    this._openDropDown();
                }
                break;
        }
    }

    private _onInputFocus(e?: JQueryEventObject) {
        $("#select-datacollectors-combo-id").addClass("focus");
    }

    private _onInputFocusOut(e?: JQueryEventObject) {
        if (!(e.relatedTarget && VSS_Utils_Strings.equals(e.relatedTarget.tagName, "input", true))) {
            this._hideDropDown();
            this._setSelectedText();
        }
        $("#select-datacollectors-combo-id").removeClass("focus");
    }

    private _openDropDown() {
        this._showDropDown();
        this._contentSelector.find(".dropdown-checkbox")[0].focus();
        $("#selection-name-input-id").attr("tabindex", "-1");
    }

    private _closeDropDown() {
        this._hideDropDown();
        this._setSelectedText();
        $("#selection-name-input-id").focus();
    }

    private $checkboxList;

    private _createCheckboxes() {
        if (this._data) {
            for (let i = 0; i < this._data.length; i++) {
                let $checkboxContainer = $(domElem("li")).addClass("dropdown-checkbox-container");
                let $checkbox = $(domElem("input")).addClass("dropdown-checkbox").attr("type", "checkbox");
                // used for registry setting
                $checkbox.addClass("checkbox-" + i);
                let $dropdownLabel = $(domElem("div")).addClass("dropdown-checkbox-label").text(this._data[i]);
                $dropdownLabel.attr("id", "checkbox-" + i);
                $checkbox.click(delegate(this, this._onCheckboxToggle, { index: i, $checkbox: $checkbox }));
                $checkbox.attr("aria-labelledby", "checkbox-" + i);
                $checkbox.attr("tabindex", "-1");

                $checkbox.bind("mousedown", function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                });
                this._bind($checkbox, "keydown", delegate(this, this._onCheckboxesKeyDown));
                this._bind($checkbox, "focus", delegate(this, this._onCheckboxesFocus));
                this._bind($checkbox, "focusout", delegate(this, this._onCheckboxesFocusOut));


                $checkbox.appendTo($checkboxContainer);
                $dropdownLabel.appendTo($checkboxContainer);
                $checkboxContainer.appendTo(this.$checkboxList);
            }
        }

    }

    private _onCheckboxesKeyDown(e?: JQueryEventObject) {
        switch (e.keyCode) {
            case keyCode.BACKSPACE:
                e.stopPropagation();
                e.preventDefault();
                break;
            case keyCode.ESCAPE:
                e.preventDefault();
                e.stopPropagation();
                this._closeDropDown();
                break;
            case keyCode.DOWN:
                e.preventDefault();
                e.stopPropagation();
                $(":focus").closest("li").next().find(":input").focus();
                break;
            case keyCode.UP:
                e.preventDefault();
                e.stopPropagation();
                if (e.altKey) {
                    this._closeDropDown();
                    break;
                }
                $(":focus").closest("li").prev().find(":input").focus();
                break;
        }
    }

    private _onCheckboxesFocus(e?: JQueryEventObject) {
        $("#selection-name-input-id").attr("tabindex", "-1");
    }

    private _onCheckboxesFocusOut(e?: JQueryEventObject) {
        $("#selection-name-input-id").attr("tabindex", "0");
    }

    private _onDropClick(e?: JQueryEventObject) {
        if (e.type === "focusout" || this._dropdownVisible || this._isDisabled) {
            this._closeDropDown();
        }
        else {
            this._openDropDown();
        }
    }

    private _setSelectedText(): void {
        let selectedText: string = this._getSelectionText();
        this._selectionName.val(selectedText);
    }

    private _hideDropDown() {
        this._dropdownVisible = false;
        this._dropDownControl.hide();
        $("#selection-name-input-id").attr("aria-expanded", "false");
    }

    private _showDropDown() {
        this._dropdownVisible = true;
        this._dropDownControl.show();
        $("#selection-name-input-id").attr("aria-expanded", "true");
    }

    private _getSelectionText(): string {
        if (this._isDisabled) {
            return this._selectionName.val();
        }

        let selectedIndexes = this.getSelectedIndexes();
        let count = selectedIndexes.length;

        if (count > 1) {
            let selectedDataCollectors: string[] = this.getSelectedCheckboxesLabel();
            return selectedDataCollectors.join(Resources.CommaSeparator + " ");
        }

        if (count === 0) {
            return Resources.DataCollectorDropdownSelectionTextNone;
        }

        return this._data[selectedIndexes[0]];
    }

    private _onCheckboxToggle(event: any, data: any) {
        let index: number = data.index;
        let $checkbox: JQuery = data.$checkbox;
        if ($checkbox) {
            if ($checkbox.prop("checked") === true) {
                this._selectedIndexes.push(index);
            }
            else {
                let indexToBeRemoved = -1;
                indexToBeRemoved = this._selectedIndexes.indexOf(index);
                if (indexToBeRemoved >= 0) {
                    this._selectedIndexes.splice(indexToBeRemoved, 1);
                }
            }
        }
    }
}
