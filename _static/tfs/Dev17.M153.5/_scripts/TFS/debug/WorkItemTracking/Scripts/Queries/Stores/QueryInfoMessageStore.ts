import * as StoreBase from "VSS/Flux/Store";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { QueryContribution, ContributionMessage } from "WorkItemTracking/Scripts/Queries/Models/Models";

export class QueryInfoMessageStore extends StoreBase.Store {
    private _infoMessagesForView: { [key: number]: string | JSX.Element } = {};

    constructor(actions: ActionsHub) {
        super();

        actions.PushContributionInfoMessage.addListener((contributionMessage: ContributionMessage) => {
            this._infoMessagesForView[contributionMessage.contribution] = contributionMessage.message;
            this.emitChanged();
        });

        actions.DismissContributionInfoMessage.addListener((contribution: QueryContribution) => {
            let needEmitChange = false;

            if (this._infoMessagesForView[contribution]) {
                delete this._infoMessagesForView[contribution];
                needEmitChange = true;
            }

            if (needEmitChange) {
                this.emitChanged();
            }
        });
    }

    public getInfoForContribution(contributonName: QueryContribution): string | JSX.Element | null {
        if (this._infoMessagesForView[contributonName]) {
            return this._infoMessagesForView[contributonName];
        } else {
            return null;
        }
    }
}
