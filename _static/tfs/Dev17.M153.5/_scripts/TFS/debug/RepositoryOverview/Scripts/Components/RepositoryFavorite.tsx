import * as React from "react";

import * as VSS from "VSS/VSS";
import { StarView, StarViewHelper } from "Favorites/Controls/StarView";
import { FavoriteCreateParameters } from "Favorites/Contracts";
import { FavoriteStorageScopes } from "Favorites/Constants";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";
import { IFavoritesActionsCreator } from "Favorites/Controls/FavoritesActionsCreator";
import { IFavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";

import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import "VSS/LoaderPlugins/Css!RepositoryOverview/Scripts/Components/RepositoryFavorite";

export interface GitRepositoryFavoriteProps {
    repositoryContext: GitRepositoryContext;
    className: string;
}

export class GitRepositoryFavorite extends React.Component<GitRepositoryFavoriteProps, {}> {
    private _store: FavoritesStore;
    private _actionsCreator: IFavoritesActionsCreator;
    private _dataProvider: IFavoritesDataProvider;

    constructor(props: GitRepositoryFavoriteProps) {
        super(props);

        const favoriteFlux = StarViewHelper.getDataByArtifact(this.getArtifact());
        this._store = favoriteFlux.store;
        this._actionsCreator = favoriteFlux.actionsCreator;
        this._dataProvider = favoriteFlux.dataProvider;
    }

    private getArtifact = (): FavoriteCreateParameters => {
        const repository = this.props.repositoryContext.getRepository();
        let favParams: FavoriteCreateParameters = {
            artifactId: repository.id,
            artifactType: TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_GIT_REPOSITORY,
            artifactName: repository.name,
            artifactScope: {
                id: this.props.repositoryContext.getProjectId(),
                type: FavoriteStorageScopes.Project,
                name: repository.project.name
            },
            artifactProperties: undefined,
            owner: undefined,
        };

        return favParams;
    }

    public render(): JSX.Element {
        return (
            <div className={this.props.className}>
                <StarView
                    artifact={this.getArtifact()}
                    store={this._store}
                    actionsCreator={this._actionsCreator}
                    dataProvider={this._dataProvider}
                    className="ro-repo-favorite" />
            </div>
        );
    }
}
