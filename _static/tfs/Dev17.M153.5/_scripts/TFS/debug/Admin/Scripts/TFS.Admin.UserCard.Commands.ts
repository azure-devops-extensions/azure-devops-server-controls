import Locations = require("VSS/Locations");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

export function openProfilePage() {
    // this is non-standard usage, since the controllers are using non-standard routing, but it handles hosted/onprem differences
    document.location.href = Locations.urlHelper.getMvcUrl({ area: "details", action: "profile/information", level: TFS_Host_TfsContext.NavigationContextLevels.Application });
}
