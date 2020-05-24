import * as VSSContext from "VSS/Context";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { CollectionToOrgNavigationEnabledSource } from "MyExperiences/Scenarios/Shared/Sources/CollectionToOrgNavigationEnabledSource";

export function isOrgAccountSelectorEnabled(): boolean {
    const collectionToOrgNavigationEnabledSource = new CollectionToOrgNavigationEnabledSource();

    return VSSContext.getPageContext().webAccessConfiguration.isHosted &&
        FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessMyExperiencesOrgAccountSelector) &&
        collectionToOrgNavigationEnabledSource.isCollectionToOrgNavigationEnabled();
}
