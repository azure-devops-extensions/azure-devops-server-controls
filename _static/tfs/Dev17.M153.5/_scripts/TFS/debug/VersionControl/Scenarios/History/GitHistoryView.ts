/// <amd-dependency path='VSS/LoaderPlugins/Css!GitHistoryView' />
/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />
/// <reference types="react-dom" />

import * as ReactDOM from "react-dom";
import * as Utils_String from "VSS/Utils/String";
import * as Performance from "VSS/Performance";
import * as Controls from "VSS/Controls";
import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";

import { ActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/ActionCreator";
import { ActionsHub } from "VersionControl/Scenarios/History/GitHistory/Actions/ActionsHub";
import { GitHistorySearchCriteria } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import * as Page from "VersionControl/Scenarios/History/GitHistory/Components/GitHistoryPage";
import { StoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/StoresHub";
import { TelemetrySpy } from "VersionControl/Scenarios/History/GitHistory/TelemetrySpy";
import { TTIScenario } from "VersionControl/Scenarios/History/TTIScenario";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { createLocalStorageHubSplitter } from "VersionControl/Scenarios/Shared/HubSplitter";
import { LazyPathsSearchSource } from "VersionControl/Scenarios/Shared/Path/LazyPathsSearchSource";
import { CommitSearchAdapter } from "VersionControl/Scripts/Controls/CommitSearchAdapter";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCViewBase from "VersionControl/Scripts/Views/BaseView";

const gitHistoryContentToRender = ".versioncontrol-git-history-view";

class HistoryShortcutGroup extends ShortcutGroupDefinition {
    constructor(actionCreator: ActionCreator) {
        super(VCResources.KeyboardShortcutGroup_History);

        this.registerShortcut("t", {
            description: VCResources.ChangesetListPath,
            action: actionCreator.startPathEditing,
        });
    }
}

export class GitHistoryView extends VCViewBase.ViewBase {
    private _actionCreator: ActionCreator;
    private _storesHub: StoresHub;
    private _historyShortcutGroup: HistoryShortcutGroup;
    private _telemetrySpy: TelemetrySpy;
    private _currentSelectedVersion: string;

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            hubContentSelector: gitHistoryContentToRender,
        }, options));
    }

    public initialize() {
        if (this._emptyRepository) {
            this._showEmptyRepositoryView($(gitHistoryContentToRender));
            super.initialize();
            return;
        }
        this._customerIntelligenceData.setView("GitHistoryView");
        this._initializeFlux();

        if (this._actionCreator) {
            this._historyShortcutGroup = new HistoryShortcutGroup(this._actionCreator);
        }

        super.initialize();

        Page.renderInto(
            $(gitHistoryContentToRender)[0],
            {
                actionCreator: this._actionCreator,
                storesHub: this._storesHub,
                customerIntelligenceData: this._customerIntelligenceData,
            });

        this._actionCreator.finishInitialization();

        // commit search box is added through search adapter, but since rendering happens after initialization
        // BaseView will not find search container
        // Solutions : 
        // a) render search container in the initial hub content: this means hard-coding html till search box
        // b) intialize search adapter after final div is generated
        // going with approach (b)
        this._setHistoryCommitsSearchAdapter();
    }

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback): void {
        const state: any = {};

        this.setState(state);
        this._checkForDeletedDefaultBranch(rawState);

        // rawState.path is need for navigating to history of an item via context menu in source explorer 
        // as that action only adds path to rawState and not itemPath
        const itemPath: string = rawState.itemPath || rawState.path || this._repositoryContext.getRootPath();
        let itemVersion: string = rawState.itemVersion || rawState.version;

         if (itemVersion) {
            if (itemVersion != this._currentSelectedVersion && this._actionCreator) {
                const versionSpec = VCSpecs.VersionSpec.parse(itemVersion);
                this._actionCreator.saveBranchVersionSpec(versionSpec);
                this._currentSelectedVersion = itemVersion;
            }
        } else {
            const versionSpec = new VCSpecs.GitBranchVersionSpec(this._defaultGitBranchName);
            itemVersion = versionSpec.toVersionString();
        }

        let showGitVersionMenu = true;
        let searchCriteria: GitHistorySearchCriteria;

        searchCriteria = <GitHistorySearchCriteria>{
            itemPath: itemPath,
            itemVersion: itemVersion,
            user: rawState.user,
            fromDate: rawState.fromDate,
            toDate: rawState.toDate,
            alias: rawState.alias
        };

        if (rawState.gitLogHistoryMode) {
            searchCriteria.gitLogHistoryMode = rawState.gitLogHistoryMode;
        }
        this.setViewTitle(Utils_String.format(VCResources.CommitHistoryTitleFormat, this._getFriendlyPathTitle(searchCriteria.itemPath)));

        state.historySearchCriteria = searchCriteria;

        if (this._actionCreator) {
            this._actionCreator.setSearchCriteria(searchCriteria);
        }

        callback(action, state);
    }

    public _dispose(): void {
        ReactDOM.unmountComponentAtNode($(gitHistoryContentToRender)[0]);

        if (this._historyShortcutGroup) {
            this._historyShortcutGroup.removeShortcutGroup();
            this._historyShortcutGroup = null;
        }

        if (this._telemetrySpy) {
            this._telemetrySpy.dispose();
            this._telemetrySpy = null;
        }
        if (this._storesHub) {
            this._storesHub.dispose();
            this._storesHub = null;
        }

        this._actionCreator = null;

        super._dispose();
    }

    private _setHistoryCommitsSearchAdapter(): void {
        let $commitsAdapterElement: JQuery = $(".vc-search-adapter-commits");
        let adapter: CommitSearchAdapter;

        if ($commitsAdapterElement.length) {
            adapter = <CommitSearchAdapter>Controls.Enhancement.ensureEnhancement(CommitSearchAdapter, $commitsAdapterElement);
            adapter.setRepository(<GitRepositoryContext>this._repositoryContext);
        }
    }

    private _initializeFlux(): void {
        const actionsHub = new ActionsHub();
        const repoContext = this._repositoryContext as GitRepositoryContext;
        
        this._telemetrySpy = new TelemetrySpy(actionsHub, this._repositoryContext.getRepositoryType());
        const isPathSearchEnabled = this._repositoryContext.getRepositoryType() === RepositoryType.Git;

        this._storesHub = new StoresHub(actionsHub, isPathSearchEnabled);
        const lazyPathsSearchSource = isPathSearchEnabled ? new LazyPathsSearchSource(this._repositoryContext) : undefined;

        this._actionCreator = new ActionCreator(
            actionsHub,
            this._defaultGitBranchName,
            this._storesHub,
            new GitPermissionsSource(repoContext.getProjectId(), repoContext.getRepositoryId()),
            this._repositoryContext,
            lazyPathsSearchSource,
            new TTIScenario("Git.History.View"));
        this._actionCreator.setupInitialVersion(this._deletedUserDefaultBranchName);
    }
}