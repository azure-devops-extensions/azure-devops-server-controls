import { autobind } from "OfficeFabric/Utilities";
import * as VSSStore from "VSS/Flux/Store";
import {
    GitRepositoryPermissionSet,
    GitPermissionsSource,
    getDefaultRepositoryPermissionSet
} from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import {
    SettingsPermissions,
    SettingsPermissionsSource,
    getDefaultSettingsPermissions
} from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

export interface PermissionsSet {
    gitPermission: GitRepositoryPermissionSet;
    settingsPermissions: SettingsPermissions;
}
export class PermissionStore extends VSSStore.Store {

    public state: PermissionsSet;

    constructor() {
        super();
        this.state = this.getDefaultSet();
    }

    @autobind
    public gitPermissionUpdate(gitRepositoryPermissionSet: GitRepositoryPermissionSet): void {
        this.state.gitPermission = gitRepositoryPermissionSet;
        this.emitChanged();
    }

    @autobind
    public settingPermissionUpdate(settingsPermissions: SettingsPermissions): void {
        this.state.settingsPermissions = settingsPermissions;
        this.emitChanged();
    }

    private getDefaultSet(): PermissionsSet {
        return {
            gitPermission: getDefaultRepositoryPermissionSet(),
            settingsPermissions: getDefaultSettingsPermissions()
        };
    }
}