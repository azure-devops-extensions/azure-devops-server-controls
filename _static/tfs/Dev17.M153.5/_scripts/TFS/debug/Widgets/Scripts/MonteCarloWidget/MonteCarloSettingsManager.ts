import { MonteCarloConstants } from "Widgets/Scripts/MonteCarloWidget/MonteCarloConstants";
import { MonteCarloSettings } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloSettings';
import BurndownSettingsManager from 'Widgets/Scripts/Burndown/BurndownSettingsManager';

export default class MonteCarloSettingsManager extends BurndownSettingsManager {
    public getFeatureName(): string {
        return MonteCarloConstants.featureName;
    }

    protected packDefaultSettings(): MonteCarloSettings {
        let burndownSettings = <MonteCarloSettings> super.packDefaultSettings();

        return {
            ...burndownSettings,
            isShowStatisticalProbabilitiesEnabled: true,
            isUseDurationsCheckboxEnabled: false
        };
    }
}