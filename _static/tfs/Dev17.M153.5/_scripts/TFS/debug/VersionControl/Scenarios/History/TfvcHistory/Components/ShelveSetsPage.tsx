import * as React from "react";
import * as ReactDOM from "react-dom";
import { Fabric } from "OfficeFabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import * as Performance from "VSS/Performance";
import * as Utils_String from "VSS/Utils/String";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfvcShelveSetsActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcShelveSetsActionCreator";
import { TfvcShelveSetsStore } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcShelveSetsStore";
import { TfvcShelveSetsStoreHub, ShelveSetsPageState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcShelveSetsStoreHub";
import { ShelveSetsUrlState } from "VersionControl/Scenarios/History/TfvcHistory/Stores/ShelveSetUrlStore"
import { EmptyResultPage } from "VersionControl/Scenarios/Shared/EmptyResultPage";

import { ShelvesetFilter, ShelvesetFilterSearchCriteria, ShelvesetFilterProps } from "VersionControl/Scenarios/History/TfvcHistory/Components/ShelvesetFilter";
import { HistoryEntry, TfsChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangesHistoryList } from "VersionControl/Scenarios/History/ChangesHistoryList";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/ShelveSetsPage";
import "VSS/LoaderPlugins/Css!fabric";

export interface ShelveSetsPageProps {
    actionCreator: TfvcShelveSetsActionCreator;
    storesHub: TfvcShelveSetsStoreHub;
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
}

export function renderInto(container: HTMLElement, props: ShelveSetsPageProps): void {
    ReactDOM.render(
        <ShelveSetsPage {...props} />,
        container);
}

/**
 * Container for the Tfvc ShelveSets page, containing the filter component, search box and the changes history list.
 */
export class ShelveSetsPage extends React.Component<ShelveSetsPageProps, ShelveSetsPageState> {

    constructor(props: ShelveSetsPageProps) {
        super(props);
        this.state = {
            shelvesetUrlState: this.props.storesHub.shelveSetUrlStore.state,
            shelvesetsState: this.props.storesHub.tfvcListStore.state,
        };
    }

    public componentWillMount(): void {
        this.props.storesHub.tfvcListStore.addChangedListener(this._onStoreChanged);
        this.props.storesHub.shelveSetUrlStore.addChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        const titleString = Utils_String.format(VCResources.ShelvesetResultsForOwner, this.state.shelvesetUrlState.user);

        const filterProps: ShelvesetFilterProps = {
            filterUpdatedCallback: this._updateFilters,
            initialSearchCriteria: {
                user: this.state.shelvesetUrlState.user,
                userId: this.state.shelvesetUrlState.userId,
            },
            currentIdentity: this.props.tfsContext.currentIdentity,
        };

        return (
            <Fabric className="shelvesets-page absolute-full">
                <div className={"hub-title"}>
                    <div className={"vc-page-title-area"}>
                        <div className={"vc-page-title"}>{titleString}</div>
                    </div>
                </div>
                <div className={"filters"}>
                    <div className={"filter-Container"}>
                        <ShelvesetFilter {...filterProps}/>
                        <div className="versioncontrol-shelvesets-search-box">
                            <div className="vc-search-adapter-shelvesets search-box bowtie noDrop"></div>
                        </div>
                    </div>
                </div>
                <ShelveSetsListContainer
                    repositoryContext={this.props.repositoryContext}
                    store={this.props.storesHub.tfvcListStore}
                    onDismissError={this._onDismissError}
                    onScenarioComplete={this.props.actionCreator.notifyContentRendered}
                />
            </Fabric>)
    }

    public componentWillUnmount(): void {
        this.props.storesHub.tfvcListStore.removeChangedListener(this._onStoreChanged);
        this.props.storesHub.shelveSetUrlStore.removeChangedListener(this._onStoreChanged);
    }

    private _updateFilters = (searchCriteria: ShelvesetFilterSearchCriteria): void => {
        this.props.actionCreator.UpdateFilters(null, searchCriteria);
    }

    private _onStoreChanged = (): void => {
        this.setState(this.props.storesHub.getShelveSetsPageState());
    };

    private _onDismissError = (): void => {
        this.props.actionCreator.clearAllErrors();
    }
}

export interface ShelveSetsListContainerProps {
    repositoryContext: RepositoryContext;
    store: TfvcShelveSetsStore;
    selectionMode?: SelectionMode;
    onDismissError(): void;
    onSelectionChanged?(selection: HistoryEntry[]): void;
    onScenarioComplete?(splitTimingName: string): void;
}

export const ShelveSetsListContainer = (props: ShelveSetsListContainerProps): JSX.Element => {

    const historyEntries = props.store.state ? props.store.state.tfvcHistoryItems : null;
    const shouldDisplayErrorBar = props.store.hasError();
    const shouldDisplaySpinner = props.store.isLoading();
    const ShouldDisplayEmptyPage = (!props.store.isLoading() && (!historyEntries || (historyEntries && historyEntries.length == 0)));
    const shouldDisplayList = (!props.store.isLoading() && (historyEntries && historyEntries.length > 0));

    return (
        <div className="shelvesets-page-content">
            {shouldDisplayErrorBar &&
                <MessageBar
                    key={"ErrorMessage"}
                    messageBarType={MessageBarType.error}
                    onDismiss={props.onDismissError}>
                    {props.store.getError().message}
                </MessageBar>}
            {shouldDisplaySpinner && <Spinner label={VCResources.FetchingResultsText} />}
            {ShouldDisplayEmptyPage &&
                <EmptyResultPage title={VCResources.ShelvesetListNoEntriesFound} message={VCResources.EmptyShelveSetsResultMessage} />}
            {ShouldDisplayEmptyPage && props.onScenarioComplete && props.onScenarioComplete("EmptyResultPage")}
            {shouldDisplayList &&
                <ChangesHistoryList
                    historyEntries={historyEntries}
                    repositoryContext={props.repositoryContext}
                    isLoading={false}
                    selectionMode={props.selectionMode}
                    onSelectionChanged={props.onSelectionChanged}
                    onScenarioComplete={props.onScenarioComplete}
                />}
        </div>);
}
