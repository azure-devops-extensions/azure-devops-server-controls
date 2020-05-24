import { ODataQueryOptions } from "Analytics/Scripts/OData";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ODataQueryResponseAttributes } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { TestReportSource } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Sources/TestReportSource";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VssContext from "VSS/Context";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

export class TestHistoryListSource extends TestReportSource {
    constructor() {
        super("TestResultsAnalytics_InContext_TestHistoryReport");
    }

    public static getInstance(): TestHistoryListSource {
        return FluxFactory.instance().get(TestHistoryListSource);
    }

    public static getKey(): string {
        return "TestHistoryListSource";
	}

    public dispose(): void {
    }

    public queryTestHistoryList(testResultContext: TCMContracts.TestResultsContext, testContext: CommonTypes.ITestContext, confValues: CommonTypes.IReportConfiguration,
        nextPageToken: CommonTypes.INextDataPageToken): IPromise<CommonTypes.ITestHistoryListData> {

        let responsePromise: IPromise<CommonTypes.IODataQueryResponse> = null;

        if (nextPageToken && nextPageToken.token) {
            responsePromise = this.queryODataByUrl(nextPageToken.token);
        }
        else {
            let queryOptions = {
                entityType: this._testResultEntityName,
                project: VssContext.getDefaultWebContext().project.id
            } as ODataQueryOptions;

            let expandStr: string = "Branch($select = BranchName)";

            this._getTestRunTitlePropertyString = () => { return "TestRun/Title" };

            let filterStr: string = `filter(${this._getTestResultsContextFilter(testResultContext)} and ${this._getDateFilter(confValues.trendBy, confValues.period)}`
                + ` and ${this._getTestContextFilter(testContext.testIdentifier)} ${this._getFilterByFieldsString(confValues.configuredFilters)})`;

            let selectStr: string = "Outcome,CompletedDate,DurationSeconds,TestResultId,TestRunId";

            // Only when TestHistoryList is in a release context, fetch environment Id
            if (testResultContext.contextType === TCMContracts.TestResultsContextType.Release) {
                expandStr += `,${this._getReleaseEnvironmentDefinitionExpandString(testResultContext)}`;
            }

            queryOptions.$expand = `${expandStr}`;
            queryOptions.$apply = `${filterStr}`;
            queryOptions.$select = `${selectStr}`;
            queryOptions.$orderby = `CompletedDate desc`;

            responsePromise = this.queryOData(queryOptions, true);
        }

        return responsePromise.then((data: CommonTypes.IODataQueryResponse) => {
            if (!data || !data.value) {
                return null;
            }

            //Iterate over all data.
            let testHistoryListItems = (data.value as any[]).map(d => {
                return {
                    itemkey: { testRunId: d.TestRunId, testResultId: d.TestResultId } as CommonTypes.ITestResultIdentifier,
                    itemName: d.TestResultId as string,
                    outcome: d.Outcome as string,
                    date: d.CompletedDate ? Utils_Core.convertValueToDisplayString(new Date(d.CompletedDate)) : Resources.NotAvailable,     //Date coming from server is in ISO 8601 format: yyyy-mm-ddTHH.mm.dd-HH:mm
                    duration: d.DurationSeconds ? d.DurationSeconds : 0,
                    branch: d.Branch && d.Branch.BranchName ? d.Branch.BranchName : Resources.NoBranchText,
                    environmentRef: {
                                        id: (d.ReleaseEnvironment && d.ReleaseEnvironment.ReleaseEnvironmentDefinitionId) ?
                                                d.ReleaseEnvironment.ReleaseEnvironmentDefinitionId : 0,
                                        name: Utils_String.empty
                                    } as CommonTypes.ITestObjectReference
                } as CommonTypes.ITestHistoryListItem;
            });

            return { testHistoryListItems: testHistoryListItems, confValues: confValues, isCachedData: data.isCachedData, nextPageToken: { token: data[ODataQueryResponseAttributes.ODataNextLink] } } as CommonTypes.ITestHistoryListData;
        });
    }

    private _getReleaseEnvironmentDefinitionExpandString(testResultsContext: TCMContracts.TestResultsContext): string {
            return `ReleaseEnvironment($select = ReleaseEnvironmentDefinitionId)`;
    }
}
