import {
    LookBackToggleOptionsPanel,
    LookBackCheckboxInfo
} from 'Widgets/Scripts/LookBackToggleOptionsPanel';
import { MonteCarloSettings } from 'Widgets/Scripts/MonteCarloWidget/MonteCarloSettings';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';


/**Describes values of panel. This contract is used for initialization and exposing state. */
export interface MonteCarloToggleOptionsPanelValues {
    isShowStatisticalProbabilitiesEnabled: boolean;
    isUseDurationsCheckboxEnabled: boolean;
}

export interface MonteCarloToggleOptionsPanelOptions {
    onChange: () => void;
    settings: MonteCarloSettings;
}

export class MonteCarloToggleOptionsPanel extends LookBackToggleOptionsPanel {
    constructor(options: MonteCarloToggleOptionsPanelOptions) {
        super({
            onChange: options.onChange,
            checkboxInfo: MonteCarloToggleOptionsPanel.getCheckboxInfoList(options)
        });
    }

    private static getCheckboxInfoList(options: MonteCarloToggleOptionsPanelOptions): LookBackCheckboxInfo[] {
        let checkboxInfoList: LookBackCheckboxInfo[];
        checkboxInfoList = [{
            checkboxId: 'monte-carlo-statistical-probabilities-checkbox',
            label: WidgetResources.MonteCarloWidget_AdvancedFeaturesShowStatisticalProbabilities,
            checked: options.settings.isShowStatisticalProbabilitiesEnabled,
            enabled: true
        },
        {
            checkboxId: 'monte-carlo-use-dates-checkbox',
            label: WidgetResources.MonteCarloWidget_AdvancedFeaturesUseDurationsCheckboxLabel,
            checked: options.settings.isUseDurationsCheckboxEnabled,
            enabled: true
        }];
        return checkboxInfoList;
    }

    public getSettings(): MonteCarloToggleOptionsPanelValues {
        return {
            isShowStatisticalProbabilitiesEnabled: this.checkboxes[0].getSettings(),
            isUseDurationsCheckboxEnabled: this.checkboxes[1].getSettings()
        };
    }
}