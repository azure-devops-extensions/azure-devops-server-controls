

import ko = require("knockout");
import ksb = require("knockoutSecureBinding");
import q = require("q");

import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TMService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Contracts = require("TFS/TestManagement/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Events_Document = require("VSS/Events/Document");
import Navigation = require("VSS/Controls/Navigation");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let options = { attribute: "data-bind", globals: window, bindings: ko.bindingHandlers, noVirtualElements: false };
ko.bindingProvider.instance = new ksb(options);

export class AdminView extends Navigation.NavigationView {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend(options, {
            attachNavigate: true
        }));
    }

    public initialize() {
        super.initialize();
        this._createView();   
    }

    public dispose() {
        if (this._retentionSettingsView) {
            this._retentionSettingsView.dispose();
        }

        if (this._retentionSettingsViewModel) {
            this._retentionSettingsViewModel.dispose();
        }

        super.dispose();
    }

    private _createView() {
        this._retentionSettingsViewModel = new RetentionSettingsViewModel();
        this._retentionSettingsView = Controls.Control.create<RetentionSettingsView, RetentionSettingsViewOptions>(RetentionSettingsView, this.getElement().find(".retention-settings-container"),
        {
            templateId: "retention_settings",
            viewModel: this._retentionSettingsViewModel
        });
    }

    private _retentionSettingsViewModel: RetentionSettingsViewModel;
    private _retentionSettingsView: RetentionSettingsView;
}

export class RetentionSettingsViewOptions {
    public templateId: string;
    public viewModel: RetentionSettingsViewModel;
}

export class RetentionSettingsView extends Controls.Control<RetentionSettingsViewOptions> {
    private _runningDocEntry: Events_Document.RunningDocumentsTableEntry;

    public initializeOptions(options: RetentionSettingsViewOptions) {
        this._viewModel = options.viewModel;
        this._templateId = options.templateId;
        this._disposalManager = new Utils_Core.DisposalManager();
    }

    public initialize() {

        Controls.BaseControl.createIn(MessageArea.MessageAreaView, this.getElement(), { viewModel: this._viewModel.getMessageViewModel() });

        let template = TFS_Knockout.loadHtmlTemplate(this._templateId, "retention-settings");
        ko.applyBindings(this._viewModel, template[0]);
        this.getElement().append(template);

        this._createSelectors();

        this._viewModel.getSavedDuration().then((value: IDurationSettings) => {
            this._durationSelectorForAutomatedResults.setText(value.automatedDurationString);
            this._durationSelectorForManualResults.setText(value.manualDurationString);
        },
        $.noop);

        this._saveButton = this.getElement().find(".save-changes-button");
        this._undoButton = this.getElement().find(".undo-changes-button");
        this._runningDocEntry = Events_Document.getRunningDocumentsTable().add("TestManagement.Admin.RetentionSettings", this);

        this._bindEvents();
    }

    public isDirty() {
        return this._viewModel.isDirty();
    }

    public dispose() {
        this._disposalManager.dispose();
        this._saveButton.off("click");
        this._undoButton.off("click");
        this._durationSelectorForAutomatedResults._unbind("change");
        this._durationSelectorForManualResults._unbind("change");

        if (this._runningDocEntry) {
            Events_Document.getRunningDocumentsTable().remove(this._runningDocEntry);
        }

        super.dispose();
    }

    private _createSelectors() {
        this._durationSelectorForAutomatedResults = this._enhanceComboIn(this.getElement().find(".duration-selector-automated"),
            this._viewModel.automatedRetentionDurationString,
            this._viewModel.isAutomatedRetentionDurationValid);

        this._durationSelectorForManualResults = this._enhanceComboIn(this.getElement().find(".duration-selector-manual"),
            this._viewModel.manualRetentionDurationString,
            this._viewModel.isManualRetentionDurationValid);
    }

    private _bindEvents() {
        this._bindButtonEvents(this._saveButton, Utils_UI.KeyCode.S, delegate(this, this._save));
        this._bindButtonEvents(this._undoButton, RetentionSettingsView.KeyCodeZ, delegate(this, this._undo));
    }

    private _bindButtonEvents(buttonElement: JQuery, shortCutKeyCode: number, handler: IArgsFunctionR<any>) {
        buttonElement.on("click", handler);
        TMUtils.AccessibilityHelper.onEnterPress(buttonElement, true, handler);
        TMUtils.AccessibilityHelper.onWindowCtrlShortcut(shortCutKeyCode, handler);
    }

