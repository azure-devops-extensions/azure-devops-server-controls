import * as Service from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { FeedPermission, FeedRole } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { CustomSet } from "Feed/Common/Types/CustomSet";

/**
 * User clicked Delete button in Feed permission's grid
 * send delete request to server and remove from grid
 */
export class DeletePermissionsHandler {
    public static async handleAsync(state: IFeedSettingsState): Promise<void> {
        if (state.selectedPermissions == null || state.selectedPermissions.length === 0) {
            // shouldn't encounter this case, if you do then you're calling this method in wrong place
            throw new Error("state.selectedPermissions cannot be null or empty");
        }

        if (state.feedPermissions.length === state.selectedPermissions.length) {
            // shouldn't encounter this case either, since PCA is not selectable in UI
            throw new Error("Cannot delete all the permissions");
        }

        const permissionsToUpdate: FeedPermission[] = [];
        const deletedIdentityIds = new CustomSet<string>();

        state.selectedPermissions.forEach((selectedPermission: FeedPermission) => {
            selectedPermission.role = FeedRole.None;
            permissionsToUpdate.push(selectedPermission);
            deletedIdentityIds.add(selectedPermission.identityId);
        });

        const feedsDataService = Service.getService(FeedsDataService);
        await feedsDataService.setFeedPermissionsAsync(state.feed().id, permissionsToUpdate);

        const permissionNames: string = permissionsToUpdate.map(permission => permission.displayName).join(", ");
        announce(Utils_String.format(PackageResources.DeletedAnnouncement, permissionNames));

        // ideally we should just set state.feed.permissions with permissions but server
        // doesn't return all properties only identityDescriptor and role
        state.feedPermissions.forEach((permission: FeedPermission, index: number) => {
            if (deletedIdentityIds.has(permission.identityId)) {
                state.feedPermissions[index] = null;
            }
        });

        // reset the list tracking selection
        state.selectedPermissions = [];

        state.feedPermissions = state.feedPermissions.filter((permission: FeedPermission) => {
            return permission != null;
        });

        return;
    }
}
