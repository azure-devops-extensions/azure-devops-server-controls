import * as Q from "q";
import * as VSS from "VSS/VSS";
import * as Utils_Core from "VSS/Utils/Core";
import * as Service from "VSS/Service";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as TFS_Service from "Presentation/Scripts/TFS/TFS.Service";
import * as Work_WebApi from "TFS/Work/RestClient";
import * as TFS_Core_Contracts from "TFS/Core/Contracts";
import * as Contracts from "TFS/Work/Contracts";
import * as Contributions_Services from "VSS/Contributions/Services";
import * as Diag from "VSS/Diag";
import { publishErrorToTelemetry } from "VSS/Error";

import {
    BacklogConfiguration,
    IBacklogFields,
    IBacklogLevelConfiguration,
    WorkItemStateCategory,
    WorkItemTypeStateInfo,
    IColumnField,
    BacklogFieldTypes
} from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Models";

export { IBacklogLevelConfiguration, WorkItemStateCategory, WorkItemTypeStateInfo, BacklogConfiguration, BacklogFieldTypes };
import { equals } from "VSS/Utils/String";

export class BacklogConfigurationService extends TFS_Service.TfsService {

    /**
     * Get backlog configuration service 
     * @param tfsContext
     */
    public static getService(tfsContext?: TFS_Host_TfsContext.TfsContext): BacklogConfigurationService {
        if (!tfsContext) {
            tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        }
        return TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<BacklogConfigurationService>(BacklogConfigurationService);
    }

    /**
     * Get backlog configuration synchronously, recommand using beginGetBacklogConfiguration instead. 
     * @param tfsContext
     */
    public static getBacklogConfiguration(tfsContext?: TFS_Host_TfsContext.TfsContext, teamId?: string): BacklogConfiguration {
        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();

        const service = BacklogConfigurationService.getService(tfsContext);
        return service._getBacklogConfiguration(teamId);
    }

    /**
     * Get backlog field name by field type.
     * @param fieldType The field type.
     */
    public static getBacklogFieldName(fieldType: BacklogFieldTypes): string {
        const backlogConfig = BacklogConfigurationService.getBacklogConfiguration();

        if (!backlogConfig) {
            return null;
        }

        return backlogConfig.backlogFields.typeFields[fieldType];
    }

    /**
     * Get backlog configuration asynchronously
     * @param teamId Will get the specific team's backlog configuration, mainly for getting team visibility and bug behavior information. 
     *               Otherwise, will get default team's configuration. Pass null if don't care.
     * @param tfsContext Optional, the tfs Context.
     */
    public static beginGetBacklogConfiguration(teamId: string, tfsContext?: TFS_Host_TfsContext.TfsContext): IPromise<BacklogConfiguration> {
        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        const service = BacklogConfigurationService.getService(tfsContext);
        return service._beginGetBacklogConfiguration(teamId);
    }

    private _backlogConfiguration: BacklogConfiguration;

    /**
     * Returns the cached backlog configuration or try load it from json island synchronously
     */
    private _getBacklogConfiguration(teamId?: string): BacklogConfiguration {
        if (!this._backlogConfiguration || (teamId && !equals(this._backlogConfiguration.teamId, teamId, true))) {
            this._getFromDataProvider(teamId);
        }

        return this._backlogConfiguration;
    }

    /**
     * Get backlog configuration asynchronously
     * @param teamId Will get team specific backlog configuration if specified, such as getting team visibility or bug behavior related information.
     */
    private _beginGetBacklogConfiguration(teamId: string): IPromise<BacklogConfiguration> {
        // First try load it sync if available.
        const cachedConfig = this._getBacklogConfiguration(teamId);
        if (cachedConfig && equals(cachedConfig.teamId, teamId, true)) {
            return Q(cachedConfig);
        }

        const httpClient = this.tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        const teamContext: TFS_Core_Contracts.TeamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: this.getTfsContext().contextData.project.id,
            teamId: teamId
        };

