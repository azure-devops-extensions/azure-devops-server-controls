import * as React from "react";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { createExplorerEventData, Constants } from "VersionControl/Scenarios/Explorer/Sources/TelemetryWriter";
import { GitHistoryFilter, GitFilterSearchCriteria, GitFilterProps, GitFilterState } from "VersionControl/Scenarios/History/GitHistory/Components/GitHistoryFilter";
import { HistoryListContainer } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListContainer";
import * as HistoryUtils from "VersionControl/Scenarios/History/GitHistory/HistoryUtils";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getBranchFullName } from "VersionControl/Scripts/VersionSpecUtils";

/**
 * Container that displays history of an item in Explorer.
 */
export const HistoryContainer = VCContainer.create(
    ["historyList", "context", "version"],
    ({ historyListState, versionSpec, repositoryContext }, { actionCreator, storesHub }) =>
        <div className={"vc-history-tab-root"}>
            <div className={"history-tab-filters"}>
                <GitHistoryFilter
                    initialSearchCriteria={historyListState.searchCriteria}
                    filterUpdatedCallback={actionCreator.filterHistory}
                    repositoryId={repositoryContext.getRepositoryId()}
                    mruAuthors={HistoryUtils.calculateMruAuthors(historyListState.historyResults)}
                    isFilterPanelVisible={historyListState.isFilterPanelVisible} />
            </div>
            <HistoryListContainer
                actionCreator={actionCreator.getHistoryTabActionCreator()}
                historyListStore={storesHub.historyListStore}
                permissionStore={storesHub.historyListPermissionStore}
                repositoryContext={repositoryContext}
                onScenarioComplete={actionCreator.notifyContentRendered}
                telemetryEventData={createExplorerEventData("do-not-publish", repositoryContext, { view: Constants.viewName })}
                infiniteScroll={true}
                currentBranchFullname={getBranchFullName(versionSpec)}
            />
        </div>);
