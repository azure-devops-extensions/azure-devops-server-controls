/// <reference types="jquery" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!AdminView' />

import * as ReactDOM from "react-dom";
import Controls = require("VSS/Controls");
import Navigation_Services = require("VSS/Navigation/Services");
import Navigation = require("VSS/Controls/Navigation");
import Menus = require("VSS/Controls/Menus");
import Panels = require("VSS/Controls/Panels");
import VSS = require("VSS/VSS");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import VCContracts = require("TFS/VersionControl/Contracts");
import VCAdminRepositoryOptionsControl = require("VersionControl/Scripts/Controls/AdminRepositoryOptionsControl");
import VCAdminGitRepositoriesTree = require("VersionControl/Scripts/Controls/AdminGitRepositoriesTree");
import { getBranchesUrl, getNewBranchPolicyAdminUrl } from "VersionControl/Scripts/VersionControlUrls";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCSourceExplorerTree = require("VersionControl/Scripts/Controls/SourceExplorerTree");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import VCCreateRepositoryDialogShower = require("VersionControl/Scripts/Controls/CreateRepositoryDialogShower");
import { renderSearchBranchUX, updateSearchBranchUX } from "VersionControl/Scripts/Components/SearchBranchPolicy/SearchBranchPolicy";

import { renderVCOptions } from "VersionControl/Scenarios/VCAdmin/Components/VCAdminContainer";
import { GitClientService } from "VersionControl/Scripts/GitClientService";

let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;
let TfsContext = TFS_Host_TfsContext.TfsContext;

export module ActionIds {
    export let Security = "security";
    export let Options = "options";
    export let Policy = "policy";
}

