import { DemandTracker } from 'WidgetComponents/Demands/DemandTracker';
import { DemandType } from "WidgetComponents/Demands/DemandType";
import { ModefulValueSetting } from "Widgets/Scripts/Shared/ModefulValueSetting";
import { WorkItemTypeFilterMode } from "Widgets/Scripts/Shared/WorkItemTypePicker";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WorkItemTypeFieldsQuery } from "Widgets/Scripts/Burndown/Queries/WorkItemTypeFieldsQuery";
import { WorkItemFieldDescriptor } from "Widgets/Scripts/Burndown/BurndownDataContract";
import { WidgetsCacheableQueryService } from "Widgets/Scripts/DataServices/WidgetsCacheableQueryService";
import { SettingsHelper } from "Widgets/Scripts/Utilities/SettingsHelper";
import * as Q from 'q';
import { WidgetDataManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase';
import { PingServiceQuery } from "Widgets/Scripts/Burndown/Queries/PingServiceQuery";
import { AnalyticsExceptionType, AnalyticsExceptionParsing } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { LayoutState, MessageType } from "WidgetComponents/LayoutState";
import { ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { CustomSettings } from 'TFS/Dashboards/WidgetContracts';
import { LegacyProjectDataHelper } from "Widgets/Scripts/Shared/LegacyProjectDataHelper";
import { ISettingsManager } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import { BurndownSettings } from 'Widgets/Scripts/Burndown/BurndownSettings';
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";

export class LookBackDataManagerHelper {

    public static configNotSatisfactory(dataManager: WidgetDataManagerBase, 
                        dataService: WidgetsCacheableQueryService): IPromise<LayoutState> {
        // Ping Analytics to decide whether to show fault-in or unconfigured
        return dataService
        .getCacheableQueryResult(new PingServiceQuery())
        .then(() => {
            return dataManager.packMessageAsState(MessageType.Unconfigured);
        }, e => {
            let messageType = MessageType.WidgetError;

            if (AnalyticsExceptionParsing.recognizeAnalyticsException(e) === AnalyticsExceptionType.DataNotReady) {
                messageType = MessageType.AxFaultIn;
            }

            return dataManager.packMessageAsState(messageType, ErrorParser.stringifyODataError(e));
        });
    }

    // is work item a backlog or work item type
    public static getWorkItemTypes(workItemTypeFilter: ModefulValueSetting<string, string>, includeBugsForRequirementCategory: boolean): IPromise<string[]> {
        if (workItemTypeFilter.identifier == WorkItemTypeFilterMode[WorkItemTypeFilterMode.WorkItemType]) {
            return Q([workItemTypeFilter.settings]);
        } else {
            // In the backlog case we use the current context project to look up the work item types associated with a backlog category.
            const project = TfsContext.getDefault().contextData.project;
            return SettingsHelper.getProjectWorkItemTypesOfBacklogCategory(project.id, workItemTypeFilter.settings, includeBugsForRequirementCategory);
        }
    }

    public static getWorkItemTypeFieldsPromise(workItemTypes: string[], 
                                        projectIds: string[],
                                        dataService: WidgetsCacheableQueryService): IPromise<WorkItemFieldDescriptor[]> {
        let workItemTypeFieldsQuery = new WorkItemTypeFieldsQuery(projectIds, workItemTypes);
        return dataService.getCacheableQueryResult(workItemTypeFieldsQuery);
    }

    public static demandsArePresent(demandTracker: DemandTracker): boolean {
        return demandTracker.isDemandPresent(DemandType.subtitle)
            || demandTracker.isDemandPresent(DemandType.scalar)
            || demandTracker.isDemandPresent(DemandType.chart)
            || demandTracker.isDemandPresent(DemandType.submetrics);
    }

     /**
    * Verifies widget is properly configured for viewing (This means it has configuration, and  that configuration is accepted for rendering).
    */
    public static hasSatisfactoryConfiguration(customSettings: CustomSettings, 
                                            settingsManager: ISettingsManager<BurndownSettings>,
                                            widgetTypeId: string): boolean {
        let isConfigured = settingsManager.isConfigured(customSettings);
        if (isConfigured && SettingsHelper.useAnalyticsForProcessData()) {
            const monteCarloSettings = JSON.parse(customSettings.data) as BurndownSettings;

            // Reject configuration if configured with bugs for Reqs & Project doesn't employ a known Bug Category
            // Config UI will highlight the issue.
            isConfigured = (monteCarloSettings.includeBugsForRequirementCategory != true || LegacyProjectDataHelper.getResults().ProjectUsesKnownBugCategoryName);
            
            // Log for occurrences of failures caused by bugs for Requirement Category 
            // Note: all occurrences are simply credited against Burndown(as opposed to BurnUp), as Widget type is not present in this context, and it's not needed.
            WidgetTelemetry.onWidgetFailure(
                widgetTypeId,
                "Widget Rendering blocked - usage of include bugs option was blocked on customized Xml Process, until widget is reconfigured.",
                "SettingsManager.isConfigured()",
                {});
        }
        return isConfigured;
    }
}