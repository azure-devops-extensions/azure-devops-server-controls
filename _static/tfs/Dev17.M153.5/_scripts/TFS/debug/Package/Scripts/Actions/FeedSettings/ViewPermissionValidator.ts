import * as Utils_String from "VSS/Utils/String";

import { IValidationResult } from "Package/Scripts/Actions/FeedSettings/ValidationHandler";
import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedSettingsComponents } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";
import { FeedPermission } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class ViewPermissionValidator {
    public static GetValidationResult(
        state: IFeedSettingsState,
        viewId: string,
        permissionToAdd: FeedPermission
    ): IValidationResult {
        const validationResult: IValidationResult = {
            componentKey: FeedSettingsComponents.viewPermission,
            errorMessage: null
        };

        if (permissionToAdd == null) {
            return validationResult;
        }

        const existingViewPermissions = ViewPermissionValidator._getCurrentPermissions(
            state.viewPermissions[viewId],
            state.viewPermissionsToAdd[viewId],
            state.viewPermissionsToRemove[viewId]
        );

        // Just check the identity id -- we only need to add reader permissions if no permissions for the identity currently exist
        const permissionAlreadyExists: boolean = existingViewPermissions.some((permission: FeedPermission) => {
            return permission.identityId === permissionToAdd.identityId;
        });

        if (permissionAlreadyExists) {
            validationResult.errorMessage = Utils_String.format(
                PackageResources.Error_FeedSettings_SufficientPermissionAlreadyExists,
                permissionToAdd.displayName
            );
            return validationResult;
        }
    }

    private static _getCurrentPermissions(
        permissions: FeedPermission[],
        permissionsToAdd: FeedPermission[],
        permissionsToRemove: FeedPermission[]
    ): FeedPermission[] {
        const result: FeedPermission[] = [];

        const permissionsToRemoveMap: IDictionaryStringTo<string> = {};
        if (permissionsToRemove) {
            for (const permission of permissionsToRemove) {
                permissionsToRemoveMap[permission.identityId] = permission.identityId;
            }
        }

        // add existing permissions, excluding those to be removed
        if (permissions) {
            for (const permission of permissions) {
                if (permissionsToRemoveMap[permission.identityId] == null) {
                    result.push(permission);
                }
            }
        }

        // add new permissions
        if (permissionsToAdd) {
            result.concat(permissionsToAdd);
        }

        return result;
    }
}
