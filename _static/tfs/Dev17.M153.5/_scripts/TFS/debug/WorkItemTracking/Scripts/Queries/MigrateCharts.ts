import DataServices = require("Charting/Scripts/TFS.Charting.DataServices");
import Charting = require("Charting/Scripts/TFS.Charting");
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import VSSError = require("VSS/Error");
import * as Q from "q";
import Diag = require("VSS/Diag");


/**
* Migrate charts configuration from one query to another
* @param oldQueryId - Query Id to get old charts configuration
* @param migratedQueryId - Query Id to migrate charts configuration
* @param projectId 
* @param currentIdentity 
* @param isSpecialQuery - If the query is a special query like assignedtome
*/
export function migrateCharts(oldQueryId: string, migratedQueryId: string, projectId: string, currentIdentity: string, isSpecialQuery: boolean): IPromise<DataServices.IChartConfiguration> {
    const deferred = Q.defer<DataServices.IChartConfiguration>();
    const groupKey = QueryUtilities.formatGroupKey(oldQueryId, isSpecialQuery, currentIdentity);

    // Bail out if the group key is null
    if (!groupKey) {
        Diag.Debug.assertIsNotNull(groupKey, "Query Id should not be empty.");
        return;
    }

    DataServices.ChartConfigStore.beginGetChartConfigurationsInGroup(
        projectId,
        Charting.ChartProviders.witQueries,
        groupKey,
        (chartConfigurations) => {
            for (const config of chartConfigurations) {
                // creating new config with new query
                const newConfig: DataServices.IChartConfiguration = { ...config, groupKey: migratedQueryId, chartId: null };
                newConfig.transformOptions.filter = migratedQueryId;
                newConfig.transformOptions.transformId = null;
                DataServices.ChartConfigStore.beginSaveNewChartConfiguration(projectId, newConfig, (newconfigurations: DataServices.IChartConfiguration) => {
                    deferred.resolve(newconfigurations);
                }, (error: Error) => {
                    deferred.reject(error);
                    VSSError.publishErrorToTelemetry({
                        name: "CouldNotMigrateCharts",
                        message: error.message
                    });
                });
            }
        },
        (error) => {
            deferred.reject(error);
            VSSError.publishErrorToTelemetry({
                name: "CouldNotMigrateCharts",
                message: error.message
            });
        })

    return deferred.promise;
}