import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import { ChangesHistoryListContainer } from "VersionControl/Scenarios/History/ChangesHistoryListContainer";
import { TfvcActionsHub } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcActionsHub";
import { TfvcHistoryActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryActionCreator";
import { TfvcChangeSetsStoresHub } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStoresHub";
import { ChangeSetsListItem } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";

import { ChangesetsFilterContainer, ChangesetsFilterContainerProps } from "VersionControl/Scenarios/History/TfvcHistory/Components/ChangeSetsFilterContainer";
import { PathExplorerContainer } from "VersionControl/Scenarios/Shared/Path/PathExplorerContainer";
import { PathStore } from "VersionControl/Scenarios/Shared/Path/PathStore";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/ChangeSetsPage";
import "VSS/LoaderPlugins/Css!VersionControl/TfvcHistoryViewer";

export interface TfvcHistoryViewerProps {
    searchCriteria: ChangeListSearchCriteria;
    repositoryContext: RepositoryContext;
    showFilters?: boolean;
    showPathControl?: boolean;
    filterContainer?: HTMLElement;
    selectionMode?: SelectionMode;
    onDrawComplete?(): void;
    onSelectionChanged?(selection: ChangeSetsListItem[]): void;
    onScenarioComplete?(splitTimingName?: string): void;
}

/**
 * Rendering Tfvc history viewer in given container element
 */
export function renderTfvcHistoryViewer(element: HTMLElement, historyListContainerProps: TfvcHistoryViewerProps): void {
    ReactDOM.render(
        <TfvcHistoryViewer {...historyListContainerProps} />,
        element);
}

export class TfvcHistoryViewer extends React.Component<TfvcHistoryViewerProps, {}>{
    private _actionsHub: TfvcActionsHub;
    private _actionCreator: TfvcHistoryActionCreator;
    private _storesHub: TfvcChangeSetsStoresHub;

    public render(): JSX.Element {
        return (
            <div className="changesets-list-control">
                {
                    this.props.showPathControl &&
                    <div className="vc-header">
                        <div className="vc-page-path-explorer">
                            <PathExplorerContainer
                                onEditingStart={this._actionCreator.startPathEditing}
                                onInputTextEdit={this._actionCreator.editPathText}
                                onPathChange={this._actionCreator.changePath}
                                onEditingCancel={this._actionCreator.cancelPathEditing}
                                pathStore={this._storesHub.pathStore}
                            />
                        </div>
                    </div>
                }
                {
                    this.props.showFilters && !this.props.filterContainer &&
                    <div className="filter-container">
                        <ChangesetsFilterContainer
                            actionCreator={this._actionCreator}
                            filterStore={this._storesHub.filterStore} />
                    </div>
                }
                <ChangesHistoryListContainer
                    actionCreator={this._actionCreator}
                    changeSetsStore={this._storesHub.tfvcChangeSetsStore}
                    repositoryContext={this.props.repositoryContext}
                    onScenarioComplete={this.props.onScenarioComplete}
                    selectionMode={this.props.selectionMode}
                    onSelectionChanged={this.props.onSelectionChanged} />
            </div>);
    }

    public shouldComponentUpdate(nextProps: TfvcHistoryViewerProps, nextState: {}): boolean {
        return false;
    }

    public componentWillUpdate(): void {
        this._fetchData();
    }

    public componentWillMount(): void {
        this._setFluxObjects();
        // changeRepository() pathstore values to default values for rendering path control for the first time
        if (this.props.showPathControl) {
            this._actionCreator.changeRepository();
            this._actionCreator.changePath(this.props.repositoryContext ? this.props.repositoryContext.getRootPath() : "");
        }
        else {
            this._fetchData();
        }
    }

    public componentDidMount(): void {
        if (this.props.showFilters && this.props.filterContainer) {
            this._renderSearchFilter();
        }
        if (this.props.onDrawComplete) {
            this.props.onDrawComplete();
        }
    }

    public componentWillReceiveProps(nextProps: TfvcHistoryViewerProps): void {
        if (JSON.stringify(nextProps.searchCriteria) !== JSON.stringify(this.props.searchCriteria)) {
            this.props = nextProps;
            this._fetchData();
        }
    }

    public componentWillUnmount(): void {
        if (this.props.showFilters && this.props.filterContainer) {
            ReactDOM.unmountComponentAtNode(this.props.filterContainer);
        }

        if (this._storesHub) {
            this._storesHub.dispose();
        }

        this._storesHub = null;
        this._actionsHub = null;
        this._actionCreator = null;
    }

    private _setFluxObjects(): void {
        if (this.props.repositoryContext) {
            this._actionsHub = new TfvcActionsHub();
            this._storesHub = new TfvcChangeSetsStoresHub(this._actionsHub);
            this._actionCreator = new TfvcHistoryActionCreator(this._actionsHub, this._storesHub, this.props.repositoryContext as TfvcRepositoryContext);
        }
        else {
            throw new Error("Repository Context cannot be null or empty");
        }
    }

    private _renderSearchFilter = (): void => {
        const filterProps: ChangesetsFilterContainerProps = {
            actionCreator: this._actionCreator,
            filterStore: this._storesHub.filterStore,
        };

        ReactDOM.render(<ChangesetsFilterContainer {...filterProps} />, this.props.filterContainer);
    }

    private _fetchData(): void {
        if (this._actionCreator) {
            this._actionCreator.fetchChangesets(this.props.searchCriteria);
        }
    }
}
