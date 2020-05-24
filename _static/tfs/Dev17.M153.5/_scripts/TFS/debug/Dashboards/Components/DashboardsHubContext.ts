import * as React from "react";
import { ActionsSet } from "Dashboards/Components/ActionsSet";
import { StoresSet } from "Dashboards/Components/StoresSet";
import { ActionCreatorsSet } from "Dashboards/Components/ActionCreatorsSet";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";
import { IFavoritesActionsCreator, FavoritesActionsCreator } from "Favorites/Controls/FavoritesActionsCreator";
import { IFavoritesDataProvider, FavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { FavoritesActions } from "Favorites/Controls/FavoritesActions";

export interface IDashboardsHubContext {
    /**
     * encapsulates different stores of the page through a single registry.
     */
    stores: StoresSet;

     /**
     * encapsulates different action creators of the page through a single registry.
     */
    actionCreators: ActionCreatorsSet;

    /**
    * encapsulates favorites context.
    */
    favoriteContext: { store: FavoritesStore, actionsCreator: IFavoritesActionsCreator, dataProvider: IFavoritesDataProvider };
}

/**
 * Represents the context for the dashboard hub and its pages (content, directory).
 * provides access to the core hub artifact providers, the actions/stores/action creators.
 * This context is instantiated by the views (contentView, DirectoryView) and passed down to their components. 
 */
export class DashboardsHubContext implements IDashboardsHubContext {
    public stores: StoresSet;
    public actionCreators: ActionCreatorsSet;
    public favoriteContext: { store: FavoritesStore, actionsCreator: IFavoritesActionsCreator, dataProvider: IFavoritesDataProvider };

    private constructor() { }
    private static instance: IDashboardsHubContext;

    public static getInstance(): IDashboardsHubContext {
        if (!DashboardsHubContext.instance) {
            const favoriteActions = new FavoritesActions();
            const favoriteDataProvider = new FavoritesDataProvider();
            const favoritesStore = new FavoritesStore(favoriteActions);
            const favoritesActionsCreator = new FavoritesActionsCreator(favoriteDataProvider, favoritesStore, favoriteActions);

            const actionsSet = new ActionsSet(favoriteActions);
            const storeSet = new StoresSet(actionsSet);
            const actionCreators = new ActionCreatorsSet(actionsSet, storeSet);

            // pending setting up the page level action creator to manage invocations.
            DashboardsHubContext.instance = {
                stores: storeSet,
                actionCreators: actionCreators,
                favoriteContext: {
                    store: favoritesStore,
                    actionsCreator: favoritesActionsCreator,
                    dataProvider: favoriteDataProvider
                }
            };
        }

        return DashboardsHubContext.instance;
    }
}

/**
* Context made available to the contributed tab and tab group controls through their initial configuration.
* This context is instantiated by the views (ContentView, DirectoryView) and passed down to their components.
*/
export interface SharedContext {
    context: IDashboardsHubContext;
}