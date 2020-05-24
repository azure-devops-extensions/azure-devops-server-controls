import * as React from "react";
import * as ReactDOM from "react-dom";
import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { QueryItemFavoriteConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { StarView } from "Favorites/Controls/StarView";
import { FavoriteCreateParameters } from "Favorites/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { FavoriteTypes, FavoriteScopes } from "TfsCommon/Scripts/Favorites/Constants";
import { css } from "OfficeFabric/Utilities";

export interface IFavoriteStarProps {
    queryItem: QueryHierarchyItem;
    queriesHubContext: IQueriesHubContext;
    className?: string;
}

export const FavoriteStar: React.StatelessComponent<IFavoriteStarProps> =
    (props: IFavoriteStarProps): JSX.Element => {
        if (props && props.queryItem) {
            const { queryItem } = props;
            const favorite = {
                artifactId: queryItem.id,
                artifactName: queryItem.name,
                artifactProperties: undefined,
                artifactType: FavoriteTypes.WIT_QUERYITEM,
                artifactScope: {
                    id: TfsContext.getDefault().contextData.project.id,
                    name: undefined,
                    type: QueryItemFavoriteConstants.FavoriteArtifactScopeType
                },
                owner: undefined
            } as FavoriteCreateParameters;

            return <div className={css("query-favorite", props.className)}><StarView
                artifact={favorite}
                actionsCreator={props.queriesHubContext.actionsCreator.favoritesActionsCreator}
                store={props.queriesHubContext.stores.favoritesStore}
                dataProvider={props.queriesHubContext.actionsCreator.favoritesDataProvider}
                />
            </div>;

        }

        return null;
    };

export function createFavoriteStar(queriesHubContext: IQueriesHubContext, queryItem: QueryHierarchyItem, container: Element) {
    ReactDOM.render(<FavoriteStar key={queryItem.id} queriesHubContext={queriesHubContext} queryItem={queryItem} />, container);
}

export function unMountFavoriteStar(container: Element) {
    ReactDOM.unmountComponentAtNode(container);
}