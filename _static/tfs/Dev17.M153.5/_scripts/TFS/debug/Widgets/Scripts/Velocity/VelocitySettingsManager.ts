import Q = require('q');
import { AggregationMode, TeamScope } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import { SettingsManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import { WorkItemTypeFilterMode } from 'Widgets/Scripts/Shared/WorkItemTypePicker';
import { VelocityConstants } from 'Widgets/Scripts/Velocity/VelocityConstants';
import { VelocitySettings } from 'Widgets/Scripts/Velocity/VelocitySettings';

import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import { getDefaultWebContext } from "VSS/Context";

export default class VelocitySettingsManager extends SettingsManagerBase<VelocitySettings>{

    public getFeatureName(){
        return VelocityConstants.featureName;
    }

    /** 
     * Provides promise to perform neccessary legwork to produce default Velocity Settings, if possible. 
     */
    public generateDefaultSettings(): IPromise<VelocitySettings> {
        let context = this.packContext();
        return Q(this.packDefaultSettings(context, "Microsoft.RequirementCategory"));
    }

    /** Collects  neccessary initial information for querying for default settings. Decoupled from main method for testability. */
    private packContext(): TeamScope {
        let teamContext = TFS_Dashboards_Common.getDashboardTeamContext();
        return {
            teamId: teamContext.id,
            projectId: getDefaultWebContext().project.id
        };
    }

    private packDefaultSettings(context: TeamScope, defaultBacklogCategory: string): VelocitySettings {
        let defaultSettings: VelocitySettings = {
            lastArtifactName: undefined,

            teamId: context.teamId,
            projectId: context.projectId,

            aggregation: {
                identifier: AggregationMode.Count,
                settings: undefined
            },

            lateWorkDelay: 0,
            plannedWorkDelay: 0,
            numberOfIterations: 6,
            workItemTypeFilter: {
                identifier: WorkItemTypeFilterMode[WorkItemTypeFilterMode.BacklogCategory],
                settings: defaultBacklogCategory
            }
        };

        return defaultSettings;
    }
}