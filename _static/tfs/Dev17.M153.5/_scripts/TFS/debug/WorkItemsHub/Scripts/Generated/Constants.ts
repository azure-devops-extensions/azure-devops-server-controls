
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Server.WebAccess.WorkItemsHub.Plugins
//----------------------------------------------------------


export module MentionedTabDataProvider {
    export var MentionedDateField = "MentionedDate";
}

export module RecentActivityConstants {
    export var MyActivityDateField = "MyActivityDate";
    export var MyActivityDetailsField = "MyActivityDetails";
    export var RecentlyUpdatedDateField = "RecentlyUpdatedDate";
}

export module WorkItemsHubPaging {
    export var MaxWorkItems = 1000;
}

export module WorkItemsHubRouteConstants {
    export var TabRouteParameterName = "name";
}

export module WorkItemsHubSettingsHelper {
    export var WorkItemsHubRecentTabIdKey = "WorkItemsHub/RecentTabId";
    export var WorkItemsHubColumnSettingsKeyTemplate = "WorkItemsHub/ColumnSettings/{0}";
    export var WorkItemsHubShowCompletedKeyTemplate = "WorkItemsHub/ShowCompleted/{0}";
    export var InjectedCommentCount = 1;
    export var NonexistentCommentCount = 0;
}

export enum WorkItemsHubTabs {
    AssignedToMe = 0,
    Following = 1,
    Mentioned = 2,
    MyActivity = 3,
    RecentlyCreated = 4,
    RecentlyUpdated = 5,
    RecentlyCompleted = 6,
    MyTeams = 7,
}

