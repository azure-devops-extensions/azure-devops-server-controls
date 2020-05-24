import * as VSSStore from  "VSS/Flux/Store";
import { DiscussionManager, DiscussionViewOptions } from "Presentation/Scripts/TFS/TFS.Discussion.OM";
import { ActionsHub,
    IChangeExplorerDisplayOptionUpdatedPayload,
    UrlParameters,
    IDiscussionManagerCreatedPayload } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { ChangeExplorerGridCommentsMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";

/**
 * DiscussionManagerStore for change details page.
 */
export class DiscussionManagerStore extends VSSStore.RemoteStore {
    private _discussionManager: DiscussionManager;
    private _shouldHideDiscussionManager: boolean;
    private _discussionId: number;
    private _viewOptions: DiscussionViewOptions;

    constructor(private _actionsHub: ActionsHub) {
        super();

        this._actionsHub.discussionManagerCreated.addListener(this._onDiscussionManagerCreated);
        this._actionsHub.changeExplorerDisplayOptionUpdated.addListener(this._onDiscussionViewOptionsChanged);
        this._actionsHub.shouldHideDiscussionManagerUpdated.addListener(this._onShouldHideDiscussionManagerUpdated);
        this._actionsHub.urlParametersChanged.addListener(this._onDiscussionIdChanged, this);
    }

    public get discussionManager(): DiscussionManager {
        if (this._shouldHideDiscussionManager) {
            return null;
        } else {
            return this._discussionManager;
        }
    }

    public get discussionId(): number {
        return this._discussionId;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.discussionManagerCreated.removeListener(this._onDiscussionManagerCreated);
            this._actionsHub.changeExplorerDisplayOptionUpdated.removeListener(this._onDiscussionViewOptionsChanged);
            this._actionsHub.shouldHideDiscussionManagerUpdated.removeListener(this._onShouldHideDiscussionManagerUpdated);
            this._actionsHub.urlParametersChanged.removeListener(this._onDiscussionIdChanged);

            this._actionsHub = null;
        }

        if (this._discussionManager) {
            this._discussionManager.dispose();
            this._discussionManager = null;
        }
        this._viewOptions = null;
    }

    private _onDiscussionManagerCreated = (payload: IDiscussionManagerCreatedPayload): void => {
        this._discussionManager = payload.discussionManager;
        this._discussionId = payload.discussionId;

        if (this._viewOptions) {
            this._discussionManager.setViewOptions(this._viewOptions);
        }

        this._shouldHideDiscussionManager = false;
        this._loading = false;

        this.emitChanged();
    }

    private _onDiscussionViewOptionsChanged = (changeExplorerDisplayOptionUpdatedPayload: IChangeExplorerDisplayOptionUpdatedPayload): void => {
        const displayOptions = changeExplorerDisplayOptionUpdatedPayload.options;

        if (displayOptions.commentsModeChanged) {
            if (displayOptions.commentsMode === ChangeExplorerGridCommentsMode.Off) {
                this._viewOptions = {
                    hideComments: true,
                    hideNonActiveComments: false,
                };

            } else if (displayOptions.commentsMode === ChangeExplorerGridCommentsMode.ActiveCommentsUnderFiles) {
                this._viewOptions = {
                    hideComments: false,
                    hideNonActiveComments: true,
                };
            } else {
                this._viewOptions = {
                    hideComments: false,
                    hideNonActiveComments: false,
                };
            }
        }
        if (this._discussionManager) {
            this._discussionManager.setViewOptions(this._viewOptions);
            this.emitChanged();
        }
    }

    private _onShouldHideDiscussionManagerUpdated = (shouldHideDiscussionManager: boolean): void => {
        if (this._shouldHideDiscussionManager !== shouldHideDiscussionManager) {
            this._shouldHideDiscussionManager = shouldHideDiscussionManager;
            this.emitChanged();
        }
    }

    private _onDiscussionIdChanged = (urlParameters: UrlParameters): void => {
        if (!this.isLoading() && this._discussionId !== urlParameters.discussionId) {
            this._discussionId = urlParameters.discussionId;
            this.emitChanged();
        }
    }
}
