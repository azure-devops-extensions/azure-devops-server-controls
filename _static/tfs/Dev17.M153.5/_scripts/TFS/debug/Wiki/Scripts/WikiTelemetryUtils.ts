import { format, base64Encode } from "VSS/Utils/String";
import { UrlConstants } from "Wiki/Scripts/Generated/Constants";

export interface TrackingData {
    [key: string]: {};
}

export function getUrlWithTrackingData(url: string, data: TrackingData): string {
    return url + format("{0}{1}={2}",
        (url.indexOf("?") >= 0) ? "&" : "?",
        UrlConstants.TrackingData,
        _encodeTrackingData(data));
}

function _encodeTrackingData(data: TrackingData): string {
    return encodeURIComponent(base64Encode(JSON.stringify(data)));
}