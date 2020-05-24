
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Dashboards.Common
// Microsoft.TeamFoundation.Dashboards.WebApi
// Microsoft.TeamFoundation.Server.WebAccess.Dashboards.Plugins
// Microsoft.TeamFoundation.Dashboards.Server
//----------------------------------------------------------


export module AppStoreConstants {
    export var DashboardWidgetCatalogTargetContributionID = "ms.vss-dashboards-web.widget-catalog";
    export var DashboardWidgetConfigurationCatalogTargetContributionID = "ms.vss-dashboards-web.widget-configuration";
    export var WidgetTypeContributionID = "ms.vss-dashboards-web.widget";
    export var WidgetConfigurationTypeContributionID = "ms.vss-dashboards-web.widget-configuration";
}

export module BowTieClassNames {
    export var Bowtie = "bowtie";
    export var Icon = "bowtie-icon";
    export var ArrowOpenIcon = "bowtie-arrow-open";
    export var BrandVisualStudioIcon = "bowtie-brand-visualstudio";
    export var Comment = "bowtie-comment";
    export var SideBySide = "side-by-side";
}

export module DashboardFeatureIds {
    export var NewExperience = "ms.vss-dashboards-web.dashboards-new-experience-feature";
}

export module DashboardPageDataProviderKeys {
    export var MaxDashboardPerGroup = "MaxDashboardPerGroup";
    export var MaxWidgetsPerDashboard = "MaxWidgetsPerDashboard";
    export var IsStakeholder = "IsStakeholder";
    export var Dashboard = "Dashboard";
    export var IsNewDashboardFeatureEnabled = "IsNewDashboardFeatureEnabled";
    export var TeamMembersOf = "TeamMembersOf";
    export var RouteId = "RouteId";
}

export module DashboardProviderPropertyBagNames {
    export var Dashboards = "ms.vss-dashboards-web.dashboards-data-provider";
    export var DashboardsLegacy = "ms.vss-dashboards-web.dashboards-legacy-data-provider";
    export var DashboardsNavigation = "ms.vss-dashboards-web.dashboards-nav-data-provider";
    export var TeamContextData = "ms.vss-dashboards-web.dashboards-team-context-data-provider";
    export var TeamData = "ms.vss-dashboards-web.dashboards-team-data-provider";
    export var TeamList = "ms.vss-dashboards-web.dashboards-team-list-data-provider";
    export var TeamMemberships = "ms.vss-dashboards-web.dashboards-team-memberships-provider";
    export var DashboardsContent = "ms.vss-dashboards-web.dashboards-content-provider";
    export var DashboardDirectoryData = "ms.vss-dashboards-web.dashboards-directory-data-provider";
}

export module DashboardRouteIds {
    export var NewExperience = "ms.vss-dashboards-web.dashboards-new-experience-route";
    export var NewExperienceEmbedded = "ms.vss-dashboards-web.dashboards-new-experience-route-embed";
}

export module DashboardSecurity {
    export var SecurityNamespaceGuid = "8ADF73B7-389A-4276-B638-FE1653F7EFC7";
}

export module DashboardsPermissions {
    export var Read = 1;
    export var Create = 2;
    export var Edit = 4;
    export var Delete = 8;
    export var ManagePermissions = 16;
    export var MaterializeDashboards = 32;
}

export module DashboardsProviderNames {
    export var Dashboards = "TFS.Dashboards.Widgets.Provider.DashboardsDataProvider";
    export var DashboardsLegacy = "TFS.Dashboards.Widgets.Provider.DashboardsLegacyDataProvider";
    export var TeamContext = "TFS.Dashboards.Widgets.Provider.TeamContextDataProvider";
    export var TeamData = "TFS.Dashboards.Widgets.Provider.TeamDataProvider";
    export var TeamList = "TFS.Dashboards.Widgets.Provider.TeamListDataProvider";
    export var TeamMemberships = "TFS.Dashboards.Widgets.Provider.TeamMembershipsDataProvider";
    export var DashboardsContent = "TFS.Dashboards.Widgets.Provider.DashboardsContentDataProvider";
    export var DashboardDirectoryData = "TFS.Dashboards.Widgets.Provider.DashboardsDirectoryDataProvider";
}

export module DashboardUrlParams {
    export var ActiveDashboardId = "activeDashboardId";
    export var IsNew = "isNew";
}

export module DashboardWidgetLimits {
    export var MaxDashboardNameLength = 32;
    export var MaxDashboardDescriptionLength = 128;
    export var MaxWidgetNameLength = 256;
    export var MaxWidgetTypeLength = 1000;
    export var MaxWidgetArtifactIdLength = 256;
    export var MaxWidgetSettingsVersionLength = 256;
    export var MaxWidgetArtifactContextLength = 512;
    export var MaxWidgetLegacySettingsLength = 4000;
    export var MaxWidgetSettingsLength = 16000;
    export var MinRequiredRefreshInterval = 30;
    export var MaxRowSpan = 10;
    export var MaxColumnSpan = 10;
}