export function GetRepositoryToken(parsedState: any): string {
    let repositoryToken: string;

    repositoryToken = "repoV2/" + parsedState.projectGuid + "/";
    if (parsedState.repository) {
        repositoryToken += parsedState.repository.id;
        // Replace "/" in ref with "^" to form the token. This logic needs to stay in sync with GitUtils.CalculateSecurable
        if (parsedState.branchName) {
            repositoryToken += "/refs^heads^" + parsedState.branchName.replace(/\//g, "^") + "/";
        } else if (parsedState.tagGroup) {
            repositoryToken += "/refs^tags/";
        } else if (parsedState.branchGroup) {
            repositoryToken += "/refs^heads/";
        }
    } else if (parsedState.explicitPath) {
        repositoryToken = parsedState.itemPath;
    }

    return repositoryToken;
}

class AdminSecurityTab extends Navigation.NavigationViewTab {

    private _ajaxPanel: Panels.AjaxPanel;

    public onNavigate(rawState: any, parsedState: any) {
        /// <summary>
        /// Called whenever navigation occurs with this tab as the selected tab
        /// </summary>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>

        let repositoryToken: string,
            title: string;

        if (this._ajaxPanel) {
            this._ajaxPanel.dispose();
            this._ajaxPanel = null;
        }

        if (parsedState.repository) {
            if (parsedState.branchGroup) {
                title = VCResources.Branches;
            } 
            else if (parsedState.tagGroup) {
                title = VCResources.AdminPage_GitTree_allTags;
            }
            else if (parsedState.branchName) {
                title = Utils_String.format(VCResources.BranchSecurityTitleFormat, parsedState.repository.name, parsedState.branchName);
            }
            else {
                title = Utils_String.format(VCResources.RepositorySecurityTitleFormat, parsedState.repository.name);
            }
        } else if (!parsedState.explicitPath) {
            title = Utils_String.format(VCResources.GitProjectSecurityTitleFormat, parsedState.projectInfo.project.name);
        } else {
            title = Utils_String.format(VCResources.ProjectSecurityTitle, parsedState.itemPath);
        }

        repositoryToken = GetRepositoryToken(parsedState);

        this._ajaxPanel = <Panels.AjaxPanel>Controls.BaseControl.createIn(Panels.AjaxPanel, this._element, {
            tfsContext: TfsContext.getDefault(),
            url: TfsContext.getDefault().getActionUrl("index", "security", { area: "admin" }),
            urlParams: {
                permissionSet: parsedState.repositoryPermissionSet,
                token: repositoryToken,
                tokenDisplayVal: title,
                style: "min",
                controlManagesFocus: false
            }
        });

        this._options.navigationView.setViewTitle(title);
        CustomerIntelligenceData.publishFirstTabView("AdminSecurityTab", parsedState, this._options);
    }
}

class AdminOptionsTab extends Navigation.NavigationViewTab {

    // new up a RepositoryOptionsControl

    private _repositoryOptions: VCAdminRepositoryOptionsControl.RepositoryOptionsControl;
    private static SEARCH_CODE_ENTITY_CONTRIBUTION = "ms.vss-code-search.code-entity-type";
    private _searchBranchUXContainer: JQuery;
    private _maxNoOfConfigurableBranchesForSearch: number;
    private _adminOptionsContainer: JQuery;

    public initialize() {
        super.initialize();

        let tfsContext = TfsContext.getDefault();
        this._repositoryOptions = <VCAdminRepositoryOptionsControl.RepositoryOptionsControl>Controls.BaseControl.createIn(VCAdminRepositoryOptionsControl.RepositoryOptionsControl, this._element, {
            tfsContext: tfsContext
        });
        
        this._adminOptionsContainer = $(domElem('div')).appendTo(this._element).addClass('vc-repository-option-info');

        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessSearchMultiBranchConfigurationUX, false)) {
            this._searchBranchUXContainer = $(domElem('div')).appendTo(this._element).addClass('search-branch-list');
            this._maxNoOfConfigurableBranchesForSearch = (Utils_Core.parseJsonIsland($(document), ".max-configurable-branches-search"));
            renderSearchBranchUX(this._searchBranchUXContainer[0], null, this._maxNoOfConfigurableBranchesForSearch);
        }

    }

    public onNavigate(rawState: any, parsedState: any) {
        /// <summary>
        /// Called whenever navigation occurs with this tab as the selected tab
        /// </summary>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>

        let vcView: any = this._options.navigationView;
        let title = parsedState.projectInfo.project.name;

        // set up the default rendering state, which mostly consists of hiding everything, so we can
        // then show the correct controls
        ReactDOM.unmountComponentAtNode(this._adminOptionsContainer[0]);
        this._adminOptionsContainer.hide();
        this._repositoryOptions.hideElement();
        this.drawSearchBranchUX(null);

        if (parsedState.gitRepositoryContext) {
            // if we are on the root node of a repository (not a branch or the tags group)
            if (parsedState.repository && !parsedState.branchName && !parsedState.tagGroup && !parsedState.branchGroup) {
                title = Utils_String.format(VCResources.ProjectOptionsTitle, parsedState.repository.name);
                renderVCOptions(this._adminOptionsContainer[0], parsedState.gitRepositoryContext);
                this._adminOptionsContainer.show();

                // Draw search branch policies UX
                this.drawSearchBranchUX(parsedState.gitRepositoryContext);
            }
        }
        else if (parsedState.repoGroup) {
            title = VCResources.GitProjectOptionsTitle;
            this._adminOptionsContainer.show();

            // create a 'null' repo context, since we don't have a repo context
            let repoContext: GitRepositoryContext = GitRepositoryContext.create(null, null);
            renderVCOptions(this._adminOptionsContainer[0], repoContext);
        }
        else if (parsedState.tfvcRepositoryContext) {
            title = Utils_String.format(VCResources.ProjectOptionsTitle, parsedState.itemPath);
            
            renderVCOptions(this._adminOptionsContainer[0], parsedState.tfvcRepositoryContext);
            this._adminOptionsContainer.show();
        }

        this._options.navigationView.setViewTitle(title);
        CustomerIntelligenceData.publishFirstTabView("AdminOptionsTab", parsedState, this._options);
    }

    private drawSearchBranchUX(repositoryContext: any) {
        // Draw search branch policies UX when featureflag is ON
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessSearchMultiBranchConfigurationUX, false)) {
            var isRepoForksEnabled: boolean = FeatureAvailabilityService.isFeatureEnabled("Git.Forks", false);
            updateSearchBranchUX(repositoryContext, isRepoForksEnabled);
        }
    }
}

