import * as ReactDOM from "react-dom";
import Contribution_Services = require("VSS/Contributions/Services");
import Service = require("VSS/Service");
import Serialization = require("VSS/Serialization");
import Navigation_Services = require("VSS/Navigation/Services");
import Navigation = require("VSS/Controls/Navigation");
import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Controls = require("VSS/Controls");

import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";
import TFS_ProjectsMru = require("TfsCommon/Scripts/Navigation/TFS.Projects.Mru");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import VCContracts = require("TFS/VersionControl/Contracts");

import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as VersionControlRegistryPath from "VersionControl/Scripts/VersionControlRegistryPath";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";
import { VersionControlShortcutGroup, GitShortcutGroup, TfvcShortcutGroup } from "VersionControl/Scripts/Views/CommonShortcuts";
import VCCommitSearchAdapter = require("VersionControl/Scripts/Controls/CommitSearchAdapter");
import VCChangesetSearchAdapter = require("VersionControl/Scripts/Controls/ChangesetSearchAdapter");
import VCShelvesetSearchAdapter = require("VersionControl/Scripts/Controls/ShelvesetSearchAdapter");
import { RepositorySelector } from "VersionControl/Scripts/Controls/RepositorySelector";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import TFS_Admin_Security_NO_REQUIRE = require("Admin/Scripts/TFS.Admin.Security");
import VCPullRequestSuggestionRibbon_NO_REQUIRE = require("VersionControl/Scripts/Controls/PullRequestSuggestion");
import VCPullRequestSuggestion_NO_REQUIRE = require("VersionControl/Scenarios/Shared/Suggestion");
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { showEmptyRepository } from "VersionControl/Scenarios/Shared/EmptyRepository";

import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

export class ViewBase extends Navigation.TabbedNavigationView {

    public _tfsContext: TFS_Host_TfsContext.TfsContext;
    public _projectInfo: VCContracts.VersionControlProjectInfo;
    private _supportsTfvc: boolean;
    protected _customerIntelligenceData: CustomerIntelligenceData;
    public _repositoryContext: RepositoryContext;
    public _projectGuid: string;
    public _projectUri: string;
    public _emptyRepository: boolean;
    public _defaultGitBranchName: string;
    public _reviewMode: boolean;
    public _showPullRequestSuggestion: boolean;
    public _deletedUserDefaultBranchName: string;
    public _$errorMessageContainer: JQuery;

    private _pullRequestSuggestion: VCPullRequestSuggestionRibbon_NO_REQUIRE.SuggestionRibbon;
    private _versionControlShortcutGroup: VersionControlShortcutGroup;
    private _$emptyRepositoryContainer: JQuery;

    public initializeOptions(options?) {

        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        const vcViewModel = webPageDataSvc.getPageData<any>(Constants.versionControlDataProviderId);
        if (vcViewModel) {
            $.extend(options, vcViewModel);
        }
        options = Serialization.ContractSerializer.deserialize(options, VCWebAccessContracts.TypeInfo.VersionControlViewModel, false);

        this._projectGuid = options.projectGuid;
        this._projectUri = options.projectUri;
        this._projectInfo = options.projectVersionControlInfo;
        this._tfsContext = options.tfsContext || TfsContext.getDefault();
        this._emptyRepository = options.isEmptyRepository;
        this._defaultGitBranchName = options.defaultGitBranchName;
        this._reviewMode = options.reviewMode === true;
        this._customerIntelligenceData = new CustomerIntelligenceData();
        this._deletedUserDefaultBranchName = options.deletedUserDefaultBranchName;

        this._supportsTfvc = (this._projectInfo && this._projectInfo.supportsTFVC);

        if (!options.gitRepository && (!this._projectInfo || this._projectInfo.supportsTFVC)) {
            this._repositoryContext = TfvcRepositoryContext.create(this._tfsContext);
        }
        else {
            this._repositoryContext = GitRepositoryContext.create(options.gitRepository, this._tfsContext);
            this._customerIntelligenceData.setRepositoryId((<GitRepositoryContext>this._repositoryContext).getRepositoryId());
        }

        this._repositoryContext.getClient()._setUserPreferencesFromViewData(options.vcUserPreferences);

        // Creates the repository picker in the older hub header (before the newer Dev15 VSTS navigation bar).
        const $oldNavHubs = $("div.nav-separated.hubs-section-nav");
        if ($oldNavHubs.length === 1) {
            RepositorySelector.createInstance(vcViewModel, $oldNavHubs, "vc-hub-repositories-selector");
        }

        this._setSearchAdapter();

        this._setTitleMode(this._tfsContext.isHosted);

        this._showPullRequestSuggestion = options.showPullRequestSuggestion;

        super.initializeOptions(options);
    }

