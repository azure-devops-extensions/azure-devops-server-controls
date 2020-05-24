/// <reference types="jquery" />

import Q = require("q");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_BladeCommon = require("Dashboards/Scripts/BladeCommon");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import { ErrorMessageControl } from "Dashboards/Scripts/ErrorMessageControl";
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Control_WidgetConfigurationHost = require("Dashboards/Scripts/WidgetConfigurationHost");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import { SettingsField } from "Dashboards/Scripts/SettingsField";
import { SettingsUtilities } from "Dashboards/Scripts/SettingsUtilities";

import {IWidgetBladeContext, IBlade, IBladeOptions, IBladeActions} from  "Dashboards/Scripts/BladeContracts";
import {BladeLevelConstants} from "Dashboards/Scripts/BladeConstants";

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboards_WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Combos = require("VSS/Controls/Combos");
import Contribution_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Performance = require("VSS/Performance");

import WidgetSize = TFS_Dashboards_Contracts.WidgetSize;


export interface IGeneralSettingsControlOptions {
    settingsChangedCallback: (settings: Dashboard_Shared_Contracts.IGeneralSettings, suppressNameNotify: boolean) => void;
    displayErrorCallback: (error: string) => void;
    validStateChangeCallback: (valid: boolean) => void;
    settings: Dashboard_Shared_Contracts.IGeneralSettings;
    allowedSizes: TFS_Dashboards_Contracts.WidgetSize[];
    isNameConfigurable: boolean;
    widgetContributionId: string;
}

/**
 * UI control to display general widget settings
*/

export class GeneralSettingsControl extends Controls.Control<IGeneralSettingsControlOptions> implements Dashboard_Shared_Contracts.IConfigureWidgetName, Dashboard_Shared_Contracts.IConfigureWidgetSize {
    public static NameFieldId: string = "widget-general-configuration-name";
    public static SizeFieldCssClass: string = "widget-general-configuration-size";
    public static SizeFieldContainerCssClass: string = "widget-general-configuration-size-container";

    private settingsChangedCallback: (settings: Dashboard_Shared_Contracts.IGeneralSettings, suppressNameNotify: boolean) => void;
    private widgetNameSettingsField: SettingsField<Controls.Control<any>>;
    public _$widgetNameInput: JQuery;
    public _$widgetSizeFields: JQuery;
    public _widgetSizeDropDown: Combos.Combo;
    private validStateChangeCallback: (valid: boolean) => void;
    private settings: Dashboard_Shared_Contracts.IGeneralSettings;
    private isNameConfigurable: boolean;

    /**
     * This is used to determine the valid sizes for the current widget.
     */
    public _allowedSizes: TFS_Dashboards_Contracts.WidgetSize[];

    public constructor(options: IGeneralSettingsControlOptions) {
        super(options);
        this.settingsChangedCallback = options.settingsChangedCallback;
        this.validStateChangeCallback = options.validStateChangeCallback;
        this.settings = options.settings;
        this._allowedSizes = options.allowedSizes;
        this.isNameConfigurable = options.isNameConfigurable;
    }

    /**
     * 1) Validate
     * 2) Callback for preview
     * @param {boolean} suppressNameNotify - whether we should suppress notifying a live preview update for a name change.
     */
    public onWidgetSettingsChange(suppressNameNotify: boolean): void {
        var widgetName = this.getCurrentWidgetName();
        var widgetSize = (this._allowedSizes.length == 1) ? this._allowedSizes[0] : this._getWidgetSizeFromId(this._widgetSizeDropDown.getValue<string>());
        var valid = this.validate() == null;

        //Call back to the blade menu. Used mainly for the button to change the state of the save button.
        if (this.validStateChangeCallback) {
            this.validStateChangeCallback(valid);
        }

        this.settings = <Dashboard_Shared_Contracts.IGeneralSettings>{
            WidgetName: this.isNameConfigurable ? widgetName : this.settings.WidgetName,
            WidgetSize: widgetSize
        };

        //Only call the settings changed callback if the state if valid. This keeps parity with the latest changes in the SDK that the custom config
        // does not initiate a notify when settings are not valid.
        if (this.settingsChangedCallback && valid) {
            this.settingsChangedCallback(this.settings, suppressNameNotify);
        }
    }

    /**
     * Validate the widget name
     * @param widgetName  to validate
     * @returns {boolean} True if valid, False if not
     */
    public validateWidgetName(widgetName: string): boolean {
        if (!this.isNameConfigurable) {
            return true;
        }

        if (widgetName == null) {
            return false;
        }
        var widgetNameTrimmed = widgetName.trim();
        return widgetNameTrimmed.length > 0 && widgetNameTrimmed.length <= TFS_Dashboards_Constants.DashboardWidgetLimits.MaxWidgetNameLength;
    }

    /**
     * All validation for general configuration
     * @returns {string} Return a string with the error messageif and error; else null
     */
    public validate(): string {

        var isNameValid = this.validateWidgetName(this.getCurrentWidgetName());

        if (this.widgetNameSettingsField) {
            this.widgetNameSettingsField.toggleError(!isNameValid);
        }

        return isNameValid
            ? null
            : Utils_String.format(TFS_Dashboards_Resources.ErrorMessage_Configuration_NameWidget, 1, TFS_Dashboards_Constants.DashboardWidgetLimits.MaxWidgetNameLength);
    }

    /**
     * Set in the UI the widget general values into the general settings html controls
     */
    public initialize() {
        this._addWidgetNameControl();
        this._addWidgetSizeControl();
    }