    private _save(): void {
        this._viewModel.save();
    }

    private _undo(): void {
        this._viewModel.undo();
    }

    private _enhanceComboIn(
        element: JQuery,
        valueObservable: KnockoutObservable<string>,
        validationObservable: KnockoutComputed<IValidationResult>): Combos.Combo {

        let combo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, element);
        combo.setSource(this._viewModel.getPossibleValues());
        combo._bind("change", () => {
            valueObservable(combo.getText());
        });

        this._disposalManager.addDisposable(
            valueObservable.subscribe((newValue: string) => {
            combo.setText(newValue, /* fireEvent */ false); 
        }));

        this._disposalManager.addDisposable(
            validationObservable.subscribe((result: IValidationResult) => {
            combo.setInvalid(!result.status);
            combo.getElement().attr("title", result.errorMessage || Utils_String.empty);
            combo.getInput().attr("title", result.errorMessage || Utils_String.empty);
        }));

        return combo;
    }
    
    private _viewModel: RetentionSettingsViewModel;
    private _templateId: string;
    private _durationSelectorForAutomatedResults: Combos.Combo;
    private _durationSelectorForManualResults: Combos.Combo;
    private _saveButton: JQuery;
    private _undoButton: JQuery;
    private _disposalManager: Utils_Core.DisposalManager;

    private static KeyCodeZ = 90;
}

export interface IValidationResult {
    status: boolean;
    errorMessage?: string;
}

export interface IDurationSettings {
    automatedDurationString: string;
    manualDurationString: string;
}

export class RetentionSettingsViewModel extends Adapters_Knockout.TemplateViewModel {

    // Represents the currently selected automated retention duration in the UI.
    public automatedRetentionDurationString: KnockoutObservable<string> = ko.observable(Resources.NeverDeleteSettingsText);

    // Represents the currently selected manual  retention duration in the UI.
    public manualRetentionDurationString: KnockoutObservable<string> = ko.observable(Resources.NeverDeleteSettingsText);

    public isAutomatedRetentionDurationValid: KnockoutComputed<IValidationResult>;

    public isManualRetentionDurationValid: KnockoutComputed<IValidationResult>;

    public isDirty: KnockoutComputed<boolean>;

    public canSave: KnockoutComputed<boolean>;

    public canUndo: KnockoutComputed<boolean>;

    constructor() {

        super();

        this._messageAreaViewModel = new MessageArea.MessageAreaViewModel();

        this.isAutomatedRetentionDurationValid = this.computed(() => {
            return this._validate(this.automatedRetentionDurationString());
        });

        this.isManualRetentionDurationValid = this.computed(() => {
            return this._validate(this.manualRetentionDurationString());
        });

        this.isDirty = this.computed(() => {
            let automatedDurationString = this._toString(this._savedAutomatedRetentionDuration());
            let manualDurationString = this._toString(this._savedManualRetentionDuration());

            return Utils_String.ignoreCaseComparer(this.automatedRetentionDurationString(), automatedDurationString) !== 0 ||
                   Utils_String.ignoreCaseComparer(this.manualRetentionDurationString(), manualDurationString) !== 0;
        });

        this.canSave = this.computed(() => {
            return this.isDirty() && this.isAutomatedRetentionDurationValid().status && this.isManualRetentionDurationValid().status;
        });

        // Added just for readability purpose. 
        this.canUndo = this.computed(() => {
            return this.isDirty();
        });

        this._isValid = this.computed(() => {
            let isManualRetentionValid = this._validate(this.manualRetentionDurationString());
            let isAutomatedRetentionValid = this._validate(this.automatedRetentionDurationString());
            if (isManualRetentionValid.status && isAutomatedRetentionValid.status) {
                this._messageAreaViewModel.clear();
                return true;
            }
            else {
                this._messageAreaViewModel.logError(Resources.RetentionDurationValidationText);
                return false;
            }
        });
    }

    public getPossibleValues(): string[] {
        return [
            Resources.TenDays,
            Resources.TwentyDays,
            Resources.ThirtyDays,
            Resources.SixtyDays,
            Resources.NinetyDays,
            Resources.OneEightyDays,
            Resources.ThreeSixtyFiveDays,
            Resources.NeverDeleteSettingsText
        ];
    }

