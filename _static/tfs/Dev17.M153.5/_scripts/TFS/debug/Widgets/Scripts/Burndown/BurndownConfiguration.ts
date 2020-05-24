import { WidgetConfigurationOptions } from 'Dashboards/Scripts/Contracts';
import * as Controls from 'VSS/Controls';
import * as SDK from 'VSS/SDK/Shim';
import { BurnDirection } from 'Widgets/Scripts/Burndown/BurnDirection';
import { BurndownSettings } from 'Widgets/Scripts/Burndown/BurndownSettings';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import { LookBackConfiguration } from 'Widgets/Scripts/LookBackConfiguration';
import { SettingsManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import BurndownSettingsManager from 'Widgets/Scripts/Burndown/BurndownSettingsManager';
import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import { BurndownToggleOptionsPanel, BurndownToggleOptionsPanelOptions } from 'Widgets/Scripts/Burndown/BurndownToggleOptionsPanel';
import { BehaviorTiming } from 'Widgets/Scripts/ModernWidgetTypes/ConfigurationViewContracts';

export class BurndownConfiguration extends LookBackConfiguration {

    private toggleOptionsPanel: BurndownToggleOptionsPanel;
    
    protected getCalculatedWidgetTitle() {
        return WidgetResources.Burndown_DefaultWidgetName;
    }

    protected isBurndown(): boolean {
        return true;
    }

    protected getSettingsManager(): SettingsManagerBase<BurndownSettings> {
        return new BurndownSettingsManager();
    }

    protected getLabelText(): string {
        return (this.getBurnDirection() === BurnDirection.Down) ?
        WidgetResources.TimePeriod_PlotBurndownByLabel :
        WidgetResources.TimePeriod_PlotBurnupByLabel
    }

    /** Recommended pattern for checking if this config is in burndown or burn-up mode. */
    protected getBurnDirection(): BurnDirection {
        return BurnDirection.Down;
    }

    protected getSettings(): BurndownSettings {
        let optionsBlockSettings = this.toggleOptionsPanel.getSettings();
        let timePeriodSettings = this.timePeriodControl.getSettings();

        const includeBugs = this.shouldShowIncludeBugsCheckbox() && this.includeBugsCheckbox.getSettings();

        let fieldFilters = this.analyticsRichFilterBlock.getSettings();

        let settings: BurndownSettings = {
            teams: this.projectTeamPickerList.getSettings(),
            aggregation: this.aggregationBlock.control.getSettings(),
            completedWorkEnabled: optionsBlockSettings.isCompletedWorkEnabled,
            fieldFilters: fieldFilters,
            stackByWorkItemTypeEnabled: optionsBlockSettings.IsStackByWorkItemTypeEnabled,
            burndownTrendlineEnabled: optionsBlockSettings.isBurndownTrendlineEnabled,
            workItemTypeFilter: this.workItemFilterBlock.getSettings(),
            includeBugsForRequirementCategory: includeBugs,
            timePeriodConfiguration: timePeriodSettings,
            totalScopeTrendlineEnabled: optionsBlockSettings.isScopeTrendlineEnabled,
        };

        return settings;
    }

    protected createOptionsBlock(settings: BurndownSettings): SettingsField<any> {
        // Options checkboxes
        let optionsFeaturesBlock = {
            onChange: () => {
                this.packSettingsAndRequestWidgetReload(BehaviorTiming.Immediate);
            },
            settings: settings,
            burnDirection: this.getBurnDirection()
        }
        
        this.toggleOptionsPanel = BurndownToggleOptionsPanel.create(BurndownToggleOptionsPanel, this.getElement(), optionsFeaturesBlock);

        return SettingsField.createSettingsField({
            labelText: WidgetResources.BurndownWidget_AdvancedFeaturesHeader,
            control: this.toggleOptionsPanel,
            hasErrorField: true,
            layout: "advanced-features-block"
        },
            this.getElement());
    }
}


/** Encapsulates any implementation differences over BurndownConfiguration. */
export class BurnupConfiguration extends BurndownConfiguration {
    protected getBurnDirection(): BurnDirection {
        return BurnDirection.Up;
    }

    protected render(settings: BurndownSettings): void {
        super.render(settings);
    }

    protected getCalculatedWidgetTitle(): string {
        return WidgetResources.BurnupConfig_Name;
    }

    protected getAggregationBlockLabel() {
        return WidgetResources.BurnupConfig_AggregationBurnupLabel;
    }

    protected getBurndownTrendlineLabel(): string {
        return WidgetResources.BurnupWidget_AdvancedFeaturesBurnupTrendlineLabel;
    }

    protected showCompletedWork(): boolean {
        return false;
    }
}

SDK.VSS.register("dashboards.burndownConfiguration", () => BurndownConfiguration);
SDK.registerContent("dashboards.burndownConfiguration-init", (context) => {
    let options = <WidgetConfigurationOptions>context.options;
    return Controls.create(BurndownConfiguration, context.$container, options);
});


SDK.VSS.register("dashboards.burnupConfiguration", () => BurnupConfiguration);
SDK.registerContent("dashboards.burnupConfiguration-init", (context) => {
    let options = <WidgetConfigurationOptions>context.options;
    return Controls.create(BurnupConfiguration, context.$container, options);
});
