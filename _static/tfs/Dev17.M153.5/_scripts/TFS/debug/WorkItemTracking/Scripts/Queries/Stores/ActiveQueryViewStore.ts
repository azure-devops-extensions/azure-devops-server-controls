import { DefaultStore } from "VSS/Flux/Store";
import { ActiveQueryView } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";

/**
 * Active query view data provider
 */
export interface IActiveQueryViewDataProvider {
    /**
     * Gets active query view
     */
    getValue(): ActiveQueryView;
}

export class ActiveQueryViewStore extends DefaultStore<ActiveQueryView> implements IActiveQueryViewDataProvider {
    constructor(actions: ActionsHub) {
        super();

        actions.QueryViewChanged.addListener((newView) => {
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_ACTIVEQUERYVIEWSTORE_CHANGEQUERYVIEW, true);
            this.onChange(newView);
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_ACTIVEQUERYVIEWSTORE_CHANGEQUERYVIEW, false);
        });
    }
}
