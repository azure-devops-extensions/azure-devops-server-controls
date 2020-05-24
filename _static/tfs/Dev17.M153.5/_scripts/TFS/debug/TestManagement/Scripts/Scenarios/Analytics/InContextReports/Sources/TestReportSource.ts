import { DateSKParser } from "Analytics/Scripts/DateSKParser";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { AnalyticsODataClientBase } from "TestManagement/Scripts/Scenarios/Analytics/AnalyticsODataClientBase";
import { QueryUtility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/QueryUtility";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { FilterState, FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";

export abstract class TestReportSource extends AnalyticsODataClientBase {
    
    protected constructor(command: string) {
        super(command);
    }

    protected _getTestResultsContextFilter(testResultsContext: TCMContracts.TestResultsContext): string {
        //TODO: We shouldnt be doing this and rather accept ITestReportContext context. 
        const testReportContext = testResultsContext as CommonTypes.ITestReportContext;
        let queryField: string = "";
        let queryValue: number = 0;

        switch (testReportContext.contextType) {
            case TCMContracts.TestResultsContextType.Build:
                if (testReportContext.definitionSK) {
                    queryField = "BuildPipelineSK";
                    queryValue = testReportContext.definitionSK;
                }
                else {
                    queryField = "BuildPipeline/BuildPipelineId";
                    queryValue = testReportContext.build.definitionId;
                }
                break;
            case TCMContracts.TestResultsContextType.Release:
                if (testReportContext.definitionSK) {
                    queryField = "ReleasePipelineSK";
                    queryValue = testReportContext.definitionSK;
                }
                else {
                    queryField = "ReleasePipeline/ReleasePipelineId";
                    queryValue = testReportContext.release.definitionId;
                }
                break;
        }
        return `${queryField} eq ${queryValue}`;
    }

    protected _getTestResultsContextPipelineFilter(testResultsContext: TCMContracts.TestResultsContext): string {
        return this._getTestResultsContextFilter(testResultsContext);
    }

    protected _getDateFilter(trendBy: CommonTypes.TrendBy, period: CommonTypes.Period, datePropertyName?: string): string {
        let nowInUTC: Date = Utils_Date.shiftToUTC(new Date());      // Convert client time to UTC.
        let lookBackDate: Date;
        switch (trendBy) {
            case CommonTypes.TrendBy.Days:
                lookBackDate = Utils_Date.addDays(nowInUTC, -this._getPeriodValueFromPeriod(period) + 1);
                break;
            case CommonTypes.TrendBy.Weeks:
                lookBackDate = Utils_Date.addDays(nowInUTC, -7 * this._getPeriodValueFromPeriod(period) + 1);
                break;
        }

        let lookBackDateSK = DateSKParser.dateStringToDateSK(Utils_Date.format(lookBackDate, DateSKParser.dateStringFormat));
        datePropertyName = datePropertyName ? datePropertyName : "CompletedDateSK";
        return `${datePropertyName} ge ${lookBackDateSK}`;
    }

    protected _getDailyDateFilter(trendBy: CommonTypes.TrendBy, period: CommonTypes.Period, dateFieldName?: string): string {
        return this._getDateFilter(trendBy, period, "DateSK");
    }

    private _getPeriodValueFromPeriod(period: CommonTypes.Period): number {
        switch (period) {
            case CommonTypes.Period.Days_7:
                return 7;
            case CommonTypes.Period.Days_14:
                return 14;
            case CommonTypes.Period.Days_30:
                return 30;
        }
    }

    protected _getOutcomeFilter(outcome: CommonTypes.TestOutcome) {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return "Outcome eq 'Failed'";
            case CommonTypes.TestOutcome.Passed:
                return "Outcome eq 'Passed'";
            case CommonTypes.TestOutcome.Inconclusive:
                return "Outcome eq 'Inconclusive'";
            case CommonTypes.TestOutcome.Aborted:
                return "Outcome eq 'Aborted'";
            case CommonTypes.TestOutcome.Error:
                return "Outcome eq 'Error'";
            case CommonTypes.TestOutcome.NotExecuted:
                return "Outcome eq 'NotExecuted'";
            case CommonTypes.TestOutcome.NotImpacted:
                return "Outcome eq 'NotImpacted'";
        }
    }

    protected _getOutcomeCountFilter(outcome: CommonTypes.TestOutcome): string {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return `ResultFailCount gt 0`;
            case CommonTypes.TestOutcome.Passed:
                return `ResultPassCount gt 0`;
            case CommonTypes.TestOutcome.Aborted:
                return `ResultAbortedCount gt 0`;
            case CommonTypes.TestOutcome.Error:
                return `ResultErrorCount gt 0`;
            case CommonTypes.TestOutcome.Inconclusive:
                return `ResultInconclusiveCount gt 0`;
            case CommonTypes.TestOutcome.NotExecuted:
                return `ResultNotExecutedCount gt 0`;
            case CommonTypes.TestOutcome.NotImpacted:
                return `ResultNotImpactedCount gt 0`;
        }
    }

    protected _getTestContextFilter(testIdentifier: string): string {
        return this._isAnalyticsGroupByAndFilterOnTestSKEnabled() ? `TestSK eq ${testIdentifier}` : `Test/FullyQualifiedTestName eq '${testIdentifier}'`;
    }

    protected _getGroupByTestResultsContext(testResultsContext: TCMContracts.TestResultsContext): string {
        switch (testResultsContext.contextType) {
            case TCMContracts.TestResultsContextType.Build:
                return `BuildSK`;
            case TCMContracts.TestResultsContextType.Release:
                return `ReleaseEnvironmentSK`;
        }
        return "true";
    }

    protected _getGroupByPeriodColumnString(trendBy: CommonTypes.TrendBy): string {
        switch (trendBy) {
            case CommonTypes.TrendBy.Days:
                return "CompletedDateSK";
            case CommonTypes.TrendBy.Weeks:
                return "CompletedOn/WeekStartingDate";
        }
    }

    protected _getGroupByDailyPeriodColumnString(trendBy: CommonTypes.TrendBy): string {
        switch (trendBy) {
            case CommonTypes.TrendBy.Days:
                return "DateSK";
            case CommonTypes.TrendBy.Weeks:
                return "Date/WeekStartingDate";
        }
    }

    protected _getGroupByTestRunPropertiesString(groupBy: CommonTypes.GroupBy): string {
        switch (groupBy) {
            case CommonTypes.GroupBy.Container:
                return "Test/ContainerName";
            case CommonTypes.GroupBy.Owner:
                return "Test/TestOwner";
            case CommonTypes.GroupBy.Priority:
                return "Test/Priority";
            case CommonTypes.GroupBy.Outcome:
                return "Outcome";
            case CommonTypes.GroupBy.Environment:
                return "ReleaseStage/ReleaseStageId";
            case CommonTypes.GroupBy.Branch:
                return "Branch/BranchName";
            case CommonTypes.GroupBy.TestRun:
                return "Title";
        }
    }
    
    protected _getGroupByTestPropertiesString(groupBy: CommonTypes.GroupBy): string {
        switch (groupBy) {
            case CommonTypes.GroupBy.Container:
            case CommonTypes.GroupBy.Owner:
            case CommonTypes.GroupBy.Priority:
            case CommonTypes.GroupBy.Outcome:
            case CommonTypes.GroupBy.Branch:
                return this._getGroupByTestRunPropertiesString(groupBy);
            case CommonTypes.GroupBy.Environment:
                return "ReleaseStage/ReleaseStageId";
            case CommonTypes.GroupBy.TestRun:
                return "TestRun/Title";
        }
    }
    
    protected _getOutcomeCountAggregateAndComputeStrings(outcomes: CommonTypes.TestOutcome[]): { outcomeAggregationStr: string, outcomeComputeStr: string } {
        let outcomeAggregationStr: string = Utils_String.empty;
        let outcomeComputeStr: string = Utils_String.empty;

        if (outcomes.length > 0) {
            outcomes.forEach(o => {
                if (!outcomeAggregationStr) {
                    outcomeAggregationStr = this._getOutcomeCountStringForAggregation(o);
                    outcomeComputeStr = this._getOutcomeComputeStrings(o);
                }
                else {
                    outcomeAggregationStr += `, ${this._getOutcomeCountStringForAggregation(o)}`;
                    outcomeComputeStr += ` add ${this._getOutcomeComputeStrings(o)}`;
                }
            });
        }
        else {
            // If no filters specified, AggregateValue is positioned inside the aggregate clause
            outcomeAggregationStr = "ResultCount with sum as AggregateValue";
        }

        return { outcomeAggregationStr: outcomeAggregationStr, outcomeComputeStr: outcomeComputeStr };
    }

    protected _getOutcomeCountCastedAggregationString(outcome: CommonTypes.TestOutcome): string {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return `cast(Outcome eq 'Failed',Edm.Int32) with sum as FailedCount`;
            case CommonTypes.TestOutcome.Passed:
                return `cast(Outcome eq 'Passed',Edm.Int32) with sum as PassedCount`;
            case CommonTypes.TestOutcome.Aborted:
                return `cast(Outcome eq 'Aborted',Edm.Int32) with sum as AbortedCount`;
            case CommonTypes.TestOutcome.Error:
                return `cast(Outcome eq 'Error',Edm.Int32) with sum as ErrorCount`;
            case CommonTypes.TestOutcome.Inconclusive:
                return `cast(Outcome eq 'Inconclusive',Edm.Int32) with sum as InconclusiveCount`;
            case CommonTypes.TestOutcome.NotExecuted:
                return `cast(Outcome eq 'NotExecuted',Edm.Int32) with sum as NotExecutedCount`;
            case CommonTypes.TestOutcome.NotImpacted:
                return `cast(Outcome eq 'NotImpacted',Edm.Int32) with sum as NotImpactedCount`;
        }
    }

    protected _getOutcomeComputeStrings(outcome: CommonTypes.TestOutcome): string {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return `ResultFailCount`;
            case CommonTypes.TestOutcome.Passed:
                return `ResultPassCount`;
            case CommonTypes.TestOutcome.Aborted:
                return `ResultAbortedCount`;
            case CommonTypes.TestOutcome.Error:
                return `ResultErrorCount`;
            case CommonTypes.TestOutcome.Inconclusive:
                return `ResultInconclusiveCount`;
            case CommonTypes.TestOutcome.NotExecuted:
                return `ResultNotExecutedCount`;
            case CommonTypes.TestOutcome.NotImpacted:
                return `ResultNotImpactedCount`;
        }
    }

    protected _getOutcomeCountStringForAggregation(outcome: CommonTypes.TestOutcome): string {
        return QueryUtility.getOutcomeCountStringForAggregation(outcome);
    }

    protected _getTotalCountStringForAggregation(): string {
        return `ResultCount with sum as ResultCount`;
    }

    protected _getOrderByDateClause(trendBy: CommonTypes.TrendBy): string {
        switch (trendBy) {
            case CommonTypes.TrendBy.Days:
                return " CompletedDateSK asc ";
            case CommonTypes.TrendBy.Weeks:
                return " CompletedOn/WeekStartingDate asc ";
        }
    }

    protected _getDailyOrderByDateClause(trendBy: CommonTypes.TrendBy): string {
        switch (trendBy) {
            case CommonTypes.TrendBy.Days:
                return "DateSK asc";
            case CommonTypes.TrendBy.Weeks:
                return "Date/WeekStartingDate asc";
        }
    }

    protected _parseReturnDateIntoDisplayForm(trendBy: CommonTypes.TrendBy, record: any): string {
        switch (trendBy) {
            case CommonTypes.TrendBy.Days:
                return DateSKParser.parseDateSKAsDateString(record.CompletedDateSK);
            case CommonTypes.TrendBy.Weeks:
                return Utils_Date.format(Utils_Date.parseDateString(record.CompletedOn.WeekStartingDate), DateSKParser.dateStringFormat);           //Date comes in string for like 'yyyy-mm-ddT00:00:00Z'
        }
    }

    protected _parseReturnDailyDateIntoDisplayForm(trendBy: CommonTypes.TrendBy, record: any): string {
        switch (trendBy) {
            case CommonTypes.TrendBy.Days:
                return DateSKParser.parseDateSKAsDateString(record.DateSK);
            case CommonTypes.TrendBy.Weeks:
                return Utils_Date.format(Utils_Date.parseDateString(record.Date.WeekStartingDate), DateSKParser.dateStringFormat);           //Date comes in string for like 'yyyy-mm-ddT00:00:00Z'
        }
    }

    protected _parseTestProperties(groupBy: CommonTypes.GroupBy, record: any): { actualValue: string, displayValue: string } {
        switch (groupBy) {
            case CommonTypes.GroupBy.Container:
                return {
                    actualValue: record.Test.ContainerName ? record.Test.ContainerName.toString() : Utils_String.empty,
                    displayValue: record.Test.ContainerName ? record.Test.ContainerName.toString() : Utils_String.empty
                };
            case CommonTypes.GroupBy.Owner:
                return {
                    actualValue: record.Test.TestOwner ? record.Test.TestOwner.toString() : Utils_String.empty,
                    displayValue: record.Test.TestOwner ? record.Test.TestOwner.toString() : Resources.FilterNoOwner
                };
            case CommonTypes.GroupBy.Priority:
                // Converting number to string here. We should see if we convert to number then in detailed list grid order of data displayed will not change.
                return {
                    actualValue: record.Test.Priority != null ? record.Test.Priority.toString() : 255,
                    displayValue: record.Test.Priority != null ? (record.Test.Priority as number !== 255 ? record.Test.Priority.toString() : Resources.NotAvailable) : Resources.NotAvailable
                };
            case CommonTypes.GroupBy.Outcome:
                return {
                    actualValue: record.Outcome ? record.Outcome.toString() : Utils_String.empty,
                    displayValue: record.Outcome ? record.Outcome.toString() : Utils_String.empty
                };
            case CommonTypes.GroupBy.Environment:
                // For TestResultsDaily and TestResults
                const releaseStageIdString: string = (record.ReleaseStage && record.ReleaseStage.ReleaseStageId) ?
                    record.ReleaseStage.ReleaseStageId.toString() : Utils_String.empty;
                // For TestRun
                const releaseEnvDefIdString: string = (record.ReleaseEnvironment && record.ReleaseEnvironment.ReleaseEnvironmentDefinitionId) ?
                    record.ReleaseEnvironment.ReleaseEnvironmentDefinitionId.toString() : Utils_String.empty;
                
                return {
                    actualValue: releaseStageIdString || releaseEnvDefIdString,
                    displayValue: releaseStageIdString || releaseEnvDefIdString
                };
            case CommonTypes.GroupBy.Branch:
                return {
                    actualValue: record.Branch.BranchName ? record.Branch.BranchName.toString() : Utils_String.empty,
                    displayValue: record.Branch.BranchName ? record.Branch.BranchName.toString() : Resources.NoBranchText
                };
            case CommonTypes.GroupBy.TestRun:
                return {
                    actualValue: record.Title ? record.Title.toString() : ((record.TestRun && record.TestRun.Title) ? record.TestRun.Title.toString() : Utils_String.empty),
                    displayValue: record.Title ? record.Title.toString() : ((record.TestRun && record.TestRun.Title) ? record.TestRun.Title.toString() : Utils_String.empty)
                };
        }
    }
    
    protected _getEntityWiseOutcomeCountParseFunction(entityName: string): Function {
        switch (entityName) {
            case this._testResultEntityName:
                return this._parseOutcomeCountByTestResult;
            case this._testRunEntityName:
            case this._testResultDailyEntityName:
                return this._parseOutcomeCount;
            
        }
    }

    protected _parseOutcomeCount(outcome: CommonTypes.TestOutcome, record: any): number {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return record.ResultFailCount as number;
            case CommonTypes.TestOutcome.Passed:
                return record.ResultPassCount as number;
            case CommonTypes.TestOutcome.Aborted:
                return record.ResultAbortedCount as number;
            case CommonTypes.TestOutcome.Error:
                return record.ResultErrorCount as number;
            case CommonTypes.TestOutcome.Inconclusive:
                return record.ResultInconclusiveCount as number;
            case CommonTypes.TestOutcome.NotExecuted:
                return record.ResultNotExecutedCount as number;
            case CommonTypes.TestOutcome.NotImpacted:
                return record.ResultNotImpactedCount as number;
        }
    }

    private _parseOutcomeCountByTestResult(outcome: CommonTypes.TestOutcome, record: any): number {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return record.FailedCount as number;
            case CommonTypes.TestOutcome.Passed:
                return record.PassedCount as number;
            case CommonTypes.TestOutcome.Aborted:
                return record.AbortedCount as number;
            case CommonTypes.TestOutcome.Error:
                return record.ErrorCount as number;
            case CommonTypes.TestOutcome.Inconclusive:
                return record.InconclusiveCount as number;
            case CommonTypes.TestOutcome.NotExecuted:
                return record.NotExecutedCount as number;
            case CommonTypes.TestOutcome.NotImpacted:
                return record.NotImpactedCount as number;
        }
    }

    protected _getEntityWiseTotalCountParseFunction(entityName: string): Function {
        switch (entityName) {
            case this._testResultEntityName:
                return this._parseTotalCountByTestResult;
            case this._testRunEntityName:
            case this._testResultDailyEntityName:
                return this._parseTotalCount;
        }
    }

    protected _parseTotalCount(record: any): number {
        return record.ResultCount as number;
    }

    private _parseTotalCountByTestResult(record: any): number {
        return record.TotalCount as number;
    }

    protected _isAnalyticsRouteAPIsToTestResultDailyEnabled(): boolean {
        return TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsRouteAPIsToTestResultDailyEnabled();
    } 

    protected _isAnalyticsSwitchToTestSKContextFilterEnabled(): boolean {
        return TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsSwitchToTestSKContextFilterEnabled();
    }

    protected _isAnalyticsGroupByAndFilterOnTestSKEnabled(): boolean {
        return TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isAnalyticsGroupByAndFilterOnTestSKEnabled();
    }

    protected _getFilterByFieldsString(filters: FilterState): string {
        if (!filters) {
            return Utils_String.empty;
        }
        let filterValueList: string[] = [];

        for (const key in filters) {
            if (filters[key] && filters[key].values && filters[key].values.length > 0) {

                let filterValuePredicate: string[] = [];
                filters[key].values.forEach((filterValue: FilterValueItem) => {
                    filterValuePredicate.push(this._getFilterByFieldString(key, filterValue.value.toString()));
                });

                if (filterValuePredicate.length > 0) {
                    filterValueList.push(`(${filterValuePredicate.join(" or ")})`);
                }
            }
        }

        if (filterValueList.length > 0) {
            return ` and (${filterValueList.join(" and ")})`;
        }

        return Utils_String.empty;
    }

    private _getFilterByFieldString(filterField: string, filterSelectedValue: string): string {
        let filterFormattedValue: string = Utility.getFormattedValueStringForODataQuery(filterSelectedValue.toString());

        switch (filterField) {
            case CommonTypes.Filter.Workflow:
                filterFormattedValue = CommonTypes.Workflow[filterFormattedValue];
                break;
            case CommonTypes.Filter.Outcome:
                filterFormattedValue = CommonTypes.TestOutcome[filterFormattedValue];
                break;
            case CommonTypes.Filter.Branch:
            case CommonTypes.Filter.Environment:
                return `${this._getFilterPropertiesString(filterField)} eq ${filterFormattedValue}`;
        }

        return `${this._getFilterPropertiesString(filterField)} eq '${filterFormattedValue}'`;
    }

    private _getFilterPropertiesString(filterField: string): string {
        switch (filterField) {
            case CommonTypes.Filter.Workflow:
                return "Workflow";
            case CommonTypes.Filter.Outcome:
                return "Outcome";
            case CommonTypes.Filter.Container:
                return "Test/ContainerName";
            case CommonTypes.Filter.TestRun:
                return this._getTestRunTitlePropertyString();
            case CommonTypes.Filter.Owner:
                return "Test/TestOwner";
            case CommonTypes.Filter.Branch:
                return "BranchSK";
            case CommonTypes.Filter.Environment:
                return "ReleaseStageSK";
        }
    }

    protected _getTestRunTitlePropertyString(): string {
        //Derive classes will override implementation of method depending upon table (TestRun or TestResult) use for data source.
        return null;
    }

    protected _getPassPercentage(totalCount: number, passedCount: number, notExecutedCount: number, notImpactedCount: number): number {
        const totalPassedCountIncludingNotImpacted: number = notImpactedCount + passedCount;
        const totalCountExcludingNotExecuted: number = totalCount - notExecutedCount; 

        return (totalPassedCountIncludingNotImpacted && totalCountExcludingNotExecuted &&  
            totalCountExcludingNotExecuted > 0) ? (totalPassedCountIncludingNotImpacted * 100.0) / totalCountExcludingNotExecuted : 0 as number;
    }

    protected _testRunEntityName: string = "TestRuns";
    protected _testResultEntityName: string = "TestResults";
    protected _testResultDailyEntityName: string = "TestResultsDaily";
    protected _buildPipelineEntityName: string = "BuildPipelines";
    protected _releasePipelineEntityName: string = "ReleasePipelines";
    protected _allOutcomes: CommonTypes.TestOutcome[] = [CommonTypes.TestOutcome.Passed, CommonTypes.TestOutcome.Failed, CommonTypes.TestOutcome.Aborted,
    CommonTypes.TestOutcome.Error, CommonTypes.TestOutcome.Inconclusive, CommonTypes.TestOutcome.NotExecuted, CommonTypes.TestOutcome.NotImpacted];
}