class AdminPolicyTab extends Navigation.NavigationViewTab {
    public onNavigate(rawState: any, parsedState: any) {
        /// <summary>
        /// Called whenever navigation occurs with this tab as the selected tab
        /// </summary>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>

        let title: string;
        let tfsContext = TfsContext.getDefault();

        if (parsedState.gitRepositoryContext && parsedState.branchName) {
            // Git repo and a branch name on URL: can show policies
            title = Utils_String.format(VCResources.CodePolicyTitleFormat, parsedState.repository.name, parsedState.branchName);

            const policyAdminUrl = getNewBranchPolicyAdminUrl(parsedState.gitRepositoryContext, parsedState.branchName);

            window.location.replace(policyAdminUrl);

            return;
        }

        this._options.navigationView.setViewTitle(title);
        CustomerIntelligenceData.publishFirstTabView("AdminPolicyTab", parsedState, this._options);
    }
}

export class AdminView extends Navigation.TabbedNavigationView {

    private _projectInfo: VCContracts.VersionControlProjectInfo;
    private _defaultGitRepositoryId: string;
    private _tfvcContext: RepositoryContext;
    private _gitContexts: RepositoryContext[];
    private _gitRepositories: VCContracts.GitRepository[];
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _projectGuid: string;
    private _projectUri: string;
    private _tfsRepositoryPermissionSet: string;
    private _gitRepositoryPermissionSet: string;
    private _sourceExplorerTree: VCSourceExplorerTree.Tree;
    private _repositoriesControl: VCAdminGitRepositoriesTree.GitRepositoriesAdminTree;
    private _menuBar: Menus.MenuBar;
    private _customerIntelligenceData: CustomerIntelligenceData;

    private _gitTreeSelected: boolean = true;
    private _isInitialLoad: boolean = true;
    private _showAllBranchesExperience: boolean;

    public initializeOptions(options?: any) {

        let tabs = {};

        this._projectInfo = options.projectVersionControlInfo;
        this._projectGuid = options.projectGuid;
        this._projectUri = options.projectUri;
        this._defaultGitRepositoryId = options.defaultGitRepositoryId;
        this._gitRepositories = options.gitRepositories;
        this._tfsContext = options.tfsContext || TfsContext.getDefault();
        this._tfsRepositoryPermissionSet = options.tfsRepositoryPermissionSet;
        this._gitRepositoryPermissionSet = options.gitRepositoryPermissionSet;

        tabs[ActionIds.Security] = AdminSecurityTab;
        tabs[ActionIds.Options] = AdminOptionsTab;
        tabs[ActionIds.Policy] = AdminPolicyTab;

        super.initializeOptions($.extend({
            tabs: tabs,
            hubContentSelector: ".vc-admin-right-pane",
            pivotTabsSelector: ".vc-admin-tabs"
        }, options));
    }

    public initialize() {
        let $leftPane = this._element.find(".vc-admin-left-pane");
        let $repoPane = $leftPane.find(".vc-admin-left-pane-repositories");
        let $treePane = $(domElem("div", "vc-admin-left-pane-tfvc"));
        let menuItems: Menus.IMenuItemSpec[] = [];
        let featureAvailabilityService = <FeatureAvailabilityService>TFS_OM_Common.Application.getConnection(TFS_Host_TfsContext.TfsContext.getDefault()).getService(FeatureAvailabilityService);

        this._tfvcContext = TfvcRepositoryContext.create();
        this._customerIntelligenceData = new CustomerIntelligenceData();
        this._customerIntelligenceData.setView(CustomerIntelligenceConstants.ADMIN_VIEW);

        if (this._projectInfo.supportsTFVC) {
            this._createSourceExplorerTree($treePane);
            this._customerIntelligenceData.properties["supportsTfvc"] = true;
        }
        $repoPane.append($treePane);

        $treePane = $(domElem("div", "vc-admin-left-pane-git"));
        $repoPane.append($treePane);

        if (this._projectInfo.supportsGit) {
            if (featureAvailabilityService) {
                this._showAllBranchesExperience = !featureAvailabilityService.isFeatureEnabledLocal(FeatureAvailabilityFlags.WebAccessVersionControlShowSelectedBranchAdminView, false);
            }

            this._gitContexts = $.map(this._gitRepositories, (gitRepository: VCContracts.GitRepository) => {
                return GitRepositoryContext.create(gitRepository);
            });

            this.createRepositoriesControl();
            this._customerIntelligenceData.properties["supportsGit"] = true;
        }

        let $newRepo = $leftPane.find(".vc-admin-left-pane-toolbar");

        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $newRepo, {
            items: [{
                id: "new-repository",
                text: VCResources.CreateNewRepositoryLinkText,
                noIcon: true,
                action: delegate(this, this._createRepository)
            }]
        });

