
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WebPageDataHelper } from "ScaledAgile/Scripts/Shared/Utils/WebPageDataHelper";

/**
 * Helper class with methods to check the FeatureFlag states.
 */
export class FeatureEnablement {

    /**
     * Returns the state of the feature flag, if set. If not set, and if the defaultValue has been passed, defaultValue will be returned.
     * @param {string} featureName - The feature name.
     * @param {boolean} defaultValue - Optional. If passed, when the feature flag state has not been set, this value would be returned.
     * @return {boolean} Feature flag state if set, else defaultValue
     */
    public static isFeatureEnabled(featureName: string, defaultValue?: boolean): boolean {
        let featureFlagStates = WebPageDataHelper.getFeatureFlagStates();
        if (featureFlagStates) {
            let featureFlagValue = featureFlagStates[featureName];
            return featureFlagValue !== undefined ? featureFlagValue : defaultValue;
        }
        return defaultValue;
    }

    public static isCardDragDropDelayed(): boolean {
        return FeatureEnablement.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessScaledAgilePlansDeliveryTimelineDelayedDragDropCard);
    }

    public static isCardMovementAnimated(): boolean {
        return FeatureEnablement.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessScaledAgilePlansDeliveryTimelineIsCardMovementAnimated);
    }

    public static isDeliveryTimelineCopyPlanEnabled(): boolean {
        return FeatureEnablement.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessScaledAgilePlansDeliveryTimelineCopyPlan);
    }

    public static isDeliveryTimelineFilterEnabled(): boolean {
        return FeatureEnablement.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessScaledAgilePlansDeliveryTimelineFilter);
    }
}
