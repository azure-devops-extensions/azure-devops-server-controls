import { ODataQueryOptions } from "Analytics/Scripts/OData";
import { ODataQueryResponseAttributes } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { DataSourceHelper } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/DataSourceHelper";
import { TestReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestReportSource";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VssContext from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";

interface IOutcomeODataFilterAndAggrString {
    outcomeCountCastedAggrStr: string;
    outcomeCountAggrStr: string;
    outcomeCountFilterStr: string;
}

export class DetailedTestListSource extends TestReportSource {
    constructor() {
        super("TestResultsAnalytics_InContext_DetailedTestListReport");
    }

    public static getInstance(): DetailedTestListSource {
        return FluxFactory.instance().get(DetailedTestListSource);
    }

    public static getKey(): string {
        return "DetailedTestListSource";
	}

    public dispose(): void {
    }

    public async queryDetailedList(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, orderByColumn: CommonTypes.IDetailedListColumn,
        nextPageToken: CommonTypes.INextDataPageToken, groupValue: number | string): Promise<CommonTypes.IDetailedListData> {

        let responsePromise: IPromise<CommonTypes.IODataQueryResponse> = null;
        // When Odata next link exists then query by URL
        if (nextPageToken && nextPageToken.token) {
            responsePromise = this.queryODataByUrl(nextPageToken.token);
        } else {
            switch (DataSourceHelper.getTestListDataSourceTable(confValues)) {
                case CommonTypes.DataSourceTable.TestResult:
                    responsePromise = this._queryDetailedList_TestResultTable(testResultContext, confValues, orderByColumn, nextPageToken, groupValue);
                    break;
                case CommonTypes.DataSourceTable.TestResultDaily:
                    responsePromise = this._queryDetailedList_TestResultDailyTable(testResultContext, confValues, orderByColumn, nextPageToken, groupValue);
                    break;
            }
        }

        const responseData: CommonTypes.IODataQueryResponse = await responsePromise;

        if (!responseData || !responseData.value) {
            return null;
        }

        // Iterate over all data.
        const detailedListItems = (responseData.value as any[]).map(d => {
            return {
                itemkey: (this._isAnalyticsGroupByAndFilterOnTestSKEnabled() ? d.TestSK : d.Test.FullyQualifiedTestName) as string,
                itemName: d.Test.TestName as string,
                totalCount: d.TotalCount as number,
                passPercentage: d.PassRate as number,
                avgDuration: d.AvgDuration as number,
                failedCount: d.FailedCount as number,
                passedCount: d.PassedCount as number,
                inconclusiveCount: d.InconclusiveCount as number,
                abortedCount: d.AbortedCount as number,
                notExecutedCount: d.NotExecutedCount as number,
                errorCount: d.ErrorCount as number,
                notImpactedCount: d.NotImpactedCount as number
            } as CommonTypes.IDetailedListItem;
        });

        return {
            detailedListItems: detailedListItems, confValues: confValues, isCachedData: responseData.isCachedData, nextPageToken: { token: responseData[ODataQueryResponseAttributes.ODataNextLink] }
        } as CommonTypes.IDetailedListData;
    }

    private _queryDetailedList_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, orderByColumn: CommonTypes.IDetailedListColumn,
        nextPageToken: CommonTypes.INextDataPageToken, groupValue: number | string): IPromise<CommonTypes.IODataQueryResponse> {

        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        const filterStr: string =
            `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)}` +
            ` ${this._getFilterToApplyForGroup(confValues.groupBy, groupValue)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        const outcomeStrings: IOutcomeODataFilterAndAggrString = this._getOutcomeCountFilterAndAggregationStrings(confValues.outcomes);
        let outcomeAggrStr: string = `${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.Passed)}, ${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.Failed)},` +
            `${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.NotExecuted)}, ${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.NotImpacted)}`;

        confValues.outcomes.forEach(o => {
            if (o !== CommonTypes.TestOutcome.Passed && o !== CommonTypes.TestOutcome.NotExecuted && o !== CommonTypes.TestOutcome.Failed && o !== CommonTypes.TestOutcome.NotImpacted) {
                outcomeAggrStr += `, ${this._getOutcomeCountAggregationStringTestRun(o)}`;
            }
        });

        const groupByStr: string = `groupby((${this._isAnalyticsGroupByAndFilterOnTestSKEnabled() ? "TestSK" : "Test/FullyQualifiedTestName"}, Test/TestName),`
            + ` aggregate(ResultCount with sum as TotalCount, ResultDurationSeconds with sum as TotalDuration, ${outcomeAggrStr}))`;

        let $apply: string = Utils_String.empty;
        if (!outcomeStrings.outcomeCountFilterStr) {
            $apply = `${filterStr}/${groupByStr}`;
        }
        else {
            $apply = `${filterStr}/${groupByStr}/filter(${outcomeStrings.outcomeCountFilterStr})`;
        }

        /* Here AvgDuration of test is calculated by sum of duration/sum of count.  Other way is find avg of each row in TestResultDaily and then take avg of all averages. */
        queryOptions.$apply = `${$apply}/compute(TotalDuration div cast(TotalCount,Edm.Double) as AvgDuration,` +
            `iif(TotalCount gt NotExecutedCount, ((PassedCount add NotImpactedCount) div cast(TotalCount sub NotExecutedCount, Edm.Decimal)) mul 100, 0) as PassRate)`;

        queryOptions.$orderby = this._getOrderByColumnClause(orderByColumn);

        return this.queryOData(queryOptions, true);
    }

    private _queryDetailedList_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration, orderByColumn: CommonTypes.IDetailedListColumn,
        nextPageToken: CommonTypes.INextDataPageToken, groupValue: number | string): IPromise<CommonTypes.IODataQueryResponse> {

        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        let filterStr: string =
            `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)}` +
            ` ${this._getFilterToApplyForGroup(confValues.groupBy, groupValue)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        let outcomeStrings: IOutcomeODataFilterAndAggrString = this._getOutcomeCountFilterAndAggregationStrings(confValues.outcomes);
        let groupByStr: string = `groupby((${this._isAnalyticsGroupByAndFilterOnTestSKEnabled() ? "TestSK" : "Test/FullyQualifiedTestName"}, Test/TestName),`
            + ` aggregate($count as TotalCount, DurationSeconds with sum as TotalDuration, ${outcomeStrings.outcomeCountCastedAggrStr}))`;

        let $apply: string = Utils_String.empty;
        if (!outcomeStrings.outcomeCountFilterStr) {
            $apply = `${filterStr}/${groupByStr}`;
        }
        else {
            $apply = `${filterStr}/${groupByStr}/filter(${outcomeStrings.outcomeCountFilterStr})`;
        }

        queryOptions.$apply = `${$apply}/compute(TotalDuration div cast(TotalCount,Edm.Double) as AvgDuration,` +
            `iif(TotalCount gt NotExecutedCount, ((PassedCount add NotImpactedCount) div cast(TotalCount sub NotExecutedCount, Edm.Decimal)) mul 100, 0) as PassRate)`;

        queryOptions.$orderby = this._getOrderByColumnClause(orderByColumn);

        return this.queryOData(queryOptions, true);

    }

    public async queryGroupedDetailedList(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration,
        orderByColumn: CommonTypes.IDetailedListColumn, nextPageToken: CommonTypes.INextDataPageToken): Promise<CommonTypes.IDetailedListData> {

        if (confValues.groupBy === CommonTypes.GroupBy.None) {
            return this.queryDetailedList(testResultContext, confValues, orderByColumn, nextPageToken, null);
        }

        let responsePromise: IPromise<CommonTypes.IODataQueryResponse> = null;
        // When Odata next link exists then query by URL
        if (nextPageToken && nextPageToken.token) {
            responsePromise = this.queryODataByUrl(nextPageToken.token);
        }
        else {
            switch (DataSourceHelper.getGroupedListDataSourceTable(confValues)) {
                case CommonTypes.DataSourceTable.TestResult:
                    responsePromise = this._queryGroupedDetailedList_TestResultTable(testResultContext, confValues, orderByColumn, nextPageToken);
                    break;
                case CommonTypes.DataSourceTable.TestResultDaily:
                    responsePromise = this._queryGroupedDetailedList_TestResultDailyTable(testResultContext, confValues, orderByColumn, nextPageToken);
                    break;
                case CommonTypes.DataSourceTable.TestRun:
                    responsePromise = this._queryGroupedDetailedList_TestRunTable(testResultContext, confValues, orderByColumn, nextPageToken);
                    break;
            }
        }

        const responseData: CommonTypes.IODataQueryResponse = await responsePromise;

        if (!responseData || !responseData.value) {
            return null;
        }

        //Iterate over all data.
        let detailedListItems = (responseData.value as any[]).map(d => {
            let props = this._parseTestProperties(confValues.groupBy, d);
            return {
                itemkey: props.actualValue,
                itemName: props.displayValue,
                totalCount: d.TotalCount as number,
                passPercentage: d.PassRate as number,
                avgDuration: d.AvgDuration as number,
                failedCount: d.FailedCount as number,
                passedCount: d.PassedCount as number,
                inconclusiveCount: d.InconclusiveCount as number,
                abortedCount: d.AbortedCount as number,
                notExecutedCount: d.NotExecutedCount as number,
                errorCount: d.ErrorCount as number,
                notImpactedCount: d.NotImpactedCount as number
            } as CommonTypes.IDetailedListItem;
        });

        return { detailedListItems: detailedListItems, confValues: confValues, isCachedData: responseData.isCachedData, nextPageToken: { token: responseData[ODataQueryResponseAttributes.ODataNextLink] } } as CommonTypes.IDetailedListData;
    }   

    private _queryGroupedDetailedList_TestRunTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration,
        orderByColumn: CommonTypes.IDetailedListColumn, nextPageToken: CommonTypes.INextDataPageToken): IPromise<CommonTypes.IODataQueryResponse> {

        let queryOptions = {
            entityType: this._testRunEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "Title" };

        let filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        let outcomeAggrStr: string = `${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.Passed)}, ${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.Failed)}, ${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.NotExecuted)}
, ${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.NotImpacted)}`;

        confValues.outcomes.forEach(o => {
            if (o !== CommonTypes.TestOutcome.Passed && o !== CommonTypes.TestOutcome.NotExecuted && o !== CommonTypes.TestOutcome.Failed && o !== CommonTypes.TestOutcome.NotImpacted) {
                outcomeAggrStr += `, ${this._getOutcomeCountAggregationStringTestRun(o)}`;
            }
        });

        let outcomeStrings: IOutcomeODataFilterAndAggrString = this._getOutcomeCountFilterAndAggregationStrings(confValues.outcomes);

        let groupByTestProperty = this._getGroupByTestRunPropertiesString(confValues.groupBy);
        let groupByTestResultsContext = this._getGroupByTestResultsContext(testResultContext);
        let groupByStr: string = `groupby((${groupByTestProperty}, ${groupByTestResultsContext}),`;
        groupByStr += `aggregate(ResultCount with sum as TotalCount, ResultDurationSeconds with sum as TotalDuration, ${outcomeAggrStr}))/`;
        groupByStr += `groupby((${groupByTestProperty}),`;
        groupByStr += `aggregate(TotalCount with sum as TotalCount, TotalDuration with average as AvgDuration, ${outcomeStrings.outcomeCountAggrStr}))`;

        let $apply: string = Utils_String.empty;
        if (!outcomeStrings.outcomeCountFilterStr) {
            $apply = `${filterStr}/${groupByStr}`;
        }
        else {
            $apply = `${filterStr}/${groupByStr}/filter(${outcomeStrings.outcomeCountFilterStr})`;
        }

        queryOptions.$apply = `${$apply}/compute(iif(TotalCount gt NotExecutedCount, ((PassedCount add NotImpactedCount) div cast(TotalCount sub NotExecutedCount, Edm.Decimal)) mul 100, 0) as PassRate)`;

        queryOptions.$orderby = this._getOrderByColumnClause(orderByColumn);

        return this.queryOData(queryOptions, true);
    }

    private _queryGroupedDetailedList_TestResultDailyTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration,
        orderByColumn: CommonTypes.IDetailedListColumn, nextPageToken: CommonTypes.INextDataPageToken): IPromise<CommonTypes.IODataQueryResponse> {

        let queryOptions = {
            entityType: this._testResultDailyEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        let filterStr: string = `filter(${this._getTestResultsContextPipelineFilter(testResultContext)} and ${this._getDailyDateFilter(confValues.trendBy, confValues.period)}` +
            ` ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        let outcomeStrings: IOutcomeODataFilterAndAggrString = this._getOutcomeCountFilterAndAggregationStrings(confValues.outcomes);
        let outcomeAggrStr: string = `${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.Passed)}, ${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.Failed)},` +
            `${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.NotExecuted)}, ${this._getOutcomeCountAggregationStringTestRun(CommonTypes.TestOutcome.NotImpacted)}`;

        confValues.outcomes.forEach(o => {
            if (o !== CommonTypes.TestOutcome.Passed && o !== CommonTypes.TestOutcome.NotExecuted && o !== CommonTypes.TestOutcome.Failed && o !== CommonTypes.TestOutcome.NotImpacted) {
                outcomeAggrStr += `, ${this._getOutcomeCountAggregationStringTestRun(o)}`;
            }
        });

        let groupByStr: string =
            `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}, DateSK), aggregate(ResultCount with sum as TotalCount, ResultDurationSeconds div ResultCount with sum as TotalAvgDuration, ${outcomeAggrStr}))/` +
            `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}), aggregate(TotalCount with sum as TotalCount, TotalAvgDuration with average as AvgDuration, ${outcomeStrings.outcomeCountAggrStr}))`;

        let $apply: string = Utils_String.empty;
        if (!outcomeStrings.outcomeCountFilterStr) {
            $apply = `${filterStr}/${groupByStr}`;
        }
        else {
            $apply = `${filterStr}/${groupByStr}/filter(${outcomeStrings.outcomeCountFilterStr})`;
        }

        queryOptions.$apply = `${$apply}/compute(iif(TotalCount gt NotExecutedCount, ((PassedCount add NotImpactedCount) div cast(TotalCount sub NotExecutedCount, Edm.Decimal)) mul 100, 0) as PassRate)`;

        queryOptions.$orderby = this._getOrderByColumnClause(orderByColumn);

        return this.queryOData(queryOptions, true);
    }

    private _queryGroupedDetailedList_TestResultTable(testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration,
        orderByColumn: CommonTypes.IDetailedListColumn, nextPageToken: CommonTypes.INextDataPageToken): IPromise<CommonTypes.IODataQueryResponse> {

        let queryOptions = {
            entityType: this._testResultEntityName,
            project: VssContext.getDefaultWebContext().project.id
        } as ODataQueryOptions;

        this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

        const filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

        let outcomeStrings: IOutcomeODataFilterAndAggrString = this._getOutcomeCountFilterAndAggregationStrings(confValues.outcomes);
        let groupByStr: string = `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}, ${this._getGroupByTestResultsContext(testResultContext)}),` +
            `aggregate($count as TotalCount, DurationSeconds with sum as TotalDuration, ${outcomeStrings.outcomeCountCastedAggrStr}))/` +
            `groupby((${this._getGroupByTestPropertiesString(confValues.groupBy)}),aggregate(TotalCount with sum as TotalCount, TotalDuration with average as AvgDuration, ${outcomeStrings.outcomeCountAggrStr}))`;

        let $apply: string = Utils_String.empty;
        if (!outcomeStrings.outcomeCountFilterStr) {
            $apply = `${filterStr}/${groupByStr}`;
        }
        else {
            $apply = `${filterStr}/${groupByStr}/filter(${outcomeStrings.outcomeCountFilterStr})`;
        }

        queryOptions.$apply = `${$apply}/compute(iif(TotalCount gt NotExecutedCount, ((PassedCount add NotImpactedCount) div cast(TotalCount sub NotExecutedCount, Edm.Decimal)) mul 100, 0) as PassRate)`;

        queryOptions.$orderby = this._getOrderByColumnClause(orderByColumn);

        return this.queryOData(queryOptions, true);
    }

    private _getFilterToApplyForGroup(group: CommonTypes.GroupBy, groupValue: number | string): string {
        //We are appending 'and' before predicate to be used with filter clause and when no group supplied then return no predicate. Value like true or 1 eq 1 adds extra filter in SQL plan.
        if (groupValue === null /* We are srictly checking only for null as we are passing null when no gruop by. This is to ensure that values like empty string or 0 is not bypassed. */) {
            return Utils_String.empty;
        }
        groupValue = Utility.getFormattedValueStringForODataQuery(groupValue.toString());
        switch (group) {
            case CommonTypes.GroupBy.Container:
                return ` and Test/ContainerName eq '${groupValue}'`;
            case CommonTypes.GroupBy.Owner:
                return ` and Test/TestOwner eq '${groupValue}'`;
            case CommonTypes.GroupBy.Priority:
                return ` and Test/Priority eq ${groupValue}`;
            case CommonTypes.GroupBy.Environment:
                return ` and ReleaseStage/ReleaseStageId eq ${groupValue}`;
            case CommonTypes.GroupBy.Branch:
                if (groupValue === Utils_String.empty) {
                    return ` and Branch/BranchName eq null`;
                }

                return ` and Branch/BranchName eq '${groupValue}'`;
            case CommonTypes.GroupBy.TestRun:
                return ` and TestRun/Title eq '${groupValue}'`;
        }
    }

    /**
     * Dont intent query string lines in this methods by tabs or spaces as they will increase URL length.
     */
    private _getOutcomeCountFilterAndAggregationStrings(outcomes: CommonTypes.TestOutcome[]): IOutcomeODataFilterAndAggrString {
        //Three outcomes are mandatory for detailed list: Pass, Fail, Not executed. Others are required for filtering out data.
        let outcomeCountCastedAggregationStr: string = `${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.Passed)},
