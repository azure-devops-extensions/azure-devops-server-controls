import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";

export class TelemetryUtils {

    public static publishScreenResolutionTelemetry() {
        try {
            if (window && window.screen) {
                let eventProperties: IDictionaryStringTo<any> = {};
                eventProperties[Properties.WindowOuterHeight] = window.outerHeight;
                eventProperties[Properties.WindowOuterWidth] = window.outerWidth;
                eventProperties[Properties.ScreenHeight] = window.screen.height;
                eventProperties[Properties.ScreenWidth] = window.screen.width;
                eventProperties[Properties.ScreenAvailHeight] = window.screen.availHeight;
                eventProperties[Properties.ScreenAvailWidth] = window.screen.availWidth;
                eventProperties[Properties.ColorDepth] = window.screen.colorDepth;
                eventProperties[Properties.PixelDepth] = window.screen.pixelDepth;
                eventProperties[Properties.BrowserZoomLevel] = Math.round(window.devicePixelRatio * 100);

                Telemetry.instance().publishEvent(Feature.ScreenProperties, eventProperties);
            }
        }
        catch (e) {
            Diag.logError(Utils_String.format("Error {0} while publishing screen resolution", e));
        }
    }

    public static publishCanvasKeyboardAccessTelemetry(keyCode: string) {
        const properties = {};
        properties[Properties.KeyCode] = keyCode;
        Telemetry.instance().publishEvent(Feature.CanvasKeyboardAccess, properties);
    }

    public static publishInnerFocusZoneAccess(keyCode: string) {
        const properties = {};
        properties[Properties.KeyCode] = keyCode;
        Telemetry.instance().publishEvent(Feature.InnerFocusZoneAccess, properties);
    }
}