import * as ReactDOM from "react-dom";
import * as Controls from "VSS/Controls";
import * as VSS from "VSS/VSS";
import * as Navigation from "VSS/Controls/Navigation";
import * as Utils_String from "VSS/Utils/String";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

// module reference starting with underscore is for asynchronously downloading the file content
import * as _VCNewHistoryTab from "VersionControl/Scenarios/History/GitHistory/Components/Tabs/HistoryTab";
import * as _VCHistoryActionCreator from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import * as _VCHistoryActionsHub from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import * as _VCSharedPermissionsSource from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import * as _VCHistoryCommitsSource from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import * as _VCHistorySourcesHub from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import * as _VCHistoryStoresHub from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";

// module references loaded asynchronously for TFVC
import * as _TfvcHistoryViewer from "VersionControl/Scenarios/Shared/TfvcHistoryViewer";
import * as _Contracts from "TFS/VersionControl/Contracts";

// shim for VC History tab -> react for git commits and jquery for tfvc.
export class HistoryNavigationTab extends Navigation.NavigationViewTab {
    private _storesHub: _VCHistoryStoresHub.HistoryTabStoresHub;
    private _actionCreator: _VCHistoryActionCreator.HistoryTabActionCreator;
    private _historyTabOptions: _VCNewHistoryTab.IHistoryTabOptions = null;
    private _parsedState: any;
    private _previousRepositoryContext: GitRepositoryContext = null;

    public onNavigate(rawState: any, parsedState: any): void {
        this._parsedState = parsedState;
        if (this._showGitHistoryView()) {
            this._element.addClass("vc-history-tab");
            this._navigateToNewGitHistoryTab(rawState, parsedState);
        } else if (this._showTFVCHistoryView()) {
            this._navigateToNewTfvcHistory(rawState, parsedState);
        }
    }

    public onNavigateAway(): void {
        if (this._showGitHistoryView()) {
            if (this._actionCreator) {
                this._actionCreator.clearHistoryList();
            }
        }
    }

    protected _dispose(): void {
        if (this._showGitHistoryView() || this._showTFVCHistoryView()) {
            ReactDOM.unmountComponentAtNode(this._element[0]);
        }

        if (this._showGitHistoryView()) {
            this._historyTabOptions.onFilterUpdated = null;
            this._historyTabOptions.scenarioComplete = null;

            if (this._storesHub) {
                this._storesHub.dispose();
            }
            this._storesHub = null;
            this._actionCreator = null;
            this._previousRepositoryContext = null;
        }
        super._dispose();
    }

    private _showGitHistoryView(): boolean {
        return this._parsedState.repositoryContext &&
            this._parsedState.repositoryContext.getRepositoryType() === RepositoryType.Git;
    }

    private _showTFVCHistoryView(): boolean {
        return this._parsedState.repositoryContext &&
            this._parsedState.repositoryContext.getRepositoryType() === RepositoryType.Tfvc;
    }

    private _navigateToNewGitHistoryTab(rawState: any, parsedState: any): void {
        CustomerIntelligenceData.publishFirstTabView(this._options.tabName, parsedState, this._options);
        VSS.using(
            [
                "VersionControl/Scenarios/History/GitHistory/Components/Tabs/HistoryTab",
                "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator",
                "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub",
                "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource",
                "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource",
                "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub",
                "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub",
            ],
            (
                vcHistoryTab: typeof _VCNewHistoryTab,
                vcHistoryActionCreator: typeof _VCHistoryActionCreator,
                vcHistoryActionsHub: typeof _VCHistoryActionsHub,
                vcSharedPermissionsSource: typeof _VCSharedPermissionsSource,
                vcHistoryCommitsSource: typeof _VCHistoryCommitsSource,
                vcHistorySourcesHub: typeof _VCHistorySourcesHub,
                vcHistoryStoresHub: typeof _VCHistoryStoresHub,
            ) => {

                if (!this._actionCreator) {
                    const actionsHub = new vcHistoryActionsHub.HistoryTabActionsHub();
                    this._storesHub = new vcHistoryStoresHub.HistoryTabStoresHub(actionsHub);
                    const repoContext = parsedState.repositoryContext;
                    const sourcesHub: _VCHistorySourcesHub.HistorySourcesHub = {
                        historyCommitsSource: new vcHistoryCommitsSource.HistoryCommitsSource(repoContext),
                        permissionsSource: new vcSharedPermissionsSource.GitPermissionsSource(repoContext.getRepository().project.id, repoContext.getRepositoryId())
                    };

                    this._actionCreator = new vcHistoryActionCreator.HistoryTabActionCreator(actionsHub, sourcesHub, this._storesHub.getAggregatedState);
                } else if (this._previousRepositoryContext &&
                    parsedState.repositoryContext &&
                    Utils_String.ignoreCaseComparer(this._previousRepositoryContext.getRepositoryId(),
                        parsedState.repositoryContext.getRepositoryId())) {
                    const repoContext = parsedState.repositoryContext;
                    const sourcesHub: _VCHistorySourcesHub.HistorySourcesHub = {
                        historyCommitsSource: new vcHistoryCommitsSource.HistoryCommitsSource(repoContext),
                        permissionsSource: new vcSharedPermissionsSource.GitPermissionsSource(repoContext.getRepository().project.id, repoContext.getRepositoryId())
                    };

                    this._actionCreator.setHistoryCommitsSourcesHub(sourcesHub);
                }

                this._previousRepositoryContext = parsedState.repositoryContext;

                if (!this._historyTabOptions) {
                    this._historyTabOptions = {
                        onFilterUpdated: this._options.onFilterUpdated,
                        scenarioComplete: this._options.scenarioComplete,
                        columns: this._options.columns,
                    } as _VCNewHistoryTab.IHistoryTabOptions;
                }

                const historySearchProps: _VCNewHistoryTab.IHistoryTabSearchProps = {
                    historySearchCriteria: parsedState.historySearchCriteria,
                    path: parsedState.path,
                    version: parsedState.version,
                    dataOptions: this._options.dataOptions,
                    repositoryContext: parsedState.repositoryContext
                };

                const customerIntelligenceObject: CustomerIntelligenceData = parsedState.customerIntelligenceData as CustomerIntelligenceData;
                vcHistoryTab.renderTab(
                    this._element[0],
                    {
                        actionCreator: this._actionCreator,
                        storesHub: this._storesHub,
                        historySearchProps: historySearchProps,
                        tabOptions: this._historyTabOptions,
                        customerIntelligenceData: customerIntelligenceObject ? customerIntelligenceObject.clone() : null,
                    });
            });
    }

    private _navigateToNewTfvcHistory(rawState: any, parsedState: any): void {
        VSS.using(
            [
                "VersionControl/Scenarios/Shared/TfvcHistoryViewer",
                "TFS/VersionControl/Contracts",
            ],
            (
                tfvcHistoryViewer: typeof _TfvcHistoryViewer,
                contracts: typeof _Contracts,
            ) => {
                const tfvcSearchCriteria = {} as _Contracts.ChangeListSearchCriteria;
                tfvcSearchCriteria.itemPath = parsedState.path;
                tfvcSearchCriteria.itemVersion = parsedState.version;

                const tfvcHistoryViewerProps: _TfvcHistoryViewer.TfvcHistoryViewerProps = {
                    searchCriteria: tfvcSearchCriteria,
                    repositoryContext: parsedState.repositoryContext,
                    showFilters: true,
                };

                tfvcHistoryViewer.renderTfvcHistoryViewer(this._element[0], tfvcHistoryViewerProps);
            });
    }
}
