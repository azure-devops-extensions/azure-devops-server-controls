import { autobind } from "OfficeFabric/Utilities";
import { IShowShareDialogPayload, IPullRequestTeamExpansionEnabledPayload } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { Store } from "VSS/Flux/Store";

export class SharePullRequestStore extends Store {

    private _dialogIsVisible: boolean;
    private _defaultReviewers: ReviewerItem[] = [];
    private _teamExpansionEnabled: boolean = false;

    constructor() {
        super();

        this._dialogIsVisible = false;
    }

    @autobind
    public onShowDialog(payload: IShowShareDialogPayload): void {
        this._dialogIsVisible = payload.isVisible;
        this._defaultReviewers = payload.defaultReviewers;

        this.emitChanged();
    }

    public onTeamExpansionEnabled = (payload: IPullRequestTeamExpansionEnabledPayload) => {
        this._teamExpansionEnabled = payload.expansionEnabled;

        this.emitChanged();
    }

    public get isVisible(): boolean {

        return this._dialogIsVisible;
    }

    public get defaultRecipients(): string[] {

        if (this._defaultReviewers && this._defaultReviewers.length && this._dialogIsVisible) {
            return this._defaultReviewers
                    .filter(i => this._teamExpansionEnabled || !i.identity.isContainer || i.identity.isAadIdentity)
                    .map(i => i.identity.id);
        }
        else {
            return [];
        }
    }

    public get isTeamExpansionEnabled(): boolean {
        return this._teamExpansionEnabled;
    }
}
