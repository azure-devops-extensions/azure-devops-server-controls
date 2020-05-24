import * as React from 'react';

import { AnalyticsTrendsSettings } from 'Widgets/Scripts/AnalyticsTrends/AnalyticsTrendsSettings';

import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import { TeamPicker, TeamPickerDefaultPropertyName } from 'Analytics/Config/Components/TeamPicker';
import { WitPicker, WitPickerDefaultPropertyName } from 'Widgets/Scripts/Work/Components/WitPicker';
import { WidgetConfig, registerWidgetConfig } from 'Widgets/Scripts/WidgetConfig';
import { WorkConfig } from 'Widgets/Scripts/Work/Components/WorkConfig';
import { AnalyticsConfig } from 'Analytics/Config/Components/AnalyticsConfig';

export class AnalyticsTrendsConfiguration extends WidgetConfig<AnalyticsTrendsSettings> {

    protected getCalculatedWidgetTitle(): string {
        return WidgetResources.AnalyticsTrendsConfig_Name;
    }

    protected getSettingsFromProperties(properties: IDictionaryStringTo<any>): AnalyticsTrendsSettings {
        return {
            teams: properties[TeamPickerDefaultPropertyName],
            workItemTypes: properties[WitPickerDefaultPropertyName]
        };
    }

    protected getPropertiesFromSettings(settings: AnalyticsTrendsSettings): IDictionaryStringTo<any> {
        return {
            [TeamPickerDefaultPropertyName]: settings.teams,
            [WitPickerDefaultPropertyName]: settings.workItemTypes
        };
    }

    protected getChildren(): React.ReactNode {
        return (
            <WorkConfig>
                <AnalyticsConfig>
                    <TeamPicker />
                    <WitPicker />
                </AnalyticsConfig>
            </WorkConfig>
        );
    }
}

registerWidgetConfig(
    "dashboards.analyticsTrendsConfiguration",
    "dashboards.analyticsTrendsConfiguration-init",
    AnalyticsTrendsConfiguration
);
