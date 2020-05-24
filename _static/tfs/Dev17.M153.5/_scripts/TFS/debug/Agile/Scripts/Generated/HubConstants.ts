
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Server.WebAccess.Agile
//----------------------------------------------------------


/**
* Points (i.e. contribution ids) for targeting all agile hubs.
*/
export module AgileHubContributionIds {
    export var BacklogConfiguration_DataProvider = "ms.vss-work-web.agile-backlog-configuration-data-provider";
    export var TeamSetting_DataProvider = "ms.vss-work-web.team-wit-settings-data-provider";
    export var Settings_Route = "ms.vss-admin-web.project-admin-hub-route";
}

export module AgileHubServerConstants {
    export var FilterRegistryKeyFormat = "{0}/{1}/Filter";
    export var TeamMRUKey = "Agile/Team";
    export var HelpLinkPlanAnIteration = "https://go.microsoft.com/fwlink/?LinkId=209524";
}

export module AgileQueryParameters {
    export var TeamId = "teamid";
    export var Level = "level";
}

export module AgileRouteParameters {
    export var Name = "name";
    export var Project = "project";
    export var Team = "team";
    export var Pivot = "pivot";
    export var Iteration = "iteration";
    export var TeamName = "teamName";
    export var BacklogLevel = "backlogLevel";
    export var Id = "id";
    /**
    * This parameter is not surfaced in the user-visible url but instead it's used for contribution constraints
    */
    export var ViewName = "viewname";
}

export module BacklogConstants {
    export var SprintForecastVelocity = "AgileBacklog.SprintForecastVelocity";
    export var DefaultSprintForecastVelocity = 10;
    export var ShowForecastFilter = "AgileBacklog.ShowForecastFilter";
    export var ActionNameIteration = "Iteration";
    export var NumberOfIterationsInVelocity = 5;
    export var ShowInProgressFilter = "AgileBacklog.ShowInProgressFilter";
}

export module BacklogsHubConstants {
    export var HUB_NAME = "Backlogs";
    export var BacklogPivot = "backlog";
    export var InProgressParameter = "inProgress";
    export var InProgressSetting = "Agile/BacklogsHub/InProgressFilter";
    export var ShowParentsQueryParameter = "showParents";
    export var RightPaneQueryParameter = "rightPane";
    export var ShowParentsSetting = "Agile/BacklogsHub/ShowParentsFilter";
    export var ForecastingParameter = "forecasting";
    export var ForecastingSetting = "Agile/BacklogsHub/Forecasting";
    export var PaneParameter = "pane";
    export var PaneSetting = "Agile/BacklogsHub/Pane";
    export var MruBacklogKey = "Agile/BacklogsHub/BacklogId";
    export var HUB_CONTRIBUTION_ID = "ms.vss-work-web.backlogs-hub";
    export var PRODUCTBACKLOG_DATAPROVIDER_ID = "ms.vss-work-web.backlogs-hub-backlog-data-provider";
    export var HEADER_DATAPROVIDER_ID = "ms.vss-work-web.backlogs-hub-content-header-data-provider";
    export var ContentRouteContributionId = "ms.vss-work-web.backlogs-content-route";
    export var DirectoryRouteContributionId = "ms.vss-work-web.backlogs-directory-route";
    export var LegacyBacklogsHubContributionRouteId = "ms.vss-work-web.agile-route";
    export var DirectoryViewName = "directory";
}

