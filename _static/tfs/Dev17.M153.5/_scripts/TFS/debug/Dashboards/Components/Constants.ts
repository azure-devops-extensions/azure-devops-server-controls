// constants used in the url mapping
export namespace UrlConstants {
    export const TeamRouteKey: string = "team";
    export const TeamIdRouteKey: string = "teamId";
    export const TeamNameRouteKey: string = "teamName";
    export const IdRouteKey: string = "id";
    export const AllView: string = "all";
    export const MineView: string = "mine";
    export const DirectoryView: string = "directory";
    export const DashboardView: string = "dashboard";
    export const NameKey: string = "name";
    export const ViewNameKey: string = "viewname";
}

// constants used in route contruction.
export namespace RouteConstants {
    export const DashboardsController = "dashboards";
}

// constants to map to the column keys for the directory views.
export namespace DirectoryViewColumnKey {
    export const Name = "name";
    export const Team = "team";
    export const Description = "description";
}

// constants that are used as Keys in local storage
export namespace LocalStorageKey {
    export const RecentPivot = "recentPivot";
    export const GroupToggleStateFormat = "groupToggleState/{0}";
}

// contribution ids relevant to the dashboard pages.
export namespace ContributionIds {
    export const DashboardHubId = "ms.vss-dashboards-web.dashboards-new-experience-hub";
    export const DashboardsDirectoryRouteId = "ms.vss-dashboards-web.dashboards-directory-route";
    export const DashboardsNewExperienceRouteId = "ms.vss-dashboards-web.dashboards-new-experience-route";
    export const DashboardsLegacyDirectoryRouteId = "ms.vss-dashboards-web.dashboards-legacy-directory-route";
}

export namespace DataConstants {
    export const SentinelTeam = "_####_#####_";
}