import * as React from "react";

import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

import { LikeArtifactInfo } from "Social/Components/Likes/LikeModels";
import { StatefulLikeHeart } from "Social/Components/Likes/StatefulLikeHeart";

import * as RepositoryOverviewResources from "RepositoryOverview/Scripts/Resources/TFS.Resources.RepositoryOverview";

export interface RepositoryLikesProps {
    className: string;
    repositoryId: string
    projectId: string;
    isOrganizationActivated: boolean;
    isTfvcRepo: boolean;
}

export const RepositoryLikes: React.StatelessComponent<RepositoryLikesProps> = (props: RepositoryLikesProps): JSX.Element => {
    if (!props.isOrganizationActivated) {
        return null;
    }

    //  ArtifactType depends on the Repository type. 
    //  Also projectId and repositoryId would be same in case of Tfvc Project or Tfvc Repository.
    const tfvcRepoArtifactType: string = "TfvcRepository";
    const gitRepoArtifactType: string = "GitRepository";

    const likeArtifactInfo: LikeArtifactInfo = {
        artifactId: props.isTfvcRepo ? props.projectId : props.repositoryId,
        artifactType: props.isTfvcRepo ? tfvcRepoArtifactType : gitRepoArtifactType,
        artifactScopeType: "Project",
        artifactScopeId: props.projectId,
    };

    return (
        <StatefulLikeHeart
            className={props.className}
            likeArtifactInfo={likeArtifactInfo}
            tooltipUnliked={RepositoryOverviewResources.LikeHeartTooltipUnliked}
            serviceInstanceId={ServiceInstanceTypes.TFS} />
    );
}