    /**
     * Creates the Widget name control.
     * Developer Sanity note: Name is presented to user as "title".
     */
    public _addWidgetNameControl(): void {
        if (this.isNameConfigurable) {
            this._$widgetNameInput = $('<input>')
                .attr("type", "text")
                .attr("id", GeneralSettingsControl.NameFieldId)
                .attr("maxlength", TFS_Dashboards_Constants.DashboardWidgetLimits.MaxWidgetNameLength)
                .val(this.settings ? this.settings.WidgetName : "")
                .on("input", () => {
                    this.onWidgetSettingsChange(false);
                });

            this.widgetNameSettingsField = SettingsField.createSettingsFieldForJQueryElement({
                initialErrorMessage: Utils_String.format(TFS_Dashboards_Resources.ErrorMessage_Configuration_NameWidget, 1, TFS_Dashboards_Constants.DashboardWidgetLimits.MaxWidgetNameLength),
                labelText: TFS_Dashboards_Resources.BladeConfigurationWidgetName,
            }, this._$widgetNameInput);

            this.getElement().append(this.widgetNameSettingsField.getElement());
        }
    }

    public _addWidgetSizeControl(): void {
        if (this._allowedSizes) {
            // Filter out invalid sizes
            var validAllowedSizes = this._allowedSizes.filter(size => TFS_Dashboards_Common.WidgetSizeValidator.isValidWidgetSize(size));
            if (validAllowedSizes.length < this._allowedSizes.length) {
                Diag.logWarning(
                    Utils_String.format(`The maximum supported widget size is {0}x{1}. There are one or more unsupported widget sizes for the widget with ID: {2}.`,
                        TFS_Dashboards_Constants.DashboardWidgetLimits.MaxColumnSpan,
                        TFS_Dashboards_Constants.DashboardWidgetLimits.MaxRowSpan,
                        this._options.widgetContributionId));
            }

            // Because the blade is initialized on page load, allowedSizes is null in that case so we need to check for
            // that. In addition, we only need to show the resize option if a widget supports multiple sizes.
            if (validAllowedSizes.length > 1) {
                Utils_Array.sortIfNotSorted(validAllowedSizes, (ws1: WidgetSize, ws2: WidgetSize) => {
                    var result = ws1.columnSpan - ws2.columnSpan;
                    return result !== 0 ? result : ws1.rowSpan - ws2.rowSpan;
                });

                var sizes: string[] = [];
                validAllowedSizes.forEach((ws) => sizes.push(this.getLabelFromWidgetSize(ws)));

                var $widgetSizeContainer = $("<div>").addClass(GeneralSettingsControl.SizeFieldContainerCssClass);
                this._widgetSizeDropDown = <Combos.ComboO<Combos.IComboOptions>>Controls.Control.createIn<Combos.IComboOptions>(
                    Combos.Combo,
                    $widgetSizeContainer, {
                        change: () => {
                            this.onWidgetSettingsChange(false);
                        },
                        allowEdit: false
                    });

                this._widgetSizeDropDown.setSource(sizes);

                var targetIndex = $.inArray(this.getLabelFromWidgetSize(this.settings.WidgetSize), $.map(sizes, (item) => {
                    return item;
                }));

                this._widgetSizeDropDown.setSelectedIndex(targetIndex);

                this._$widgetSizeFields = SettingsField.createSettingsFieldForJQueryElement({
                    labelText: TFS_Dashboards_Resources.BladeConfigurationWidgetSize,
                    hasErrorField: true,
                    initialErrorMessage: TFS_Dashboards_Resources.InvalidWidgetSizeText
                }, $widgetSizeContainer).getElement();

                this.getElement().append(this._$widgetSizeFields);
            }
        }
    }

    /**
     * Converts id (e.g., 2x4) to the corresponding widget size. This is reversible via getIdFromWidgetSize().
     */
    public _getWidgetSizeFromId(dropDownValue: string): TFS_Dashboards_Contracts.WidgetSize {
        // Converts size string to array of numbers (i.e., "4x6" to [4, 6])
        var dimensions = dropDownValue
            .split("x")
            .map(s => +s);

        if (dimensions.length !== 2 || dimensions.some(isNaN)) {
            throw new Error("dropDownValue has invalid format");
        }

        return {
            columnSpan: dimensions[0],
            rowSpan: dimensions[1]
        };
    }

    public getCurrentWidgetName(): string {
        if (this.isNameConfigurable) {
            return this._$widgetNameInput.val();
        }
        else {
            return null;
        }
    }

    public getCurrentWidgetSize(): TFS_Dashboards_Contracts.WidgetSize {
        return this.settings.WidgetSize;
    }

    public setCurrentWidgetName(name: string): void {
        this._$widgetNameInput.val(name);

        // we suppress the name change notify in the case of live title as the corresponding change in the config would trigger a notification for reload.
        var suppressNameChangeNotify: boolean = true;
        this.onWidgetSettingsChange(suppressNameChangeNotify);
    }

    /**
     * Returns a human readable label for a widget size.
     */
    private getLabelFromWidgetSize(widgetSize: WidgetSize): string {
        return Utils_String.format(TFS_Dashboards_Resources.BladeConfigurationWidgetSizeLabel, widgetSize.columnSpan, widgetSize.rowSpan);
    }
}

export interface IBladeConfigurationOptions extends IBladeOptions {
    saveWidgetCallback: (bladeSource: IBlade<IBladeOptions>, widget: TFS_Dashboards_Contracts.Widget, generalSettingsControl: Dashboard_Shared_Contracts.ISettings) => IPromise<void>;
    onBladeClose: (closingBlade: IBlade<IBladeOptions>) => void;
    onSettingChanged: (settings: Dashboard_Shared_Contracts.ISettings) => IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus>;
    onSizeChanged: (settings: TFS_Dashboards_Contracts.WidgetSize) => void;
}

