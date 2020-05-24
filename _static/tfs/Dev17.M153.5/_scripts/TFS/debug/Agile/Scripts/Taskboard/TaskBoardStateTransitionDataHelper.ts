import Q = require("q");
import Service = require("VSS/Service");
import Contributions_Services = require("VSS/Contributions/Services");
import Diag = require("VSS/Diag");
import * as Utils_String from "VSS/Utils/String";
import VSS = require("VSS/VSS");
import VSS_Error = require("VSS/Error");

export interface StatesTransitionData {
    /** A dictionary of Work Item Type Name to, source state and target states.
    for example
        {
        "Task": {
            "New": ["Removed", "Closed", "Active"],
            "Active": ["Removed", "Closed", "New"],
            "Closed": ["Active", "New"]
        },
        "Bug": {
          ...
        },
        ...
    }
    */
    transitions: IDictionaryStringTo<IDictionaryStringTo<string[]>>;
}

/**
 * Helper class to retrieve Taskboard State Transition data from the data provider
 */
export class TaskBoardStateTransitionDataHelper {

    private static _dataProviderName: string = "ms.vss-work-web.taskboard-state-transitions-data-provider";
    /**
     * Used for checking if the taskboard state transitions data is already on the page
     * @return true if the data is already on page, false otherwise
     */
    public static isPopulated(): boolean {
        var data: any = Service.getService(Contributions_Services.WebPageDataService)
            .getPageData(TaskBoardStateTransitionDataHelper._dataProviderName);

        return Boolean(data);
    }

    /**
     * Get the taskboard state transitions data from the page
     * @return data if it is on the page, null otherwise
     */
    public static getStateTransitions(): StatesTransitionData {
        Diag.Debug.assert(TaskBoardStateTransitionDataHelper.isPopulated(), "getStateTransitions is called without checking if the data is populated or not.");
        if (!TaskBoardStateTransitionDataHelper.isPopulated()) {
            return null;
        }

        var data = <StatesTransitionData>Service.getService(Contributions_Services.WebPageDataService)
            .getPageData(TaskBoardStateTransitionDataHelper._dataProviderName);

        if (!data.transitions) {
            data.transitions = {};
        }
        return data;
    }

    /**
     * Fetches Taskboard State Transition data async from server
     * @return A promise for state transition data
     */
    public static beginGetStateTransitions(): IPromise<StatesTransitionData> {
        if (TaskBoardStateTransitionDataHelper.isPopulated()) {
            return Q(this.getStateTransitions());
        }
        let includeRootItems = true;
        let includeChildren = false;

        return Service.getService(Contributions_Services.ExtensionService)
            .getContributions([TaskBoardStateTransitionDataHelper._dataProviderName], includeRootItems, includeChildren)
            .then((contributions: IExtensionContribution[]) => {
                var data = TaskBoardStateTransitionDataHelper.getStateTransitions();
                return data;
            }, (error: Error) => {
                error.name = Utils_String.format("{0}.GetContributionsError", (error.name||""));
                error.message = "getContributions() failed in TaskBoardStateTransitionDataHelper.beginGetStateTransitions: " + VSS.getErrorMessage(error);

                VSS_Error.publishErrorToTelemetry(error);

                return null;
            });
    }
}