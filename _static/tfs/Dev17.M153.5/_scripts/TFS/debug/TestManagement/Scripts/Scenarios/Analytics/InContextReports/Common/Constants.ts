
export class TestAnalyticsConstants {
    public static Report: string = "Report";
    public static TestFailures: string = "TestFailures";
    public static BuildDefinitionId: string  = "BuildDefinitionId";
    public static ReleaseDefinitionId: string = "ReleaseDefinitionId";
    public static WorkFlow: string = "WorkFlow";
    public static Build: string = "Build";
    public static Release: string = "Release";
    public static TotalTestResults: string = "TotalTestResults";
    public static Passed: string = "Passed";
    public static Failed: string = "Failed";
    public static NotExecuted: string = "NotExecuted";
    public static FailedTests: string = "FailedTests";
    public static ChartType: string = "ChartType";
    public static GroupBy: string = "GroupBy";
    public static Duration: string = "Duration";
    public static LoadType: string = "LoadType";
    public static LoadTimeInMS: string = "LoadTimeInMS";
    public static Outcome: string = "Outcome";
    public static SortBy: string = "SortBy";
    public static Rows: string = "Rows";
    public static Type: string = "Type";
    public static Test: string = "Test";
    public static Group: string = "Group";
    public static IsCached: string = "IsCached";
    public static Filters: string = "Filters";
    public static FiltersCount: string = "FiltersCount";
    public static IsUserAction: string = "IsUserAction";
}

export class TestAnalyticsRouteParameters {
    public static BuildDefinitionId: string = "buildDefinitionId";
    public static ReleaseDefinitionId: string = "releaseDefinitionId";
}

export class NavigationConstants {
    public static BuildHub: string = "ms.vss-build-web.ci-definitions-hub";
    public static BuildHubActionAnalytics: string = "ms.vss-test-web.build-definition-test-analytics-view-cardmetrics";
    public static BuildHubActionHistory: string = "history";
    public static BuildAnalyticsHub: string = "ms.vss-test-web.test-analytics-hub";
    public static ReleaseHub: string = "ms.vss-releaseManagement-web.hub-explorer";
    public static ReleasesHubActionAnalytics: string = "analytics";
    public static ReleasesHubActionOverview: string = "definitionoverview";
    public static ReleaseAnalyticsHub: string = "ms.vss-test-web.test-analytics-hub-release";
}

export class ODataQueryResponseAttributes {
    public static readonly ODataNextLink: string = "@odata.nextLink";
    public static readonly Value: string = "value";
}