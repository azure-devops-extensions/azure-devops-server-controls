import { findIndex } from "OfficeFabric/Utilities";

import * as Service from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";

import { SavePermissionsHandler } from "Package/Scripts/Actions/FeedSettings/SavePermissionsHandler";
import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedsDataService } from "Package/Scripts/DataServices/FeedsDataService";
import { FeedPermission, FeedRole, FeedView, FeedViewType, FeedVisibility } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { CustomSet } from "Feed/Common/Types/CustomSet";

/**
 * User clicked 'Add' button in 'Add view' panel, add that view to grid
 */
export class SaveViewHandler {
    public static async handleAsync(
        state: IFeedSettingsState,
        view: FeedView,
        viewPermissions: FeedPermission[]
    ): Promise<FeedView> {
        if (state.isViewPanelInEditMode) {
            return this.updateViewAsync(state, view, viewPermissions);
        }

        return this.addViewAsync(state, view, viewPermissions);
    }

    private static async addViewAsync(
        state: IFeedSettingsState,
        view: FeedView,
        viewPermissions: FeedPermission[]
    ): Promise<FeedView> {
        const feedId = state.feed().id;
        const feedView = await this.createViewAsync(feedId, view);
        state.views.push(feedView);

        await this.saveViewPermissionsAsync(
            view.visibility,
            state.viewPermissions,
            feedId,
            feedView.id,
            viewPermissions
        );

        announce(PackageResources.SavedAnnouncement);
        return feedView;
    }

    private static async updateViewAsync(
        state: IFeedSettingsState,
        viewToUpdate: FeedView,
        viewPermissions: FeedPermission[]
    ): Promise<FeedView> {
        const feedId = state.feed().id;
        const feedView = await this.updateFeedViewAsync(feedId, viewToUpdate);

        // replace view with updated view
        const index = findIndex(state.views, (view: FeedView) => {
            return view.id === feedView.id;
        });

        if (index > -1) {
            state.views[index] = feedView;
        }

        await this.saveViewPermissionsAsync(
            feedView.visibility,
            state.viewPermissions,
            feedId,
            feedView.id,
            viewPermissions
        );

        announce(PackageResources.SavedAnnouncement);
        return feedView;
    }

    private static async createViewAsync(feedId: string, view: FeedView): Promise<FeedView> {
        const feedDataService = Service.getService(FeedsDataService);
        const feedView = feedDataService.createFeedViewAsync(feedId, view);
        return feedView;
    }

    private static async updateFeedViewAsync(feedId: string, viewToUpdate: FeedView): Promise<FeedView> {
        const view: FeedView = {
            id: viewToUpdate.id,
            // do not send a view name for an implicit view
            name: viewToUpdate.type === FeedViewType.Implicit ? null : viewToUpdate.name,
            visibility: viewToUpdate.visibility
        } as FeedView;

        const feedDataService = Service.getService(FeedsDataService);
        return feedDataService.updateFeedViewAsync(feedId, view, view.id);
    }

    private static async saveViewPermissionsAsync(
        viewVisibility: FeedVisibility,
        viewPermissionsMap: IDictionaryStringTo<FeedPermission[]>,
        feedId: string,
        viewId: string,
        permissions: FeedPermission[]
    ): Promise<void> {
        // We only update permissions for private views -- organization and collection views just save the visiblity state
        if (viewVisibility !== FeedVisibility.Private) {
            return;
        }

        if (permissions == null || permissions.length === 0) {
            // user selected 'private' visibility but did not add users to it
            return;
        }

        // there is no existing permission for new view
        const existingPermissions = viewPermissionsMap[viewId] || [];

        const { permissionsToRetain, permissionsToAdd, permissionsToDelete } = this.splitPermissions(
            existingPermissions,
            permissions
        );

        if (permissionsToAdd.length > 0) {
            await SavePermissionsHandler.setIdentityDescriptorsAsync(permissionsToAdd);
        }

        if (permissionsToDelete.length > 0) {
            // set role to None for deleted permissions
            this.updateRoleForPermissionsToDelete(permissionsToDelete);
        }

        const permissionsToSend = [...permissionsToAdd, ...permissionsToDelete];
        await this.setFeedPermissionsAsync(feedId, viewId, permissionsToSend);

        // TODO: Determine whether we should instead be setting the view permission map value
        // to the permissions returned from setFeedPermissionsAsync
        viewPermissionsMap[viewId] = permissionsToRetain.concat(permissionsToAdd);
    }

    private static async setFeedPermissionsAsync(
        feedId: string,
        viewId: string,
        permissions: FeedPermission[]
    ): Promise<FeedPermission[]> {
        const feedDataService = Service.getService(FeedsDataService);
        return feedDataService.setFeedViewPermissionsAsync(feedId, viewId, permissions);
    }

    private static splitPermissions(
        viewPermissions: FeedPermission[],
        permissionsToUpdate: FeedPermission[]
    ): {
        permissionsToRetain: FeedPermission[];
        permissionsToAdd: FeedPermission[];
        permissionsToDelete: FeedPermission[];
    } {
        const permissionsToRetain = [];
        const permissionsToAdd = [];
        const permissionsToDelete = [];

        const viewPermissionsSet = new CustomSet<string>();
        const permissionsToUpdateSet = new CustomSet<string>();
        permissionsToUpdate.forEach((permission: FeedPermission) => {
            permissionsToUpdateSet.add(permission.identityId);
        });

        viewPermissions.forEach((permission: FeedPermission) => {
            viewPermissionsSet.add(permission.identityId);

            if (permissionsToUpdateSet.has(permission.identityId)) {
                permissionsToRetain.push(permission);
                return;
            }

            permissionsToDelete.push(permission);
        });

        permissionsToUpdate.forEach((permission: FeedPermission) => {
            if (viewPermissionsSet.has(permission.identityId)) {
                // existing or deleted, already captured
                return;
            }

            permissionsToAdd.push(permission);
        });

        return { permissionsToRetain, permissionsToAdd, permissionsToDelete };
    }

    private static updateRoleForPermissionsToDelete(permissions: FeedPermission[]): void {
        permissions.forEach((permission: FeedPermission) => {
            permission.role = FeedRole.None;
        });
    }
}
