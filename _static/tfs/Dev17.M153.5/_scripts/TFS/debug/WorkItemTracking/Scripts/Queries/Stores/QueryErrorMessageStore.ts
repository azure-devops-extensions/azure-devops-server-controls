import * as StoreBase from "VSS/Flux/Store";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { FavoritesFailureState } from "Favorites/Controls/FavoritesModels";
import * as Utils_String from "VSS/Utils/String";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { QueryContribution, ContributionMessage } from "WorkItemTracking/Scripts/Queries/Models/Models";

export class QueryErrorMessageStore extends StoreBase.Store {
    private _errorMessagesForView: { [key: number]: string | JSX.Element } = {};
    private _globalErrorMessage: string;

    constructor(actions: ActionsHub) {
        super();

        actions.PushContributionErrorMessage.addListener((viewErrorMessage: ContributionMessage) => {
            this._errorMessagesForView[viewErrorMessage.contribution] = viewErrorMessage.message;
            this.emitChanged();
        });

        actions.DismissContributionErrorMessage.addListener((contribution: QueryContribution) => {
            let needEmitChange = this._setGlobalErrorMessage(null, false);

            if (this._errorMessagesForView[contribution]) {
                delete this._errorMessagesForView[contribution];
                needEmitChange = true;
            }

            if (needEmitChange) {
                this.emitChanged();
            }
        });

        actions.FavoritesActions.FavoritingFailed.addListener((failureState: FavoritesFailureState) => {
            this._setGlobalErrorMessage(Utils_String.format(Resources.FavoriteQueryFailed, failureState.favoriteItem.favorite.artifactName), true);
        });

        actions.FavoritesActions.UnfavoritingFailed.addListener((failureState: FavoritesFailureState) => {
            this._setGlobalErrorMessage(Utils_String.format(Resources.UnfavoriteQueryFailed, failureState.favoriteItem.favorite.artifactName), true);
        });
    }

    public getErrorForContribution(contributonName: QueryContribution): string | JSX.Element | null {
        if (this._globalErrorMessage) {
            return this._globalErrorMessage;
        } else if (this._errorMessagesForView[contributonName]) {
            return this._errorMessagesForView[contributonName];
        } else {
            return null;
        }
    }

    private _setGlobalErrorMessage = (errorMessage: string, emitChanges: boolean): boolean => {
        if (this._globalErrorMessage !== errorMessage) {
            this._globalErrorMessage = errorMessage;
            if (emitChanges) {
                this.emitChanged();
            }
            else {
                return true;
            }
        }
        return false;
    }
}
