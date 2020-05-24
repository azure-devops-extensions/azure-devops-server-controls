import { AppContext } from "DistributedTaskControls/Common/AppContext";

import { getService as getEventService, CommonActions } from "VSS/Events/Action";
import { getLWPModule } from "VSS/LWP";
import { isSafeProtocol, Uri } from "VSS/Utils/Url";
import * as Diag from "VSS/Diag";

const FPS = getLWPModule("VSS/Platform/FPS");

export class UrlUtilities {

    /**
     * 
     * @param url - The Url to open
     * @param allowRelative - This should be sent as true if you are sure that the url is relative.
     *        This is an additional safeguard in addition to code checking for relative url. 
     */
    public static openInNewWindow(url: string, allowRelative?: boolean): void {
        this._performAction(CommonActions.ACTION_WINDOW_OPEN, url, allowRelative);
    }

    public static navigateTo(url: string, allowRelative?: boolean, event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void {
        const lwpContext = AppContext.instance().PageContext;
        if (lwpContext && url) {
            FPS.onClickFPS(lwpContext, url, true, event);
        }
        else {
            this._performAction(CommonActions.ACTION_WINDOW_NAVIGATE, url, allowRelative);
        }
    }

    public static isRelativeUrl(url: string): boolean {
        if (!url || !url.trim()) {
            return true;
        }

        let indexOfSchemeDelimiter = url.indexOf(":");
        return (indexOfSchemeDelimiter < 0);
    }

    private static _performAction(actionName: string, url: string, allowRelative?: boolean): void {
        if (url !== null && url !== undefined) {
            let allowRelativeUrl = allowRelative && this.isRelativeUrl(url);
            if (allowRelativeUrl || isSafeProtocol(url)) {
                getEventService().performAction(actionName, {
                    url: url
                });
            }
            else {
                Diag.logError("UrlUtilities:performAction: Unsafe url detected.");
            }
        }
        else {
            Diag.logError("UrlUtilities:performAction: URL cannot be null or underfined.");
        }
    }
}