export module BoardsHubConstants {
    export var HUB_NAME = "Boards";
    export var HUB_CONTRIBUTION_ID = "ms.vss-work-web.boards-hub";
    export var TEAM_BOARD_CONTENT_ROUTE_CONTRIBUTION_ID = "ms.vss-work-web.team-board-content-route";
    export var EMBEDDED_ROUTE_CONTRIBUTION_ID = "ms.vss-work-web.microsoft-teams-board-tab-content-route";
    export var DIRECTORY_ROUTE_CONTRIBUTION_ID = "ms.vss-work-web.boards-directory-route";
    export var TEAM_BOARD_CONTENT_HEADER_DATAPROVIDER_ID = "ms.vss-work-web.team-board-content-header-data-provider";
    export var TEAM_BOARD_CONTENT_DATAPROVIDER_ID = "ms.vss-work-web.team-board-content-data-provider";
    export var MruBacklogKey = "Agile/BoardsHub/BacklogId";
}

export module BoardsHubRoutingConstants {
    export var AllPivot = "all";
    export var MinePivot = "mine";
    export var BoardPivot = "board";
    export var DirectoryViewName = "directory";
}

export module BoardsHubServerConstants {
    export var ContentContributionRouteId = "ms.vss-work-web.team-board-content-route";
    export var DirectoryContributionRouteId = "ms.vss-work-web.boards-directory-route";
    export var IdBoardContributionRouteId = "ms.vss-work-web.idboard-route";
    export var EmbeddedContentContributionRouteId = "ms.vss-work-web.microsoft-teams-board-tab-content-route";
    export var EmbeddedQueryParameter = "embedded";
    export var IdBoardContentView = "idboard";
}

export module DirectoryConstants {
    export var KeywordFilterItemKey = "DirectoryFilter-Keyword";
    export var TeamFilterItemKey = "DirectoryFilter-Team";
}

export module FavoriteConstants {
    export var TeamName = "TeamName";
}

/**
* Points (i.e. contribution ids) for targeting right panel extensions.
*/
export module RightPanelExtensionIds {
    export var PortfolioBacklog = "ms.vss-work-web.portfolio-backlog-toolpane";
    export var RequirementBacklog = "ms.vss-work-web.requirement-backlog-toolpane";
    export var IterationBacklog = "ms.vss-work-web.iteration-backlog-toolpane";
}

export module SprintsHubBackCompatRoutingConstants {
    export var SprintBacklogPivot = "iteration";
}

export module SprintsHubConstants {
    export var HUB_NAME = "Sprints";
    export var HUB_CONTRIBUTION_ID = "ms.vss-work-web.sprints-hub";
    export var RIGHT_PANEL_DEFAULT_SIZE_PX = 420;
    export var ContentPivotSetting = "Agile/SprintsHub/Navigation/ContentPivot";
    export var DirectoryPivotSetting = "Agile/SprintsHub/Navigation/DirectoryPivot";
    export var IterationSetting = "Agile/SprintsHub/Navigation/Iteration";
    export var PivotSettings = "Agile/SprintsHub/Navigation/PivotSettings";
}

export module SprintsHubRoutingConstants {
    export var AllPivot = "all";
    export var MinePivot = "mine";
    export var NewPivot = "new";
    export var TaskboardPivot = "taskboard";
    export var SprintBacklogPivot = "backlog";
    export var CapacityPivot = "capacity";
    export var DirectoryViewName = "directory";
}

export module SprintsHubServerConstants {
    export var ContributionRouteId = "ms.vss-work-web.sprints-content-route";
    export var TeamAgnosticContributionRouteId = "ms.vss-work-web.sprints-route";
    export var DirectoryContributionRouteId = "ms.vss-work-web.sprints-directory-route";
    export var SprintsHubNavigationSettings = "Agile/SprintsHub/NavigationSettings";
}

export module SprintsHubStorageConstants {
    export var AgileBoardFilter = "AgileBoardFilter.";
    export var Group = "group";
}

export module TeamPanelConstants {
    export var TeamId = "teamId";
    export var ProjectId = "projectId";
    export var TeamName = "teamName";
    export var ProjectName = "projectName";
}

export module WorkItemsConstants {
    export var WorkItemsFormContributionId = "ms.vss-work-web.work-items-form-route-with-id";
    export var WorkItemFormRouteIdParam = "id";
}

