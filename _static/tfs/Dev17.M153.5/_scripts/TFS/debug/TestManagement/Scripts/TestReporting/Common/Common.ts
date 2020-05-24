/* File contains common data structures that can be used across Test Reporting features */
/* No files should be imported here */


/// <summary>
/// Enum for view context
/// </summary>
export enum ViewContext {
    Build = 0,
    Release,
    ExploratorySession,
    WorkItem,
    Unsupported
}

/**
 * @brief The interface is used for inputs to Data providers e.g. Release or Build objects to Release/Build data providers
 */
export interface IData {
    mainData: any;      // Main data object: e.g. Build or Release
    subData?: any;      // sub-data object: e.g selected environment in a release
    compareWithData?: any;  // data object to compare with: e.g. selected build object or selected release object
    payload?: any;      // Any additional information that needs to be passed to the Data provider. e.g. count of builds to be fetched for trend chart.
}

export interface IItem {
    name: string;
}

export interface IDuration {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

export interface ITestFailureData {
    newFailures: number;
    existingFailures: number;
    totalFailures: number;
}

/**
 * @brief All implemented extension names should be used from here
 */
export class ExtensionNames {
    public static TestTabInReleaseSummary = "ms.vss-test-web.test-result-in-release-management";
    public static TestTabInBuildSummary = "ms.vss-test-web.test-result-details";
    public static TestResultHistoryId = "ms.vss-test-web.test-result-history";
}

export class Constants {
    public static BuildTrendCount = 10;
    public static ReleaseTrendCount = 10;
    public static SelectedEnvironmentIdUrlOption = "selectedEnvironmentId";
    public static HyperLinkTextForegroundColor = "#007ACC";
    public static SuppressedTextForegroundColor = "grey";
}

export class UrlKeyWords {
    public static TestTab_DropDownPivot_GroupByOption = "testtab-groupby-command";
    public static TestTab_DropDownPivot_GroupByValue = "testtab-groupby-value";
    public static TestTab_DropDownPivot_FilterOption = "testtab-filter-command";
}

export const TestResultSummaryTitleView = $(`
                        <table cellpadding="0" >
                            <tr class="title-row">
                                <td class="query-title" />
                                <td class="query-status" />
                            </tr>
                        </table>
                    `);

