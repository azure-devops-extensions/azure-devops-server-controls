import { Identity } from "VSS/Identities/Contracts";
import * as Service from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";

import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { IdentityDataService } from "Package/Scripts/DataServices/IdentityDataService";
import * as PackageResources from "Feed/Common/Resources";
import { FeedPermission } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

/**
 * User clicked 'Save' button in 'Add users or groups' panel
 * save new users/groups to server and add to grid
 */
export class SavePermissionsHandler {
    public static async handleAsync(state: IFeedSettingsState, permissionsToAdd: FeedPermission[]): Promise<void> {
        if (permissionsToAdd == null || permissionsToAdd.length === 0) {
            // shouldn't encounter this case, if you do then you're calling this method in wrong place
            throw new Error("permissionsToAdd cannot be null or empty");
        }

        await this.setIdentityDescriptorsAsync(permissionsToAdd);

        await this.setFeedPermissionsAsync(state.feed().id, permissionsToAdd);

        // ideally we should just set state.feed.permissions with permissions but server
        // doesn't return all properties only identityDescriptor and role
        state.feedPermissions = state.feedPermissions.concat(permissionsToAdd);

        announce(PackageResources.SavedAnnouncement);
    }

    public static async setIdentityDescriptorsAsync(permissionsToAdd: FeedPermission[]): Promise<void> {
        const identityIds = [];
        permissionsToAdd.forEach((permission: FeedPermission) => {
            identityIds.push(permission.identityId);
        });

        // need to get descriptors for recently added user/group because IdentityPicker
        // doesn't return descriptors
        const identityDataService = Service.getService(IdentityDataService);
        const identities: Identity[] = await identityDataService.readIdentitiesAsync(identityIds);

        identities.forEach((identity: Identity, index: number) => {
            permissionsToAdd[index].identityDescriptor = identity.descriptor;
        });
    }

    private static async setFeedPermissionsAsync(
        feedId: string,
        permissionsToUpdate: FeedPermission[]
    ): Promise<FeedPermission[]> {
        const feedDataService = Service.getService(FeedsDataService);
        return feedDataService.setFeedPermissionsAsync(feedId, permissionsToUpdate);
    }
}
