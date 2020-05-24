import { autobind } from "OfficeFabric/Utilities";

import { NavigationSource } from "VersionControl/Scripts/Sources/NavigationSource";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";
import { PullRequestActions } from "VersionControl/Scripts/Stores/PullRequestReview/NavigationStore";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import * as Navigation_Services from "VSS/Navigation/Services";

export class NavigationActionCreator {
    private _tfsContext: TfsContext;
    private _navigationSource: NavigationSource;
    private _actionsHub: Actions.ActionsHub;
    private _storesHub: StoresHub;

    constructor(tfsContext: TfsContext, actionsHub: Actions.ActionsHub, sourcesHub: SourcesHub, storesHub: StoresHub) {
        this._tfsContext = tfsContext;
        this._navigationSource = sourcesHub.navigationSource;
        this._actionsHub = actionsHub;
        this._storesHub = storesHub;
    }

    public updateLastVisit(echo?: boolean): void {
        if (this._storesHub.permissionsStore.getPermissions().updateVisit) {
            this._actionsHub.lastVisitUpdating.invoke(null);

            this._navigationSource.updateLastVisitAsync()
                .then((lastVisit: Date) => {
                    // if previous last visit wasn't set, the user has never been to this pull request
                    // the server already has the last visit set, so set this locally to the current time
                    // this way all subsequent signalR notifications that are new will still show as new
                    // (note: offset added to prevent automatic reviewers signalR race condition)
                    if (!lastVisit) {
                        lastVisit = new Date(Date.now() + 2000);
                    }

                    if (echo) {
                        this._actionsHub.lastVisitUpdated.invoke({ lastVisit });
                    }
                })
                .then(undefined, this.raiseError);
        }
    }

    public dismissLastVisitBanner(): void {
        this._actionsHub.lastVisitBannerDismissed.invoke(null);
    }

    public updateState(state: Actions.INavigationState) {
        this._actionsHub.navigationStateChanged.invoke({ state });
    }

    public navigateWithState(newState: Actions.INavigationState, replaceHistory: boolean = false): void {
        const rawState = Navigation_Services.getHistoryService().getCurrentState();
        const oldState: Actions.INavigationState = NavigationActionCreator.convertState(rawState);

        Navigation_Services.getHistoryService().updateHistoryEntry(null, $.extend(oldState, newState), replaceHistory, !rawState.view, null, false);
    }

    public static convertState(state: any): Actions.INavigationState {
        const navState: Actions.INavigationState = {};

        let action: string = state.action;
        if (!action) {
            // translate legacy actions - converts old view state info to actions
            switch (state.view) {
                case PullRequestActions.Files:
                case PullRequestActions.Compare:
                case PullRequestActions.Content:
                    action = PullRequestActions.Files;
                    break;
                case PullRequestActions.Commits:
                    action = PullRequestActions.Commits;
                    break;
                default:
                    action = PullRequestActions.Overview;
            }
        }

        let actionIsValid: boolean = false;
        Object.keys(PullRequestActions).forEach(key => {
            if (action.toLowerCase() === key.toLowerCase()) {
                actionIsValid = true;

                // if we recognize this action, remove any contribution id from the state
                delete state.contributionId;
            }
        });

        if (!actionIsValid && !state.contributionId) {
            action = PullRequestActions.Overview;
        }

        navState.action = action;
        navState.path = state.path || null;
        navState.discussionId = (state.discussionId && parseInt(state.discussionId)) || null;
        navState.iteration = (state.iteration && parseInt(state.iteration)) || null;
        navState.base = (state.base && parseInt(state.base)) || null;
        navState.fullScreen = (state.fullScreen || null) && state.fullScreen === "true";
        navState.contributionId = state.contributionId || null;
        navState.unfollow = (state.unfollow || null) && state.unfollow === "true";

        return navState;
    }

    public static getState(): Actions.INavigationState {
        const rawState = Navigation_Services.getHistoryService().getCurrentState();
        return NavigationActionCreator.convertState(rawState);
    }

    @autobind
    public viewCommit(commitId: string, event: React.MouseEvent<HTMLElement>): void {
        this._navigationSource.viewCommit(commitId, event);
    }

    @autobind
    private raiseError(error: any): void {
        this._actionsHub.raiseError.invoke(error);
    }
}