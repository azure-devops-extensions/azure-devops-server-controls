import { TeamMember } from "VSS/WebApi/Contracts";
import { Favorite } from "Favorites/Contracts";

export interface ITeamPanelContext {
    teamId: string;
    teamName: string;
    projectId: string;
    projectName: string;
}

export interface ITeamPanelDataProviderResponse {
    items: ITeamPanelItem[];
    error?: string;
}

export interface ITeamPanelItem {
    name: string;
    href: string;
    iconClassName: string;
    artifactId: string;
    favorite?: Favorite;
}

export interface IItemGroup {
    /**
     * Contribution id of the hub for navigation
     */
    hubContributionId: string;

    /**
     * Name of the hub, e.g. Board, Backlog , Build
     */
    hub: string;

    /**
     * Name of the hub group, e.g. Work, CI/CD
     */
    hubGroup: string;

    /**
     * Favorite Type, e.g. Microsoft.TeamFoundation.Work.TeamBoardSets
     */
    favoriteType: string;

    /**
     * Sort order
     */
    order: number;
}

export interface ITeamPanelItemsByType {
    items: ITeamPanelItem[];
    itemGroup: IItemGroup;
}

export interface ITeamPaneItemDataProviderDetails {
    itemGroup: IItemGroup;
    contributionId: string;
}

export const enum TeamPanelView { Items, TeamMembers };

export interface IAsyncState<T> {
    loading?: boolean;
    data?: T;
    error?: string;
}

export interface ITeamPanelFilter {
    itemGroup: IItemGroup;
}


export interface ITeamPanelState {
    activeView: TeamPanelView;

    loadingItems: boolean;
    teamImageUrl: string;
    // hub name to state map
    itemsMap?: IDictionaryStringTo<IAsyncState<ITeamPanelItemsByType>>;
    members?: IAsyncState<TeamMember[]>;
    filter?: ITeamPanelFilter;
    favoriteErrors?: string[];
}

export module TeamPanelConstants {
    export var TeamId = "teamId";
    export var ProjectId = "projectId";
    export var TeamName = "teamName";
    export var ProjectName = "projectName";
}