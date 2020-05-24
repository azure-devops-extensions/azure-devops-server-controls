import Context = require("VSS/Context");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import Navigation_HubsProvider = require("VSS/Navigation/HubsProvider");
import Navigation_Services = require("VSS/Navigation/Services");
import Q = require("q");
import SDK_Shim = require("VSS/SDK/Shim");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import VSS_Locations = require("VSS/Locations");
import VSS = require("VSS/VSS");
import * as Utils_String from "VSS/Utils/String";

class HubsProvider extends Navigation_HubsProvider.HubsProvider {
    constructor() {
        super(true);
    }

    protected getRootContributedHub(context: IHubsProviderContext): IContributedHub {
        return null;
    }
}

var hubsProvider = new HubsProvider();

SDK_Shim.VSS.register("dashboards.navigation", () => {
    return hubsProvider;
});
