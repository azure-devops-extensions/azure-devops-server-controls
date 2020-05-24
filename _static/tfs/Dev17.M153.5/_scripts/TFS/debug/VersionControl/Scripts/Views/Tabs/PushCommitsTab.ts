import { unmountComponentAtNode } from "react-dom";
import { NavigationViewTab } from "VSS/Controls/Navigation";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { domElem } from "VSS/Utils/UI";

import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { GitHistorySearchCriteria } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { renderGitHistoryList, GitHistoryListProps } from "VersionControl/Scenarios/Shared/GitHistoryList";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";

// this tab is used to support 'commits added' and 'commits removed' tabs in push details page
export class PushCommitsTab extends NavigationViewTab {
    private _$pushCommitsListContainer: JQuery;
    private _tabName: string;

    public initialize(): void {
        super.initialize();
        this._tabName = (localeIgnoreCaseComparer(this._options.tabId, VersionControlActionIds.CommitsRemoved) === 0) ? "PushCommitsRemovedTab" : "PushCommitsAddedTab";
        this._$pushCommitsListContainer = $(domElem("div", "push-commits-list-container")).appendTo(this._element);
    }

    public onNavigate(rawState: any, parsedState: any): void {
        CustomerIntelligenceData.publishFirstTabView(this._tabName, parsedState, this._options);

        const searchCriteria = {} as GitHistorySearchCriteria;

        if (localeIgnoreCaseComparer(this._options.tabId, VersionControlActionIds.CommitsRemoved) === 0) {
            searchCriteria.itemVersion = (parsedState.refDeleted) ? parsedState.oversion : parsedState.version;
            searchCriteria.compareVersion = (parsedState.refDeleted) ? undefined : parsedState.oversion;
        }
        else {
            searchCriteria.itemVersion = (parsedState.refAdded) ? parsedState.version : parsedState.oversion;
            searchCriteria.compareVersion = (parsedState.refAdded) ? undefined : parsedState.version;
        }

        const gitHistoryListProps: GitHistoryListProps = {
            historySearchCriteria: searchCriteria,
            repositoryContext: parsedState.repositoryContext,
            dataOptions: {
                fetchBuildStatuses: false,
                fetchGraph: false,
                fetchPullRequests: false,
                fetchTags: true
            },
            columns: DefaultColumns.BasicColumnsFileLevel,
            headerVisible: true,
            shouldDisplayError: true
        };
        renderGitHistoryList(this._$pushCommitsListContainer[0], gitHistoryListProps);
    }

    protected _dispose(): void {
        unmountComponentAtNode(this._$pushCommitsListContainer[0]);
        super._dispose();
    }
}
