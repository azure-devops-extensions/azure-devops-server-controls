import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
/**
 * Available actions for the pull request details page
 */
export class PullRequestActions {
    public static Overview: string = "overview";
    public static Files: string = "files";
    public static Comments: string = "comments";
    public static Updates: string = "updates";
    public static Commits: string = "commits";
    public static Compare: string = "compare";
    public static Content: string = "content";
}

/**
 * This is store is used to update browser history when events happen that need to change the page URL.
 * You can also use it to retrieve the current history state and page view history data.
 * 
 * It also contains other "navigation" related elements (particularly last visit banner and live update status).
 */
export class NavigationStore extends RemoteStore {
    private _state: Actions.INavigationState;
    private _lastVisit: Date;
    private _lastVisitBannerDismissed: boolean;
    private _liveUpdateEnabled: boolean;

    constructor() {
        super();

        this._state = { action: PullRequestActions.Overview };
        this._lastVisit = null;
        this._lastVisitBannerDismissed = false;
        this._liveUpdateEnabled = true;
    }

    public onStateChanged = (payload: Actions.INavigationStateChangedPayload): void => {
        const shouldUpdateState: boolean = payload.state &&
            (this._state.action !== payload.state.action ||
                this._state.base !== payload.state.base ||
                this._state.contributionId !== payload.state.contributionId ||
                this._state.discussionId !== payload.state.discussionId ||
                this._state.fullScreen !== payload.state.fullScreen ||
                this._state.iteration !== payload.state.iteration ||
                this._state.path !== payload.state.path);

        if (!shouldUpdateState) {
            return;
        }

        this._state = payload.state;
        this.emitChanged();
    }

    public onLastVisitUpdated = (payload: Actions.ILastVisitUpdatedPayload): void => {
        if (this._lastVisit === payload.lastVisit) {
            return;
        }

        this._lastVisit = payload.lastVisit;
        this.emitChanged();
    }

    public onLastVisitBannerDismissed = (): void => {
        if (this._lastVisitBannerDismissed) {
            return;
        }

        this._lastVisitBannerDismissed = true;
        this.emitChanged();
    }

    public onLiveUpdateChanged = (payload: Actions.ILiveUpdateChangedPayload): void => {
        this._liveUpdateEnabled = payload.shouldUpdate;
        this.emitChanged();
    }

    /**
     * Returns the current action (so components can determine visibility)
     */
    public getCurrentTab(): string {
        return this._state.action;
    }

    /**
     * Returns the current latest visit timestamp
     */
    public getLastVisit(): Date {
        return this._lastVisit;
    }

    public getLastVisitBannerDismissed(): boolean {
        return this._lastVisitBannerDismissed;
    }

    public getIsLiveUpdateEnabled(): boolean {
        return this._liveUpdateEnabled;
    }
}
