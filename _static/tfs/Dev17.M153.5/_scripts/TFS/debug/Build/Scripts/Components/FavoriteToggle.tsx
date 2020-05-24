/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { UserActions } from "Build/Scripts/Constants";
import { IconButton } from "Build/Scripts/Components/IconButton";

import { canUseFavorites } from "Favorites/FavoritesService";

import { css } from "OfficeFabric/Utilities";

import * as TFS_Resources_Presentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { DefinitionReference } from "TFS/Build/Contracts";

import { getService as getEventsService } from "VSS/Events/Services";

import "VSS/LoaderPlugins/Css!Build/FavoriteToggle";

/**
 * FavoriteToggleComponent shows a "star" icon as needed and performs desired actions to favorite stores
 */
export interface IFavoriteToggleProps {
    definition: DefinitionReference;
    isMyFavorite: boolean;
    className?: string;
}

export class FavoriteToggle extends React.Component<IFavoriteToggleProps, {}> {
    // http://vstsdesignstandards.azurewebsites.net/components/favorites.html
    public render(): JSX.Element {
        if (!canUseFavorites()) {
            return null;
        }

        const isMyFavorite = this.props.isMyFavorite;

        let title = TFS_Resources_Presentation.AddToMyFavoritesTooltipText;
        if (this.props.isMyFavorite) {
            title = TFS_Resources_Presentation.RemoveFromMyFavoritesTooltipText;
        }

        return <IconButton
            className={css("build-favorite-toggle fav-icon bowtie-icon", this.props.className, {
                "bowtie-favorite visible build-favorite": isMyFavorite,
                "bowtie-favorite-outline": !isMyFavorite
            })}
            label={title}
            toggleState={isMyFavorite}
            onClick={this._onClick}>
        </IconButton>;
    }

    private _onClick = () => {
        let eventName = UserActions.AddToMyFavorites;
        if (this.props.isMyFavorite) {
            eventName = UserActions.RemoveFromMyFavorites;
        }

        getEventsService().fire(eventName, this, { definition: this.props.definition });
    }
}
