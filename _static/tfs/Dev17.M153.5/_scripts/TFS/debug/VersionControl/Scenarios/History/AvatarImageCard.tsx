import * as React from "react";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";
import { getId } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";
import * as IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";
import { IAvatarImageProperties, IAvatarImageStyle } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/AvatarImageCard";

export interface AvatarImageCardProps extends React.HTMLProps<HTMLDivElement> {
    imageProperties: IAvatarImageProperties;
}

const defaultGravatarMysteryManString: string = "mm";

export const AvatarImageCard = (props: AvatarImageCardProps): JSX.Element => {
    const avatarImageStyle: IAvatarImageStyle = AvatarUtils.AvatarImageSizeToCssStyle(props.imageProperties.size);
    const widthForChildComponent: string = Utils_String.format("calc(100% - {0}px)", avatarImageStyle.imageSize + 10);
    const tooltipId: string = getId('avatar-image-card-tooltip');

    let userTip: string;
    if (props.imageProperties.email) {
        userTip = Utils_String.format("<{0}>", props.imageProperties.email);
    }

    if (props.imageProperties.displayName) {
        if (userTip) {
            userTip = Utils_String.format("{0} {1}", props.imageProperties.displayName, userTip);
        }
        else {
            userTip = props.imageProperties.displayName;
        }
    }

    const imageElement: JSX.Element =
        <div className="avatar-identity-picture"
            aria-describedby={(userTip && tooltipId)}>
            <IdentityImage.Component
                size={avatarImageStyle.className}
                identity={AvatarUtils.AvatarImagePropertiesToPersonaCardIdentityRef(props.imageProperties)}
                altText={""}
                defaultGravatar={defaultGravatarMysteryManString}
                dataIsFocusable
                showProfileCardOnClick={true} />
        </div>;

    return (
        <div className="avatar-image-card">
            {
                userTip ?
                    <TooltipHost
                        id={tooltipId}
                        content={userTip}
                        directionalHint={DirectionalHint.bottomCenter}>
                        {imageElement}
                    </TooltipHost>
                    : imageElement
            }
            <div className="card-details-section" style={{ width: widthForChildComponent }} >
                {props.children}
            </div>
        </div>
    );
}
