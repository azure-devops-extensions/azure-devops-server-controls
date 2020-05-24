import * as VSSStore from "VSS/Flux/Store";
import { ActionsHub, IChangeListLoadedPayload, IChangeListAuthorDetails } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { getUserNameWithoutEmail } from "VersionControl/Scripts/ChangeListIdentityHelper";

/**
 * Store for author related information associated with a changeList
 */
export class AuthorDetailsStore extends VSSStore.RemoteStore {
    private _state: IChangeListAuthorDetails;

    constructor(private _actionsHub: ActionsHub) {
        super();
        this._actionsHub.changeListLoaded.addListener(this._loadAuthorDetails);
    }

    public get state(): IChangeListAuthorDetails {
        return this._state;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.changeListLoaded.removeListener(this._loadAuthorDetails);
            this._actionsHub = null;
        }

        this._state = null;
    }

    private _loadAuthorDetails = (changeListDetails: IChangeListLoadedPayload): void => {
        const changeList = changeListDetails.originalChangeList as TfsChangeList;
        this._state = this._getAuthorDetails(changeList);
        this._loading = false;
        this.emitChanged();
    }

    private _getAuthorDetails(changeList: TfsChangeList): IChangeListAuthorDetails {
        return {
            author: {
                email: changeList.owner,
                displayName: getUserNameWithoutEmail(changeList.ownerDisplayName),
                identityId: changeList.ownerId
            },
            authoredDate: changeList.creationDate,
            changeListId: changeList.changesetId
        } as IChangeListAuthorDetails;
    }
}