    public initialize() {
        //if the repository context is not available rest of the intialization can be skipped
        if (!this._repositoryContext) {
            super.initialize();
        }
        else {
            this._$errorMessageContainer = $(domElem("div", "right-hub-error-container")).appendTo(this._element.find(".hub-title")).hide();

            if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                this._element.addClass("git-repositories-view");

                if (this._showPullRequestSuggestion) {
                    // we only pull in suggestion CSS/JS if we should show a suggestion
                    VSS.using(["VersionControl/Scripts/Controls/PullRequestSuggestion", "VersionControl/Scenarios/Shared/Suggestion"],
                        (VCPullRequestSuggestionRibbon: typeof VCPullRequestSuggestionRibbon_NO_REQUIRE,
                            VCPullRequestSuggestion: typeof VCPullRequestSuggestion_NO_REQUIRE) => {
                            const pullRequestsSuggestionParentSelector: string = this._options.pullRequestsSuggestionParentSelector || ".right-hub-content";
                            VCPullRequestSuggestion.Suggestion.beginGetSuggestion(<GitRepositoryContext>this._repositoryContext).then((suggestion: VCPullRequestSuggestion_NO_REQUIRE.ISuggestionObject) => {
                                if (!suggestion) {
                                    return;
                                }

                                this._pullRequestSuggestion = <VCPullRequestSuggestionRibbon_NO_REQUIRE.SuggestionRibbon>Controls.BaseControl.createIn(VCPullRequestSuggestionRibbon.SuggestionRibbon,
                                    this._element.find(pullRequestsSuggestionParentSelector), {
                                        cssClass: "vc-pullrequest-suggestions-container",
                                        tfsContext: TfsContext.getDefault(),
                                        suggestion: suggestion,
                                        repositoryContext: this._repositoryContext
                                    });
                                this._pullRequestSuggestion._element.prependTo(this._pullRequestSuggestion._element.parent());
                                this._pullRequestSuggestion.setVisibility(this._showPullRequestSuggestion);
                            });
                        });
                }
            }
            else {
                this._element.removeClass("git-repositories-view");
            }

            if (this._emptyRepository) {
                this._element.addClass("no-hub-title-text empty-repository");
            }

            if (this._reviewMode || Utils_String.localeIgnoreCaseComparer((Navigation_Services.getHistoryService().getCurrentState() || {}).fullScreenMode, "true") === 0) {
                this.setFullScreenMode(true, this._reviewMode);
            }

            // Update the MRU Project Selector to use the Code controller so that the last used Tfvc/Git repo is selected for hybrid projects.
            TFS_ProjectsMru.projectsMru.setControllerRedirect("VersionControl", "Code");
            TFS_ProjectsMru.projectsMru.setControllerRedirect("Git", "Code");

            this._customerIntelligenceData.publish((this._emptyRepository ? "EmptyRepositoryView" : this._customerIntelligenceData.getView()) + ".FirstView", true);
            super.initialize();

            this._versionControlShortcutGroup =
                this._repositoryContext.getRepositoryType() === RepositoryType.Git
                    ? new GitShortcutGroup(this._repositoryContext)
                    : new TfvcShortcutGroup(this._repositoryContext);
        }
    }

    protected setPullRequestSuggestionVisibility(isVisible: boolean) {
        if (this._pullRequestSuggestion) {
            this._pullRequestSuggestion.setVisibility(isVisible);
        }
        this._showPullRequestSuggestion = isVisible;
    }

    protected _checkForDeletedDefaultBranch(rawState: any) {
        //clear the error message container and hide the warning message
        this._$errorMessageContainer.empty();
        this._$errorMessageContainer.hide();
        //When the user default branch was deleted and url doesn't contain any version info, show warning message
        if (this._deletedUserDefaultBranchName && this._defaultGitBranchName &&
            !rawState.version && !rawState.itemVersion && !rawState.targetVersion && !rawState.baseVersion &&
            this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
            this._$errorMessageContainer
                .append($(domElem("span", "bowtie-icon bowtie-math-multiply")).click(() => {
                    this._$errorMessageContainer.hide();
                }))
                .append($(domElem("div", "content"))
                    .text(Utils_String.format(VCResources.UserDefaultBranchDeletedErrorMessage_WithoutVersionInUrl, this._deletedUserDefaultBranchName, this._defaultGitBranchName)))
                .show();
            //When url changes but JsonIsland keeps same, then do not show warning message by clear the deletedUserDefaultBranchName
            this._deletedUserDefaultBranchName = null;
        }
    }

    /**
     * Set the current (parsed) state objects for the current navigation state.
     * Also adds a copy of customerIntelligenceData.
     */
    public setState(parsedState: any) {
        super.setState(parsedState);
        parsedState.customerIntelligenceData = this._customerIntelligenceData.clone();
    }

    public setFullScreenMode(fullScreenMode: boolean, showLeftPaneInFullScreenMode: boolean = false) {
        if (this._pullRequestSuggestion) {
            this.setPullRequestSuggestionVisibility(!fullScreenMode);
        }
        const fullScreenChanged = $(document.body).hasClass("full-screen-mode") !== fullScreenMode;
        super.setFullScreenMode(fullScreenMode, showLeftPaneInFullScreenMode);

        // Toggling full screen may require a redraw/layout of controls such as the virtualized Change Explorer grid and the
        // Monaco editor/diff that typically update on a window resize.  So, we trigger the window.resize event.
        if (fullScreenChanged) {
            $(window).trigger("resize");
        }
    }

    protected _dispose(): void {
        if (this._versionControlShortcutGroup) {
            this._versionControlShortcutGroup.removeShortcutGroup();
            this._versionControlShortcutGroup = null;
        }

        if (this._$emptyRepositoryContainer && this._$emptyRepositoryContainer[0]) {
            ReactDOM.unmountComponentAtNode(this._$emptyRepositoryContainer[0]);
        }

        super._dispose();
    }

    private _setSearchAdapter(): void {
        // The search adapters self-register as long as we reference the modules so that they're actually imported.
        VCChangesetSearchAdapter.ChangesetSearchAdapter.getTypeName();
        VCShelvesetSearchAdapter.ShelvesetSearchAdapter.getTypeName();
        this._setCommitSearchAdapterRepository();
    }

    private _setCommitSearchAdapterRepository() {
        let $adapterElement: JQuery,
            adapter: VCCommitSearchAdapter.CommitSearchAdapter;

        $adapterElement = $(".vc-search-adapter-commits");
        if ($adapterElement.length) {
            adapter = <VCCommitSearchAdapter.CommitSearchAdapter>Controls.Enhancement.ensureEnhancement(VCCommitSearchAdapter.CommitSearchAdapter, $adapterElement);
            adapter.setRepository(<GitRepositoryContext>this._repositoryContext);
        }
    }

    public _showSecurityPermissions(path: string, description: string) {
        VSS.using(["Admin/Scripts/TFS.Admin.Security"], (_TFS_Admin_Security: typeof TFS_Admin_Security_NO_REQUIRE) => {
            const repositorySecurityManager = _TFS_Admin_Security.SecurityManager.create(this._options.repositoryPermissionSet, {
                    projectGuid: this._projectGuid
                });

            if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                const repositoryToken = "repoV2/" + this._projectGuid + "/" + this._repositoryContext.getRepositoryId();
                repositorySecurityManager.showPermissions(repositoryToken, (<GitRepositoryContext>this._repositoryContext).getRepository().name);
            }
            else {
                repositorySecurityManager.showPermissions(path, description);
            }
        });
    }

    protected _showEmptyRepositoryView(parent?: JQuery) {

        //overwrite how much space we leave at the top
        //to have the experience dedicated to the empty repo.
        $(".hub-view.explorer .right-hub-content")
            .addClass("top-of-page");

        this._getViewTitle().hide();
        this.setLeftHubPaneVisibility(false);
        if (this._options.tabs) {
            this.setHubPivotVisibility(false);
        }

        if (!parent) {
            parent = $(domElem("div"));
            this.appendElement(parent);
        }

        this._$emptyRepositoryContainer = parent;

        showEmptyRepository(
            parent[0],
            document,
            this._options.activeImportRequest,
            this._repositoryContext as GitRepositoryContext,
            this._tfsContext,
            this._projectInfo,
            this._options.sshEnabled,
            this._options.sshUrl,
            this._options.cloneUrl);
    }

    public _updateUserDefaultBranchName(versionSpec: VCSpecs.VersionSpec) {
        let settingsSvc: TFS_WebSettingsService.WebSettingsService,
            branchName: string;

        if (versionSpec instanceof VCSpecs.GitBranchVersionSpec) {
            branchName = (<VCSpecs.GitBranchVersionSpec>versionSpec).branchName;
            this._defaultGitBranchName = branchName;
            VersionControlRegistryPath.setUserDefaultBranchSetting(branchName, this._repositoryContext);
        }
    }

    public _getFriendlyPathTitle(path: string): string {
        /// <summary>Get the file name portion of a version control path.</summary>
        /// <param name="path" type="String">VC item server path</param>
        /// <returns type="String">Friendly file name</returns>

        let fileOrFolderName = (path + "").replace(/\/+$/, ""); // Trim ending slash
        fileOrFolderName = VersionControlPath.getFileName(fileOrFolderName);

        if (!fileOrFolderName || Utils_String.localeIgnoreCaseComparer(path, this._repositoryContext.getRootPath()) === 0) {
            if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                return (<GitRepositoryContext>this._repositoryContext).getRepository().name;
            }
            else {
                return this._options.tfsContext.navigation.project || "";
            }
        }

        return fileOrFolderName;
    }

    public _getFriendlyPathForTooltip(path: string): string {
        if (!path || Utils_String.localeIgnoreCaseComparer(path, this._repositoryContext.getRootPath()) === 0) {
            if (this._repositoryContext.getRepositoryType() === RepositoryType.Git) {
                return (<GitRepositoryContext>this._repositoryContext).getRepository().name;
            }
            else {
                return this._options.tfsContext.navigation.project || "";
            }
        }

        return path;
    }

    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {

        if (this._emptyRepository && Utils_String.localeIgnoreCaseComparer(tabId, currentTabId) !== 0) {
            // Empty repository - only show the currently selected tab
            return false;
        }

        return true;
    }
}
