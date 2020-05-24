import * as Q from "q";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService } from "VSS/Service";

export class FeatureAvailabilitySource {
    public getIsFeatureEnabled(featureFlag: string, defaultValue: boolean): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(featureFlag, defaultValue);
    }

    /**
     * Gets the current state for the requested Feature Flags.
     * For those that have not got a defined state, the provided default value will be used.
     */
    public getFeatureFlags(featureDefaults: IDictionaryStringTo<boolean>): Q.Promise<IDictionaryStringTo<boolean>> {
        const features: IDictionaryStringTo<boolean> = {};
        for (const featureName in featureDefaults) {
            features[featureName] = this.getIsFeatureEnabled(featureName, featureDefaults[featureName]);
        }

        return Q(features);
    }

    public isVerticalNavigation(): boolean {
        return getService(FeatureManagementService).isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");
    }
}