    public getMessageViewModel(): MessageArea.MessageAreaViewModel {
        return this._messageAreaViewModel;
    }

    public getSavedDuration(): IPromise<IDurationSettings>{
        let deferred = q.defer<IDurationSettings>();
        let service = TMService.ServiceManager.instance().testResultsServiceLegacy();
        service.getResultRetentionSettings().then(
            (settings: Contracts.ResultRetentionSettings) => { 
                this._messageAreaViewModel.clear();
                this.automatedRetentionDurationString(this._toString(settings.automatedResultsRetentionDuration));
                this.manualRetentionDurationString(this._toString(settings.manualResultsRetentionDuration));

                this._savedAutomatedRetentionDuration(settings.automatedResultsRetentionDuration);
                this._savedManualRetentionDuration(settings.manualResultsRetentionDuration);

                deferred.resolve({
                    automatedDurationString: this.automatedRetentionDurationString(),
                    manualDurationString: this.manualRetentionDurationString()
                });
            },
            (error) => {
                this._messageAreaViewModel.logError(error);
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public save(): IPromise<any> {
        let deferred = q.defer();
        let service = TMService.ServiceManager.instance().testResultsServiceLegacy();
        let retentionSettings = this._getRetentionSettingsToSave();
        service.updateResultRetentionSettings(retentionSettings).then(
            (updatedRetentionSettings: Contracts.ResultRetentionSettings) => {
                this._messageAreaViewModel.clear();
                this._savedAutomatedRetentionDuration(updatedRetentionSettings.automatedResultsRetentionDuration);
                this._savedManualRetentionDuration(updatedRetentionSettings.manualResultsRetentionDuration);
                deferred.resolve({});
            },
            (error) => {
                this._messageAreaViewModel.logError(error);
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public undo() {
        this.automatedRetentionDurationString(this._toString(this._savedAutomatedRetentionDuration()));
        this.manualRetentionDurationString(this._toString(this._savedManualRetentionDuration()));
    }

    private _getRetentionSettingsToSave(): Contracts.ResultRetentionSettings {
        return {
            automatedResultsRetentionDuration: this._parse(this.automatedRetentionDurationString()),
            manualResultsRetentionDuration: this._parse(this.manualRetentionDurationString()),
            lastUpdatedBy: null,
            lastUpdatedDate: null
        };
    }

    private _toString(retentionDuration: number): string {
        if (retentionDuration === RetentionSettingsViewModel.NeverDeleteResults) {
            return Resources.NeverDeleteSettingsText;
        }
        else {
            return retentionDuration.toString();
        }
    }

    private _parse(retentionDurationString: string): number {

        if (isNaN(<any>retentionDurationString)) {
            // Treat any string as never delete results.
            return RetentionSettingsViewModel.NeverDeleteResults;
        }

        return parseInt(retentionDurationString);
    }

    private _validate(retentionDurationString: string): IValidationResult {
        if (Utils_String.localeIgnoreCaseComparer(retentionDurationString, Resources.NeverDeleteSettingsText) === 0) {
            return {
                status: true
            };
        }
        else {
            let retentionDuration = parseFloat(retentionDurationString);
            if (isNaN(<any>retentionDurationString) ||
                retentionDuration <= 0 ||
                retentionDuration > RetentionSettingsViewModel.MaxDurationInDays ||
                Math.round(retentionDuration) !== retentionDuration) { // Do not allow float values like 1.23 e.t.c

                return {
                    status: false,
                    errorMessage: Resources.RetentionDurationValidationText
                };
            }
        }

        return {
            status: true
        };
    }

    private _savedAutomatedRetentionDuration: KnockoutObservable<number> = ko.observable(RetentionSettingsViewModel.NeverDeleteResults);
    private _savedManualRetentionDuration: KnockoutObservable<number> = ko.observable(RetentionSettingsViewModel.NeverDeleteResults);
    private _messageAreaViewModel: MessageArea.MessageAreaViewModel;
    private _isValid: KnockoutComputed<boolean>;
    
    private static NeverDeleteResults = -1; 
    private static MaxDurationInDays = 10000;
}

Controls.Enhancement.registerEnhancement(AdminView, ".test-admin-view");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.Admin", exports);

