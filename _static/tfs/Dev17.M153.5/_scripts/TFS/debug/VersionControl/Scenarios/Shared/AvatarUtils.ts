import { IdentityRef } from "VSS/WebApi/Contracts";
import * as Utils_String from "VSS/Utils/String";
import { AvatarImageSize, IAvatarImageStyle, IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { getTFSIdentityfromAuthor } from "VersionControl/Scripts/Utils/SearchCriteriaUtil";

export class AvatarUtils {
    /**
     * Creates the Identity Ref object from the Avatar Image Properties object
     * @param avatarImageProps
     */
    public static AvatarImagePropertiesToIdentityRef(avatarImageProps: IAvatarImageProperties): IdentityRef {
        return <IdentityRef>{
            id: avatarImageProps.identityId,
            displayName: avatarImageProps.displayName,
            isContainer: false,
            uniqueName: avatarImageProps.email,
            imageUrl: "", // obsolete
            isAadIdentity: false,
            profileUrl: "",
            url: "",
            inactive: false,
            directoryAlias: null,
            _links: {
                avatar: {
                    href: avatarImageProps.imageUrl,
                },
            },
        };
    }

    /**
     * Converted the Image Size enum to a string class that the IdentityImage.Component understands
     * @param sizeEnum
     */
    public static AvatarImageSizeToCssStyle(sizeEnum: AvatarImageSize): IAvatarImageStyle {
        if (sizeEnum === AvatarImageSize.ExtraSmall) {
            return {
                className: "x-small",
                imageSize: 16,
            };
        } else if (sizeEnum === AvatarImageSize.SmallMinus) {
            return {
                className: "small-minus",
                imageSize: 24,
            };
        } else if (sizeEnum === AvatarImageSize.Small) {
            return {
                className: "small",
                imageSize: 32,
            };
        } else if (sizeEnum === AvatarImageSize.SmallPlus) {
            return {
                className: "small-plus",
                imageSize: 40,
            };
        } else if (sizeEnum === AvatarImageSize.Large) {
            return {
                className: "large-identity-picture",
                imageSize: 80,
            };
        }
        return {
            className: "",
            imageSize: 48,
        }; // AvatarImageSize.Medium is the default
    }

    public static AvatarImagePropertiesToPersonaCardIdentityRef(avatarImageProps: IAvatarImageProperties): IdentityRef {
        const identity = AvatarUtils.AvatarImagePropertiesToIdentityRef(avatarImageProps);

        // If uniqueName contains both display name and email split them apart and assign the email to uniqueName
        const parsedIdentity = getTFSIdentityfromAuthor(identity.uniqueName);
        if (parsedIdentity && parsedIdentity.displayName &&
            parsedIdentity.displayName === identity.displayName &&
            parsedIdentity.alias !== Utils_String.empty) {
            identity.uniqueName = parsedIdentity.alias;
        }

        return identity;
    }

    public static getAvatarUrl(identity: IdentityRef): string {
        if (identity) {
            const { _links, imageUrl } = identity;

            if (_links && _links.avatar && _links.avatar.href) {
                return _links.avatar.href;
            }

            // fallback to imageurl becasue of bug# 1234049: _links.avatar.href is returned as empty
            // for member users because of IsResourceRegistered check.
            // this will die out eventually
            if (imageUrl) {
                return imageUrl;
            }
        }

        return undefined; 
    }
}