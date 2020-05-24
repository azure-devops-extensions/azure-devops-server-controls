import { 
    LookBackToggleOptionsPanel, 
    LookBackCheckboxInfo
} from 'Widgets/Scripts/LookBackToggleOptionsPanel';
import VSS_Diag = require("VSS/Diag");
import { BurndownSettings } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { BurnDirection } from 'Widgets/Scripts/Burndown/BurnDirection';
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';

/**Describes values of panel. This contract is used for initialization and exposing state. */
export interface BurndownToggleOptionsPanelValues {
    isBurndownTrendlineEnabled: boolean;
    isScopeTrendlineEnabled: boolean;
    isCompletedWorkEnabled?: boolean;
    IsStackByWorkItemTypeEnabled: boolean;
}

export interface BurndownToggleOptionsPanelOptions {
    onChange: () => void;
    settings: BurndownSettings;
    burnDirection: BurnDirection;
}

export class BurndownToggleOptionsPanel extends LookBackToggleOptionsPanel {

    private static readonly burndownTrendlineCheckboxId = 'burndown-trendline-checkbox';
    private static readonly scopeTrendlineCheckboxId = 'scope-trendline-checkbox';
    private static readonly completedWorkTrendlineCheckboxId = 'completed-work-checkbox';
    private static readonly stackByWITCheckboxId = 'stack-by-workitemtype-checkbox';

    constructor(options: BurndownToggleOptionsPanelOptions) {
        super({
            onChange: options.onChange,
            checkboxInfo: BurndownToggleOptionsPanel.getCheckboxInfoList(options)
        });
    }

    private static getCheckboxInfoList(options: BurndownToggleOptionsPanelOptions): LookBackCheckboxInfo[] {
        let checkboxInfoList: LookBackCheckboxInfo[];
        checkboxInfoList = [
            {
                checkboxId: BurndownToggleOptionsPanel.burndownTrendlineCheckboxId,
                label: WidgetResources.BurndownWidget_AdvancedFeaturesBurndownTrendlineLabel,
                checked: options.settings.burndownTrendlineEnabled,
                enabled: true
            },
            {
                checkboxId: BurndownToggleOptionsPanel.scopeTrendlineCheckboxId,
                label: WidgetResources.BurndownWidget_AdvancedFeaturesScopeTrendlineLabel,
                checked: options.settings.totalScopeTrendlineEnabled,
                enabled: true
            },
            {
                checkboxId: BurndownToggleOptionsPanel.completedWorkTrendlineCheckboxId,
                label: WidgetResources.BurndownWidget_AdvancedFeaturesCompletedWorkLabel,
                checked: options.settings.completedWorkEnabled,
                enabled: true
            },
            {
                checkboxId: BurndownToggleOptionsPanel.stackByWITCheckboxId,
                label:  options.burnDirection === BurnDirection.Down ? WidgetResources.BurndownWidget_StackByLabel : WidgetResources.BurnupWidget_StackByLabel,
                checked: options.settings.stackByWorkItemTypeEnabled,
                enabled: true
            }
        ];
        return checkboxInfoList;
    }

    public getSettings(): BurndownToggleOptionsPanelValues {
        let burndownTrendlineSettings: boolean;
        let scopeTrendlineSettings: boolean;
        let completeWorkSettings: boolean;
        let stackByWorkItemTypeSettings: boolean;

        for (let i in this._options.checkboxInfo) {
            switch (this._options.checkboxInfo[i].checkboxId) {
                case BurndownToggleOptionsPanel.burndownTrendlineCheckboxId: {
                    burndownTrendlineSettings = this.checkboxes[i].getSettings();
                    break;
                }
                case BurndownToggleOptionsPanel.scopeTrendlineCheckboxId: {
                    scopeTrendlineSettings = this.checkboxes[i].getSettings();
                    break;
                }
                case BurndownToggleOptionsPanel.completedWorkTrendlineCheckboxId: {
                    completeWorkSettings = this.checkboxes[i].getSettings();
                    break;
                }
                case BurndownToggleOptionsPanel.stackByWITCheckboxId: {
                    stackByWorkItemTypeSettings = this.checkboxes[i].getSettings();
                    break;
                }
                default: {
                    VSS_Diag.logError("Could not identify checkboxId " + this._options.checkboxInfo[i].checkboxId + ": BurndownToggleOptionsPanel");
                    break;
                }
            }
        }
        
        return {
            isBurndownTrendlineEnabled: burndownTrendlineSettings,
            isScopeTrendlineEnabled:  scopeTrendlineSettings,
            isCompletedWorkEnabled:  completeWorkSettings,
            IsStackByWorkItemTypeEnabled:  stackByWorkItemTypeSettings
        };
    }
}