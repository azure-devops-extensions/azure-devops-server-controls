import { autobind } from "OfficeFabric/Utilities";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { TfvcShelveSetsActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcShelveSetsActionCreator";
import { TfvcShelveSetsActionsHub } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcShelveSetsActionsHub";
import { ShelvesetFilter, ShelvesetFilterSearchCriteria, ShelvesetFilterProps } from "VersionControl/Scenarios/History/TfvcHistory/Components/ShelvesetFilter";
import { ShelveSetsPageProps, ShelveSetsPage, ShelveSetsListContainer } from "VersionControl/Scenarios/History/TfvcHistory/Components/ShelveSetsPage";
import { TfvcShelveSetsStoreHub, ShelveSetsPageState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcShelveSetsStoreHub";
import { TfvcChangeListItems } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces"
import { HistoryEntry } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/TfvcShelvesetsViewer";

export interface TfvcShelvesetsViewerProps {
    repositoryContext: RepositoryContext;
    selectionMode?: SelectionMode;
    onDismissError?(): void;
    onDrawComplete?(): void;
    onSelectionChanged?(selection: HistoryEntry[]): void;
    onScenarioComplete?(splitTimingName: string): void;
}

/**
 * Rendering Tfvc Shelvesets List in given container element
 */
export function renderTfvcShelveSetsList(element: HTMLElement, tfvcShelvesetsViewerProps: TfvcShelvesetsViewerProps): void {
    ReactDOM.render(
        <TfvcShelvesetsViewer {...tfvcShelvesetsViewerProps} />,
        element);
}

export class TfvcShelvesetsViewer extends React.Component<TfvcShelvesetsViewerProps, ShelveSetsPageState>{
    private _actionsHub: TfvcShelveSetsActionsHub;
    private _actionCreator: TfvcShelveSetsActionCreator;
    private _storesHub: TfvcShelveSetsStoreHub;
    private _tfsContext: TfsContext;

    public render(): JSX.Element {
        const filterProps: ShelvesetFilterProps = {
            filterUpdatedCallback: this._updateFilters,
            initialSearchCriteria: {
                user: this._storesHub.getshelveSetUrlState().user,
                userId: this._storesHub.getshelveSetUrlState().userId,
            },
            currentIdentity: this._tfsContext.currentIdentity,
        };

        return (
            <div className="changesets-list-control">
                <ShelvesetFilter {...filterProps} />
                <ShelveSetsListContainer
                    repositoryContext={this.props.repositoryContext}
                    store={this._storesHub.tfvcListStore}
                    selectionMode={this.props.selectionMode}
                    onDismissError={this.props.onDismissError || this._onDismissError}
                    onSelectionChanged={this.props.onSelectionChanged}
                    onScenarioComplete={this.props.onScenarioComplete}
                />
            </div>
        );
    }

    public componentWillMount(): void {
        this._setFluxObjects();
        this._setCurrentUser();
        if (this._storesHub.tfvcListStore && this._storesHub.shelveSetUrlStore) {
            this._storesHub.tfvcListStore.addChangedListener(this._onStoreChanged);
            this._storesHub.shelveSetUrlStore.addChangedListener(this._onStoreChanged);
        }
        this._fetchData();
    }

    public componentDidMount(): void {
        if (this.props.onDrawComplete) {
            this.props.onDrawComplete();
        }
    }

    public componentWillUnmount(): void {
        if (this._storesHub) {
            if (this._storesHub.tfvcListStore && this._storesHub.shelveSetUrlStore) {
                this._storesHub.tfvcListStore.removeChangedListener(this._onStoreChanged);
                this._storesHub.shelveSetUrlStore.removeChangedListener(this._onStoreChanged);
            }
            this._storesHub.dispose();
        }
    }

    @autobind
    private _onStoreChanged(): void {
        this.setState(this._storesHub.getShelveSetsPageState());
    }

    @autobind
    private _onDismissError(): void {
        this._actionCreator.clearAllErrors();
    }

    @autobind
    private _updateFilters(searchCriteria?: ShelvesetFilterSearchCriteria): void {
        this._actionsHub.urlChanged.invoke(searchCriteria);
        this._fetchData(searchCriteria);
    }

    private _fetchData(searchCriteria?: ShelvesetFilterSearchCriteria): void {
        if (this._actionCreator) {
            this._actionCreator.fetchShelvesets(searchCriteria);
        }
    }

    private _setFluxObjects(): void {
        this._tfsContext = TfsContext.getDefault();
        this._actionsHub = new TfvcShelveSetsActionsHub();
        this._storesHub = new TfvcShelveSetsStoreHub(this._actionsHub);
        this._actionCreator = new TfvcShelveSetsActionCreator(this._actionsHub, this._tfsContext, this.props.repositoryContext, this._storesHub);
    }

    private _setCurrentUser(): void {
        this._actionsHub.urlChanged.invoke({
            user: this._tfsContext.currentIdentity.displayName,
            userId: this._tfsContext.currentIdentity.id,
        });
    }
}
