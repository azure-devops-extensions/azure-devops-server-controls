/// <amd-dependency path='VSS/LoaderPlugins/Css!ChangesHistoryView' />

import * as ReactDOM from "react-dom";
import * as VSS from "VSS/VSS";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as Performance from "VSS/Performance";
import * as Controls from "VSS/Controls";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCViewBase from "VersionControl/Scripts/Views/BaseView";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import { HistoryListColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import * as HistoryList from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListContainer";
import { HistoryListColumnMapper } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { HistoryTabActionsHub, GitHistorySearchCriteria, GitHistoryDataOptions } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { HistoryTabStoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { HistorySourcesHub } from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";

import TfsContext = TFS_Host_TfsContext.TfsContext;
import domElem = Utils_UI.domElem;

export class HistoryListFlux {
    public historyStoresHub: HistoryTabStoresHub;
    public historyActionsHub: HistoryTabActionsHub;
    public historyTabActionCreator: HistoryTabActionCreator;
}

export class CommitsSearchView extends VCViewBase.ViewBase {

    private _$content: JQuery;
    private _performance = Performance.getScenarioManager().startScenarioFromNavigation(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.HISTORYLIST_COMMITS_SEARCH_VIEW, true);

    public _historyListFlux: HistoryListFlux;
    private _$newHistoryListContainer: JQuery;

    constructor(options?) {
        super($.extend({
            hubContentSelector: ".versioncontrol-commits-search-content",
            titleElementSelector: ".vc-page-title"
        }, options));
    }

    public initialize(): void {
        this._customerIntelligenceData.setView("CommitsSearchView");
        this._performance.addSplitTiming("startedInitialization");

        this._$content = this._element.find(".versioncontrol-commits-search-content");

        this._historyListFlux = this._initializeHistoryListFlux();

        super.initialize();

        $(".vc-page-title-area").show();
        this._performance.addSplitTiming("initialized");
    }

    public onNavigate(state: any): void {
        if (this._emptyRepository) {
            $(".vc-search-adapter-commits.search-box").hide();
            this._showEmptyRepositoryView($(".versioncontrol-commits-search-content"));
            return;
        }

        let searchCriteria: GitHistorySearchCriteria;
        const dataOptions: GitHistoryDataOptions = {
            fetchBuildStatuses: true,
            fetchPullRequests: true,
            fetchTags: true,
            fetchGraph: false
        };

        if (state.commitStartsWith) {
            this.setViewTitle(Utils_String.format(VCResources.CommitsWithIdStartsWithTitleFormat, state.commitStartsWith));
            searchCriteria = CommitIdHelper.getStartsWithSearchCriteria(state.commitStartsWith) as GitHistorySearchCriteria;
        } else {
            searchCriteria = state;

            if (typeof searchCriteria.itemPath !== "string") {
                searchCriteria.itemPath = this._repositoryContext.getRootPath();
            }

            if (!searchCriteria.itemVersion) {
                searchCriteria.itemVersion = new VCSpecs.GitBranchVersionSpec(this._defaultGitBranchName).toVersionString();
            }

            this.setViewTitle(Utils_String.format(VCResources.CommitHistoryTitleFormat, this._getFriendlyPathTitle(searchCriteria.itemPath)));
        }

        this._renderHistoryList(searchCriteria, dataOptions);
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback): void {
        const itemPath = rawState.itemPath || this._repositoryContext.getRootPath();

        super.parseStateInfo(action, rawState, callback);
    }

    // Making it public for UT
    public _renderHistoryList(searchCriteria: GitHistorySearchCriteria, dataOptions: GitHistoryDataOptions): void {
        // restricting the number of history items similar to the old commits search list
        searchCriteria.top = 25;

        this._historyListFlux.historyTabActionCreator.fetchHistory(searchCriteria, dataOptions);
        this._$newHistoryListContainer = $(domElem("div", "vc-history-list-container")).appendTo(this._$content);

        const requiredColumns: HistoryListColumnMapper[] = [
            HistoryListColumns.CommitHashColumn,
            HistoryListColumns.MessageColumn,
            HistoryListColumns.AuthorColumn,
            HistoryListColumns.ChangeTypeColumn,
            HistoryListColumns.AuthoredDateColumn,
            HistoryListColumns.PullRequestColumn,
            HistoryListColumns.BuildStatusColumn,
        ];

        HistoryList.renderInto(this._$newHistoryListContainer[0], {
            actionCreator: this._historyListFlux.historyTabActionCreator,
            repositoryContext: this._repositoryContext,
            historyListStore: this._historyListFlux.historyStoresHub.historyListStore,
            headerVisible: true,
            columns: requiredColumns,
            onScenarioComplete: (splitTimingName: string) => {
                this._performance.isActive() ? this._performance.end() : null;
            },
            infiniteScroll: true,
        });
    }

    protected _dispose(): void {

        ReactDOM.unmountComponentAtNode(this._$newHistoryListContainer[0]);
        this._$newHistoryListContainer = null;
        this._$content = null;

        if(this._historyListFlux){
            this._historyListFlux.historyStoresHub.dispose();
            this._historyListFlux.historyStoresHub = null;

            this._historyListFlux.historyActionsHub = null;
            this._historyListFlux = null;
        }
        super._dispose();
    }
    
    private _initializeHistoryListFlux(): HistoryListFlux {
        const historyListFlux = new HistoryListFlux();
        historyListFlux.historyActionsHub = new HistoryTabActionsHub();
        historyListFlux.historyStoresHub = new HistoryTabStoresHub(historyListFlux.historyActionsHub);
        const repoContext = this._repositoryContext as GitRepositoryContext;
        const historySourcesHub: HistorySourcesHub = {
            historyCommitsSource: new HistoryCommitsSource(repoContext),
            permissionsSource: new GitPermissionsSource(repoContext.getRepository().project.id, repoContext.getRepositoryId())
        };

        historyListFlux.historyTabActionCreator =
            new HistoryTabActionCreator(historyListFlux.historyActionsHub, historySourcesHub, historyListFlux.historyStoresHub.getAggregatedState);

        return historyListFlux;
    }
}

VSS.classExtend(CommitsSearchView, TfsContext.ControlExtensions);
