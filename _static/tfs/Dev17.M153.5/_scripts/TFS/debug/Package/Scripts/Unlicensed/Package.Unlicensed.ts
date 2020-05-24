import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import * as Context from "VSS/Context";
import * as Controls from "VSS/Controls";
import * as Locations from "VSS/Locations";
import * as Performance from "VSS/Performance";
import * as SDK from "VSS/SDK/Shim";

import { CiConstants, FeedServiceInstanceId, HubScenarioSplits, PerfScenarios } from "Feed/Common/Constants/Constants";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { IPackageUnlicensedViewProps, PackageUnlicensedView } from "Package/Scripts/Unlicensed/PackageUnlicensedView";

export class PackageUnlicensed extends Controls.Control<{}> {
    public initialize() {
        super.initialize();

        const isHosted = Context.getPageContext().webAccessConfiguration.isHosted;
        const userHubUrl = Locations.urlHelper.getMvcUrl({
            level: NavigationContextLevels.Collection,
            area: "admin",
            controller: isHosted ? "users" : "userHub"
        });

        PackageUnlicensedView.render(this.getElement()[0], {
            userHubUrl
        } as IPackageUnlicensedViewProps);
        CustomerIntelligenceHelper.publishEvent(CiConstants.PageLoaded, { Object: CiConstants.PageLoadedNoLicense });
        Performance.getScenarioManager().recordPageLoadScenarioForService(
            PerfScenarios.Area,
            PerfScenarios.PageLoadUnlicensed,
            null,
            FeedServiceInstanceId
        );
    }
}

// The value we're registering against must match the one in
// Feed/Service/Web/Extension/vss-extension.json
SDK.registerContent("package-unlicensed", context => {
    Performance.getScenarioManager().split(HubScenarioSplits.INITIALIZING);
    return Controls.Control.create<PackageUnlicensed, {}>(PackageUnlicensed, context.$container, context.options);
});
