import * as Utils_String from "VSS/Utils/String";

import * as PackageResources from "Feed/Common/Resources";
import { FeedRole } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class RoleHelper {
    public static roleToLocaleString(role: FeedRole): string {
        switch (role) {
            case FeedRole.Administrator:
                return PackageResources.FeedSettings_Permissions_Role_Owner;
            case FeedRole.Contributor:
                return PackageResources.FeedSettings_Permissions_Role_Contributor;
            case FeedRole.Custom:
                return "Custom";
            case FeedRole.None:
                return "None";
            case FeedRole.Reader:
                return PackageResources.FeedSettings_Permissions_Role_Reader;
            case FeedRole.Collaborator:
                return PackageResources.FeedSettings_Permissions_Role_Collaborator;
        }
    }

    public static stringToRole(role: string): FeedRole {
        if (Utils_String.equals(role, PackageResources.FeedSettings_Permissions_Role_Owner)) {
            return FeedRole.Administrator;
        }

        if (Utils_String.equals(role, PackageResources.FeedSettings_Permissions_Role_Contributor)) {
            return FeedRole.Contributor;
        }

        if (Utils_String.equals(role, PackageResources.FeedSettings_Permissions_Role_Reader)) {
            return FeedRole.Reader;
        }

        if (Utils_String.equals(role, PackageResources.FeedSettings_Permissions_Role_Collaborator)) {
            return FeedRole.Collaborator;
        }
    }
}
