import HistoryActions = require("WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryActionSet");
import { WorkItemHistory } from "WorkItemTracking/Scripts/OM/History/WorkItemHistory"

/**
 * Actions associated with workitems history update
 */
export class HistoryActionsCreator {
    private _actionSet: HistoryActions.HistoryActionSet;

    constructor(actionSet: HistoryActions.HistoryActionSet) {
        this._actionSet = actionSet;
    }

    public workItemHistoryUpdateCompleted(history: WorkItemHistory) {
        this._actionSet.workItemHistoryUpdateCompleted().invoke({
            history: history
        });
    }

    public workItemHistoryUpdateStarted() {
        this._actionSet.workItemHistoryUpdateStarted().invoke({});
    }

    public workItemHistoryUpdateFailed(error: any) {
        this._actionSet.workItemHistoryUpdateFailed().invoke({
            error: error
        });
    }

    public workItemHistoryClear() {
        this._actionSet.workItemHistoryClear().invoke({});
    }
}