import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import {
    AgileRouteParameters,
    BacklogsHubConstants,
    BoardsHubConstants,
    BoardsHubRoutingConstants,
    SprintsHubConstants,
    SprintsHubRoutingConstants,
    SprintsHubServerConstants,
    WorkItemsConstants,
    BoardsHubServerConstants
} from "Agile/Scripts/Generated/HubConstants";
import { SprintsNavigationSettingsService } from "Agile/Scripts/SprintsHub/Common/SprintsNavigationSettingsService";
import { IRouteData, TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { getDefaultWebContext } from "VSS/Context";
import { HubsService } from "VSS/Navigation/HubsService";
import { getNavigationHistoryService, StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import * as Service from "VSS/Service";
import { normalizePath } from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import { IViewOptionsValues } from "VSSUI/Utilities/ViewOptions";


/**
 * Options for generating backlogs hub URLs.
 */
export interface IBacklogUrlOptions {

    /** Team name or identifier */
    readonly teamIdOrName?: string;

    /** Optional. Pivot name */
    readonly pivot?: string;

    /** Optional. Backlog level name */
    readonly backlogLevel?: string;

    /** Optional. A value indicating whether or not to preserve query parameters found in the navigation service */
    readonly preserveQueryParameters?: boolean;
}

export namespace BacklogsUrls {
    /**
     * Performs an xhr navigate to a url in the backlogs hub
     * @param url The url to navigate to
     */
    export function navigateToBacklogsHubUrl(url: string): void {
        UrlUtilities.navigateToHubUrl(url, BacklogsHubConstants.HUB_CONTRIBUTION_ID);
    }

    /**
     * Gets a link to the backlog content view from an external hub.  Gives option to specifiy project.  Defaults to "backlog" pivot.
     * @param team Name or id of the team
     * @param backlogLevel Optional, backlog level
     * @param project Optional name or id of the project. Only needed from experiences that may have multiple projects shown (i.e. plans).
     */
    export function getExternalBacklogContentUrl(team: string, backlogLevel?: string, project?: string): string {
        const webContext = getDefaultWebContext();
        const state = {
            [AgileRouteParameters.Team]: webContext.team && team,
            [AgileRouteParameters.TeamName]: team,
            [AgileRouteParameters.Pivot]: BacklogsHubConstants.BacklogPivot,
            [AgileRouteParameters.Project]: project || webContext.project.name
        };

        if (backlogLevel) {
            state[AgileRouteParameters.BacklogLevel] = backlogLevel;
        }

        return getNavigationHistoryService().generateUrlForRoute(
            BacklogsHubConstants.ContentRouteContributionId,
            state,
            StateMergeOptions.none
        );
    }

    /**
     * Gets a link to the backlog content view.
     * @param options Options for generating the URL.
     */
    export function getBacklogContentUrl(options: IBacklogUrlOptions): string {
        const webContext = getDefaultWebContext();
        const navHistorySvc = getNavigationHistoryService();
        const currentRouteValues = navHistorySvc.getCurrentRouteValues();
        const currentState = navHistorySvc.getState();

        const state = {
            [AgileRouteParameters.Project]: webContext.project.name,
            [AgileRouteParameters.Team]: webContext.team && options.teamIdOrName,
            [AgileRouteParameters.TeamName]: options.teamIdOrName,
            [AgileRouteParameters.Pivot]: options.pivot || currentRouteValues[AgileRouteParameters.Pivot]
        };

        if (options.backlogLevel) {
            state[AgileRouteParameters.BacklogLevel] = options.backlogLevel;
        }

        if (options.preserveQueryParameters) {
            //  State contains route values plus query parameters.
            for (const key of Object.keys(currentState)) {
                if (!currentRouteValues[key]) {
                    state[key] = currentState[key];
                }
            }
        }

        return getNavigationHistoryService().generateUrlForRoute(
            BacklogsHubConstants.ContentRouteContributionId,
            state,
            StateMergeOptions.none
        );
    }

    export function getBacklogDirectoryUrl(): string {
        const webContext = getDefaultWebContext();

        const state = {
            [AgileRouteParameters.Project]: webContext.project.name,
            [AgileRouteParameters.Pivot]: DirectoryPivotType.directory
        };

        return getNavigationHistoryService().generateUrlForRoute(
            BacklogsHubConstants.DirectoryRouteContributionId,
            state,
            StateMergeOptions.none
        );
    }

    /**
     * Generates a URL for the backlogs hub with an option for the right pane as query parameter.
     * @param teamName Name of the team.
     * @param pivot Name of the Backlogs hub pivot.
     * @param backlogLevel Backlog level name.
     * @param rightPaneOption The right pane option to include as query parameter in the URL generated.
     */
    export function getBacklogContentUrlWithRightPaneOption(
        teamName: string,
        pivot: string,
        backlogLevel: string,
        rightPaneOption: string): string {
        const webContext = getDefaultWebContext();

        const state = {
            [AgileRouteParameters.Project]: webContext.project.name,
            [AgileRouteParameters.Team]: webContext.team && teamName,
            [AgileRouteParameters.TeamName]: teamName,
            [AgileRouteParameters.Pivot]: pivot,
            [AgileRouteParameters.BacklogLevel]: backlogLevel,
            [BacklogsHubConstants.RightPaneQueryParameter]: rightPaneOption
        };

        return getNavigationHistoryService().generateUrlForRoute(
            BacklogsHubConstants.ContentRouteContributionId,
            state,
            StateMergeOptions.none
        );
    }
}

export namespace SprintsUrls {
    /**
     * Performs an xhr navigate to a url in the sprints hub
     * @param url The url to navigate to
     */
    export function navigateToSprintsHubUrl(url: string): void {
        UrlUtilities.navigateToHubUrl(url, SprintsHubConstants.HUB_CONTRIBUTION_ID);
    }

    /**
     * Get a url within the Sprints Hub directory pages
     * @param pivot The pivot
     */
    export function getSprintDirectoryUrl(): string {
        return getNavigationHistoryService().generateUrlForRoute(
            SprintsHubServerConstants.DirectoryContributionRouteId,
            {
                [AgileRouteParameters.Project]: getDefaultWebContext().project.name,
                [AgileRouteParameters.Pivot]: DirectoryPivotType.directory
            },
            StateMergeOptions.none
        );
    }

    /**
     * Gets a link to the sprints content view
     * @param teamName Name of the team
     * @param iteration Name of the iteration
     * @param pivot Optional, name of the pivot to navigate to, otherwise use sticky pivot
     */
    export function getExternalSprintContentUrl(teamName: string, iteration?: string, pivot?: string): string {
        pivot = pivot || Service.getService(SprintsNavigationSettingsService).contentPivot || SprintsHubRoutingConstants.TaskboardPivot;

        const historyService = getNavigationHistoryService();
        const state = historyService.getState();

        const webContext = getDefaultWebContext();

        // We need to set the merge options to 'none' in order to use this function from the Backlogs Hub. If we don't, it will try
        // to add backlogLevel to the query parameters. We must have the project when we use 'StateMergeOptions.none'
        return getNavigationHistoryService().generateUrlForRoute(
            SprintsHubServerConstants.ContributionRouteId,
            {
                // Only add team if the we have a team context
                [AgileRouteParameters.Team]: webContext.team && teamName,
                [AgileRouteParameters.Pivot]: pivot,
                [AgileRouteParameters.TeamName]: teamName,
                [AgileRouteParameters.Iteration]: iteration ? normalizePath(iteration) : undefined,
                [AgileRouteParameters.Project]: state[AgileRouteParameters.Project]
            }, StateMergeOptions.none
        );
    }
}

export namespace BoardsUrls {

    /**
     * Performs an xhr navigate specified url in boards hub
     * @param url The url to navigate to
     */
    export function navigateToBoardsHubUrl(url: string): void {
        UrlUtilities.navigateToHubUrl(url, BoardsHubConstants.HUB_CONTRIBUTION_ID);
    }

    /**
     * Get a url to the boards hub.  This will overwrite current pivot and backlog level.
     * @param team The team id
     * @param backlogLevel The optional name of the board
     * @param contributionId The optional contribution id
     */
    export function getBoardsContentUrl(
        team: string,
        backlogLevel?: string,
        contributionId?: string): string {

        const state = {};

        state[AgileRouteParameters.TeamName] = team;
        state[AgileRouteParameters.Team] = team;
        state[AgileRouteParameters.BacklogLevel] = backlogLevel;

        // Sending to content page. If contribution id is not specidfied always use the "board" pivot.
        state[AgileRouteParameters.Pivot] = contributionId || BoardsHubRoutingConstants.BoardPivot;

        return getNavigationHistoryService().generateUrlForRoute(BoardsHubConstants.TEAM_BOARD_CONTENT_ROUTE_CONTRIBUTION_ID, state);
    }

    /**
     * Get a url to the id board hub.
     * @param boardId The board id
     */
    export function getIdBoardUrl(boardId: number) {
        const webContext = getDefaultWebContext();
        const state = {};
        state[AgileRouteParameters.Id] = boardId;
        state[AgileRouteParameters.Project] = webContext.project.name;
        state[AgileRouteParameters.Pivot] = BoardsHubRoutingConstants.BoardPivot;
        state[AgileRouteParameters.ViewName] = BoardsHubServerConstants.IdBoardContentView;

        return getNavigationHistoryService().generateUrlForRoute(BoardsHubServerConstants.IdBoardContributionRouteId, state);
    }

    /**
     * Get a url to the directory of the boards hub.
     * @param pivot All/mine pivot
     */
    export function getBoardsDirectoryUrl(): string {
        const webContext = getDefaultWebContext();
        const state = {
            [AgileRouteParameters.Pivot]: DirectoryPivotType.directory,
            [AgileRouteParameters.Project]: webContext.project.name
        };

        return getNavigationHistoryService().generateUrlForRoute(
            BoardsHubConstants.DIRECTORY_ROUTE_CONTRIBUTION_ID,
            state,
            StateMergeOptions.none
        );
    }

    /**
     * Gets a link to the board content view
     * @param teamName Name of the team
     */
    export function getExternalBoardContentUrl(teamName: string): string {
        const webContext = getDefaultWebContext();

        return getNavigationHistoryService().generateUrlForRoute(
            BoardsHubConstants.TEAM_BOARD_CONTENT_ROUTE_CONTRIBUTION_ID,
            {
                [AgileRouteParameters.Pivot]: BoardsHubRoutingConstants.BoardPivot,
                [AgileRouteParameters.Project]: webContext.project.name,
                [AgileRouteParameters.TeamName]: teamName,
                [AgileRouteParameters.Team]: webContext.team && teamName
            }, StateMergeOptions.none);
    }
}

/**
 * A common class of URL Utilities for Hubs
 */
export namespace UrlUtilities {
    /**
     * Is this a directory view?
     * @param viewOptions
     */
    export function isDirectoryView(viewOptions: IViewOptionsValues): boolean {
        return Utils_String.equals(viewOptions[AgileRouteParameters.Pivot], DirectoryPivotType.all, /*ignorecase*/ true) ||
            Utils_String.equals(viewOptions[AgileRouteParameters.Pivot], DirectoryPivotType.mine, /*ignorecase*/ true);
    }

    /**
     * Perform XHR navigation to a hub
     * @param hubId The hub id
     * @param url The url to navigate to
     */
    export function navigateToHubUrl(url: string, hubId: string) {
        const hubsService = Service.getLocalService(HubsService);
        hubsService.navigateToHub(hubId, url);
    }

    /**
     * Gets the work items form web url
     * @param workItemId Id of the work item
     */
    export function getWorkItemEditUrl(workItemId: number): string {
        const { project, team } = getDefaultWebContext();

        const state = {
            [AgileRouteParameters.Project]: project.name,
            [WorkItemsConstants.WorkItemFormRouteIdParam]: `${workItemId}`
        };
        if (team) {
            state[AgileRouteParameters.Team] = team.name;
        }
        return getNavigationHistoryService().generateUrlForRoute(
            WorkItemsConstants.WorkItemsFormContributionId,
            state,
            StateMergeOptions.none);
    }
}

export namespace TeamSettingUrls {

    /**
     * Get the team settings url for the specified area (iterations or area) and team. This will return either the "legacy" horizontal nav team admin url 
     * or the "new" vertical nav settigns url. 
     * @param tfsContext 
     * @param projectName 
     * @param teamName 
     * @param action - the "_a" portion of the url.  Either iteration or area. 
     */
    export function getTeamIterationSettingURL(tfsContext: TfsContext, projectId: string, teamId: string, action: string): string {
        const featureManagementService = Service.getService(FeatureManagementService);
        const isNewNav = featureManagementService.isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");

        return isNewNav ? getTeamSettingConfigLandingURL(projectId, teamId, action) : getTeamAdminURL(tfsContext, projectId, teamId, action);
    }

    /**
     * Get settings url for horizontal navigation (_admin area) 
     * @param tfsContext 
     * @param projectId
     * @param teamId 
     * @param action - the "_a" portion of the url.  Either iteration or area. 
     */
    export function getTeamAdminURL(tfsContext: TfsContext, projectId: string, teamID: string, action: string): string {
        return tfsContext.getActionUrl("", "work",
            {
                area: "admin",
                project: projectId,
                team: teamID,
                _a: action
            } as IRouteData);
    }

    /**
     * Get settings url for vertical navigation (_settings area)
     * @param projectId
     * @param teamId
     * @param action - the "_a" portion of the url.  Either iteration or area. 
     */
    export function getTeamSettingConfigLandingURL(projectId: string, teamId: string, action: string): string {
        return getNavigationHistoryService().generateUrlForRoute("ms.vss-admin-web.project-admin-hub-route",
            {
                project: projectId,
                teamId: teamId,
                adminPivot: 'work-team',
                _a: action
            });
    }
}