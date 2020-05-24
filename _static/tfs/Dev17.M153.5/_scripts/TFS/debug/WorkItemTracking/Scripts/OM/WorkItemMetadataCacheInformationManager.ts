import { getCookie } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { serialize, IWorkItemMetadataCookie, deserialize } from "WorkItemTracking/Scripts/OM/WorkItemMetadataCookie";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { setCookie } from "VSS/Utils/Core";
import { format } from "VSS/Utils/String";
import { WorkItemTrackingMetadataCacheConstants, WITCommonConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { getLocalService } from "VSS/Service";
import { LocalSettingsService, LocalSettingsScope } from "VSS/Settings";

const CookieMaxAgeSeconds = 60 * 60 * 24 * 5; // Five days, after which the cookies will be cleaned up by the browser

const LocalStorageKey = "WIT-METADATA";

/** We want to set cookies only for certain meta data types */
const CookieEnabledMetadataTypes = {
    [WITCommonConstants.TeamProjects.toLowerCase()]: true,
    [WITCommonConstants.LinkTypes.toLowerCase()]: true,
    [WITCommonConstants.WorkItemTypes.toLowerCase()]: true
};

/**
 * Set meta data cookies for WIT experiences
 */
export class WorkItemMetadataCacheInformationManager {
    /**
     * Stores WIT cache information as a cookie for the specified project and meta data type, as well as in local storage 
     * for non-WIT experiences
     * @param scopeId Id of scope (typically collection or project id)
     * @param type Meta data type
     * @param keys Keys, if the meta data part can be subdivided (e.g., work item types)
     * @param stamp Cache stamp
     */
    public persist(scopeId: string, type: string, keys: string[], stamp: string): void {
        if (!this._shouldSetCookieForType(type)) {
            return;
        }

        const cookieName = format(WorkItemTrackingMetadataCacheConstants.CookieFormat, scopeId);

        // Cookies are set for WIT path (<collection>/<project/_workitems), one per project. Format:
        // <type>:<scopeId>:<stamp>:<name1>,<name2>|<type>:<scopeId>:<stamp>:...

        const localSettingsService = getLocalService(LocalSettingsService);

        // Read existing cookie
        let cookieValue: string = getCookie(cookieName);
        if (!cookieValue) {
            cookieValue = localSettingsService.read(LocalStorageKey, null, LocalSettingsScope.Project);
        }

        const data: IWorkItemMetadataCookie = deserialize(cookieValue);

        // Update data
        data[type] = {
            scopeId,
            stamp,
            keys
        };

        cookieValue = serialize(data);

        for (const location of this._getCookieLocations()) {
            setCookie(cookieName, cookieValue, location, undefined, CookieMaxAgeSeconds);
        }

        // Store in local storage as well, for non-wit experiences
        localSettingsService.write(LocalStorageKey, cookieValue, LocalSettingsScope.Project);
    }

    /**
     * Gets the WIT cache information for non-WIT experiences
     */
    public readInformationForNonWITLocation(): string {
        const localSettingsService = getLocalService(LocalSettingsService);
        return localSettingsService.read(LocalStorageKey, null, LocalSettingsScope.Project);
    }

    private _shouldSetCookieForType(type: string): boolean {
        return CookieEnabledMetadataTypes[type.toLowerCase()];
    }

    private _getCookieLocations(): string[] {
        // We don't want to send the cookie with every single request, so scope it to relevant WIT locations
        return [
            TfsContext.getDefault().getActionUrl("", "workitems")
        ];
    }
}