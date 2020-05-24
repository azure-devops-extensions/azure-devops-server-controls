import { WidgetConfigurationOptions } from 'Dashboards/Scripts/Contracts';
import * as Controls from 'VSS/Controls';
import * as SDK from 'VSS/SDK/Shim';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import { LookBackConfiguration } from 'Widgets/Scripts/LookBackConfiguration';
import { SettingsManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import MonteCarloSettingsManager from 'Widgets/Scripts/MonteCarloWidget/MonteCarloSettingsManager';
import { MonteCarloSettings } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloSettings';
import { MonteCarloToggleOptionsPanel } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloToggleOptionsPanel';
import { BurndownSettings } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import { BehaviorTiming } from 'Widgets/Scripts/ModernWidgetTypes/ConfigurationViewContracts';
import { Async } from "OfficeFabric/Utilities"
import { ValidatedCombo } from "Widgets/Scripts/Shared/ValidatedCombo"
import { MonteCarloConstants } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloConstants';
import * as StringUtils from "VSS/Utils/String";
import Telemetry = require("VSS/Telemetry/Services");


export class MonteCarloConfiguration extends LookBackConfiguration {

    private toggleOptionsPanel: MonteCarloToggleOptionsPanel;
    private numWorkItemsCombo: ValidatedCombo;

    constructor(options?: WidgetConfigurationOptions) {
        super(options);
        let async = new Async();
        this.debouncedPackSettingsAndReload = this.debouncedPackSettingsAndReload.bind(this);
        this.debouncedPackSettingsAndReload = async.debounce(this.debouncedPackSettingsAndReload, 300 /*debounce time*/, {leading: false});
    }

    protected getCalculatedWidgetTitle() {
        return WidgetResources.MonteCarloConfig_Name;
    }

    protected getSettingsManager(): SettingsManagerBase<BurndownSettings> {
        return new MonteCarloSettingsManager();
    }

    protected getLabelText(): string {
        return WidgetResources.TimePeriod_PlotByLabel;
    }

    protected isBurndown(): boolean {
        return false;
    }

    protected createOptionsBlock(settings: MonteCarloSettings): SettingsField<any> {
        let optionsFeaturesBlock = {
            onChange: () => {
                this.packSettingsAndRequestWidgetReload(BehaviorTiming.Immediate);
            },
            settings: settings
        }

        this.toggleOptionsPanel = MonteCarloToggleOptionsPanel.create(MonteCarloToggleOptionsPanel, this.getElement(), optionsFeaturesBlock);

        return SettingsField.createSettingsField({
            labelText: WidgetResources.BurndownWidget_AdvancedFeaturesHeader,
            control: this.toggleOptionsPanel,
            hasErrorField: true,
            layout: "advanced-features-block"
        },
            this.getElement());
    }

    /* Note: getSettings has duplicate unused code because the return type is BurndownSettings, 
     * and it was decided that it wasn't worth abstracting BurndownSettings since this code 
     * won't be reused due to an ongoing shift in how we create widgets */
    protected getSettings(): MonteCarloSettings {
        let optionsBlockSettings = this.toggleOptionsPanel.getSettings();
        let timePeriodSettings = this.timePeriodControl.getSettings();

        const includeBugs = this.shouldShowIncludeBugsCheckbox() && this.includeBugsCheckbox.getSettings();

        let fieldFilters = this.analyticsRichFilterBlock.getSettings();

        let settings: MonteCarloSettings = {
            teams: this.projectTeamPickerList.getSettings(),
            aggregation: null,
            completedWorkEnabled: false,
            fieldFilters: fieldFilters,
            stackByWorkItemTypeEnabled: false,
            burndownTrendlineEnabled: false,
            workItemTypeFilter: this.workItemFilterBlock.getSettings(),
            includeBugsForRequirementCategory: includeBugs,
            timePeriodConfiguration: timePeriodSettings,
            totalScopeTrendlineEnabled: false,
            isShowStatisticalProbabilitiesEnabled: optionsBlockSettings.isShowStatisticalProbabilitiesEnabled,
            numberOfWorkItems: this.numWorkItemsCombo.getText(),
            isUseDurationsCheckboxEnabled: optionsBlockSettings.isUseDurationsCheckboxEnabled,
        };

        return settings;
    }

    protected renderCustomConfiguration(settings: MonteCarloSettings): SettingsField<any> {
        let value = settings.numberOfWorkItems ? settings.numberOfWorkItems : "";

        let settingsField: SettingsField<any> = null;

        this.numWorkItemsCombo = Controls.Control.create(
            ValidatedCombo,
            null,
            {
                mode: "text",
                value: value,
                change: () => {
                    let errorMessage = this.getErrorMessage();
                    if (errorMessage) {
                        settingsField.showError(errorMessage);
                    } else {
                        settingsField.hideError();
                        this.debouncedPackSettingsAndReload();
                    }
                },
                label: value
            },
            {
                ariaAttributes: {
                    labelledby: Controls.getHtmlId()
                }
            }
        );

        settingsField = SettingsField.createSettingsField({
            labelText: WidgetResources.MonteCarloWidget_NumberOfWorkItemsLabel,
            control: this.numWorkItemsCombo,
            hasErrorField: true,
            layout: "advanced-features-block",
            collapseOnHide: true,
            toolTipText: WidgetResources.MonteCarloWidget_NumberOfWorkItemsDescriptionLabel
        },
            this.getElement());

        if (this.numWorkItemsCombo.getText() === "") {
            settingsField.showError(WidgetResources.MonteCarloWidget_NumberOfWorkItemsNumbersOnlyErrorMessage);
        }

        this.numWorkItemsCombo.validate = () => {
            return this.getErrorMessage();
        }

        return settingsField;
    }

    private debouncedPackSettingsAndReload() {
        this.packSettingsAndRequestWidgetReload(BehaviorTiming.Immediate);

    }

    private getErrorMessage(): string {
        let changedText = this.numWorkItemsCombo.getText();
        if (changedText.match(/[^0-9]/g) != null) { // input must be a number
            return WidgetResources.MonteCarloWidget_NumberOfWorkItemsNumbersOnlyErrorMessage;
        } else if (new Number(changedText).valueOf() > MonteCarloConstants.maxNumberOfWorkItemsToForecast) { // input must be less than the max allowed
            var measuredFeatureName = "TooManyWorkItemsToForecast";
            var properties: IDictionaryStringTo<any> =
                {
                    "NumWorkItems": this.numWorkItemsCombo.getText()
                };
            Telemetry.publishEvent(new Telemetry.TelemetryEventData("Monte Carlo Forecast", measuredFeatureName, properties));
            
            return StringUtils.format(WidgetResources.MonteCarloWidget_NumberOfWorkItemsNumberTooHighErrorMessage, MonteCarloConstants.maxNumberOfWorkItemsToForecast);
        } else if (new Number(changedText).valueOf() === 0) { // field is required
            return WidgetResources.MonteCarloWidget_NumberOfWorkItemsNumbersOnlyErrorMessage;
        } else {
            return null;
        }
    }
}



SDK.VSS.register("dashboards.monteCarloConfiguration", () => MonteCarloConfiguration);
SDK.registerContent("dashboards.monteCarloConfiguration-init", (context) => {
    let options : WidgetConfigurationOptions = context.options;
    return Controls.create(MonteCarloConfiguration, context.$container, options);
});
