import * as VSSStore from "VSS/Flux/Store";
import Utils_String = require("VSS/Utils/String");

export class ContributionsStore extends VSSStore.Store {
    private _contributionsByTargetId: IDictionaryStringTo<Contribution[]> = {};

    public onContributionsRetrieved(targetId: string, contributions: Contribution[]) {
            this._contributionsByTargetId[targetId] = contributions;

            this.emitChanged();
        }

    public getContributionsForTarget(targetId: string, contributionType?: string): Contribution[] {
        let results = this._contributionsByTargetId[targetId];

        if (results && contributionType) {
            results = results.filter((contribution) => {
                return Utils_String.equals(contributionType, contribution.type);
            });
        };

        return results;
    }
}