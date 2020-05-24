import * as React from "react";
import { Link } from "OfficeFabric/Link";
import { Fabric } from "OfficeFabric/components/Fabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { SelectionMode } from "OfficeFabric/utilities/selection/interfaces";
import * as Utils_UI from "VSS/Utils/UI";
import { EmptyResultPage } from "VersionControl/Scenarios/Shared/EmptyResultPage";
import { TfvcHistoryActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryActionCreator";
import { ChangesetsList } from "VersionControl/Scenarios/History/ChangesetsList";
import { TfvcChangeSetsStoreState, TfvcChangeSetsStore } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStore"
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import {
    EmptyHistoryResultTitle,
    ChangeSets_NoChangeSetsFound,
    FetchingResultsText
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { Container } from "VersionControl/Scenarios/History/TfvcHistory/Components/Container";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ChangeSetsListItem } from "VersionControl/Scenarios/History/TfvcHistory/TfvcInterfaces"

export interface ChangesHistoryListContainerProps {
    actionCreator: TfvcHistoryActionCreator;
    changeSetsStore: TfvcChangeSetsStore;
    repositoryContext: RepositoryContext;
    selectionMode?: SelectionMode;
    onSelectionChanged?(selection: ChangeSetsListItem[]): void;
    onScenarioComplete?(splitTimingName: string): void;
}

export class ChangesHistoryListContainer extends Container<ChangesHistoryListContainerProps, TfvcChangeSetsStoreState> {
    private readonly c_defaultShowMoreCount = 150;

    public render(): JSX.Element {
        const {actionCreator, repositoryContext, onScenarioComplete} = this.props;

        return <ChangesetsHistoryList
            changesetsListItems={this.state.tfvcChangeSetsListItems}
            isLoading={this.state.isLoading}
            error={this.state.error}
            repositoryContext={repositoryContext}
            hasMoreChangesets={this.state.hasMoreChangeSets}
            selectionMode={this.props.selectionMode}
            onSelectionChanged={this.props.onSelectionChanged}
            onLoadMoreChangesets={this._fetchMoreEntries}
            onHistoryExpand={actionCreator.expandChangeSetHistory}
            onHistoryCollapsed={actionCreator.collapseChangeSetsHistory}
            onDismissError={actionCreator.clearAllErrors}
            onScenarioAbort={actionCreator.abortScenario}
            onScenarioComplete={onScenarioComplete}
        />;
    }

    public getStateFromStores({changeSetsStore}: ChangesHistoryListContainerProps): TfvcChangeSetsStoreState {
        return changeSetsStore.state;
    }

    public componentDidUpdate(): void {
        if (this.state.error && !this.state.isLoading) {
            Utils_UI.Positioning.scrollIntoViewVertical($(".error-message"), Utils_UI.Positioning.VerticalScrollBehavior.Top);
        }
    }

    private _fetchMoreEntries = (): void => {
        this.props.actionCreator.fetchMoreChangesets(this.c_defaultShowMoreCount);
    }
}

export interface ChangesetsHistoryListProps {
    className?: string;
    repositoryContext: RepositoryContext;
    changesetsListItems: ChangeSetsListItem[];
    hasMoreChangesets: boolean;
    error?: Error;
    isLoading: boolean;
    selectionMode?: SelectionMode;
    onSelectionChanged?(selection: ChangeSetsListItem[]): void;
    onLoadMoreChangesets(): void;
    onHistoryExpand(item: ChangeSetsListItem): void;
    onHistoryCollapsed(item: ChangeSetsListItem): void;
    onDismissError?(): void;
    onScenarioComplete?(splitTimingName: string): void;
    onScenarioAbort?(): void;
}

export const ChangesetsHistoryList = (props: ChangesetsHistoryListProps): JSX.Element => {
    const listContent: JSX.Element[] = [];
    const historyEntries = props.changesetsListItems;
    const hasHistoryEntries = historyEntries && historyEntries.length > 0;
    const hasError = !!props.error;

    const showEmptyResultsPage = !(hasHistoryEntries || hasError || props.isLoading);

    if (hasError) {
        listContent.push(
            <MessageBar
                key={"ErrorMessage"}
                className={"error-message"}
                messageBarType={MessageBarType.error}
                onDismiss={this._onDismissError}>
                {props.error.message}
            </MessageBar>
        );
        props.onScenarioAbort && props.onScenarioAbort();
    }

    if (showEmptyResultsPage) {
        listContent.push(
            <EmptyResultPage
                key={"EmptyResultPage"}
                title={EmptyHistoryResultTitle}
                message={ChangeSets_NoChangeSetsFound} />
        );
        props.onScenarioComplete && props.onScenarioComplete("EmptyResultPage");

    } else if (hasHistoryEntries) {
        listContent.push(
            <ChangesetsList
                key={"ChangesHistoryList"}
                historyEntries={props.changesetsListItems}
                repositoryContext={props.repositoryContext}
                isLoading={props.isLoading}
                selectionMode={props.selectionMode}
                onSelectionChanged={props.onSelectionChanged}
                onExpandHistory={props.onHistoryExpand}
                onCollapseHistory={props.onHistoryCollapsed}
                onScenarioComplete={props.onScenarioComplete}
                addShowMoreLink={props.hasMoreChangesets}
                onShowMoreLinkClick={props.onLoadMoreChangesets} />
        );
    } else if (props.isLoading) {
        listContent.push(
            <Spinner key={"Spinner"} className={"vc-history-spinner"} label={FetchingResultsText} />
        );
    }

    const className = `changes-history-list-container ${props.className ? props.className : ""}`;

    return (
        <Fabric className={className}>
            {listContent}
        </Fabric>
    );
}
