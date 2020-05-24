/// <reference types="react" />

import * as React from "react";
import { PlanMetadata } from "TFS/Work/Contracts";
import { IViewData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { StarView } from "Favorites/Controls/StarView";
import { StarViewHelper } from "Favorites/Controls/StarView";
import { FavoriteCreateParameters } from "Favorites/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export interface IFavoriteStarProps {
    plan: IViewData; 
}

 export var FavoriteStar: React.StatelessComponent<IFavoriteStarProps> =
     (props: IFavoriteStarProps): JSX.Element => {
         if (props && props.plan) {
             const { plan } = props;
             const data: PlanMetadata = { description: plan.description, modifiedDate: plan.modifiedDate, createdByIdentity: plan.createdByIdentity, userPermissions: plan.userPermissions };
             const favorite = {
                 artifactId: plan.id,
                 artifactProperties: data,
                 artifactType: "Microsoft.TeamFoundation.Work.Plans",
                 artifactName: plan.name,
                 artifactScope: { id: TfsContext.getDefault().contextData.project.id, type: "Project", name: undefined },
                 owner: undefined
             } as FavoriteCreateParameters;
             const flux = StarViewHelper.getDataByArtifact(favorite);
             return <StarView
                 artifact={favorite}
                 actionsCreator={flux.actionsCreator}
                 store={flux.store}
                 dataProvider={flux.dataProvider} />;
         }
         return null;
     };

