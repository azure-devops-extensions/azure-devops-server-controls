import * as StoreBase from "VSS/Flux/Store";
import { TriageViewActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/TriageViewActionsCreator";
import { TempQuery, ITemporaryQueryData } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { ITempQueryDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/ITempQueryWiqlDataProvider";

export class TempQueryDataStore extends StoreBase.Store implements ITempQueryDataProvider {
    private _tempIdToWiql: IDictionaryStringTo<ITemporaryQueryData>;

    constructor(actions: TriageViewActionsHub) {
        super();

        this._tempIdToWiql = {};

        actions.TempQueryWiqlAdded.addListener((tempQuery: TempQuery) => {
            this._tempIdToWiql[tempQuery.tempId] = {
                queryText: tempQuery.wiql,
                queryType: tempQuery.queryType
            };
        });
    }

    public getQueryDataForTempId(tempId: string): ITemporaryQueryData {
        return this._tempIdToWiql[tempId];
    }
}
