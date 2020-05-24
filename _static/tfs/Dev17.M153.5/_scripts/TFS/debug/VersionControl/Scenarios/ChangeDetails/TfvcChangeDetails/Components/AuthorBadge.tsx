import * as React from "react";

import { IdentityHelper } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import * as Utils_String from "VSS/Utils/String";

import { AvatarBadge } from "VersionControl/Scenarios/Shared/AvatarControls";
import { IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { ChangeDetailsAuthoredOn } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";

import "VSS/LoaderPlugins/Css!VersionControl/AuthorBadge";

export interface AuthorBadgeProps {
    imageProperties: IAvatarImageProperties;
    authoredDateString: string;
}

export const AuthorBadge = ({ imageProperties, authoredDateString }: AuthorBadgeProps): JSX.Element => {
    return (
        <div className={"author-badge-container"}>
            <div className={"author-badge-header"}>
                <AvatarBadge
                    imageProperties={imageProperties}
                    tooltip={IdentityHelper.getDistinctDisplayName(imageProperties.displayName, imageProperties.email)}
                    showProfileCardOnClick={true} />
            </div>
            <div className={"authored-date"}
                aria-label={Utils_String.format(ChangeDetailsAuthoredOn, authoredDateString)}>
                {authoredDateString}
            </div>
        </div>
    );
}
