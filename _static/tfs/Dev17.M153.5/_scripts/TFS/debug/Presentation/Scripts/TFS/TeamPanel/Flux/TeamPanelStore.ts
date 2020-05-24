import { TeamPanelActions, IItemLoadingErrorPayload, IItemFavoriteUpdatePayload } from "Presentation/Scripts/TFS/TeamPanel/Flux/TeamPanelActions";
import { ITeamPanelState, TeamPanelView, IAsyncState, ITeamPanelItemsByType, ITeamPanelFilter } from "Presentation/Scripts/TFS/TeamPanel/TeamPanelContracts";
import { Store as VSSStore } from "VSS/Flux/Store";
import { TeamMember } from "VSS/WebApi/Contracts";

export class TeamPanelStore extends VSSStore {

    private _activeView: TeamPanelView;
    // Item type to State map
    private _items: IDictionaryStringTo<IAsyncState<ITeamPanelItemsByType>>;
    private _loadingItems: boolean;
    private _members: IAsyncState<TeamMember[]>;
    private _filter: ITeamPanelFilter;
    private _favoriteErrors: string[];
    private _teamImageUrl: string;

    constructor(actions: TeamPanelActions) {
        super();

        // Initialize
        this._activeView = TeamPanelView.Items;
        this._items = {};
        this._members = {};
        this._filter = null;
        this._loadingItems = false;
        this._favoriteErrors = [];

        // Attach listeners
        actions.startLoadingMembers.addListener(this._handleStartLoadingMembers);
        actions.membersLoadError.addListener(this._handleMembersLoadError);
        actions.membersAvailable.addListener(this._handleMembersAvailable);

        actions.changeLoadingItems.addListener(this._handleChangeLoadingItems);
        actions.itemsLoadError.addListener(this._handleItemsLoadError);
        actions.itemsAvailable.addListener(this._handleItemsAvailable);

        actions.favoriteUpdated.addListener(this._handleFavoriteUpdated);
        actions.favoriteFailed.addListener(this._handleFavoriteError);

        actions.filterChanged.addListener(this._handleSetFilter);
        actions.clearFilter.addListener(this._handleClearFilter);
        actions.changeActiveView.addListener(this._handleChangeActiveView);
        actions.teamImageUrlAvailable.addListener(this._handleTeamImageUrlAvailable);
    }

    public getState(): ITeamPanelState {
        return {
            activeView: this._activeView,
            itemsMap: this._items,
            members: this._members,
            filter: this._filter,
            loadingItems: this._loadingItems,
            favoriteErrors: this._favoriteErrors,
            teamImageUrl: this._teamImageUrl
        };
    }

    private _handleStartLoadingMembers = (loading: boolean) => {
        this._members = {
            ...this._members,
            loading
        };
        this.emitChanged();
    }

    private _handleMembersLoadError = (error: string) => {
        this._members = {
            loading: false,
            error
        }

        this.emitChanged();
    }

    private _handleMembersAvailable = (details: TeamMember[]) => {
        this._members = {
            loading: false,
            error: null,
            data: details
        }

        this.emitChanged();
    }

    private _handleChangeLoadingItems = (loading: boolean) => {
        this._loadingItems = loading;
        this.emitChanged();
    }

    private _handleItemsLoadError = (payload: IItemLoadingErrorPayload) => {
        const {
            itemGroup,
            error
        } = payload;

        const {
            hub
        } = itemGroup;

        this._items[hub] = {
            ...this._items[hub],
            error
        };

        this.emitChanged();
    }

    private _handleItemsAvailable = (payload: ITeamPanelItemsByType) => {
        const {
            itemGroup,
            items
        } = payload;

        const {
            hub
        } = itemGroup;

        this._items[hub] = {
            data: {
                itemGroup,
                items
            }
        };

        this.emitChanged();
    }

    private _handleFavoriteUpdated = (updatedInfo: IItemFavoriteUpdatePayload) => {
        const currentItems = this._items[updatedInfo.panelItem.itemType.hub].data.items;
        const currentItem = currentItems.find((item) => item.artifactId === updatedInfo.panelItem.item.artifactId);

        currentItem.favorite = updatedInfo.favorite;

        this.emitChanged();
    }

    private _handleFavoriteError = (errorMessage: string) => {
        this._favoriteErrors.push(errorMessage);
        this.emitChanged()
    }

    private _handleSetFilter = (filter: ITeamPanelFilter) => {
        this._filter = filter;
        this.emitChanged();
    }

    private _handleClearFilter = () => {
        this._filter = null;
        this.emitChanged();
    }

    private _handleChangeActiveView = (view: TeamPanelView) => {
        this._activeView = view;
        this.emitChanged();
    }

    private _handleTeamImageUrlAvailable = (teamImageUrl: string) => {
        this._teamImageUrl = teamImageUrl;
        this.emitChanged();
    }
}