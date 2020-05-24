

import * as Diag from "VSS/Diag";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { isSafeProtocol } from "VSS/Utils/Url";

export interface IOAuthLoginInfo {
    strongboxKey: string;
    loginUser: string;
    loginAvatarUrl: string;
}

export class ConnectedServiceAuthHelper {
    constructor(onAuthorized: (loginInfo: IOAuthLoginInfo) => void, onAuthorizationError: (error: string) => void, authWindow: Window) {
        this._onAuthorizationError = onAuthorizationError;
        this._onAuthorized = onAuthorized;
        this._authWindow = authWindow;
    }

    public LaunchAuthUrl(url: string): void {
        if (isSafeProtocol(url)) {
            if (this._authWindow) {
                this._authWindow.location.href = url;
                this._authWindow.opener = null;
            }

            this._pollAuthWindow();
        }
    }

    private _pollAuthWindow(): void {
        this._delayedFunction = Utils_Core.delay(this, ConnectedServiceAuthHelper._pollingInterval, () => {
            this._delayedFunction.cancel();
            delete this._delayedFunction;

            try {
                if (!this._authWindow || this._authWindow.closed) {
                    this._cleanupAuthWindow();
                    this._onAuthorizationError(Utils_String.empty);
                } else {
                    if (this._authWindow.oauthcompleted) {

                        if (this._authWindow.oautherrormessage) {
                            this._onAuthorizationError(this._authWindow.oautherrormessage);
                        }

                        if (this._authWindow.strongboxkey) {
                            const avatarUrl = this._authWindow.owneravatarurl && this._authWindow.owneravatarurl !== "Unknown"
                                ? this._authWindow.owneravatarurl : undefined;
                            this._onAuthorized({
                                strongboxKey: this._authWindow.strongboxkey,
                                loginUser: this._authWindow.ownerlogin,
                                loginAvatarUrl: avatarUrl
                            } as IOAuthLoginInfo);
                        }

                        this._cleanupAuthWindow();
                    } else {
                        this._pollAuthWindow();
                    }
                }
            }
            catch (e) {
                this._pollAuthWindow();
            }
        });
    }

    private _cleanupAuthWindow() {
        if (this._authWindow) {
            try {
                this._authWindow.close();
                this._authWindow = null;
            }
            catch (e) {
                Diag.logError(e.message || e);
             }
        }

        if (this._delayedFunction) {
            this._delayedFunction.cancel();
            delete this._delayedFunction;
        }
    }

    private _authWindow: any;
    private _delayedFunction: Utils_Core.DelayedFunction;
    private _onAuthorized: (loginInfo: IOAuthLoginInfo) => void;
    private _onAuthorizationError: (error: string) => void;
    private static _pollingInterval: number = 500;
}