/**
 * This is the one concrete blade. This blade is unique and has it's own implementation.
 * This is the blade used to configure widgets.
 */
export class BladeConfiguration extends TFS_Dashboards_BladeCommon.Blade<IBladeConfigurationOptions>  {
    /**
     * Blade configuration is 2 because the catalog is 1. It means that the configuration will be in second position when
     * the catalog is open. However, if this one is open alone, we won't see the catalog.
     */
    public static BladeLevel: number = 2;
    private canSaveGeneralSettings: boolean;
    private canSaveCustomSettings: boolean;

    //When the configuration is changed it becomes dirty, except when configuration reverts to initial (default) state.
    public _isDirty: boolean;

    /**
     * The configuration is divided in 3 sub-containers. This is the general setting that are specified by the Dashboard Team.
     */
    public general: BladeConfigurationGeneralContainer;

    /**
    * The configuration is divided in 3 sub-containers. This is the setting defined by the widget's owner.
    */
    public custom: BladeConfigurationCustomContainer;

    /**
     * The last container is the button to save and cancel.
     */
    private buttons: TFS_Dashboards_BladeCommon.BladeButtons;

    /**
     * Save button (save and close)
     */
    private saveButton: TFS_Dashboards_BladeCommon.BladeButton;

    /**
     * Cancel button (close configuration blade)
     */
    private cancelButton: TFS_Dashboards_BladeCommon.BladeButton;

    /**
    * Generic Error control to be used in the blade
    */
    private errorControl: ErrorMessageControl;

    /***
    * The most recent refresh call, to chain any future refresh requests to.
    */
    public _recentWidgetStateDeferred: Q.Deferred<TFS_Dashboards_WidgetContracts.NotifyResult>;

    public _totalRequestForLivePreview: number = 0;

    /**
    * A flag to keep track if the latest widget refresh failed or not.
    */
    public _hasWidgetRefreshFailed: boolean = false;

    /**
    * keep state on the error from the latest refresh made to the preview. Since a user may make a number of requests in parallel, we want to make sure
    * that he sees the right message on save that maps to the last action he made.
    */
    public _latestErrorFromRefresh: TFS_Dashboards_WidgetContracts.ErrorMessage;

    /**
     * Action trigged when the save button of the configuration is clicked
     * @param {Widget} widget - Widget impacted by the new configuration to be saved
     * @param {ISettings} GeneralSettingsControl - All settings (changed and not)
     * @returns {IPromise<string>} Promise required to be able to close the configuration once saved. Resolves once the widget is saved.
     */
    public _saveWidgetCallback: (bladeSource: IBlade<IBladeOptions>, widget: TFS_Dashboards_Contracts.Widget, generalSettingsControl: Dashboard_Shared_Contracts.ISettings) => IPromise<void>;

    /**
    * Current settings retrieved from context on each change received from widgetconfigurationhost or general settings control
    */
    public _currentSettings: Dashboard_Shared_Contracts.ISettings = <Dashboard_Shared_Contracts.ISettings>{};

    /**
    * initial settings retrieved from context
    */
    public _initialSettings: Dashboard_Shared_Contracts.ISettings = <Dashboard_Shared_Contracts.ISettings>{};

    /*
     * save the initial widget size which is used to help decide whether we need to produce a telemetry
     */
    public initialSize: TFS_Dashboards_Contracts.WidgetSize;

    /**
     * This is passed on to the general settings control
     */
    public allowedSizes: TFS_Dashboards_Contracts.WidgetSize[];

    /**
     * Make sure we use the option of this concrete class, not the base class
     */
    private options: IBladeConfigurationOptions;

    private openConfigScenario: Performance.IScenarioDescriptor;

    private isConfirmationDialogOpen = false;

    private $configurationContainer: JQuery;

    public static WidgetWithWideWidth = [
        "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.BurndownWidget",
        "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.BurnupWidget",
        "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.AnalyticsTrendsWidget",
        "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.MonteCarloWidget",
        "ms.vss-test-web.Microsoft.VisualStudioTeamServices.TestManagement.AnalyticsTestTrendWidget",
    ];

    public static WideWidthInPx = 565;

    /**
     * Build the configuration by setting the saving callback and the widget context
     * @param {IBladeConfigurationOptions} options - Blade option with mandatory field like the widget context
     */
    public constructor(options: IBladeConfigurationOptions) {
        super(<IBladeOptions>{
            level: BladeConfiguration.BladeLevel,
            heading: options.heading,
            onWidgetContextChange: options.onWidgetContextChange,
            onBladeClose: options.onBladeClose,
            withCurtain: options.withCurtain
        });
        this.options = options;
        //Setup the context change behavior to re-render
        this._options.onWidgetContextChange = (context) => {
            // Deep-cloning settings to disconnect them from actual widget, e.g. in case user cancels configuration
            this._currentSettings = $.extend(true, {}, {
                generalSettings: {
                    WidgetName: context.getWidget().name,
                    WidgetSize: context.getWidget().size
                },
                customSettings: {
                    data: context.getWidget().settings,
                    version: context.getWidget().settingsVersion
                }
            });
            this._initialSettings = $.extend(true, {}, this._currentSettings);
            this.initialSize = this._currentSettings.generalSettings.WidgetSize;

            this.allowedSizes = context.getWidget().allowedSizes;
            this.render();
        }
        this._saveWidgetCallback = options.saveWidgetCallback;
    }

    /**
     * Called by the framework. Render the UI.
     */
    public initialize(): void {
        super.initialize();

        this.canSaveGeneralSettings = null;
        this.canSaveCustomSettings = null;
    }

