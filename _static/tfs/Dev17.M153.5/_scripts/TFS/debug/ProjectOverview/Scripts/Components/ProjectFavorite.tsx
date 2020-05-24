import * as React from "react";

import * as VSS from "VSS/VSS";
import { StarView, StarViewHelper } from "Favorites/Controls/StarView";
import { FavoriteCreateParameters } from "Favorites/Contracts";
import { FavoriteStorageScopes } from "Favorites/Constants";

import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ProjectFavorite";

export interface ProjectFavoriteProps {
    projectId: string;
    projectName: string;
}

export class ProjectFavorite extends React.Component<ProjectFavoriteProps, {}> {
    private _defaultProps: any;

    public componentWillMount() {
        this._defaultProps = StarViewHelper.getDataByArtifact(this.getArtifact());
    }

    private getArtifact(): FavoriteCreateParameters {
        return {
            artifactId: this.props.projectId,
            artifactType: TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_PROJECT,
            artifactName: this.props.projectName,
            artifactScope: { id: this.props.projectId, type: FavoriteStorageScopes.Project, name: this.props.projectName }

        } as FavoriteCreateParameters;
    }

    public render(): JSX.Element {

        return (
            <div id="po-favorite-container">
                <StarView
                    artifact={this.getArtifact()}
                    store={this._defaultProps.store}
                    actionsCreator={this._defaultProps.actionsCreator}
                    dataProvider={this._defaultProps.dataProvider}
                    className="project-overview-favorite" />
            </div>
        );
    }
}