export module DomClassNames {
    export var WidgetHideMenu = "no-height";
    export var WidgetMenuContainer = "widget-menu-header";
    export var WidgetLightboxMenuContainer = "widget-lightbox-menu-header";
    export var WidgetMenuSubMenuContainer = "ellipsis-menubar";
    export var EllipsisIcon = "icon-ellipsis";
    export var DeleteIcon = "bowtie-icon bowtie-edit-delete";
    export var AddIconThin = "bowtie-icon bowtie-math-plus";
    export var SettingsIconGrey = "icon-settings";
    export var ConfigureWidgetIcon = "bowtie-icon bowtie-settings-gear";
    export var PinIcon = "icon-pin";
    export var WidgetSearchTermInput = "widget-searchterm-input";
    export var WidgetSearchButton = "widget-search-button";
    export var WidgetSearchContainer = "widget-search-container";
    export var Icon = "icon";
    export var ManagerDialog = "dashboards-manager-dialog";
    export var ManagerNewDashboardInput = "new-dashboard-name-input";
    export var ManagerNewDashboardButton = "new-dashboard-name-button";
    export var ManagerDashboardListContainer = "dashboard-list-container";
    export var ManagerDashboardListItem = "dashboard-list-item";
    export var ManagerDashboardListItemName = "dashboard-list-item-name";
    export var ManagerDashboardListItemDelete = "dashboard-list-item-delete";
    export var ManagerListHeaderContainer = "dashboard-list-header-container";
    export var ManagerListHeaderName = "dashboard-list-header-name";
    export var ManagerListHeaderAutorefresh = "dashboard-list-header-autorefresh";
    export var ManagerCreateNewDashboardTextbox = "new-dashboardname-textbox";
    export var ManagerCreateNewDashboardButton = "new-dashboardname-create-button";
    export var ManagerMessageArea = "dashboard-manager-message-area";
    export var DashboardAddWidget = "add-widget-button";
    export var AddWidgetEmptySearchText = "widget-search-watermark";
    export var WidgetEditMenuButtonContainer = "widget-edit-menu-button-container";
    export var WidgetEditMenuButton = "widget-edit-menu-button";
    export var WidgetHostInGridster = "widgethost";
    export var ToggleForDashboardEdit = "menu-toggle-button";
    export var LightboxButton = "lightbox-button";
    export var DisabledColor = "disabled-color";
}

export module DomIds {
    export var DashboardsToolbarContainerID = "dashboards-toolbar-container";
    export var DashboardsWidgetsContainerID = "widgets-container";
    export var ManagerButton = "dashboard-management";
    export var DashboardManager_CreateNewDashboard_Textbox = "dashboard-manager-createnew";
}

export module JQuerySelectors {
    export var MenuFocus = ".menu-focus-receiver";
    export var DataGridWidgetIdAttribute = "data-widget-id";
    export var ManagerListID = "data-id";
}

export module JsonIslandDomClassNames {
    export var DefaultDashboardId = "dashboard-data-defaultDashboardId";
    export var Dashboards = "dashboard-data-dashboards";
    export var DefaultDashboardWidgets = "dashboard-data-defaultDashboardWidgets";
    export var MaxWidgetsPerDashboards = "dashboard-data-maxWidgets";
    export var MaxDashboardsPerGroup = "dashboard-data-maxDashboards";
    export var IsStakeholder = "user-data-isStakeholder";
}

export module Permissions {
    export var Read = 1;
    export var Edit = 2;
    export var Manage = 4;
    export var ManagePermissions = 8;
}

export module TfsCommands {
    export var WidgetConfigurationAction = "widget-configuration";
    export var DashboardCreate = "create-dashboard";
    export var DashboardManage = "manage-dashboard";
    export var PushToDashboard = "add-to-dashboard";
    export var PinToDashboard = "pin-to-dashboard";
    export var WidgetRemoveAction = "remove-widget";
}

export module WidgetDataProviderNames {
    export var CollectionTimeZone = "TFS.Dashboards.Widgets.Provider.CollectionTimeZoneDataProvider";
    export var OtherLinksWidgetData = "TFS.Dashboards.Widgets.Provider.OtherLinksWidgetDataProvider";
    export var LegacyProjectData = "TFS.Dashboards.Widgets.Provider.LegacyProjectDataProvider";
}

export module WidgetDataProviderPropertyBagNames {
    export var CollectionTimeZoneData = "ms.vss-dashboards-web.collection-time-zone-data-provider";
    export var OtherLinksWidgetData = "ms.vss-dashboards-web.other-links-data-provider";
    export var LegacyProjectData = "ms.vss-dashboards-web.legacy-project-data-provider";
}

export module WidgetDomClassNames {
    export var WidgetContainer = "widget";
    export var DarkWidget = "dark-widget";
    export var ClickableWidgetContainer = "clickable";
    export var WidgetDescription = "description";
    export var TruncatedTextWithEllipsis = "truncated-text-ellipsis";
    export var NoBulletList = "no-bullets";
    export var Title = "title";
    export var SubTitle = "subtitle";
    export var IconContainer = "icon-container";
    export var LinkWithIconAndText = "link-with-icon-text";
    export var LinkWithIconAndTextList = "link-with-icon-text-list";
    export var DaysRemaining = "days-remaining";
    export var UserStoryProgress = "user-story-progress";
    export var DaysProgressBar = "days-progress-bar";
    export var WorkProgressBar = "work-progress-bar";
}

export module WidgetIds {
    export var TCMChartContribution = "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.TcmChartWidget";
    export var WITChartContribution = "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.WitChartWidget";
    export var BuildChartContribution = "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.BuildChartWidget";
    export var QueryScalarContribution = "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.QueryScalarWidget";
    export var CodeScalarContribution = "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.CodeScalarWidget";
    export var MarkDownContribution = "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.MarkdownWidget";
    export var TestResultsFailureTrendContribution = "ms.vss-test-web.Microsoft.VisualStudioTeamServices.Dashboards.TestResultsFailureTrendWidget";
    export var TestResultsDurationTrendContribution = "ms.vss-test-web.Microsoft.VisualStudioTeamServices.Dashboards.TestResultsDurationTrendWidget";
    export var TestResultsTrendContribution = "ms.vss-test-web.Microsoft.VisualStudioTeamServices.Dashboards.TestResultsTrendWidget";
}