    /**
    * Width provided by an individual blade that the blade menu will use to animate in the blade in the view during editing.
    * @override
    */
    public getMenuWidth(context?: IWidgetBladeContext): number {
        if (context) {
            const widgetContributionId = context.getWidget().contributionId;
            const configurationNeedsWideWidth = BladeConfiguration.WidgetWithWideWidth.some((value: string) => { return widgetContributionId === value; });
            if (configurationNeedsWideWidth) {
                return BladeConfiguration.WideWidthInPx;
            }
        }

        return super.getMenuWidth();
    }

    /**
    * Creates confirmation dialog if configuration is in a dirty state
    * @returns IPromise<true> if the config isn't dirty or the user clicks "ok" on the confirmation dialog; IPromise<false> if it's dirty or user clicked false
    */
    public canBeClosed(): IPromise<boolean> {
        var defer: Q.Deferred<any> = Q.defer<any>();

        if (!this._isDirty) {
            defer.resolve(true);
        }

        else if (this.isConfirmationDialogOpen) {
            defer.resolve(false);
        }

        else {
            this.isConfirmationDialogOpen = true;
            Dialogs.showMessageDialog(TFS_Dashboards_Resources.ConfirmCancelDialogText).then(() => {
                // user pressed Ok, which means the dirty state should be reset.
                this._isDirty = false;
                defer.resolve(true);
            }, () => {
                // user pressed Cancel, which means he wants to go back to the blade.
                defer.resolve(false);
            }).finally(() => { this.isConfirmationDialogOpen = false; });
        }

        return defer.promise;
    }

    /**
     * Generate the configuration containers (general + custom) and the buttons
     */
    private render(): void {
        // Initialize isn't called again on subsequent times config is opened, so we have to reset state here
        this._isDirty = false;

        this.openConfigScenario = Performance.getScenarioManager().startScenario(
            TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area, TFS_Dashboards_Telemetry.DashboardScenarios.ConfigOpen);

        this._$bladeContainerElement.empty();
        this.renderTitle();
        this.$configurationContainer = $('<div>')
            .addClass('main-blade-container')
            .attr('id', "configuration-containers");

        this.renderGenericErrorControl(this.$configurationContainer);
        this.renderGeneralConfiguration(this.$configurationContainer);
        this._renderCustomConfiguration(this.$configurationContainer);

        this.$configurationContainer.appendTo(this._$bladeContainerElement);

        this.saveButton = new TFS_Dashboards_BladeCommon.BladeButton(
            TFS_Dashboards_Resources.SaveConfiguration,
            TFS_Dashboards_BladeCommon.BladeButtons.ActionSave,
            () => {
                this.validateAndSave(!this._isComeFromCatalog());
            },
            null,
            true);

        this.cancelButton = new TFS_Dashboards_BladeCommon.BladeButton(
            TFS_Dashboards_Resources.CloseConfiguration,
            TFS_Dashboards_BladeCommon.BladeButtons.ActionCancel,
            () => {
                this._cancel(!this._isComeFromCatalog());
            },
            (eventObject: JQueryKeyEventObject) => {
                this.lastButtonHandler(eventObject);
            });

        this.buttons = new TFS_Dashboards_BladeCommon.BladeButtons([
            this.saveButton,
            this.cancelButton
        ]);

        this.buttons.render().appendTo(this._$bladeContainerElement);

        // Must be called after buttons.render()
        this.saveButton.setEnabled(this._isComeFromCatalog() || this._isDirty);
    }

    /**
     * Finds the first element in Blade container that can receive focus and sets the focus
     * @returns {boolean} : TRUE if successfully triggered focus on an element else FALSE
     */
    public setFocus(): boolean {
        this.$configurationContainer.scrollTop(0);
        return this.focusOnFirstElement();
    }

    /**
     * Helper to tell if the configuration come from the catalog or from the grid directly (made public for UT)
     * @returns {boolean} : True if configued from the catalog; False otherwise
     */
    public _isComeFromCatalog(): boolean {
        return this.bladeComeFrom != null && this.bladeComeFrom.getLevel() === 1;
    }

    /**
    * Render the generic error control above the general configuration but inside the configuration container
    * @param {JQuery} $configurationContainer - Container for all configurations
    */
    private renderGenericErrorControl($configurationContainer: JQuery): void {
        this.errorControl = <ErrorMessageControl>Controls.BaseControl.createIn(ErrorMessageControl, $configurationContainer, {});
        this.errorControl.getElement().addClass("main-error-on-config-blade");
    }

    /**
     * General configuration must be above the custom configuration. They are grouped inside a configurationcontainer
     * because we want all configurations to be under the same scrollbar.
     * @param {JQuery} $configurationContainer - Container for all configurations
     */
    private renderGeneralConfiguration($configurationContainer: JQuery): void {
        this.general = new BladeConfigurationGeneralContainer();
        this.general.render(
            this._widgetBladeContext
            , (settings, suppressNameNotify) => { this._onGeneralConfigurationChangeCallback(settings, suppressNameNotify); }
            , (s) => { this.setGeneralSettingsReadiness(s); }
            , this._currentSettings.generalSettings
            , this.allowedSizes
            , this._widgetBladeContext.getWidget().contributionId)
            .appendTo($configurationContainer);
    }

