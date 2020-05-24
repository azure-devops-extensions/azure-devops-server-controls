import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";

export abstract class INavigationActionCreator {
    /**
     * Update the last visit data for this user and return the previous date if applicable
     * @param echo Optionally specify whether or not to echo the last visit result locally after finishing the source call
     */
    abstract updateLastVisit(echo?: boolean): void;

    /**
     * Dismiss the last visit banner
     */
    abstract dismissLastVisitBanner(): void;

    /**
     * Notify listeners of an updated state
     * @param newState the new state
     */
    abstract updateState(newState: Actions.INavigationState);

    /**
     * Trigger a navigate event with the addition of the given state information
     * @param newState the new state to navigate with
     * @param replaceHistory whether or not to overwrite the current history entry
     */
    abstract navigateWithState(newState: Actions.INavigationState, replaceHistory: boolean): void;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "INavigationActionCreator"; }
}