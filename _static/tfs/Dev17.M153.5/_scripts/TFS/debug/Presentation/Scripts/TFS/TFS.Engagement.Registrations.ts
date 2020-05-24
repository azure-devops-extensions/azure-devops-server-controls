import VSS = require("VSS/VSS");
import EngagementCore_NO_REQUIRE = require("Engagement/Core");
import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");

module Ids {
    export const NewFeature = "NewFeature";
}

export function registerNewFeature(): void {
    VSS.using(["Engagement/Core", "Engagement/Dispatcher"], (EngagementCore: typeof EngagementCore_NO_REQUIRE, EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE) => {
        EngagementDispatcher.Dispatcher.getInstance().register(<EngagementCore_NO_REQUIRE.IEngagementModel>{
            id: Ids.NewFeature,
            type: EngagementCore.EngagementType.NewFeature,
            model: null
        });
    });
}