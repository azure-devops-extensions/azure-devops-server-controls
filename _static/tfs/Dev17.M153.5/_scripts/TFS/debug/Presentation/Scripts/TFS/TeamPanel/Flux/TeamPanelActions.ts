import { TeamPanelView, IItemGroup, ITeamPanelItemsByType, ITeamPanelFilter } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelContracts";
import { ITeamPanelItemView } from "Presentation/Scripts/TFS/TeamPanel/Flux/TeamPanelSelector";
import { Action } from "VSS/Flux/Action";
import { TeamMember } from "VSS/WebApi/Contracts";
import { Favorite } from "Favorites/Contracts";

export interface IItemFavoriteUpdatePayload {
    panelItem: ITeamPanelItemView;
    favorite: Favorite;
}

export interface IItemLoadingErrorPayload {
    itemGroup: IItemGroup;
    error: string;
}

export class TeamPanelActions {
    public changeLoadingItems: Action<boolean> = new Action<boolean>();
    public itemsLoadError: Action<IItemLoadingErrorPayload> = new Action<IItemLoadingErrorPayload>();
    public itemsAvailable: Action<ITeamPanelItemsByType> = new Action<ITeamPanelItemsByType>();

    public startLoadingMembers: Action<boolean> = new Action<boolean>();
    public membersLoadError: Action<string> = new Action<string>();
    public membersAvailable: Action<TeamMember[]> = new Action<TeamMember[]>();

    public favoriteUpdated: Action<IItemFavoriteUpdatePayload> = new Action<IItemFavoriteUpdatePayload>();
    public favoriteFailed: Action<string> = new Action<string>();

    public filterChanged: Action<ITeamPanelFilter> = new Action<ITeamPanelFilter>();
    public clearFilter: Action<void> = new Action<void>();

    public teamImageUrlAvailable: Action<string> = new Action<string>();
    public changeActiveView: Action<TeamPanelView> = new Action<TeamPanelView>();
}