    /**
    * Custom configuration must be below the general configuration. They are grouped inside a configurationcontainer
    * because we want all configurations to be under the same scrollbar.
    * @param {JQuery} $configurationContainer - Container for all configurations
    */
    public _renderCustomConfiguration($configurationContainer: JQuery): void {
        // Only render custom configuration section if there's a custom configuration contribution available
        if (this.isCustomConfigurationAvailable()) {
            this.custom = new BladeConfigurationCustomContainer();
            this.custom.render(
                this._widgetBladeContext
                , (s, r) => { this._onCustomConfigurationChangeCallback(s, r); }
                , (e) => { this._onConfigurationErrorCallback(e); }
                , this._currentSettings.customSettings
                , this.general //For rename support
                , this.general // For resize support
            )
                .appendTo($configurationContainer);

            // if host setup fails, display error on the generic error panel (this can happen if the load fails for the control rendering)
            // otherwise establish a communication channel wtih the preview host for data transfer.
            this.custom.setupHost().then(() => {
                if (this.openConfigScenario) {
                    this.openConfigScenario.end();
                }
            }, (error: TFS_Dashboards_WidgetContracts.ErrorMessage) => {
                this.displayError(error.message, error.isUserVisible, error.isRichText);
                if (this.openConfigScenario) {
                    this.openConfigScenario.abort();
                }
            });
        }
    }

    /**
     * Configuration changed, we need to refresh the preview windows
     * @param {TFS_Dashboards_WidgetContracts.CustomSettings} customSettings - Serialized widget settings from the custom section(all of them, modified and unmodified)
     */
    public _onCustomConfigurationChangeCallback(
        customSettings: TFS_Dashboards_WidgetContracts.CustomSettings,
        widgetStateRequest: Q.Deferred<TFS_Dashboards_WidgetContracts.NotifyResult>): void {

        if (this._widgetBladeContext == null) {
            throw new Error(TFS_Dashboards_Resources.WidgetConfiguration_ContextError);
        }

        // Bypass rendering of widget if config is unmodified, so un-optimized widgets don't need to reload if requested change is identical to current state.
        if (!SettingsUtilities.isCustomSettingsUnchanged(this._currentSettings.customSettings, customSettings) || this.configDependsOnPreview()) {
            this._currentSettings.customSettings = customSettings;
            // Replacing current promise with new one - old one will execute, but results don't return
            this._recentWidgetStateDeferred = widgetStateRequest;
            this._setDirtyStateAndUpdatePreview(!SettingsUtilities.isCustomSettingsUnchanged(this._initialSettings.customSettings, customSettings));
        }

    }

    public _onConfigurationErrorCallback(error: string): void {
        this.displayError(error);
    }

    /**
     * Configuration changed, we need to refresh the preview windows
     * @param {string} settings - Widget settings (all of them, modified and unmodified)
     * @param {boolean} suppressNameNotify - Suppress updating the live preview for a name change if a request is made not to.
     */
    public _onGeneralConfigurationChangeCallback(settings: Dashboard_Shared_Contracts.IGeneralSettings, suppressNameNotify: boolean): void {
        if (this._widgetBladeContext == null) {
            throw new Error(TFS_Dashboards_Resources.WidgetConfiguration_ContextError);
        }

        if (!SettingsUtilities.areGeneralSettingsEqual(this._currentSettings.generalSettings, settings)) {
            this._currentSettings.generalSettings = settings;

            // we allow size changes to pass through but we ensure that the callback source did not want to suppress updating preview for name change.
            this.options.onSizeChanged(settings.WidgetSize);

            // send notification to widget configuration that general settings changed
            if (this.isCustomConfigurationAvailable()) {
                this.custom.sendNotification(TFS_Dashboards_WidgetHelpers.WidgetEvent.GeneralSettingsChanged, TFS_Dashboards_WidgetHelpers.WidgetEvent.Args(this._currentSettings.generalSettings));
            }

            if (!suppressNameNotify) {
                this._setDirtyStateAndUpdatePreview(!SettingsUtilities.areGeneralSettingsEqual(this._initialSettings.generalSettings, settings));
            }
        }
    }

    public _setDirtyStateAndUpdatePreview(isDirty: boolean = true): void {
        // Set isDirty state and update buttons
        this._isDirty = isDirty;
        this.updateButtons();

        var currentRequestId = ++this._totalRequestForLivePreview;

        this.options.onSettingChanged(this._currentSettings)
            .then((widgetStatus: TFS_Dashboards_WidgetContracts.WidgetStatus) => {
                this._updatePreview(widgetStatus, currentRequestId);
                // Hide the generic error control after we are certain
                if (this.errorControl) {
                    this.errorControl.hideElement();
                }
            },
            (errorMessage: TFS_Dashboards_WidgetContracts.ErrorMessage) => {
                this._trackFailureAndDisplay(errorMessage, currentRequestId);
            });
    }

    /**
     * Track whether the latest refresh request failed, if it does store the error and display to the user.
     * @param errorMessage error object to save.
     * @param updateRequestId a tracking counter for the refresh request that threw the error.
     */
    public _trackFailureAndDisplay(errorMessage: TFS_Dashboards_WidgetContracts.ErrorMessage, updateRequestId: number): void {
        if (this._recentWidgetStateDeferred && updateRequestId === this._totalRequestForLivePreview) {
            this.storeLatestRefreshFailureState(errorMessage);
            this.displayError(errorMessage.message, errorMessage.isUserVisible, errorMessage.isRichText);
        }
        else {
            // we ignore failures from previous refreshes. The expectation is that the newest refresh would retrigger the preview loading
            // so the user has visual cue that the latest refresh is being processed.
        }
    }

    /**
     * Update the preview widget
     * @param widgetStatus - the widget status for updateing the preview
     * @param updateRequestId- the request id to match the preview request
     */
    public _updatePreview(widgetStatus: TFS_Dashboards_WidgetContracts.WidgetStatus, updateRequestId: number): void {
        if (this._recentWidgetStateDeferred) {
            // if the refresh is for the current update request.
            if (updateRequestId === this._totalRequestForLivePreview) {
                this.clearLatestRefreshFailureState();
                this._recentWidgetStateDeferred.resolve(
                    {
                        getResponse: () => {
                            // in case the widget configuration behaves badly in returning its status, we return the state as null to the widget. The widget should be proofing for its configuration being in a bad state, which outside of
                            // badly written code, shouldn't happen.
                            return Q.resolve(widgetStatus ? widgetStatus.state : null);
                        }
                    });
            }
            else {
                // if it is not, we do nothing as we do not want to pass stale data to the config and will wait for the
                // correct promise to be resolved.
            }
        }
    }

