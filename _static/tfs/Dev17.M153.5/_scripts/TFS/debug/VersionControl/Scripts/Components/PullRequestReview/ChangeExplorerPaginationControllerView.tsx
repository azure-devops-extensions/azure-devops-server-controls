import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { DiagnosticComponent } from "VersionControl/Scripts/Components/PullRequestReview/Mixins";
import { Pagination } from "VersionControl/Scenarios/Shared/Pagination";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { format } from "VSS/Utils/String";

export interface IChangeExplorerPaginationControllerViewState {
    numChangesDownloaded: number;
    iterationId: number;
    baseId: number;
    hasMoreResults: boolean;
    disabled: boolean;
}

/**
 * Pagination control that shows up if not all changes are loaded yet.
 */
export class ChangeExplorerPaginationControllerView extends DiagnosticComponent<{}, IChangeExplorerPaginationControllerViewState> {
    constructor(props) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (!this.state.hasMoreResults) {
            return null;
        }

        return (
            <Pagination
                showMoreButtonTitle={VCResources.ClickForMoreChangesText}
                showMoreButtonTextWhenEnabled={VCResources.PullRequest_LoadMore}
                showMoreButtonTextWhenDisabled={VCResources.PullRequest_FetchingChanges}
                showMoreMessageText={format(VCResources.PullRequest_MoreItemsMessage, this.state.numChangesDownloaded)}
                disabled={this.state.disabled}
                hasMoreResults={this.state.hasMoreResults}
                onShowMoreClick={this._onClick} />);
    }

    public componentDidMount(): void {
        super.componentDidMount();
        Flux.instance().storesHub.codeExplorerStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        Flux.instance().storesHub.codeExplorerStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onClick(event): void {
        // fire an action to request the next page of changes
        Flux.instance().actionCreator.codeExplorerActionCreator.queryIterationChanges(
            this.state.iterationId,
            this.state.baseId,
            null, // use the default page size
            this.state.numChangesDownloaded);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IChangeExplorerPaginationControllerViewState {
        return {
            numChangesDownloaded: Flux.instance().storesHub.codeExplorerStore .getSelectedIterationDownloadedChangeCount(),
            iterationId: Flux.instance().storesHub.codeExplorerStore.getSelectedIterationId(),
            baseId: Flux.instance().storesHub.codeExplorerStore.getSelectedBaseIterationId(),
            hasMoreResults: Flux.instance().storesHub.codeExplorerStore.getSelectedIterationHasMoreChanges(),
            disabled: Flux.instance().storesHub.codeExplorerStore.isUpdatingSelectedIteration(),
        };
    }
}
