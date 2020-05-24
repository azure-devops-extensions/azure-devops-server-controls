import { autobind } from "OfficeFabric/Utilities";

import { Action } from "VSS/Flux/Action";

import { PackageManagementSettingsDialogHandler } from "Package/Scripts/Actions/FeedList/PackageManagementSettingDialogHandler";
import { FeedStore } from "Package/Scripts/Stores/FeedStore";

export class FeedActionCreator {
    /**
     * User clicked on Settings icon and selected Global settings, show global Package Management SettingsDialog
     */
    public showPackageManagementSettingDialog: Action<{}>;
    public dismissfeedMessageBar: Action<{}>;
    public updateFeedMessage: Action<{}>;

    constructor(store: FeedStore) {
        this.store = store;
    }

    public initializeListeners(): void {
        this.showPackageManagementSettingDialog = new Action<{}>();
        this.showPackageManagementSettingDialog.addListener(PackageManagementSettingsDialogHandler.Open);

        this.dismissfeedMessageBar = new Action<{}>();
        this.dismissfeedMessageBar.addListener(this.clearFeedMessage);

        this.updateFeedMessage = new Action<{}>();
        this.updateFeedMessage.addListener(this.updateFeedMessageAsync);
    }

    public detachListeners(): void {
        this.showPackageManagementSettingDialog.removeListener(PackageManagementSettingsDialogHandler.Open);
        this.dismissfeedMessageBar.removeListener(this.clearFeedMessage);
        this.updateFeedMessage.removeListener(this.updateFeedMessageAsync);
    }

    @autobind
    private async updateFeedMessageAsync(): Promise<void> {
        const manager = this.store.getFeedManager();
        await manager.updateFeedMessageAsync();
        this.store.emit();
    }

    @autobind
    private clearFeedMessage(): void {
        const manager = this.store.getFeedManager();
        manager.clearFeedMessage();
        this.store.emit();
    }

    // need to get abstract state or create abstraction here to pass it to handlers
    private store: FeedStore;
}
