import * as React from "react";
import * as ReactDOM from "react-dom";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import * as SDK_Shim from "VSS/SDK/Shim";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import { IGitHistoryListOptions } from "TFS/VersionControl/Controls";
import { GitRepository } from "TFS/VersionControl/Contracts";
import {
    GitHistoryDataOptions,
    GitHistorySearchCriteria,
    HistoryTabActionsHub
} from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { GitHistoryList, GitHistoryListProps } from "VersionControl/Scenarios/Shared/GitHistoryList";
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitCommitVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

SDK_Shim.registerContent("tfs.versioncontrol.git-history-list", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    const historyListParams: IGitHistoryListOptions = context.options;
    const repositoryId = historyListParams.repositoryId;

    const searchCriteria = {} as GitHistorySearchCriteria;

    searchCriteria.itemPath = historyListParams.itemPath || "";
    searchCriteria.itemVersion = historyListParams.fromVersion ? new GitCommitVersionSpec(historyListParams.fromVersion).toVersionString() : "";
    searchCriteria.compareVersion = historyListParams.toVersion ? new GitCommitVersionSpec(historyListParams.toVersion).toVersionString() : "";

    const gitService = TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault()).getService(GitClientService) as GitClientService;

    const errorCallback: IErrorCallback = (error: Error) => {
        ReactDOM.render(
            <MessageBar
                key={"ErrorMessage"}
                messageBarType={MessageBarType.error} >
                {error.message}
            </MessageBar>,
            context.$container[0]);
    };

    const successCallback = (repository: GitRepository) => {
        const repositoryContext = GitRepositoryContext.create(repository, TfsContext.getDefault());

        const gitHistoryListProps: GitHistoryListProps = {
            historySearchCriteria: searchCriteria,
            repositoryContext: repositoryContext,
            dataOptions: {
                fetchBuildStatuses: false,
                fetchGraph: false,
                fetchPullRequests: false,
                fetchTags: true
            },
            onScenarioComplete: historyListParams.onScenarioComplete,
            columns: historyListParams.visibleColumns ? DefaultColumns.GetCustomColumns(historyListParams.visibleColumns) : DefaultColumns.BasicColumnsFileLevel,
            headerVisible: historyListParams.isHeaderVisible || false,
            shouldDisplayError: true,
            showFilters: historyListParams.showFilters,
            visibleFilters: historyListParams.visibleFilters
        };

        ReactDOM.render(
            <GitHistoryList {...gitHistoryListProps} />,
            context.$container[0]);
    };

    const projectId = historyListParams.projectId;
    if (projectId) {
        gitService.beginGetProjectRepository(
            projectId,
            repositoryId,
            successCallback,
            errorCallback);
    }
    else {
        gitService.beginGetRepository(
            repositoryId,
            successCallback,
            errorCallback);
    }

    const disposable: IDisposable = {
        dispose: (): void => {
            ReactDOM.unmountComponentAtNode(context.$container[0]);
        }
    };

    return disposable;
});