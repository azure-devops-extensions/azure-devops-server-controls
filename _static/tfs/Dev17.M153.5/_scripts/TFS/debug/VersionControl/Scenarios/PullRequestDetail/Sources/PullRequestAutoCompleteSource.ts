import * as Q from "q";

import { AutoCompleteBlockingPolicy } from "VersionControl/Scenarios/PullRequestDetail/Contracts/AutoCompleteBlockingPolicy";
import { CachedSource } from "VersionControl/Scripts/Sources/Source";

const DATA_ISLAND_AUTOCOMPLETE_PROVIDER_ID: string = "ms.vss-code-web.pull-request-detail-autocomplete-data-provider";
const DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestDetailAutoCompleteProvider";

export interface IPullRequestAutoCompleteSource {
    getCachedBlockingAutoCompletePoliciesAsync(): IPromise<AutoCompleteBlockingPolicy[]>;
    resetCache();
}

export class PullRequestAutoCompleteSource extends CachedSource implements IPullRequestAutoCompleteSource {
    private _pullRequestId: number;
    private _keySuffix: string;

    constructor(pullRequestId: number) {
        super(DATA_ISLAND_AUTOCOMPLETE_PROVIDER_ID, DATA_ISLAND_CACHE_PREFIX);
        this._pullRequestId = pullRequestId;
        this._keySuffix = "BlockingAutoCompletePolicies." + this._pullRequestId;
    }

    /**
     * Get blocking auto complete policies loaded via data provider.
     */
    public getCachedBlockingAutoCompletePoliciesAsync(): IPromise<AutoCompleteBlockingPolicy[]> {
        const cached = this.fromCacheAsync<AutoCompleteBlockingPolicy[]>(this._keySuffix, {});
        if (cached) {
            return cached;
        }

        return Q(null);
    }
}
