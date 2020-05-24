import * as SignalRUtils from "VersionControl/Scripts/Utils/SignalRUtils";
import { SharedState, SharedStoresHub } from "Wiki/Scenarios/Shared/Stores/SharedStoresHub";

export class SignalRSpy implements IDisposable {
    constructor(
        private _sharedStoresHub: SharedStoresHub
    ) {
        this._sharedStoresHub.commonStore.addChangedListener(this._attachSignalRScripts);
        this._sharedStoresHub.permissionStore.addChangedListener(this._attachSignalRScripts);
        this._attachSignalRScripts();
    }

    public dispose(): void {
        this._removeListeners();
    }

    private _removeListeners(): void {
        if (this._sharedStoresHub) {
            this._sharedStoresHub.commonStore &&
                this._sharedStoresHub.commonStore.removeChangedListener(this._attachSignalRScripts);
            this._sharedStoresHub.permissionStore &&
                this._sharedStoresHub.permissionStore.removeChangedListener(this._attachSignalRScripts);
        }
    }

    private _attachSignalRScripts = (): void => {
        const signalrHubUrl: string = this._getSignalRUrl();
        const canRevert: boolean = this._sharedStoresHub.state.permissionState.hasContributePermission;

        if (signalrHubUrl && canRevert) {
            SignalRUtils.loadSignalR(signalrHubUrl);
            this._removeListeners();
        }
    }

    private _getSignalRUrl(): string {
        return this._sharedStoresHub.state.commonState.signalrHubUrl;
    }
}