import { logWarning } from "VSS/Diag";
import { publishErrorToTelemetry } from "VSS/Error";
import { getScenarioManager, getTimestamp, IScenarioDescriptor } from "VSS/Performance";
import { VERSION_CONTROL_AREA, PULL_REQUEST_REVIEW_FEATURE } from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { Action } from "VSS/Flux/Action";

/**
 * These are the pull request actions that will be listened to and timed for the
 * currently active page load scenario.
 */
export const pageLoadActions: Array<keyof ActionsHub> = [
    "userPreferencesUpdating", "userPreferencesUpdated",
    "conflictsUpdating", "conflictsUpdated",
    "pullRequestUpdating", "pullRequestUpdated",
    "permissionsUpdating", "permissionsUpdated",
    "commitsUpdating", "commitsUpdated",
    "lastVisitUpdating", "lastVisitUpdated",
    "signalrHubLoading", "signalrHubLoaded",
    "refreshDataProviderStarted", "refreshDataProviderComplete",
    "workItemsUpdating", "workItemsUpdated",
    "pullRequestStatusUpdating", "pullRequestStatusUpdated",
    "branchStatusUpdating", "branchStatusUpdated",
    "iterationChangesUpdateStart", "iterationChangesUpdated",
    "discussionThreadsUpdating", "discussionThreadsUpdated",
    "changeItemDetailLoading", "changeItemDetailLoaded",
    "iterationSelected",
];

/**
 * Writes telemetry events based on the Pull Request Detail actions invoked in Flux.
 */
export class PullRequestTelemetrySpy {
    private _pageLoadScenario: IScenarioDescriptor;
    private _pageLoadData: { [key: string]: any };

    constructor(actionsHub: ActionsHub) {
        this._registerPageLoadActionHandlers(actionsHub);
        this._registerErrorHandlers(actionsHub);
    }

    /**
     * Start a new page load scenario for the given action. If there is a currently active page
     * load scenario, mark it as being interrupted and then end it to record TTI.
     * 
     * @param action The current tab we are measuring TTI for
     * @param innerPageNavigation If true, this scenario was started from a tab switch instead of a page load
     */
    public startNewPageLoadScenario(action: string, innerPageNavigation?: boolean): void {
        if (this.isPageLoadScenarioActive()) {
            this.addPageLoadSplitTiming("pageLoadScenarioInterrupted");
            this.endPageLoadScenario();
        }
        
        this._pageLoadData = { 
            action: action,
            innerPageNavigation: Boolean(innerPageNavigation),
        };

        // if this is an inner page navigation, we don't want to start a scenario from the browsers page navigate event
        this._pageLoadScenario = innerPageNavigation
            ? getScenarioManager().startScenario(VERSION_CONTROL_AREA, PULL_REQUEST_REVIEW_FEATURE, getTimestamp(), true)
            : getScenarioManager().startScenarioFromNavigation(VERSION_CONTROL_AREA, PULL_REQUEST_REVIEW_FEATURE, true);
    }

    /**
     * If there is a currently active page load scenario, end it and record TTI.
     */
    public endPageLoadScenario(): void {
        if (this.isPageLoadScenarioActive()) {
            this._pageLoadScenario.addData(this._pageLoadData);
            this._pageLoadScenario.end();
        }
    }

    /**
     * Add split timing with the given name to the currently active page load scenario.
     */
    public addPageLoadSplitTiming(name: string): void {
        if (this.isPageLoadScenarioActive()) {
            this._pageLoadScenario.addSplitTiming(name);
        }
    }

    /**
     * Returns whether or not a page load scenario has been initialized and is currently active.
     */
    public isPageLoadScenarioActive(): boolean {
        return this._pageLoadScenario && this._pageLoadScenario.isActive();
    }

    private _registerPageLoadActionHandlers(actionsHub: ActionsHub): void {
        pageLoadActions.map(actionName => (actionsHub[actionName] as Action<{}>).addListener(() => this.addPageLoadSplitTiming(actionName)));
    }

    private _registerErrorHandlers(actionsHub: ActionsHub): void {
        actionsHub.raiseError.addListener(error => {
            if (!error) {
                return;
            }

            logWarning(error);

            // These are unhandled errors (we're only catching them to display to the user).
            // Going through the pipe of unhandled errors, they will be monitored as usual.
            // Whereas using error.name to identify real source.
            error.name = "PullRequestDetail-RaiseError";
            error.errorType = "UnhandledQRejection";
            publishErrorToTelemetry(error);
        });
    }
}