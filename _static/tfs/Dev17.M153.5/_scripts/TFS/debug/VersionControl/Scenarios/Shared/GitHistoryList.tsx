import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Utils_String from "VSS/Utils/String";

import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import {
    GitHistoryDataOptions,
    GitHistorySearchCriteria,
    HistoryTabActionsHub
} from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { GitHistoryFilter, GitFilterSearchCriteria, GitFilterProps } from "VersionControl/Scenarios/History/GitHistory/Components/GitHistoryFilter";
import { HistoryListItem, HistoryListColumnMapper } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { HistoryListContainer } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListContainer";
import { HistoryTabStoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { HistorySourcesHub } from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import * as HistoryUtils from "VersionControl/Scenarios/History/GitHistory/HistoryUtils";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface GitHistoryListProps {
    historySearchCriteria: GitHistorySearchCriteria;
    dataOptions: GitHistoryDataOptions;
    repositoryContext: RepositoryContext;
    currentBranchFullName?: string;
    columns?: HistoryListColumnMapper[];
    headerVisible?: boolean;
    onScenarioComplete?(splitTimingName?: string): void;
    // Callback invoked when selection of history list item is changed.
    // If provided the rows of list will be selectable.
    onSelectionChanged?(selection: HistoryListItem[]): void;
    shouldDisplayError?: boolean;
    infiniteScroll?: boolean;
    showFilters?: boolean;
    visibleFilters?: string[];
}

/**
 * Rendering Git history list in given container element
 */
export function renderGitHistoryList(element: HTMLElement, historyListContainerProps: GitHistoryListProps): void {
    ReactDOM.render(
        <GitHistoryList {...historyListContainerProps} />,
        element);
}

export class GitHistoryList extends React.Component<GitHistoryListProps, {}>{
    private _actionsHub: HistoryTabActionsHub;
    private _actionCreator: HistoryTabActionCreator;
    private _storesHub: HistoryTabStoresHub;
    private _searchCriteria: any = {};
    private _previousRepositoryContext: GitRepositoryContext = null;
    private _dataOptions = {
        fetchBuildStatuses: true,
        fetchPullRequests: true,
        fetchTags: true,
        fetchGraph: true
    } as GitHistoryDataOptions;
    private _searchFilterContainer: HTMLElement;

    public render(): JSX.Element {
        return (
            <div>
                {this.props.showFilters &&
                    <div ref={element => this._searchFilterContainer = element} />
                }
                <HistoryListContainer
                    actionCreator={this._actionCreator}
                    repositoryContext={this.props.repositoryContext}
                    historyListStore={this._storesHub.historyListStore}
                    currentBranchFullname={this.props.currentBranchFullName}
                    headerVisible={this.props.headerVisible}
                    shouldDisplayError={this.props.shouldDisplayError}
                    onScenarioComplete={this.props.onScenarioComplete}
                    onSelectionChanged={this.props.onSelectionChanged}
                    columns={this.props.columns}
                    infiniteScroll={this.props.infiniteScroll} />
            </div>);
    }

    public shouldComponentUpdate(nextProps: GitHistoryListProps, nextState: {}): boolean {
        if (JSON.stringify(nextProps.historySearchCriteria) === JSON.stringify(this.props.historySearchCriteria)) {
            return false;
        }
        return true;
    }

    public componentDidMount(): void {
        this._renderNewSearchFilter();
    }

    public componentWillUpdate(): void {
        this._setFluxObjects();
    }

    public componentWillMount(): void {
        this._setFluxObjects();
        if (this._storesHub) {
            this._storesHub.historyListStore.addChangedListener(this._handleStoreChange);
        }
    }

    public componentWillUnmount(): void {
        if (this._storesHub) {
            this._storesHub.historyListStore.removeChangedListener(this._handleStoreChange);
            this._storesHub.dispose();
        }

        if (this._searchFilterContainer) {
            ReactDOM.unmountComponentAtNode(this._searchFilterContainer);
            this._searchFilterContainer = null;
        }

        this._storesHub = null;
        this._actionsHub = null;
        this._actionCreator = null;
        this._previousRepositoryContext = null;
    }

    private _onFilterUpdated = (searchCriteria: any): void => {
        //Merge current searchCriteria with their searchCriteria if new filters.
        let currentSearchCriteria = searchCriteria;
        currentSearchCriteria = $.extend(this._searchCriteria, searchCriteria);

        if (currentSearchCriteria) {
            this._searchCriteria = currentSearchCriteria;
            this._actionCreator.fetchHistory(this._searchCriteria, this._dataOptions);
        }
    }

    private _handleStoreChange = (): void => {
        this._renderNewSearchFilter();
    }

    private _renderNewSearchFilter = (): void => {
        if (this._searchFilterContainer) {
            const filterProps: GitFilterProps = {
                initialSearchCriteria: this._searchCriteria,
                filterUpdatedCallback: this._onFilterUpdated,
                repositoryId: this.props.repositoryContext.getRepositoryId(),
                mruAuthors: HistoryUtils.calculateMruAuthors(this._storesHub.historyListStore.state.historyResults),
                isFilterPanelVisible: true,
                visibleFilters: this.props.visibleFilters,
            };
            ReactDOM.render(<GitHistoryFilter {...filterProps} />, this._searchFilterContainer) as GitHistoryFilter;
        }
    }

    private _setFluxObjects(): void {
        if (!this._actionCreator) {
            this._actionsHub = new HistoryTabActionsHub();
            this._storesHub = new HistoryTabStoresHub(this._actionsHub);
            const repoContext = this.props.repositoryContext as GitRepositoryContext;
            const sourcesHub: HistorySourcesHub = {
                historyCommitsSource: new HistoryCommitsSource(repoContext),
                permissionsSource: new GitPermissionsSource(repoContext.getRepository().project.id, repoContext.getRepositoryId())
            };

            this._actionCreator = new HistoryTabActionCreator(this._actionsHub, sourcesHub, this._storesHub.getAggregatedState);
        } else if (
            this._previousRepositoryContext &&
            this.props.repositoryContext &&
            Utils_String.ignoreCaseComparer(this._previousRepositoryContext.getRepositoryId(),
                this.props.repositoryContext.getRepositoryId())) {
            const repoContext = this.props.repositoryContext as GitRepositoryContext;
            const sourcesHub: HistorySourcesHub = {
                historyCommitsSource: new HistoryCommitsSource(repoContext),
                permissionsSource: new GitPermissionsSource(repoContext.getRepository().project.id, repoContext.getRepositoryId())
            };

            this._actionCreator.setHistoryCommitsSourcesHub(sourcesHub);
        }

        this._previousRepositoryContext = this.props.repositoryContext as GitRepositoryContext;
        this._actionCreator.fetchHistory(this.props.historySearchCriteria, this.props.dataOptions);
        this._searchCriteria = this.props.historySearchCriteria;
    }
}
