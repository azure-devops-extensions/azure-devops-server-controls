import { autobind } from "OfficeFabric/Utilities";
import { Store } from "VSS/Flux/Store";

import { PublishActionsHub, PublishOperationStatus } from "Wiki/Scenarios/Publish/PublishActionsHub";

export interface UnpublishData {
    unpublishOperation: PublishOperationStatus;
}

export class UnpublishDataStore extends Store {
    public state: UnpublishData = {
        unpublishOperation: {} as PublishOperationStatus,
    };

    constructor(private _actionsHub: PublishActionsHub) {
        super();

        this.state.unpublishOperation = {
            isInProgress: false,
            isComplete: false,
            error: null,
        };

        this._actionsHub.wikiUnpublishInProgress.addListener(this._onWikiUnpublishInProgress);
        this._actionsHub.wikiUnpublishSucceeded.addListener(this._onWikiUnpublishSucceeded);
        this._actionsHub.wikiUnpublishFailed.addListener(this._onWikiUnpublishFailed);
    }

    public dispose(): void {
        this._actionsHub.wikiUnpublishInProgress.removeListener(this._onWikiUnpublishInProgress);
        this._actionsHub.wikiUnpublishSucceeded.removeListener(this._onWikiUnpublishSucceeded);
        this._actionsHub.wikiUnpublishFailed.removeListener(this._onWikiUnpublishFailed);

        this._actionsHub = null;
    }

    @autobind
    private _onWikiUnpublishInProgress(): void {
        this.state.unpublishOperation.isInProgress = true;
        this.state.unpublishOperation.error = null;

        this.emitChanged();
    }

    @autobind
    private _onWikiUnpublishSucceeded(): void {
        this.state.unpublishOperation.isComplete = true;
        this.state.unpublishOperation.isInProgress = false;
        this.state.unpublishOperation.error = null;

        this.emitChanged();
    }

    @autobind
    private _onWikiUnpublishFailed(error: Error): void {
        this.state.unpublishOperation.error = error;
        this.state.unpublishOperation.isInProgress = false;

        this.emitChanged();
    }
}
