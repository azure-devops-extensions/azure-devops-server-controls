import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";
import { AnalyticsODataClient } from "TestManagement/Scripts/TestReporting/Analytics/AnalyticsODataClient";
import { TestChartData } from "TestManagement/Scripts/TestReporting/Analytics/TestChartData";
import { TestRunAggregateChartData, TestRunGroupByAggregateChartData, TestRunStackByAggregateChartData } from "TestManagement/Scripts/TestReporting/Analytics/TestRunsChartData";
import { TestResultAggregateChartData, TestResultGroupByAggregateChartData } from "TestManagement/Scripts/TestReporting/Analytics/TestResultsChartData";

import Contracts = require("TFS/TestManagement/Contracts");

export class AnalyticsChartingClient extends AnalyticsODataClient {

    constructor(command: string) {
        super(command);

        this._testRunAggregateChartData = new TestRunAggregateChartData();
        this._testRunStackByAggregateChartData = new TestRunStackByAggregateChartData();
        this._testResultAggregateChartData = new TestResultAggregateChartData();
        this._testRunGroupByAggregateChartData = new TestRunGroupByAggregateChartData();
        this._testResultGroupByAggregateChartData = new TestResultGroupByAggregateChartData();
    }

    public getChartData(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number, stackBy?: boolean): IPromise<AnalyticsTypes.IAnalyticsChartData[]> {

        let oDataQueryOptions: AnalyticsTypes.IQueryODataOptions;
        //TODO: We are identifying Testresult aggregate or testrun aggregate by stackBy. Need to to come up with better way.
        if (stackBy) {
            if (chartOptions.stackBy == AnalyticsTypes.Chart_StackBy.TestRun) {
                oDataQueryOptions = this._testRunStackByAggregateChartData.getChartData(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue, chartOptions.stackBy);
            }
            else {
                oDataQueryOptions = this._testResultAggregateChartData.getChartData(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue, chartOptions.stackBy);
            }
        }
        else {
            oDataQueryOptions = this._testRunAggregateChartData.getChartData(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        }

        return this.queryOData(oDataQueryOptions.queryOptions)
            .then((data: any) => {
                return oDataQueryOptions.onSuccess ? oDataQueryOptions.onSuccess(data) : null;
            });
    }

    public getGroupByChartData(projectId: string, publishContextDetails: Contracts.TestResultsContext, repositoryId: string, branchName: string, chartOptions: AnalyticsTypes.ISingleChartOptions,
        periodGroup: AnalyticsTypes.Chart_PeriodGroup, periodGroupValue: number): IPromise<AnalyticsTypes.IAnalyticsChartData[]> {

        let oDataQueryOptions: AnalyticsTypes.IQueryODataOptions;
        if (chartOptions.stackBy == AnalyticsTypes.Chart_StackBy.TestRun) {
            oDataQueryOptions = this._testRunGroupByAggregateChartData.getChartData(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        }
        else {
            oDataQueryOptions = this._testResultGroupByAggregateChartData.getChartData(projectId, publishContextDetails, repositoryId, branchName, chartOptions, periodGroup, periodGroupValue);
        }

        return this.queryOData(oDataQueryOptions.queryOptions)
            .then((data: any) => {
                return oDataQueryOptions.onSuccess ? oDataQueryOptions.onSuccess(data) : null;
            });
    }

    private _testRunAggregateChartData: TestChartData;
    private _testRunStackByAggregateChartData: TestChartData;
    private _testResultAggregateChartData: TestChartData;
    private _testRunGroupByAggregateChartData: TestChartData;
    private _testResultGroupByAggregateChartData: TestChartData;
}