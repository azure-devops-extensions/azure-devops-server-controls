import * as React from "react";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { createExplorerEventData, Constants } from "VersionControl/Scenarios/Explorer/Sources/TelemetryWriter";
import { ChangesetsHistoryList, ChangesetsHistoryListProps } from "VersionControl/Scenarios/History/ChangesHistoryListContainer";

export interface TfvcHistoryContainerProps extends VCContainer.ContainerProps {
    className?: string;
}

/**
 * Container that displays history of an tfvc item in Explorer.
 */
export const TfvcHistoryContainer = VCContainer.create<TfvcHistoryContainerProps>(
    ["tfvcHistoryList", "context"],
    ({ repositoryContext, tfvcHistoryListState }, { actionCreator, className }) =>
        <ChangesetsHistoryList
            className={className}
            changesetsListItems={tfvcHistoryListState.tfvcChangeSetsListItems}
            isLoading={tfvcHistoryListState.isLoading}
            error={tfvcHistoryListState.error}
            repositoryContext={repositoryContext}
            hasMoreChangesets={tfvcHistoryListState.hasMoreChangeSets}
            onHistoryExpand={actionCreator.expandTfvcHistoryItem}
            onHistoryCollapsed={actionCreator.collapseTfvcHistoryItem}
            onLoadMoreChangesets={actionCreator.loadMoreTfvcHistory}
            onScenarioComplete={actionCreator.notifyContentRendered} />);
