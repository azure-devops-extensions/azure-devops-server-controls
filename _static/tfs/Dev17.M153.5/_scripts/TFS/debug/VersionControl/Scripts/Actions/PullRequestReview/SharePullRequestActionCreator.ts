import { ActionsHub, IShowShareDialogPayload } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

export class SharePullRequestActionCreator {

    private _actionsHub: ActionsHub;
    private _sourcesHub: SourcesHub;

    constructor(actionsHub: ActionsHub, sourcesHub: SourcesHub) {
        this._actionsHub = actionsHub;
        this._sourcesHub = sourcesHub;
    }

    public queryTeamExpansionEnabled(): void {
        this._actionsHub.pullRequestTeamExpansionEnabledUpdated.invoke({
            expansionEnabled: this._sourcesHub.gitRepositorySource.queryTeamExpansionEnabled()
        });
    }

    public showShareDialog(reviewers: ReviewerItem[]): void {
        this._showDialog(true, reviewers);
    }

    public hideShareDialog(): void {
        this._showDialog(false, null);
    }

    private _showDialog(isVisible: boolean, defaultReviewers: ReviewerItem[]): void {
        const payload: IShowShareDialogPayload = {
            isVisible,
            defaultReviewers
        };

        this._actionsHub.showShareDialog.invoke(payload);
    }
}
