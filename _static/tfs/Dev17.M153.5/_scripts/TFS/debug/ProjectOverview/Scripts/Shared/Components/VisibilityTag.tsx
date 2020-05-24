import * as React from "react";

import { Icon } from "OfficeFabric/Icon";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { css, getId } from "OfficeFabric/Utilities";
import { format } from "VSS/Utils/String";
import { ProjectVisibility } from "TFS/Core/Contracts";

import { ProjectVisibilityConstants } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Shared/Components/VisibilityTag";

const visibilityTagId = getId("visibility-tag");

export interface VisibilityTagProps {
    visibility: string,
    className?: string
}

export const VisibilityTag: React.StatelessComponent<VisibilityTagProps> = (props: VisibilityTagProps): JSX.Element => {
    if (props.visibility) {
        const tooltipText = getVisibilityTooltipText(props.visibility);
        const iconName = getVisibilityIconName(props.visibility);
        const visibilityText = getVisibilityText(props.visibility);
        return (
            <div className={css("visibility-tag-container", props.className)}>
                <TooltipHost
                    content={tooltipText}
                    directionalHint={DirectionalHint.topCenter}
                    id={visibilityTagId}>
                    <div
                        className={"visibility-tag"}
                        tabIndex={0}
                        aria-describedby={visibilityTagId}>
                        <Icon iconName={iconName} className="visibility-icon" />
                        <span className="visibility-text">{visibilityText}</span>
                    </div>
                </TooltipHost>
            </div>);
    }

    return null;
}

function getVisibilityIconName(visibility: string): string {
    switch (visibility) {
        case ProjectVisibilityConstants.TeamMembers:
            return "Lock";
        case ProjectVisibilityConstants.EveryoneInTenant:
            return "CityNext";
        case ProjectVisibilityConstants.Everyone:
            return "Globe";
        default:
            throw new Error(format(ProjectOverviewResources.VisibilityTag_VisibilityValueInvalid, visibility));
    };
}

function getVisibilityText(visibility: string): string {
    switch (visibility) {
        case ProjectVisibilityConstants.TeamMembers:
            return ProjectVisibility[ProjectVisibility.Private];
        case ProjectVisibilityConstants.EveryoneInTenant:
            return ProjectOverviewResources.ProjectVisibilityEveryoneInTenant;  //Mismatch with enum name since organization is renamed to enterprise
        case ProjectVisibilityConstants.Everyone:
            return ProjectVisibility[ProjectVisibility.Public];
        default:
            throw new Error(format(ProjectOverviewResources.VisibilityTag_VisibilityValueInvalid, visibility));
    };
}

function getVisibilityTooltipText(visibility: string): string {
    switch (visibility) {
        case ProjectVisibilityConstants.TeamMembers:
            return ProjectOverviewResources.VisibilityTag_PrivateProject_Tooltip_Text;
        case ProjectVisibilityConstants.EveryoneInTenant:
            return ProjectOverviewResources.VisibilityTag_OrgVisibleProject_Tooltip_Text;
        case ProjectVisibilityConstants.Everyone:
            return ProjectOverviewResources.VisibilityTag_PublicProject_Tooltip_Text;
        default:
            throw new Error(format(ProjectOverviewResources.VisibilityTag_VisibilityValueInvalid, visibility));
    };
}
