import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export function getWorkItemsHubId(): string {

    if (FeatureAvailabilityService.isFeatureEnabled("WebAccess.WorkItemTracking.WorkItemsHub.NewPlatform", false)) {
        return "ms.vss-work-web.new-work-items-hub";
    }

    return "ms.vss-work-web.work-items-hub";
}
