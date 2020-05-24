import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_Core from "VSS/Utils/Core";

export class DelayAnnounceHelper {
    private _announceDelayDelegate: Utils_Core.DelayedFunction;

    public startAnnounce(message: string, announceStartDelayMs: number = 500): void {
        if (!this._announceDelayDelegate) {
            this._announceDelayDelegate = Utils_Core.delay(this, announceStartDelayMs, () => {
                Utils_Accessibility.announce(message, false);
            });
        }
    }

    public stopAndCancelAnnounce(message: string, failure: boolean = false): void {
        if (!failure) {
            Utils_Accessibility.announce(message, false);
        }

        if (this._announceDelayDelegate) {
            this._announceDelayDelegate.cancel();
            this._announceDelayDelegate = null;
        }
    }
}
