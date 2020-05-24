import Q = require('q');

import { BurndownConstants } from 'Widgets/Scripts/Burndown/BurndownConstants';
import { BurndownSettings, DateSampleMode } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { SettingsManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import { AggregationMode } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import { getDefaultWebContext } from "VSS/Context";

export default class BurndownSettingsManager extends SettingsManagerBase<BurndownSettings> {
    public getFeatureName(): string {
        return BurndownConstants.featureName;
    }

    /**
     * Performs neccessary legwork to produce default Burndown Settings, if possible.
     */
    public generateDefaultSettings(): IPromise<BurndownSettings> {
        return Q(this.packDefaultSettings());
    }

    protected packDefaultSettings(): BurndownSettings {
        let teamContext = TFS_Dashboards_Common.getDashboardTeamContext();

        let defaultSettings: BurndownSettings = {
            /** Spec required initial default values */
            burndownTrendlineEnabled: true,
            totalScopeTrendlineEnabled: true,
            completedWorkEnabled: false,
            stackByWorkItemTypeEnabled: false,
            aggregation: {
                identifier: AggregationMode.Count,
                settings: ""
            },
            workItemTypeFilter: {},
            timePeriodConfiguration: {
                startDate: "",
                samplingConfiguration: {
                    identifier: DateSampleMode.ByIterations,
                    settings: []
                }
            },
            teams: [{
                projectId: getDefaultWebContext().project.id,
                teamId: teamContext.id
            }],
            fieldFilters: []
        } as any;

        return defaultSettings;
    }
}