${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.Failed)}, ${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.NotExecuted)},
${this._getOutcomeCountCastedAggregationString(CommonTypes.TestOutcome.NotImpacted)}`;

        let outcomeCountAggregationStr: string = `${this._getOutcomeCountAggregationString(CommonTypes.TestOutcome.Passed)},
${this._getOutcomeCountAggregationString(CommonTypes.TestOutcome.Failed)}, ${this._getOutcomeCountAggregationString(CommonTypes.TestOutcome.NotExecuted)},
${this._getOutcomeCountAggregationString(CommonTypes.TestOutcome.NotImpacted)}`;

        let outcomeCountFilterString: string = Utils_String.empty;
        outcomes.forEach(o => {
            if (o !== CommonTypes.TestOutcome.Passed && o !== CommonTypes.TestOutcome.Failed && o !== CommonTypes.TestOutcome.NotExecuted && o !== CommonTypes.TestOutcome.NotImpacted) {
                outcomeCountCastedAggregationStr += `, ${this._getOutcomeCountCastedAggregationString(o)}`;
                outcomeCountAggregationStr += `, ${this._getOutcomeCountAggregationString(o)}`;
            }

            if (!outcomeCountFilterString) {
                outcomeCountFilterString = this._getOutcomeCountFilterString(o);
            }
            else {
                outcomeCountFilterString += ` or ${this._getOutcomeCountFilterString(o)} `;
            }
        });

        return {
            outcomeCountCastedAggrStr: outcomeCountCastedAggregationStr,
            outcomeCountAggrStr: outcomeCountAggregationStr,
            outcomeCountFilterStr: outcomeCountFilterString
        };
    }

    private _getOutcomeCountAggregationString(outcome: CommonTypes.TestOutcome): string {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return `FailedCount with sum as FailedCount`;
            case CommonTypes.TestOutcome.Passed:
                return `PassedCount with sum as PassedCount`;
            case CommonTypes.TestOutcome.Aborted:
                return `AbortedCount with sum as AbortedCount`;
            case CommonTypes.TestOutcome.Error:
                return `ErrorCount with sum as ErrorCount`;
            case CommonTypes.TestOutcome.Inconclusive:
                return `InconclusiveCount with sum as InconclusiveCount`;
            case CommonTypes.TestOutcome.NotExecuted:
                return `NotExecutedCount with sum as NotExecutedCount`;
            case CommonTypes.TestOutcome.NotImpacted:
                return `NotImpactedCount with sum as NotImpactedCount`;
        }
    }

    private _getOutcomeCountFilterString(outcome: CommonTypes.TestOutcome): string {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return `FailedCount gt 0`;
            case CommonTypes.TestOutcome.Passed:
                return `PassedCount gt 0`;
            case CommonTypes.TestOutcome.Aborted:
                return `AbortedCount gt 0`;
            case CommonTypes.TestOutcome.Error:
                return `ErrorCount gt 0`;
            case CommonTypes.TestOutcome.Inconclusive:
                return `InconclusiveCount gt 0`;
            case CommonTypes.TestOutcome.NotExecuted:
                return `NotExecutedCount gt 0`;
            case CommonTypes.TestOutcome.NotImpacted:
                return `NotImpactedCount gt 0`;
        }
    }

    private _getOrderByColumnClause(orderByColumn: CommonTypes.IDetailedListColumn): string {
        if (orderByColumn) {
            let orderByStr: string = Utils_String.empty;
            switch (orderByColumn.column) {
                case CommonTypes.ColumnIndices.FailedCount:
                    orderByStr = "FailedCount";
                    break;
                case CommonTypes.ColumnIndices.Passrate:
                    orderByStr = "PassRate";
                    break;
                case CommonTypes.ColumnIndices.TotalCount:
                    orderByStr = "TotalCount";
                    break;
                case CommonTypes.ColumnIndices.NotExecutedCount:
                    orderByStr = "NotExecutedCount";
                    break;
                case CommonTypes.ColumnIndices.AvgDuration:
                    orderByStr = "AvgDuration";
                    break;
                case CommonTypes.ColumnIndices.PassedCount:
                    orderByStr = "PassedCount";
                    break;
                case CommonTypes.ColumnIndices.NotImpactedCount:
                    orderByStr = "NotImpactedCount";
                    break;
                case CommonTypes.ColumnIndices.InconclusiveCount:
                    orderByStr = "InconclusiveCount";
                    break;
                case CommonTypes.ColumnIndices.AbortedCount:
                    orderByStr = "AbortedCount";
                    break;
                case CommonTypes.ColumnIndices.ErrorCount:
                    orderByStr = "ErrorCount";
                    break;

                default:
                    orderByStr = "FailedCount";
                    break;
            }

            switch (orderByColumn.sortOrder) {
                case CommonTypes.SortOrder.Ascending:
                    return Utils_String.format("{0} asc", orderByStr);
                case CommonTypes.SortOrder.Descending:
                    return Utils_String.format("{0} desc", orderByStr);
            }
        }
        return "FailedCount desc";
    }

    private _getOutcomeCountAggregationStringTestRun(outcome: CommonTypes.TestOutcome): string {
        switch (outcome) {
            case CommonTypes.TestOutcome.Failed:
                return `ResultFailCount with sum as FailedCount`;
            case CommonTypes.TestOutcome.Passed:
                return `ResultPassCount with sum as PassedCount`;
            case CommonTypes.TestOutcome.Aborted:
                return `ResultAbortedCount with sum as AbortedCount`;
            case CommonTypes.TestOutcome.Error:
                return `ResultErrorCount with sum as ErrorCount`;
            case CommonTypes.TestOutcome.Inconclusive:
                return `ResultInconclusiveCount with sum as InconclusiveCount`;
            case CommonTypes.TestOutcome.NotExecuted:
                return `ResultNotExecutedCount with sum as NotExecutedCount`;
            case CommonTypes.TestOutcome.NotImpacted:
                return `ResultNotImpactedCount with sum as NotImpactedCount`;
        }
    }
}
