import { IFeedSettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { FeedPermission } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

export class ChangeSelectedPermissionsHandler {
    public static handle(state: IFeedSettingsState, permissions: FeedPermission[]): void {
        state.selectedPermissions = permissions;
    }
}