    /**
     *  Checks if Widget Configuration experience depends on shared data sourced from View
     *
     * Importance: Preview should not be auto-skipped on configuration which rely on view state.
     * At least not without allowing an initial "priming" cycle.
     **/
    private configDependsOnPreview(): boolean {
        let widgetId = this._widgetBladeContext.getWidget();
        return widgetId.typeId === "Microsoft.VisualStudioOnline.Dashboards.WitChartWidget" ||
            widgetId.typeId === "Microsoft.VisualStudioOnline.Dashboards.TcmChartWidget";
    }

    /**
  * Keep track of the error from the latest refresh in local state.
  * @param errorMessage error object
  */
    private storeLatestRefreshFailureState(errorMessage: TFS_Dashboards_WidgetContracts.ErrorMessage): void {
        this._hasWidgetRefreshFailed = true;
        this._latestErrorFromRefresh = errorMessage;
    }

    /**
     * Clear any local state on refresh errors.
     */
    private clearLatestRefreshFailureState(): void {
        this._hasWidgetRefreshFailed = false;
        this._latestErrorFromRefresh = null;
    }

    /**
       * Show the generic error control with the given error message
       * @param errorMessage message representing the error.
       * @param isUserVisible indicates whether the message can be shown to the user or not.
       * @param isRichText indicates whether the message is trusted rich text (can contain html)
       */
    public displayError(errorMessage: string, isUserVisible: boolean = true, isRichText: boolean = false): void {
        Service.getService(Contribution_Services.ExtensionService).getContribution(
            this._widgetBladeContext.getWidget().contributionId).
            then((contribution: IExtensionContribution) => {

                if (isUserVisible) {
                    var richText: boolean = isRichText;
                    if (!Contribution_Services.ExtensionHelper.hasInternalContent(contribution)) {
                        richText = false;
                    }

                    this.errorControl.setErrorMessage(errorMessage, richText);
                }

                else {
                    Diag.logError(errorMessage);

                    TFS_Dashboards_Common.GalleryHelper.getExtensionMessage(contribution).then((message: string) => {
                        this.errorControl.setErrorMessage(message, true /* This message is trusted for html presentation*/);
                    });
                }

            });
        this.errorControl.showElement();
    }

    /**
     * Business logic validation state is changing. Need to notify the save button to change its state.
     * @param {boolean} valid - True if no error; False if error
     */
    private setGeneralSettingsReadiness(valid: boolean): void {
        this.canSaveGeneralSettings = valid;

        this.updateButtons();
    }

    private toggleBusyOverlay(isBusy: boolean): void {
        if (isBusy) {
            this.showBusyOverlay();
        }
        else {
            this.hideBusyOverlay();
        }
    }

    private toggleBusyWithSave(isBusyWithSave: boolean): void {
        this.saveButton.setEnabled(!isBusyWithSave);
        this.saveButton.setCaption(isBusyWithSave ?
            TFS_Dashboards_Resources.SavingConfiguration :
            TFS_Dashboards_Resources.SaveConfiguration);
        this.toggleBusyOverlay(isBusyWithSave);
    }

    /** Changes state of the buttons in relation to current state of general AND custom data. */
    public updateButtons() {
        if (this._isDirty) {
            this.cancelButton.setCaption(TFS_Dashboards_Resources.CancelConfiguration);
        }
        else {
            this.cancelButton.setCaption(TFS_Dashboards_Resources.CloseConfiguration);
        }

        this.saveButton.setEnabled(this._isDirty);
    }

    /**
     * Validate both general and custom settings and Save configuration
     * @param {boolean} isClosingBlades - Close all blade or not
     */
    public validateAndSave(isClosingBlades: boolean): void {
        if (this._widgetBladeContext == null) {
            throw new Error(TFS_Dashboards_Resources.WidgetConfiguration_ContextError);
        }

        if (this.errorControl) {
            this.errorControl.hideElement();
        }

        var generalConfigurationValidationMessage = this.general.validate();
        if (generalConfigurationValidationMessage != null) {
            this.displayError(TFS_Dashboards_Resources.ValidationErrorOnConfigurationSave);
            return;
        }

        if (this.isCustomConfigurationAvailable()) {
            if (!this._hasWidgetRefreshFailed) {
                this.custom.validateAndGetSettings().then((customSettings: TFS_Dashboards_WidgetContracts.CustomSettings) => {
                    this._currentSettings.customSettings = customSettings;
                    this.save(isClosingBlades);
                }, (error: TFS_Dashboards_WidgetContracts.ErrorMessage) => {
                    this.displayError(error.message, error.isUserVisible, error.isRichText);
                });
            }
            else {
                this.displayError(this._latestErrorFromRefresh.message, this._latestErrorFromRefresh.isUserVisible, this._latestErrorFromRefresh.isRichText);
            }
        } else {
            this.save(isClosingBlades);
        }
    }

    /**
     * Save configuration
     * @param isClosingBlades Indicate if blades must be closed or not
     */
    public save(isClosingBlades: boolean): void {
        this.applyChangesAndSave(isClosingBlades);
        this.addWidgetResizeTelemetry();
    }

