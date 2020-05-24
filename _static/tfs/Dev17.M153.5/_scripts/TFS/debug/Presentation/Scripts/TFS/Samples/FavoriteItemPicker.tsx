import * as React from "react";

import { Toggle } from "OfficeFabric/Toggle";
import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";

import { ArtifactScope, Favorite } from "Favorites/Contracts";
import { IFavoriteItemPickerProps, FavoriteItemPicker, IFavoriteItem } from "Favorites/Controls/FavoriteItemPicker";
import { ArtifactPickerProvider, IArtifactPickerProvider, IArtifactPickerProviderOptions, IFavoritesContext } from "Favorites/Controls/ArtifactPickerProvider";
import { FavoritesActions } from "Favorites/Controls/FavoritesActions";
import { FavoritesActionsCreator } from "Favorites/Controls/FavoritesActionsCreator";
import { FavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";
import { FavoriteItemData } from "Favorites/Controls/FavoritesModels";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";

import { getDefaultWebContext } from "VSS/Context";
import { urlHelper } from "VSS/Locations";
import { caseInsensitiveContains } from "VSS/Utils/String";

import { IVssIconProps, VssIconType } from "VSSUI/VssIcon";
import { IItemIndicatorProps } from "VSSUI/ItemIndicator";

import { getInitialQueriesForPicker, getAllQueryFavoriteItems, IQueryFavoriteItem, getQueryIcon, mapFavoriteToQuery, mapQueryToFavorite, searchQueries } from "Presentation/Scripts/TFS/Samples/QueryData";
import { QueryHierarchyItem, QueryExpand, QueryType } from "TFS/WorkItemTracking/Contracts";

export class QueryFavoritesContext implements IFavoritesContext {
    public artifactTypes: string[];
    public artifactScope: ArtifactScope;
    public store: FavoritesStore;
    public actionsCreator: FavoritesActionsCreator;

    constructor(webContext: WebContext = getDefaultWebContext()) {
        this.artifactTypes = ['Microsoft.TeamFoundation.WorkItemTracking.QueryItem'];
        this.artifactScope = {
            id: webContext.project.id,
            name: webContext.project.name,
            type: 'Project'
        }

        const actions = new FavoritesActions();
        this.store = new FavoritesStore(actions);
        this.actionsCreator = new FavoritesActionsCreator(new FavoritesDataProvider(), this.store, actions);
        this.actionsCreator.initializeStore(this.artifactTypes, this.artifactScope);
    }

    public getFavoriteById(id: string): FavoriteItemData {
        const state = this.store.getState();
        return state.isLoaded ? state.favoriteItems.filter(f => f.favorite.artifactId === id)[0] : undefined;
    }

    public getOrCreateFavorite(id: string, name: string): FavoriteItemData {
        let favoriteItem = this.getFavoriteById(id);
        if (!favoriteItem) {
            favoriteItem = {
                favorited: false,
                favorite: {
                    artifactId: id,
                    artifactName: name,
                    artifactType: this.artifactTypes[0],
                    artifactScope: this.artifactScope
                } as Favorite
            } as FavoriteItemData;
        }

        return favoriteItem;
    }

    public toggleFavorite(id: string, name: string): void {
        this.actionsCreator.toggleFavorite(this.getOrCreateFavorite(id, name));
    }
}

export interface IFavoriteItemComponentProps extends IBaseProps {
    id: string;
    name: string;
    favoritesContext: QueryFavoritesContext;
}

export interface IFavoriteItemComponentState {
    favorited: boolean;
}

export class FavoriteItemComponent extends BaseComponent<IFavoriteItemComponentProps, IFavoriteItemComponentState> {
    constructor(props: IFavoriteItemComponentProps) {
        super(props);
        this.state = {
            favorited: this.getFavoritedValue(this.props)
        };
    }

    componentWillReceiveProps(nextProps: IFavoriteItemComponentProps): void {
        if (this.props.id !== nextProps.id) {
            this.setState({
                favorited: this.getFavoritedValue(nextProps)
            });
        }
    }

    componentDidMount(): void {
        this.props.favoritesContext.store.addChangedListener(this.onFavoritesLoaded);
    }

    componentWillUnmount(): void {
        this.props.favoritesContext.store.removeChangedListener(this.onFavoritesLoaded);
    }

    private getFavoritedValue(props: IFavoriteItemComponentProps): boolean {
        const favoriteItem = props.favoritesContext.getFavoriteById(props.id);
        return favoriteItem ? favoriteItem.favorited : false;
    }

    public render(): JSX.Element {
        const { favorited } = this.state;
        return (
            <Toggle
                defaultChecked={favorited}
                checked={favorited}
                onText="Favorited"
                offText="Not favorited"
                onChanged={this.onFavoriteToggleClick}
            />
        );
    }

    @autobind
    private onFavoritesLoaded(): void {
        this.setState({
            favorited: this.getFavoritedValue(this.props)
        });
    }

    @autobind
    private onFavoriteToggleClick(checked: boolean): void {
        this.props.favoritesContext.toggleFavorite(this.props.id, this.props.name);
    }
}

export function getQueryFavoritesPicker(
    favoritesContext: IFavoritesContext,
    selectedItem: any,
    favoriteClickDelegate: (id: IQueryFavoriteItem) => void): FavoriteItemPicker {
    let webContext = getDefaultWebContext();

    let hasAIndictor = {
        getItemIndicator: (item: any) => {
            let indicator: IItemIndicatorProps;
            if (item && item.name && item.name.indexOf("a") > 0) {
                indicator = {
                    title: "Has a",
                    className: "sample-text-indicator"
                };
            }
            return indicator;
        }
    };

    let hasEIndictor = {
        getItemIndicator: (item: any) => {
            let indicator: IItemIndicatorProps;
            if (item && item.name && item.name.indexOf("e") > 0) {
                indicator = {
                    title: "Has e",
                    className: "sample-text-indicator"
                };
            }
            return indicator;
        }
    };

    let props: IFavoriteItemPickerProps = {
        /** Favorites context */
        favoritesContext: favoritesContext,

        /** Favorite item click */
        onFavoriteClick: favoriteClickDelegate,

        /** Visible favorite indicator */
        selectedItem: selectedItem,

        /** Search props */
        searchTextPlaceholder: 'Search all queries',
        getSearchResults: (searchText: string) => {
            return getAllQueryFavoriteItems(webContext.project.id).then((items) => {
                return items.filter(q => caseInsensitiveContains(q.name, searchText));
            });
        },

        /** Browse all props */
        browseAllText: "Browse all queries",
        onBrowseAllClick: () => {
            window.location.href = urlHelper.getMvcUrl({ action: null, controller: "queries" });
        },
        getFavoriteItemIcon: (favorite: IQueryFavoriteItem): IVssIconProps => {
            return {
                iconName: getQueryIcon(favorite.properties ? favorite.properties.queryType : undefined),
                iconType: VssIconType.bowtie
            }
        },
        compareFavorites: (favorite1: IQueryFavoriteItem, favorite2: IQueryFavoriteItem): number => {
            const queryType1 = favorite1.properties ? favorite1.properties.queryType : 0;
            const queryType2 = favorite2.properties ? favorite2.properties.queryType : 0;

            if (queryType1 !== queryType2) {
                return queryType1 - queryType2;
            }

            return favorite1.name.localeCompare(favorite2.name);
        },
        getNoFavoritesMessage: () => {
            return <p>No queries favorited yet</p>;
        },
        selectedItemIndicators: [hasEIndictor],
        dropdownIndicators: [hasEIndictor, hasAIndictor]
    };

    return new FavoriteItemPicker(props);
}

export function getQueryArtifactsPicker(
    favoritesContext: IFavoritesContext,
    selectedItem: QueryHierarchyItem,
    onQueryClicked: (query: QueryHierarchyItem) => void): IArtifactPickerProvider<QueryHierarchyItem> {

    const webContext = getDefaultWebContext();

    const options: IArtifactPickerProviderOptions<QueryHierarchyItem> = {
        favoritesContext: favoritesContext,
        onArtifactClicked: onQueryClicked,
        selectedArtifact: selectedItem,
        getArtifacts: () => {
            return getInitialQueriesForPicker(webContext.project.id) as Promise<QueryHierarchyItem[]>;
        },
        getArtifactId: query => query.id,
        getArtifactName: query => query.name,
        getArtifactIcon: (query: QueryHierarchyItem): IVssIconProps => {
            return {
                iconName: getQueryIcon(query.queryType),
                iconType: VssIconType.bowtie
            }
        },
        getArtifactFromFavorite: favorite => mapFavoriteToQuery(favorite),
        getFavoriteFromArtifact: query => mapQueryToFavorite(query, favoritesContext.artifactScope),
        artifactComparer: (query1: QueryHierarchyItem, query2: QueryHierarchyItem): number => {
            return query1.name.localeCompare(query2.name);
        },
        searchTextPlaceholder: 'Search all queries',
        getSearchResults: (searchText: string) => {
            return searchQueries(webContext.project.id, searchText) as Promise<QueryHierarchyItem[]>;
        }
    };

    return new ArtifactPickerProvider(options);
}