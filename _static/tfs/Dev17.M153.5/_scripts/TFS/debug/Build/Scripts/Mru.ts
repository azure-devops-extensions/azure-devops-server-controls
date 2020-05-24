
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");

import Utils_Array = require("VSS/Utils/Array");

var REGISTRYKEY = "/Service/Build/Settings/Mru/";
var SEPERATOR = ",";
var MAXITEMS = 6;

export module RecentlyUsedFolderPaths {
    const KEY = REGISTRYKEY + "FolderPath";

    export function getMRUValue(): string[] {
        let value = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault())
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService)
            .readLocalSetting(KEY, TFS_WebSettingsService.WebSettingsScope.User);

        return (value || "").split(SEPERATOR);
    }

    export function appendMRUValue(path: string) {
        let service = TFS_OM_Common.ProjectCollection.getConnection(TFS_Host_TfsContext.TfsContext.getDefault())
            .getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);

        // get existing value and update accordingly
        let existingValue = (service.readLocalSetting(KEY, TFS_WebSettingsService.WebSettingsScope.User) || "").split(SEPERATOR);
        existingValue.unshift(sanitizePath(path));
        existingValue = Utils_Array.unique(existingValue);
        existingValue = existingValue.filter((value) => {
            return value != "";
        });

        if (existingValue.length > 0) {
            existingValue = existingValue.slice(0, MAXITEMS);
            service.writeLocalSetting(KEY, existingValue.join(SEPERATOR), TFS_WebSettingsService.WebSettingsScope.User);
        }
    }
}

export function sanitizePath(path: string): string {
    if (!path) {
        return "";
    }

    let indexWithoutSlashes = path.length;
    for (let i = 0; i <= path.length - 1; i++) {
        if (path[i] == "\\") {
            continue;
        }

        indexWithoutSlashes = i;
        break;
    }

    return "\\" + path.slice(indexWithoutSlashes, path.length);
}