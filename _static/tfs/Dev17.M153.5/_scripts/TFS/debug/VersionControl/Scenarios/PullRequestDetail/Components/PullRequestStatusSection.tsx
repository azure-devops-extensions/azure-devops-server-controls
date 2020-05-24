import * as React from "react";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

// used to retrieve data from our stores
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

// react component libraries
import { Async, autobind } from "OfficeFabric/Utilities";
import { PullRequestStatusContributions } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusContributions";
import { PullRequestStatusesList } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusesList";
import * as PullRequestStatusUtils from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusUtils";

// legacy stuff for control rendering
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface IPullRequestStatusSectionState {
    pullRequest: IPullRequest;
    pullRequestStatuses: PullRequestStatusUtils.PullRequestStatus[];
    statusContributions: PullRequestStatusContributions;
    hasPermissionToPerformPolicyActions: boolean;
    loading: boolean;
}

const debounceWaitMs = 200;

export class PullRequestStatusSection extends React.Component<{}, IPullRequestStatusSectionState> {
    private _throttledOnChange: () => void;

    constructor(props: {}) {
        super(props);
        this._throttledOnChange = new Async().debounce(this._onChange, debounceWaitMs, { trailing: true });
        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (this.state.loading
            || !this.state.pullRequest
            || !this.state.pullRequestStatuses.length) {
            return null;
        }

        if (!this.state.pullRequestStatuses.length) {
            return null;
        }

        return (
            <div className="vc-pullrequest-leftpane-section" >
                <div className="vc-pullrequest-leftpane-section-title" >
                    <span>{VCResources.PullRequest_StatusPolicies_Section_Title}</span>
                </div>
                <div className="divider" />
                <PullRequestStatusesList
                    pullRequestStatuses={this.state.pullRequestStatuses}
                    pullRequest={this.state.pullRequest}
                    contributions={this.state.statusContributions} 
                    hasPermissionToPerformPolicyActions={this.state.hasPermissionToPerformPolicyActions} />
            </div>
        );
    }

    public componentDidMount() {
        Flux.instance().storesHub.pullRequestStatusesStore.addChangedListener(this._throttledOnChange);
        Flux.instance().storesHub.pullRequestStatusContributionsStore.addChangedListener(this._throttledOnChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._throttledOnChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._throttledOnChange);
    }

    public componentWillUnmount() {
        Flux.instance().storesHub.pullRequestStatusesStore.removeChangedListener(this._throttledOnChange);
        Flux.instance().storesHub.pullRequestStatusContributionsStore.removeChangedListener(this._throttledOnChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._throttledOnChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._throttledOnChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    public shouldComponentUpdate(nextState: IPullRequestStatusSectionState): boolean {
        if (nextState.loading && this.state.loading) {
            return false; // if we are still loading, don't bother to re-render
        }
        return this.state.pullRequest !== nextState.pullRequest
            || this.state.pullRequestStatuses !== nextState.pullRequestStatuses
            || this.state.statusContributions !== nextState.statusContributions
            || this.state.hasPermissionToPerformPolicyActions !== nextState.hasPermissionToPerformPolicyActions;
    }

    private _getStateFromStores(): IPullRequestStatusSectionState {
        const pullRequestStatuses = Flux.instance().storesHub.pullRequestStatusesStore.state.filteredStatuses.map(status => ({ status }));
        const statusesLoading = Flux.instance().storesHub.pullRequestStatusesStore.isLoading();

        return {
            pullRequest: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail(),
            statusContributions: Flux.instance().storesHub.pullRequestStatusContributionsStore.getStatusContribution(),
            hasPermissionToPerformPolicyActions: Flux.instance().storesHub.permissionsStore.getPermissions().usePolicyActions,
            pullRequestStatuses,
            loading: Flux.instance().storesHub.pullRequestDetailStore.isLoading()
                || Flux.instance().storesHub.contextStore.isLoading()
                || statusesLoading,
        };
    }
}
