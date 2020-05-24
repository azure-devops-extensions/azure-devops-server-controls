import {Preferences} from "ScaledAgile/Scripts/Shared/Utils/Preferences";
import {DeliveryTimeLineViewConstants} from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";

export interface DeliveryTimelinePreferenceValue {
    /**
     * The zoom level
     */
    zoomLevel: number;
    /**
     * The team's collapse state
     */
    teams: IDictionaryStringTo<{ isCollapsed: boolean }>;
}

export class DeliveryTimelinePreferences extends Preferences<DeliveryTimelinePreferenceValue> {

    private static Prefix = "Plans/DeliveryTimeline/v1";

    constructor() {
        super(DeliveryTimelinePreferences.Prefix, () => {
            return {
                zoomLevel: DeliveryTimeLineViewConstants.zoomLevelDefault,
                teams: {}
            };
        });
    }
}