    /*
     * Add widget resize telemetry
     */
    public addWidgetResizeTelemetry(): void {
        var currentSize: TFS_Dashboards_Contracts.WidgetSize = this._currentSettings.generalSettings.WidgetSize;
        if (this.allowedSizes && this.allowedSizes.length > 1 && (this.initialSize.columnSpan != currentSize.columnSpan || this.initialSize.rowSpan != currentSize.rowSpan)) {
            var widget = this._widgetBladeContext.getWidget();
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onWidgetResize(
                widget.contributionId,
                widget.id,
                currentSize,
                this.initialSize);
        }
    }

    /**
     * Indicate if custom configuration exist
     * @returns {boolean} : True if custom validation is present; False if only general configuration is present
     */
    public isCustomConfigurationAvailable(): boolean {
        return this._widgetBladeContext != null &&
            this._widgetBladeContext.getWidget() != null &&
            this._widgetBladeContext.getWidget().configurationContributionId != null;
    }

    public IsSaveEnabled(): boolean {
        return this.saveButton.isEnabled();
    }

    private getSaveWidgetConfigurationScenario(): Performance.IScenarioDescriptor {
        return Performance.getScenarioManager().startScenario(
            TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area,
            TFS_Dashboards_Telemetry.DashboardScenarios.SaveWidgetConfiguration);
    }

    /**
     * Apply changes to the widget in the blade context
     * @param {boolean} isClosingBlades - Indicate if blades must be closed or not
     */
    public applyChangesAndSave(isClosingBlades: boolean): void {
        if (this._widgetBladeContext == null) {
            throw new Error(TFS_Dashboards_Resources.WidgetConfiguration_ContextError);
        }
        var widget = this._widgetBladeContext.getWidget();

        var settingsError: string = this._applySettings(widget);

        // Calling the save that is implemented in containing view
        if (!settingsError) {
            // is the save button is disabled nothing needs to be done here.
            if (this.IsSaveEnabled()) {
                // once clicked disable the button and update text to indicate in progress
                // save.
                this.toggleBusyWithSave(true);

                let saveWidgetConfigurationScenario = this.getSaveWidgetConfigurationScenario();
                saveWidgetConfigurationScenario.addData({ widgetContributionId: widget.contributionId });

                Q.all([this._saveWidgetCallback(this, widget, this._currentSettings)])
                    .then(() => {
                        if (this.isCustomConfigurationAvailable()) {
                            this.custom.onConfigurationSave();
                        }

                        this._isDirty = false;
                        this.updateButtons();
                        this._onClosingBlades(isClosingBlades);
                        saveWidgetConfigurationScenario.end();
                    }, (error) => {
                        this.displayError(Utils_String.format(TFS_Dashboards_Resources.BladeMenu_ServerSaveFail, error));
                        saveWidgetConfigurationScenario.abort();
                    }).finally(() => {
                        this.toggleBusyWithSave(false);
                    });
            }
        }
        else {
            this.displayError(settingsError, false);
        }
    }

    /**
     * Apply settings from the configuration to the widget for it to be ready to save. If unable to apply, an error message is returned.
     * @param widget the widget which is being previewed.
     * @returns a string representing an error which is null if there is none.
     */
    public _applySettings(widget: TFS_Dashboards_Contracts.Widget): string {
        var settingsError: string = null;

        if (this._currentSettings) {
            if (this._currentSettings.generalSettings) {
                widget.name = this._currentSettings.generalSettings.WidgetName;
                widget.size = this._currentSettings.generalSettings.WidgetSize;
            }

            if (this._currentSettings.customSettings) {
                widget.settings = this._currentSettings.customSettings.data;
                var versionError = this._settingVersionHasErrors(widget.settingsVersion, this._currentSettings.customSettings.version);
                if (!versionError) {
                    widget.settingsVersion = this._currentSettings.customSettings.version;
                }
                else {
                    settingsError = versionError;
                }
            }
        }

        return settingsError;
    }

    /**
     * verify that the settings version is valid, and if not return an error for why it is not.
     * @param widgetVersion the version for the widget which is being previewed.
     * @param customSettingsVesion the version for the current custom settings from the config blade.
     * @returns a string representing an error which is null if there is none.
     */
    public _settingVersionHasErrors(
        widgetVersion: TFS_Dashboards_Contracts.SemanticVersion,
        customVersion: TFS_Dashboards_Contracts.SemanticVersion): string {
        var error: string = null;

        var versionForWidget: TFS_Dashboards_Contracts.SemanticVersion = widgetVersion || TFS_Dashboards_Common.SemanticVersionExtension.getInitialVersion();

        if (customVersion) {
            if (!TFS_Dashboards_Common.SemanticVersionExtension.verifyVersionValid(customVersion)) {
                error = Utils_String.format(
                    TFS_Dashboards_Resources.ErrorWidgetSettingsVersionInvalid,
                    TFS_Dashboards_Common.SemanticVersionExtension.versionToString(customVersion));
            }

            else if (!TFS_Dashboards_Common.SemanticVersionExtension.verifyVersionForward(versionForWidget, customVersion)) {
                error = Utils_String.format(
                    TFS_Dashboards_Resources.ErrorWidgetSettingsVersionDowngrade,
                    TFS_Dashboards_Common.SemanticVersionExtension.versionToString(customVersion),
                    TFS_Dashboards_Common.SemanticVersionExtension.versionToString(versionForWidget)
                );
            }

        }

        return error;
    }

    public _onClosingBlades(isClosingBlades: boolean): void {
        if (isClosingBlades) {
            this._bladeMenuActions.requestCloseBlades().then(() => {
                this._options.onBladeClose(this);
            });
        } else {
            this._bladeMenuActions.requestOpenBlade(BladeLevelConstants.CatalogBladeLevel, this);
            this._options.onBladeClose(this);
        }
    }

