import { AutoCompleteBlockingPolicy } from "VersionControl/Scenarios/PullRequestDetail/Contracts/AutoCompleteBlockingPolicy";
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export abstract class IAutoCompleteActionCreator {
    public abstract getBlockingAutoCompletePolicies(): void;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    public static getServiceName(): string {
        return "IAutoCompleteActionCreator";
    }
}

export class PullRequestAutoCompleteActionCreator implements IAutoCompleteActionCreator {
    private _actionsHub: ActionsHub;
    private _sourcesHub: SourcesHub;
    private _storesHub: StoresHub;
    private _pullRequestId: number;

    constructor(actionsHub: ActionsHub, sourcesHub: SourcesHub, storesHub: StoresHub, pullRequestId: number) {
        this._actionsHub = actionsHub;
        this._sourcesHub = sourcesHub;
        this._storesHub = storesHub;
        this._pullRequestId = pullRequestId;
    }

    public getBlockingAutoCompletePolicies() {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsAutoCompleteCriteria, false)) {

            const isAutoCompleteSet = this._storesHub.autoCompleteStore.state.isAutoCompleteSet;

            if (isAutoCompleteSet) {

                this._sourcesHub.pullRequestAutoCompleteSource.getCachedBlockingAutoCompletePoliciesAsync()
                    .then(blockingPolicies => {
                        if (!blockingPolicies) {
                            this._refreshAutoCompleteDataProvider();
                        }
                        this._handleBlockingPolicies(blockingPolicies);
                    })
                    .then(null, this._raiseError);
            }
        }
    }

    private _refreshAutoCompleteDataProvider() {
        // auto complete policies can be retrieved only through the autocomplete data provider

        // refresh autocomplete data provider to populate cache
        this._actionsHub.refreshDataProviderStarted.invoke({
            pullRequestId: this._pullRequestId,
            mode: "autoComplete",
        });

        this._sourcesHub.dataProviderSource.refresh(this._pullRequestId, "autoComplete")
            .then(() => {
                this._actionsHub.refreshDataProviderComplete.invoke({
                    pullRequestId: this._pullRequestId,
                    mode: "autoComplete",
                });

                // reset autocomplete source cache
                this._sourcesHub.pullRequestAutoCompleteSource.resetCache();

                this._getCachedBlockingAutoCompletePolicies();
            })
            .then(null, this._raiseError);
    }

    private _getCachedBlockingAutoCompletePolicies() {
        // get blocking auto complete policies from data island
        this._sourcesHub.pullRequestAutoCompleteSource.getCachedBlockingAutoCompletePoliciesAsync()
            .then(blockingPolicies => this._handleBlockingPolicies(blockingPolicies))
            .then(null, this._raiseError);
    }

    private _handleBlockingPolicies(blockingPolicies: AutoCompleteBlockingPolicy[]) {
        if (blockingPolicies) {
            this._actionsHub.autoCompleteCriteriaUpdated.invoke({ blockingPolicies });
        }
    }

    private _raiseError = (error: Error): void => {
        this._actionsHub.raiseError.invoke(error);
    }
}
