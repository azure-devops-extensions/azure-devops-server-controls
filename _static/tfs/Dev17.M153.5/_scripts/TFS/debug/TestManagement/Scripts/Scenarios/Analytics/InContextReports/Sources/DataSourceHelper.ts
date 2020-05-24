
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";

/**
 * We currently have three tables to fetch data (TestRun, TestResult, TestResultDaily). 
 * Depending on configuration and filters selected, decide which table will be best to query data for different reports.
 */
export class DataSourceHelper {

    /**
     * Logic: If TestRun and either of Container/Owner filter present then TestResult.
     * If either of Container/Owner present then TestResultDaily
     * Else TestRun
     * @param confValues
     */
    public static getPassRateCardDataSourceTable(confValues: CommonTypes.IReportConfiguration): CommonTypes.DataSourceTable {
        return this._getDataSourceTable(this._doesFiltersIncludeTestRunProperty(confValues.configuredFilters), this._doesFiltersIncludeTestProperty(confValues.configuredFilters));
    }

    /**
     * Logic: If TestRun filter present then TestResult table else TestResultDaily table.
     * @param confValues
     */
    public static getFailingTestCardDataSourceTable(confValues: CommonTypes.IReportConfiguration): CommonTypes.DataSourceTable {
        return this._doesFiltersIncludeTestRunProperty(confValues.configuredFilters) ||
            !TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsRouteAPIsToTestResultDailyEnabled() ?
            CommonTypes.DataSourceTable.TestResult :
            CommonTypes.DataSourceTable.TestResultDaily;
    }

    /**
     * Combining GroupBy and Filter fields, if TestRun and Test property(Container/Priority/Owner) are present then TestResult table.
     * If TestRun property not present and Test property present then TestResultDaily table
     * Else TestRun table.
     * @param confValues
     */
    public static getTrendChartDataSourceTable(confValues: CommonTypes.IReportConfiguration): CommonTypes.DataSourceTable {
        switch (confValues.groupBy) {
            case CommonTypes.GroupBy.None:
            case CommonTypes.GroupBy.Branch:
            case CommonTypes.GroupBy.Environment:
                return this._getDataSourceTable(this._doesFiltersIncludeTestRunProperty(confValues.configuredFilters), this._doesFiltersIncludeTestProperty(confValues.configuredFilters));

            case CommonTypes.GroupBy.TestRun:
                return this._doesFiltersIncludeTestProperty(confValues.configuredFilters) ? CommonTypes.DataSourceTable.TestResult : CommonTypes.DataSourceTable.TestRun;

            case CommonTypes.GroupBy.Container:
            case CommonTypes.GroupBy.Priority:
            case CommonTypes.GroupBy.Owner:
                return this._doesFiltersIncludeTestRunProperty(confValues.configuredFilters) ||
                    !TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsRouteAPIsToTestResultDailyEnabled() ?
                    CommonTypes.DataSourceTable.TestResult :
                    CommonTypes.DataSourceTable.TestResultDaily;
        }
    }

    /**
     * Logic: Deciding factor is presence of TestRuns then table is TestResult else TestResultDaily
     * @param confValues
     */
    public static getTestListDataSourceTable(confValues: CommonTypes.IReportConfiguration): CommonTypes.DataSourceTable {
        const isTestRunPropInvolved: boolean = confValues.groupBy === CommonTypes.GroupBy.TestRun || this._doesFiltersIncludeTestRunProperty(confValues.configuredFilters);

        return isTestRunPropInvolved ||
            !TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsRouteAPIsToTestResultDailyEnabled() ?
            CommonTypes.DataSourceTable.TestResult :
            CommonTypes.DataSourceTable.TestResultDaily;
    }

    /**
     * If TestRun and Test properties involved then query from TestResult table.
     * If only Test properties involved then query from Test table.
     * Else TestRun table.
     * @param confValues
     */
    public static getGroupedListDataSourceTable(confValues: CommonTypes.IReportConfiguration): CommonTypes.DataSourceTable {
        const isTestRunPropInvolved: boolean = confValues.groupBy === CommonTypes.GroupBy.TestRun || this._doesFiltersIncludeTestRunProperty(confValues.configuredFilters);
        const isTestPropInvolved: boolean = confValues.groupBy === CommonTypes.GroupBy.Container ||
            confValues.groupBy === CommonTypes.GroupBy.Owner ||
            confValues.groupBy === CommonTypes.GroupBy.Priority ||
            this._doesFiltersIncludeTestProperty(confValues.configuredFilters);

        return this._getDataSourceTable(isTestRunPropInvolved, isTestPropInvolved);
    }

    /**
     * When TestRun filter present then data queried from TestResult table else TestResultDaily.
     * @param confValues
     */
    public static getTestInsightTrendChartDataSourceTable(confValues: CommonTypes.IReportConfiguration): CommonTypes.DataSourceTable {
        return this._doesFiltersIncludeTestRunProperty(confValues.configuredFilters) ||
            !TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsRouteAPIsToTestResultDailyEnabled() ?
            CommonTypes.DataSourceTable.TestResult :
            CommonTypes.DataSourceTable.TestResultDaily;
    }

    private static _doesFiltersIncludeTestRunProperty(filters: FilterState): boolean {
        return filters && !!filters[CommonTypes.Filter.TestRun];
    }

    private static _doesFiltersIncludeTestProperty(filters: FilterState): boolean {
        return filters &&
            (
                !!filters[CommonTypes.Filter.Container] ||
                !!filters[CommonTypes.Filter.Owner]
            );
    }

    private static _getDataSourceTable(isTestRunPropInvolved: boolean, isTestPropInvolved: boolean): CommonTypes.DataSourceTable {
        if (isTestPropInvolved) {
            return isTestRunPropInvolved ||
                !TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsRouteAPIsToTestResultDailyEnabled()
                ? CommonTypes.DataSourceTable.TestResult :
                CommonTypes.DataSourceTable.TestResultDaily;
        }

        return CommonTypes.DataSourceTable.TestRun;
    }
}