        $newRepo.show();
        this._customerIntelligenceData.publish(CustomerIntelligenceConstants.ADMIN_VIEW + ".FirstView", true);

        super.initialize();
    }

    private _createSourceExplorerTree($container: JQuery) {
        if (!this._sourceExplorerTree) {
            this._sourceExplorerTree = <VCSourceExplorerTree.Tree>Controls.Enhancement.enhance(VCSourceExplorerTree.Tree, $container, {
                disableCollapseOnClick: true,
                showFavorites: false,
                contextMenu: null
            });

            this._sourceExplorerTree._bind("source-item-path-changed", (e?: any, args?: any) => {
                if (this._repositoriesControl) {
                    this._gitTreeSelected = false;
                    this._repositoriesControl.setSelectedNode(null);

                    if (this._showAllBranchesExperience) {
                        this._repositoriesControl.expandNextClick();
                    }
                }

                this._customerIntelligenceData.clone().publish(CustomerIntelligenceConstants.ADMIN_VIEW_TREE_TFVC_PATH);
                this._navigateToContext(null, null, args.path);
            });
        }
    }

    private _createRepository() {
        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, CustomerIntelligenceConstants.ADMIN_NEW_REPO_CLICK, {}));
        VCCreateRepositoryDialogShower.show(this._projectInfo, this._tfsContext,
            $(".vc-admin-left-pane-toolbar [command=new-repository]")[0],
            (createdRepository) => {
                if (createdRepository.repoType === RepositoryType.Git) {
                    this._createdGitRepository(createdRepository.gitRepository);
                }
                else {
                    this._createdTfvcRepository();
                }
            });
    }

    private _createdGitRepository(newRepository: VCContracts.GitRepository) {
        if (this._projectInfo && !this._projectInfo.supportsTFVC) {
            this._projectInfo.supportsTFVC = false;
        }
        let telemetryProperties: { [x: string]: string } = {
            "TfvcSupported": this._projectInfo.supportsTFVC.toString()
        };

        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.ADMIN_NEW_GIT_REPO,
            telemetryProperties));

        // If this is a TFVC only project, create the repository control
        if (!this._repositoriesControl) {
            this.createRepositoriesControl()
        }

        // Refetch the project repositories
        this._repositoriesControl.refreshRepositories((repositoryContexts: RepositoryContext[]) => {
            this._gitContexts = repositoryContexts;
            this._navigateToContext(newRepository.id, null);
        });
    }

    private _createdTfvcRepository() {
        // We succeeded in creating the project folder.
        // To avoid going back to the server, assume the supportsTFVC flag is now set.
        this._projectInfo.supportsTFVC = true;
        if (this._projectInfo && !this._projectInfo.supportsGit) {
            this._projectInfo.supportsGit = false;
        }
        let telemetryProperties: { [x: string]: string } = {
            "GitSupported": this._projectInfo.supportsGit.toString()
        };

        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.ADMIN_NEW_TFVC_REPO,
            telemetryProperties));

        // Create the source explorer tree.
        let $container = this._element.find('.vc-admin-left-pane-tfvc');
        this._createSourceExplorerTree($container);

        // Show the tree.
        this._sourceExplorerTree.setRepositoryAndVersion(this._tfvcContext, null);
    }

    private createRepositoriesControl() {
        let $treePane = this._element.find(".vc-admin-left-pane-git");
        this._repositoriesControl = <VCAdminGitRepositoriesTree.GitRepositoriesAdminTree>Controls.Enhancement.enhance(VCAdminGitRepositoriesTree.GitRepositoriesAdminTree, $treePane, {
            disableCollapseOnClick: true,
            projectId: this._projectGuid,
            showAllBranchesExperience: this._showAllBranchesExperience,
            projectName: this._projectInfo.project.name,
            repositoryContexts: this._gitContexts
        });

        this._repositoriesControl._bind("selectionchanged", (e: JQueryEventObject) => {
            if (this._sourceExplorerTree) {
                this._sourceExplorerTree.setSelectedNode(null);
                this._sourceExplorerTree.expandNextClick();
            }

            let selectedNodeInfo = this._repositoriesControl.getSelectedNodeInfo(),
                selectedRepositoryContext = selectedNodeInfo ? selectedNodeInfo.repositoryContext : null,
                selectedBranchName = (selectedNodeInfo && selectedNodeInfo.branch) ? selectedNodeInfo.branch.friendlyName : null,
                tagGroupOption: boolean = (selectedNodeInfo && selectedNodeInfo.tagGroup),
                branchGroupOption: boolean = (selectedNodeInfo && selectedNodeInfo.branchGroup),
                repoGroupOption: boolean = (selectedNodeInfo && selectedNodeInfo.repoGroup);
                
            if (selectedNodeInfo) {
                if ((selectedRepositoryContext ? selectedRepositoryContext.getRepositoryId() : "") !== (this.getState().repositoryId || "") ||
                    (selectedBranchName || "") !== (this.getState().branchName || "") ||
                    tagGroupOption !== this.getState().tagGroup ||
                    !this._gitTreeSelected) {
                    this._gitTreeSelected = true;
                    this._customerIntelligenceData.clone().publish(selectedBranchName ?
                        CustomerIntelligenceConstants.ADMIN_VIEW_TREE_GIT_BRANCH : CustomerIntelligenceConstants.ADMIN_VIEW_TREE_GIT_REPOSITORY);
                    this._navigateToContext(
                        selectedRepositoryContext ? selectedRepositoryContext.getRepositoryId() : null, 
                        selectedBranchName, 
                        null, 
                        tagGroupOption, 
                        branchGroupOption,
                        repoGroupOption);
                }
            }
        });
        this._repositoriesControl._bind("repository-renamed", () => {
            this._gitContexts = this._repositoriesControl.getRepositoryContexts();
            this.refreshCurrentTab();
        });
        this._repositoriesControl._bind("repository-deleted", () => {
            this._gitContexts = this._repositoriesControl.getRepositoryContexts();
            this._navigateToContext(null, null);
        });
    }

    private displayBranchesAdminBanner(repositoryContext: GitRepositoryContext, branchName: string): void {
        this._element.find(".branches-banner").remove();

        if (repositoryContext) {
            const $hubTitle = this._element.find(".hub-title");

            const branchesUrl = getBranchesUrl(repositoryContext);
            const link = `<a href="${branchesUrl}">${VCResources.Branches}</a>`;
            const message = Utils_String.format(VCResources.AdminView_BranchesAdminBannerMessage, link);

            const $banner = $(domElem("div"))
                .addClass("branches-banner message-area-control info-message")
                .html(message);

            $banner.insertAfter($hubTitle);

            this._element.find(".right-hub-content").addClass("has-banner");
        } else {
            this._element.find(".right-hub-content").removeClass("has-banner");
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

    public parseStateInfo(action: string, rawState: any, callback: IResultCallback) {
        let state: any = {};

        this.setState(state);

        action = action || ActionIds.Security;
        state.projectInfo = this._projectInfo;
        state.projectGuid = this._projectGuid;
        state.repositoryId = rawState.repositoryId;
        state.branchName = rawState.branchName || null;
        state.tagGroup = rawState.tagGroup ? Boolean(rawState.tagGroup) : null;
        state.branchGroup = rawState.branchGroup ? Boolean(rawState.branchGroup) : null;
        state.repoGroup = rawState.repoGroup ? Boolean(rawState.repoGroup) : null;
        
        if (this._projectInfo.supportsTFVC) {
            let rootPath = this._tfvcContext.getRootPath();

            state.tfvcRepositoryContext = this._tfvcContext;
            state.itemPath = rawState.itemPath || rootPath;
            state.explicitPath = rawState.hasOwnProperty('itemPath');

            // If this is the first load and the path is the TFVC root, explicitly navigate with the TFVC root path
            if (this._isInitialLoad && !state.explicitPath && state.itemPath == rootPath && !state.repositoryId) {
                Navigation_Services.getHistoryService().replaceHistoryPoint(this.getCurrentAction(), {
                    itemPath: rootPath
                });
                return;
            }
        }

        if (state.repositoryId) {
            $.each(this._gitContexts, (i: number, repositoryContext: GitRepositoryContext) => {
                if (repositoryContext.getRepositoryId() === state.repositoryId) {
                    state.gitRepositoryContext = repositoryContext;
                    state.repository = repositoryContext.getRepository();
                    return false;
                }
            });
            if (!state.repository) {
                this.showError(Utils_String.format(VCResources.NoRepositoryByIdError, state.repositoryId));
                return;
            }

            state.repositoryPermissionSet = this._gitRepositoryPermissionSet;
        } else if (state.explicitPath) {
            state.repositoryPermissionSet = this._tfsRepositoryPermissionSet;
        } else {
            state.repositoryPermissionSet = this._gitRepositoryPermissionSet;
        }

        if (!this._showAllBranchesExperience) {
            this.displayBranchesAdminBanner(state.gitRepositoryContext, state.branchName);
        }

        this._isInitialLoad = false;
        callback(action, state);
    }

    public getTabVisibility(tabId: any, currentTabId: string, rawState: any, parsedState: any): boolean {
        switch (tabId) {
            case ActionIds.Security:
                return true;
            case ActionIds.Options:
                //Options only support Tfvc project/repository level and Git repository level 
                const isTfvcProjectLevel = parsedState.explicitPath && this._isTfvcProjectRoot(parsedState.itemPath);
                if (isTfvcProjectLevel ||
                    this._projectInfo.project && 
                    this._projectInfo.supportsGit && 
                    !parsedState.branchName && 
                    !parsedState.tagGroup && 
                    !parsedState.branchGroup) {
                    return true;
                }
                break;
            case ActionIds.Policy:
                //Policy only support Git branch level
                if (this._projectInfo.supportsGit && parsedState.branchName) {
                    return true;
                }
                break;
        }

        return false;
    }

    public onNavigate(state: any) {
        if (this._sourceExplorerTree && state.itemPath) {
            this._sourceExplorerTree.setRepositoryAndVersion(state.tfvcRepositoryContext, null);
        }

        if (state.explicitPath) {
            this._gitTreeSelected = false;
            this._sourceExplorerTree.setSelectedItemPath(state.itemPath);
            if (this._repositoriesControl) {
                this._repositoriesControl.setSelectedNode(null);
            }
        } else {
            this._gitTreeSelected = true;
            this._repositoriesControl.setSelectedRepositoryContext(
                state.gitRepositoryContext,
                state.branchName,
                state.tagGroup,
                state.branchGroup);
        }

        const isTfvcProjectLevelOrInGitRepository = (state.explicitPath && this._isTfvcProjectRoot(state.itemPath)) || state.repository;
    }

    private _navigateToContext(repositoryId: string, branchName: string, itemPath?: string, tagGroup?: boolean, branchGroup?: boolean, repoGroup?: boolean) {
        let action = this.getCurrentAction();

        if (Utils_String.localeIgnoreCaseComparer(action, ActionIds.Options) === 0) {
            if (repoGroup !== true) {
                if (branchName
                    || tagGroup
                    || (!this._isTfvcProjectRoot(itemPath) && !repositoryId)) {
                    // Right now, options are not supported for branches, all tags, all branches node
                    action = ActionIds.Security;
                }
            }
        }

        if (Utils_String.localeIgnoreCaseComparer(action, ActionIds.Policy) === 0) {
            if (!branchName) {
                // Right now, policy is only supported at the git branches
                action = ActionIds.Security;
            }
        }

        Navigation_Services.getHistoryService().addHistoryPoint(action, {
            repositoryId: repositoryId || null,
            branchName: branchName || null,
            itemPath: itemPath || null,
            tagGroup: tagGroup || null,
            branchGroup: branchGroup || null,
            repoGroup: repoGroup || null,
        });
    }

    private _isTfvcProjectRoot(path: string): boolean {
        return path && this._projectInfo.supportsTFVC && this._tfvcContext.getRootPath() === path;
    }
}
VSS.classExtend(AdminView, TfsContext.ControlExtensions);

Controls.Enhancement.registerEnhancement(AdminView, ".vc-admin-view");

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.VersionControl.AdminView", exports);
