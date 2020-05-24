import * as Utils_String from "VSS/Utils/String";

import { IValidationResult } from "Package/Scripts/Actions/FeedSettings/ValidationHandler";
import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedSettingsComponents } from "Feed/Common/Constants/Constants";
import { FeedPermission } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import * as PackageResources from "Feed/Common/Resources";
import { CustomSet } from "Feed/Common/Types/CustomSet";

export class PermissionValidator {
    public static GetValidationResult(
        state: IFeedSettingsState,
        permissionsToAdd: FeedPermission[]
    ): IValidationResult {
        const validationResult: IValidationResult = {
            componentKey: FeedSettingsComponents.permission,
            errorMessage: null
        };

        if (permissionsToAdd == null) {
            // last identity got removed, re-render so Add button will be disabled
            return null;
        }

        // instead of 2 doing loops to check whether new identities already exists
        // create a set with incoming permissions and loop through existing ones
        const addPermissionSet = new CustomSet<string>();
        permissionsToAdd.forEach((permission: FeedPermission) => {
            addPermissionSet.add(permission.identityId);
        });

        const displayNamesOfExistingPermission: string[] = [];

        // check first in existing permissions, capture them
        state.feedPermissions.forEach((existingPermission: FeedPermission) => {
            const permissionExists = addPermissionSet.has(existingPermission.identityId);
            if (permissionExists === false) {
                return;
            }

            // these identities already exist in grid
            displayNamesOfExistingPermission.push(existingPermission.displayName);
        });

        // get error message with display names of existing identities to show to user
        if (displayNamesOfExistingPermission.length > 0) {
            const displayNames: string = displayNamesOfExistingPermission.join(", ");
            validationResult.errorMessage = Utils_String.format(
                PackageResources.Error_FeedSettings_PermissionAlreadyExists,
                displayNames
            );
            return validationResult;
        }

        // new identity was added, re-render so Add button will be enabled
        return null;
    }
}
