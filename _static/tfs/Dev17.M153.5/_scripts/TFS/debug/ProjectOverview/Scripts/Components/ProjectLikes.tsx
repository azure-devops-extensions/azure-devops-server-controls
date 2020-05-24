import * as React from "react";

import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { LikeArtifactInfo } from "Social/Components/Likes/LikeModels";
import { StatefulLikeHeart } from "Social/Components/Likes/StatefulLikeHeart";

import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/ProjectLikes";

export interface ProjectLikesProps {
    projectId: string;
    isOrganizationActivated: boolean;
    onLikeHeartRender?(): void;
}

export class ProjectLikes extends React.Component<ProjectLikesProps, {}> {

    public render(): JSX.Element {

        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.NewProjectOverviewPageLikes, false)
            || !this.props.isOrganizationActivated) {
            return null;
        }

        const likeArtifactInfo: LikeArtifactInfo = {
            artifactId: this.props.projectId,
            artifactType: "Project",
            artifactScopeType: "Project",
            artifactScopeId: this.props.projectId,
        };

        return (
            <StatefulLikeHeart
                className={"project-like-component"}
                likeArtifactInfo={likeArtifactInfo}
                onLikeHeartRender={this.props.onLikeHeartRender}
                tooltipUnliked={ProjectOverviewResources.LikeHeartTooltipUnliked}
                serviceInstanceId={ServiceInstanceTypes.TFS} />
        );
    }
}