        return httpClient.getBacklogConfigurations(teamContext).then(
            (backlogConfig: Contracts.BacklogConfiguration) => {
                // Process workItemType to state map
                const workItemTypeStates: WorkItemTypeStateInfo[] = this._updateWorkItemTypeStateValuesToEnums(backlogConfig);

                // Process portfolio backlogs
                const portfolioBacklogs: IBacklogLevelConfiguration[] = backlogConfig.portfolioBacklogs.map((backlog: Contracts.BacklogLevelConfiguration) => {
                    return this._processBacklogLevelConfiguration(backlog);
                });

                // Create backlog configuration and extend properties
                this._backlogConfiguration = new BacklogConfiguration(
                    teamContext.projectId,
                    workItemTypeStates,
                    // REST APIs use string representation of tye type fields we need to convert it to enum
                    this._mapFieldTypes(backlogConfig.backlogFields),
                    this._processBacklogLevelConfiguration(backlogConfig.taskBacklog),
                    this._processBacklogLevelConfiguration(backlogConfig.requirementBacklog),
                    portfolioBacklogs,
                    backlogConfig.hiddenBacklogs,
                    teamContext.teamId);
                return this._backlogConfiguration;
            }, (error) => {
                publishErrorToTelemetry(error);
            });
    }

    // Private use only: Returns BacklogLevelConfiguration object from backlogLevel fetched from REST apis
    private _processBacklogLevelConfiguration(backlogLevel: Contracts.BacklogLevelConfiguration): IBacklogLevelConfiguration {
        // WorkItemTypes
        let workItemTypes: string[] = [];
        if (backlogLevel.workItemTypes && backlogLevel.workItemTypes.length > 0) {
            workItemTypes = backlogLevel.workItemTypes.slice().map(type => type.name);
        }

        // Backlog level column fields
        let columnFields: IColumnField[] = [];
        if (backlogLevel.columnFields && backlogLevel.columnFields.length > 0) {
            columnFields = backlogLevel.columnFields.slice().map(field => {
                return <IColumnField>{
                    columnFieldReference: field.columnFieldReference.referenceName,
                    width: field.width
                };
            });
        }

        return <IBacklogLevelConfiguration>{
            addPanelFields: backlogLevel.addPanelFields.slice().map(field => field.referenceName),
            color: backlogLevel.color,
            columnFields: columnFields,
            defaultWorkItemType: backlogLevel.defaultWorkItemType ? backlogLevel.defaultWorkItemType.name : null,
            id: backlogLevel.id,
            name: backlogLevel.name,
            rank: backlogLevel.rank,
            workItemCountLimit: backlogLevel.workItemCountLimit,
            workItemTypes: workItemTypes
        };
    }

    // Private use only: Returns stateCategoryEnumValue from stateCategory name
    private _getStateCategoryEnumValue(stateCategory: string): WorkItemStateCategory {
        switch (stateCategory.toLowerCase()) {
            case "proposed":
                return WorkItemStateCategory.Proposed;
            case "inprogress":
                return WorkItemStateCategory.InProgress;
            case "resolved":
                return WorkItemStateCategory.Resolved;
            case "completed":
                return WorkItemStateCategory.Completed;
            case "removed":
                return WorkItemStateCategory.Removed;
        }
        return null;
    }

    /**
     * Checks the data provider for the backlog configuration.
     */
    private _getFromDataProvider(teamId: string) {
        const pageDataService = Service.getService(Contributions_Services.WebPageDataService);
        const backlogConfiguration = pageDataService.getPageData("ms.vss-work-web.agile-backlog-configuration-data-provider") as BacklogConfiguration;

        //  Team backlog configuration retrieval can fail if, for example, there are no areas selected for the team.
        //  In such cases, null configuration is returned.
        if (backlogConfiguration) {
            if (teamId && !equals(backlogConfiguration.teamId, teamId, true)) {
                throw new Error("The provided team id does not match that of the data provider");
            }

            this._backlogConfiguration = new BacklogConfiguration(
                backlogConfiguration.projectId,
                // state names to enum. This is only necessary for pages generated the old web platform framework
                // because data contract metadata is not supplied to getPageData above.
                this._updateWorkItemTypeStateValuesToEnums(backlogConfiguration),
                this._mapFieldTypes(backlogConfiguration.backlogFields),
                backlogConfiguration.taskBacklog,
                backlogConfiguration.requirementBacklog,
                backlogConfiguration.portfolioBacklogs,
                backlogConfiguration.hiddenBacklogs,
                backlogConfiguration.teamId);

            return this._backlogConfiguration;
        }
    }

    private _updateWorkItemTypeStateValuesToEnums(backlogConfiguration: Contracts.BacklogConfiguration | BacklogConfiguration): WorkItemTypeStateInfo[] {

        //  Process string state names to enum values.
        const workItemTypeStates: WorkItemTypeStateInfo[] = [];
        for (const typeState of backlogConfiguration.workItemTypeMappedStates) {
            const states = {}; // Workitemtype state to stateCategory map
            for (const state in typeState.states) {
                states[state] = typeof typeState.states[state] === "number" ? typeState.states[state] : this._getStateCategoryEnumValue(typeState.states[state] as string);
            }
            workItemTypeStates.push({
                workItemTypeName: typeState.workItemTypeName,
                states: states
            });
        }

        return workItemTypeStates;
    }

    private _mapFieldTypes(backlogFields: Contracts.BacklogFields): IBacklogFields {
        const output: IBacklogFields = { typeFields: [] };

        for (const typeField in backlogFields.typeFields) {
            if (isNaN(Number(typeField))) {
                // When old web platform is active the typeField is serialized as string
                output.typeFields[BacklogFieldTypes[typeField]] = backlogFields.typeFields[typeField];
            } else {
                // When new web platform is active the typeField is serialized as number
                output.typeFields[typeField] = backlogFields.typeFields[typeField];
            }
        }

        return output;
    }
}
