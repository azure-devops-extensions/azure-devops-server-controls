import * as VSSStore from "VSS/Flux/Store";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { GitPush } from "TFS/VersionControl/Contracts";
import { ActionsHub, IChangeListLoadedPayload, IStakeholdersDetails } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { ExtendedGitIdentityReference } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { GitCommit } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getUserNameWithoutEmail } from "VersionControl/Scripts/ChangeListIdentityHelper";

/**
 * Store for stakeholders related information associated with a commit,
 * like author, committer and pusher data.
 */
export class CommitStakeholdersStore extends VSSStore.RemoteStore {
    private _state: IStakeholdersDetails;

    constructor(private _actionsHub: ActionsHub) {
        super();

        this._state = {} as IStakeholdersDetails;

        this._actionsHub.changeListLoaded.addListener(this._loadStakeholders);
        this._actionsHub.pusherLoaded.addListener(this._updatePusher);
    }

    public get state(): IStakeholdersDetails {
        return this._state;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.changeListLoaded.removeListener(this._loadStakeholders);
            this._actionsHub.pusherLoaded.removeListener(this._updatePusher);
            this._actionsHub = null;
        }

        this._state = null;
    }

    private _loadStakeholders = (changeListDetails: IChangeListLoadedPayload): void => {

        const gitCommit = <GitCommit>changeListDetails.originalChangeList;

        // check and update the store only if it is GitCommit
        if ("commitId" in gitCommit) {
            const partialState = this._getStakeholdersDetails(gitCommit);
            this._state = { ...this._state, ...partialState };
            this._loading = false; // dont wait for pusher information if not already there
            this.emitChanged();
        }
    }

    private _updatePusher = (pusher: IdentityRef): void => {

        this._state.pusher = {
            displayName: this._state.pusher ? this._state.pusher.displayName : null,
            identityId: pusher.id,
            email: pusher.uniqueName,
            imageUrl: pusher._links.avatar.href,
        } as IAvatarImageProperties;

        this.emitChanged();
    }

    private _getStakeholdersDetails(gitCommit: GitCommit): IStakeholdersDetails {
        const author = gitCommit.author as ExtendedGitIdentityReference;
        const committer = gitCommit.committer as ExtendedGitIdentityReference;

        const stakeholdersDetails: IStakeholdersDetails = {
            author: {
                email: author.id,
                displayName: getUserNameWithoutEmail(author.displayName),
                identityId: gitCommit.ownerId,
                imageUrl: author.imageUrl
            },
            authoredDate: gitCommit.author.date,

            committer: {
                email: committer.id,
                displayName: getUserNameWithoutEmail(committer.displayName),
                identityId: null,
                imageUrl: committer.imageUrl
            },
            commitDate: gitCommit.commitTime,
            pusher: this._state.pusher || {
                displayName: gitCommit.pusher,
                identityId: null,
            },
            pushedDate: gitCommit.pushTime,
            pushId: gitCommit.pushId
        } as IStakeholdersDetails;

        return stakeholdersDetails;
    }
}
