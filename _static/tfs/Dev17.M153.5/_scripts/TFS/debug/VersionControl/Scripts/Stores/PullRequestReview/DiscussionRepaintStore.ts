import { Store } from "VSS/Flux/Store";

import { IDiscussionRepaintStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionRepaintStore";

export class DiscussionRepaintStore extends Store implements IDiscussionRepaintStore {
    constructor() {
        super();
    }

    public onPaint = (): void => {
        this.emitChanged();
    }
}