    /**
     * Cancel the configuration
     * @param {boolean} isClosingBlades - Indicate if blades must be closed or not
     */
    public _cancel(isClosingBlades: boolean): void {
        if (isClosingBlades) {
            this._bladeMenuActions.requestCloseBlades().then(() => {
                this._options.onBladeClose(this);
            }, () => {
                // no-op if closing is rejected, i.e. user clicked "cancel" on confirmation dialog for dirty state
            });
        } else {
            this._bladeMenuActions.requestOpenBlade(BladeLevelConstants.CatalogBladeLevel, this);
            this._options.onBladeClose(this);
        }
    }
}

/**
 * General configuration is the shared setting that every widget can have even if third party one.
 */
export class BladeConfigurationGeneralContainer implements Dashboard_Shared_Contracts.IConfigureWidgetName, Dashboard_Shared_Contracts.IConfigureWidgetSize {
    private control: GeneralSettingsControl;

    public render(widgetContext: IWidgetBladeContext,
        onConfigurationChangeCallback: (settings: Dashboard_Shared_Contracts.IGeneralSettings, suppressNameNotify: boolean) => void,
        validStateChangeCallback: (state: boolean) => void,
        settings: Dashboard_Shared_Contracts.IGeneralSettings,
        allowedSizes: TFS_Dashboards_Contracts.WidgetSize[],
        widgetContributionId: string
    ): JQuery {

        var container = $('<div>')
            .addClass('blade-container')
            .attr('id', 'blade-configuration-general');

        this.control = <GeneralSettingsControl>
        Controls.Control.createIn<IGeneralSettingsControlOptions>(
            GeneralSettingsControl,
            container, {
                settingsChangedCallback: onConfigurationChangeCallback,
                validStateChangeCallback: validStateChangeCallback,
                settings: settings,
                allowedSizes: allowedSizes,
                isNameConfigurable:
                (widgetContext && widgetContext.getWidget()) ?
                    widgetContext.getWidget().isNameConfigurable : false,
                displayErrorCallback: null,
                widgetContributionId: widgetContributionId
            }
        );

        return container;
    }

    /**
     * Explicitly start the validation for the general configuration
     * @returns {string} The error message. Null if no error.
     */
    public validate(): string {
        return this.control.validate();
    }

    public getCurrentWidgetName(): string {
        return this.control.getCurrentWidgetName();
    }

    public setCurrentWidgetName(name: string): void {
        this.control.setCurrentWidgetName(name);
    }

    public getCurrentWidgetSize(): TFS_Dashboards_Contracts.WidgetSize {
        return this.control.getCurrentWidgetSize();
    }

}

/**
 * Custom Configuration Container used by the BladeMenu
 */
export class BladeConfigurationCustomContainer {

    /**
     * Configuration host. Come from the CreateIn
     */
    private host: TFS_Dashboards_Control_WidgetConfigurationHost.WidgetConfigurationHost;

    public render(
        widgetContext: IWidgetBladeContext,
        onConfigurationChangeCallback: (customSettings: TFS_Dashboards_WidgetContracts.CustomSettings, widgetStateRequest: Q.Deferred<TFS_Dashboards_WidgetContracts.NotifyResult>) => void,
        onConfigurationErrorCallback: (errorMessage: string) => void,
        customSettings: TFS_Dashboards_WidgetContracts.CustomSettings,
        nameHandler: Dashboard_Shared_Contracts.IConfigureWidgetName,
        sizeHandler: Dashboard_Shared_Contracts.IConfigureWidgetSize
    ): JQuery {
        var container = $('<div>')
            .addClass('blade-container')
            .attr('id', 'blade-configuration-custom');

        if (widgetContext) {
            this.host = <TFS_Dashboards_Control_WidgetConfigurationHost.WidgetConfigurationHost>
            Controls.Control.createIn<TFS_Dashboards_Control_WidgetConfigurationHost.WidgetConfigurationHostOptions>
                (
                TFS_Dashboards_Control_WidgetConfigurationHost.WidgetConfigurationHost,
                container,
                <TFS_Dashboards_Control_WidgetConfigurationHost.WidgetConfigurationHostOptions>{
                    widget: widgetContext.getWidget(),
                    currentSettings: {
                        name: widgetContext.getWidget().name,
                        size: widgetContext.getWidget().size,
                        customSettings: customSettings
                    },
                    onConfigurationChangeCallback: onConfigurationChangeCallback,
                    onConfigurationErrorCallback : onConfigurationErrorCallback,
                    getCurrentWidgetName: () => { return nameHandler.getCurrentWidgetName(); },
                    setCurrentWidgetName: (name: string) => { nameHandler.setCurrentWidgetName(name); },
                    getCurrentWidgetSize: () => { return sizeHandler.getCurrentWidgetSize(); }
                }
                );
        }

        return container;
    }

    public setupHost(): IPromise<string> {
        Diag.Debug.assertIsNotNull(this.host, "call the render method before calling setupHost");
        return this.host.createHost();
    }

    /**
     * Get the custom settings from the host
     * @returns custom settings wrapped in a promise
     */
    public validateAndGetSettings(): IPromise<TFS_Dashboards_WidgetContracts.CustomSettings> {
        return this.host.validateAndGetSettings();
    }

    /**
     * Calls the callback for onConfigurationSave if set
     */
    public onConfigurationSave(): void {
        this.host.onConfigurationSave();
    }

    /**
     * Send notification to a listen method in the widget configuration
     * @param event event type string
     * @param eventArgs data to send
     */

    public sendNotification(event: string, eventArgs: TFS_Dashboards_WidgetContracts.EventArgs<any>): void {
        this.host.sendNotification(event, eventArgs);
    }

}
