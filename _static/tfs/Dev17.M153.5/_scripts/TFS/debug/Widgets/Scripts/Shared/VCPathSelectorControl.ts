import Dashboards_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsField, SettingsFieldOptionsForJQueryElement } from "Dashboards/Scripts/SettingsField";

import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import GitRestClient = require("TFS/VersionControl/GitRestClient");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TfvcRestClient = require("TFS/VersionControl/TfvcRestClient");
import VCContracts = require("TFS/VersionControl/Contracts");

import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {GitClientService} from "VersionControl/Scripts/GitClientService"
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import VCGitRepositorySelectorMenu = require("VersionControl/Scripts/Controls/GitRepositorySelectorMenu");
import VCGitVersionSelectorControl = require("VersionControl/Scripts/Controls/GitVersionSelectorControl");
import VCGitVersionSelectorMenu = require("VersionControl/Scripts/Controls/GitVersionSelectorMenu");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSourceExplorerTree = require("VersionControl/Scripts/Controls/SourceExplorerTree");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import VSS_Service = require("VSS/Service");
import Controls = require("VSS/Controls");
import PopupContent = require("VSS/Controls/PopupContent");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");

export interface VCPathInformation {
    path: string;
    repositoryId: string;
    version: string;
}

// This is an odd interface, it talks about the Path selector but the options is for a composite controls.
export interface VCPathSelectorOptions extends Dashboards_Contracts.ConfigurationControlOptions<VCPathInformation> {
    /**
     * Return true if item should be shown in the control, false if it should be hidden
     */
    filter?: (item: VCLegacyContracts.ItemModel) => boolean;
    /**
     * Return true if item can be selected, false if it can't be (for folders, it will open the folder)
     */
    onBeforeSelect?: (item: RepositoryContext | VCLegacyContracts.ItemModel) => boolean;

    clickToggles?: boolean;

    /**
    * custom watermark to show if the path is not available. 
    */
    customWatermark?: string;

    /**
    * custom error message to show when a path validation fails. 
    */
    customErrorMessage?: string;

    /**
    * custom validator for a path selection within the control.
    */
    pathSelectionValidator?: (path: string) => boolean;

    /**
    * if true, then hide source path selection options for git
    */
    hideGitPathSelector?: boolean;
}

// this is not a shareable control. It is a composite control that is doing too many things. We should have each control seperately and provide
// affordance on validators and event management or shared patterns that others can use. 
export class PathSelectorControl extends Controls.Control<VCPathSelectorOptions>{
    private static DomClass_RepoSelectorContainer = "repo-selector-container";
    private static DomClass_BranchSelectorContainer = "branch-selector-container";
    private static DomClass_PathSelectorContainer = "path-selector-container";

    public _VCsettings: VCPathInformation;
    private _controlOptions: VCPathSelectorOptions;

    public _hostTfsContext: TFS_Host_TfsContext.TfsContext;
    public _projectInfo: VCContracts.VersionControlProjectInfo;
    public _selectedRepoType: RepositoryType;

    public _gitRepoSelector: GitRepositorySelectorMenu;
    public _gitBranchSelector: GitVersionSelectorMenu;
    public _pathSelector: PathSelectorMenu;

    public _repoFieldSet: SettingsField<Controls.Control<any>>;
    public _branchFieldSet: SettingsField<Controls.Control<any>>;
    public _pathFieldSet: SettingsField<Controls.Control<any>>;

    constructor(options: VCPathSelectorOptions) {
        super(options);
        this._VCsettings = <VCPathInformation>$.extend({},options.initialValue);
    }

    /**
     * Returns a version spec for the default branch of the given repo or null if the default is not set for the repo
     */
    public _getRepoDefaultVersion(repository: VCContracts.GitRepository): VCSpecs.GitBranchVersionSpec {
        var defaultVersion = null;

        if (repository.defaultBranch) {
            // Strip the unnecessary info from the branch name
            // ex. "refs/heads/master" becomes "master"
            var defaultBranchName = repository.defaultBranch.replace("refs/heads/", "");
            defaultVersion = new VCSpecs.GitBranchVersionSpec(defaultBranchName);
        }
        return defaultVersion;
    }

    /**
     * Updates the repo ID of the configuration and calls for the branch selector to update its selected branch
     */
    public _onRepoChanged(selectedRepo: VCContracts.GitRepository): void {
        var repoContext: RepositoryContext;

        // Until GitRepositorySelectorMenu is updated to return something other than GitRepository we have no way to tell what kind of repo
        // we have selected unless we look at the name of the repo. Only TFVC is allowed to use $ in its name.
        if (TFS_Widget_Utilities.VersionControlHelper.GetRepoType(selectedRepo.name) != RepositoryType.Tfvc) {
            repoContext = GitRepositoryContext.create(selectedRepo, this._hostTfsContext);
            this._selectedRepoType = RepositoryType.Git;

            // Change the context of the branch selector
            // This involves querying the server for the branches in the repo so we use a callback for setting the selected branch
            this._gitBranchSelector.setRepositoryWithCallback(<GitRepositoryContext>repoContext, (items: VCSpecs.GitBranchVersionSpec[]) => {
                // Update the config
                this._VCsettings.repositoryId = selectedRepo.id;

                // Use the default if it is set. Otherwise use the first branch         
                var versionSpec = this._getRepoDefaultVersion(selectedRepo);
                if (!versionSpec && items.length > 0) {
                    versionSpec = items[0];
                }

                // This does NOT fire a change event (only selecting from the popup itself does that), so we need to call onBranchChanged ourselves
                this._gitBranchSelector.setSelectedItem(versionSpec);
                this._branchFieldSet.showElement();
                this._onBranchChanged(versionSpec);

                this._gitRepoSelector.focus();
            });
        }
        else {
            this._branchFieldSet.hideElement();
            this._VCsettings.repositoryId = null;
            this._VCsettings.version = null;
            this._selectedRepoType = RepositoryType.Tfvc;
            repoContext = TfvcRepositoryContext.create(this._hostTfsContext, true);

            this._pathSelector.setRepoAndVersion(repoContext, null);
            this._pathSelector.setSelectedNode(this._pathSelector.getRootPathNode());
        }
    }

    /**
     * Updates the version of the configuration and calls for the path selector to update its selected path
     */
    public _onBranchChanged(selectedVersion: VCSpecs.GitBranchVersionSpec): void {
        var versionString = selectedVersion ? selectedVersion.toVersionString() : null;

        // Update the config
        this._VCsettings.version = versionString;

        var repository = this._gitRepoSelector.getSelectedRepository();
        var repoContext = GitRepositoryContext.create(repository, this._hostTfsContext);

        // Change the context for the path selector and set the path to the root path
        this._pathSelector.setRepoAndVersion(repoContext, versionString);

        // The change event for path will be fired if node is valid.
        // We need to manually call the handler for the invalid case.
        var node = versionString ? this._pathSelector.getRootPathNode() : null;
        this._pathSelector.setSelectedNode(node);
        if (!node) {
            this._onSourceItemPathChange(node);
        }
        this._gitBranchSelector.focus();
    }

    /**
     * Updates the path of the configuration, validates the config, and notifies live preview of the change to the config
     */
    public _onSourceItemPathChange(selectedNode?: any): void {
        // Update the config
        this._VCsettings.path = selectedNode ? selectedNode.path : null;
        if (this._options.onChange) {
            this._options.onChange();
        }
    }

    /**
     * Returns a dummy GitRepository to be inserted into the GitRepositorySelectorMenu
     * @returns Dummy GitRepository with name set to $/<project name>
     */
    public _createTfvcRepoMenuItem(): VCContracts.GitRepository {
        return <VCContracts.GitRepository>{ name: TFS_Widget_Utilities.VersionControlHelper.TfvcPathRoot + (this._hostTfsContext.contextData.project.name) };
    }

    public _clearValidationStates(): void {
        this._repoFieldSet.hideError();
        this._branchFieldSet.hideError();
        this._pathFieldSet.hideError();
    }

    /**
     * Adds the repo selector to the container argument
     */
    public _createRepositorySelectorIn($container: JQuery): GitRepositorySelectorMenu {
        // Make an entry for TFVC if we're in hybrid mode (GIT and TFVC)
        var tfvcRepository: VCContracts.GitRepository;
        if (!!this._projectInfo.supportsGit && !!this._projectInfo.supportsTFVC) {
            tfvcRepository = this._createTfvcRepoMenuItem();
        }

        // Set the selected entry to TFVC if we're configured to it
        var initialSelectedRepository: VCContracts.GitRepository;
        if (this._VCsettings.path != null && (this._VCsettings.path.indexOf(TFS_Widget_Utilities.VersionControlHelper.TfvcPathRoot) == 0)) {
            initialSelectedRepository = tfvcRepository;
        }

        var gitRepoMenu = <GitRepositorySelectorMenu>Controls.BaseControl.createIn<GitRepositorySelectorMenuOptions>(
            GitRepositorySelectorMenu,
            $container, {
                tfsContext: this._hostTfsContext,
                projectId: this._hostTfsContext.contextData.project.id,
                projectInfo: this._projectInfo,
                showRepositoryActions: false, // Don't allow creating/modifying repos from the popup
                onItemChanged: Utils_Core.delegate(this, this._onRepoChanged),
                tfvcRepository: tfvcRepository,
                initialSelectedItem: initialSelectedRepository,
                showItemIcons: true
            } as GitRepositorySelectorMenuOptions);

        return gitRepoMenu;
    }

    /**
     * Adds the branch selector to the container argument
     */
    public _createBranchSelectorIn($container: JQuery, project: TFS_Core_Contracts.TeamProjectReference): GitVersionSelectorMenu {
        var gitBranchMenu = <GitVersionSelectorMenu>Controls.BaseControl.createIn(
            GitVersionSelectorMenu,
            $container, {
                onItemChanged: Utils_Core.delegate(this, this._onBranchChanged),
                showVersionActions: false, // Don't allow creating/modifying branches from the popup
                disableTags: true, // We only want branches. No tags.
                // Create blank default repo to allow the base control to work - base version selector control now requires a repository context
                repositoryContext: GitRepositoryContext.create(<VCContracts.GitRepository>{
                    _links: "",
                    defaultBranch: "",
                    id: "",
                    name: "",
                    project: project,
                    remoteUrl: "",
                    url: ""
                }, this._hostTfsContext)
            });

        return gitBranchMenu;
    }

    /**
     * Adds the path selector to the container argument
     */
    public _createPathSelectorIn($container: JQuery): PathSelectorMenu {
        var pathMenu = <PathSelectorMenu>Controls.BaseControl.createIn(
            PathSelectorMenu,
            $container, {
                initialRepoType: this._selectedRepoType,
                onSourceItemPathChange: Utils_Core.delegate(this, this._onSourceItemPathChange),
                filter: this._options.filter,
                onBeforeSelect: this._options.onBeforeSelect,
                clickToggles: this._options.clickToggles,
                customWatermark: this._options.customWatermark
            });

        return pathMenu;
    }

    /**
     * Creates and adds the controls used for configuration by a git repo
     */
    public _createControls(project: TFS_Core_Contracts.TeamProjectReference): void {
        // Create Repo Menu
        var $repoMenuContainer = $("<div>").addClass(PathSelectorControl.DomClass_RepoSelectorContainer);
        this._gitRepoSelector = this._createRepositorySelectorIn($repoMenuContainer);
        this._repoFieldSet = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.CodeScalar_ConfigurationRepositoryLabel,
            initialErrorMessage: Resources.CodeScalar_ConfigurationNoRepositorySelected,
        }, $repoMenuContainer);

        // Create Branch Menu
        var $branchMenuContainer = $("<div>").addClass(PathSelectorControl.DomClass_BranchSelectorContainer);
        this._gitBranchSelector = this._createBranchSelectorIn($branchMenuContainer,project);
        this._branchFieldSet = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.CodeScalar_ConfigurationBranchLabel,
            initialErrorMessage: Resources.CodeScalar_ConfigurationNoBranchSelected,
        }, $branchMenuContainer);
        
        // Create Path Tree
        var $pathTreeContainer = $("<div>").addClass(PathSelectorControl.DomClass_PathSelectorContainer);
        this._pathSelector = this._createPathSelectorIn($pathTreeContainer);
        this._pathFieldSet = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.CodeScalar_ConfigurationPathLabel,
            initialErrorMessage: this._options.customErrorMessage || Resources.CodeScalar_ConfigurationNoPathSelected,
            labelTargetElement: this._pathSelector.getSourceExplorerMenuElement()
        }, $pathTreeContainer);

        // Add the controls to the config blade
        this.getElement()
            .append(this._repoFieldSet.getElement())
            .append(this._branchFieldSet.getElement())
            .append(this._pathFieldSet.getElement());
    }

    /**
     * Sets the selections of the controls based upon the saved widget configuration in the order: repo, branch, path.
     * Failing to set a control cascades down to remaining controls and unsets the configuration for those controls.
     * For example, failing to set branch means path doesn't get set, and the version and path fields of the configuration
     * would be emptied.
     */
    public _setInitialStateForGitControlsUsingConfiguration(repository: VCContracts.GitRepository): void {
        // Set initial selections
        if (repository) {
            // Set initial repo selection
            this._gitRepoSelector.setSelectedRepository(repository);

            // Get branch name from version
            var branchSpec: VCSpecs.GitBranchVersionSpec = <VCSpecs.GitBranchVersionSpec>VCSpecs.VersionSpec.parse(this._VCsettings.version);

            // Set initial branch selection
            var repoContext = GitRepositoryContext.create(repository, this._hostTfsContext);
            this._gitBranchSelector.setRepositoryWithCallback(repoContext, (items) => {
                // Set the initial selection if it exists in the list of branches
                if (branchSpec && items.some((value) => { return value.branchName == branchSpec.branchName; })) {
                    this._gitBranchSelector.setSelectedVersion(branchSpec);
                }
                // Branch wasn't found in the list. Clear the branch and path portions of the settings.
                else {
                    this._VCsettings.version = null;
                    this._VCsettings.path = null;
                }

                // Set initial path selection
                if (this._VCsettings.version) {
                    this._pathSelector.setRepoAndVersion(repoContext, this._VCsettings.version);

                    if (this._VCsettings.path) {
                        this._pathSelector.setSelectedPath(this._VCsettings.path, () => {
                            // Path wasn't found. Clear the path portion of the settings.
                            this._VCsettings.path = null;
                        });
                    }
                }
            });
        }
        else {
            // We don't have a repository. Clear all settings.
            this._VCsettings = <VCPathInformation>{};
        }
    }

    /**
     * Sets the selections of the controls based upon defaults in the order: repo, branch, path.
     * First repo is set either to the user's default repo, or if that fails then the first repo of the project.
     * Branch is set to the first branch of the selected repo. Path is set to the root path for a Git repo.
     * Failing to set a control cascades down to remaining controls.  For example, failing to set branch means path doesn't get set.
     * Controls that do get set have their field in the configuration set. So for example, if repo is successfully set, repoId will
     * be set in the configuration.
     */
    public _setInitialStateForGitControlsUsingDefaults(): void {
        // Clear all settings
        this._VCsettings = <VCPathInformation>{};

        // Try to use the user default repo
        if (this._hostTfsContext.navigation.project) {
            var gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(this._hostTfsContext).getService<GitClientService>(GitClientService);

            gitClient.beginGetUserDefaultRepository(this._hostTfsContext.navigation.project, (repository: VCContracts.GitRepository) => {
                if (repository) {
                    this._gitRepoSelector.setSelectedRepository(repository);
                    this._onRepoChanged(repository);
                }
            });
        }
        // Use the first repo instead
        else {
            var gitRestClient = GitRestClient.getClient();
            var repositoriesPromise = gitRestClient.getRepositories(this._hostTfsContext.contextData.project.id, false);

            repositoriesPromise.then((repositories: VCContracts.GitRepository[]) => {
                if (repositories && repositories.length > 0) {
                    // Use first repo in list
                    this._gitRepoSelector.setSelectedRepository(repositories[0]);
                    this._onRepoChanged(repositories[0]);
                }
            });
        }
    }

    /**
     * Sets up the artifact ID and sets up the config controls
     */
    public initializeForGit(): void {
        // The widget is configured, so we can look up the repo info directly
        this._selectedRepoType = RepositoryType.Git;

        if (this._VCsettings && this._VCsettings.repositoryId && this._VCsettings.version && this._VCsettings.path) {
            var gitRestClient = GitRestClient.getClient();

            var repositoryPromise = gitRestClient.getRepository(this._VCsettings.repositoryId);

            repositoryPromise.then((repository: VCContracts.GitRepository) => {
                this._setInitialStateForGitControlsUsingConfiguration(repository);
            }, () => {
                this._setInitialStateForGitControlsUsingConfiguration(null);
            });
        }
        // The widget is unconfigured or only partially configured, so we'll use defaults
        else {
            this._setInitialStateForGitControlsUsingDefaults();
        }
    }

    /**
     * Sets up the artifact ID and sets up the config controls
     */
    public initializeForTfvc(): void {
        // Set initial selection
        // Use the root path if path has not been set
        this._selectedRepoType = RepositoryType.Tfvc;

        var repoContext = TfvcRepositoryContext.create(this._hostTfsContext);
        if (!this._VCsettings.path) {
            this._VCsettings.path = repoContext.getRootPath();
            if (this._options.onChange) {
                this._options.onChange();
            }
        }
        this._pathSelector.setRepoAndVersion(repoContext, null);
        this._pathSelector.setSelectedPath(this._VCsettings.path);

        this.getElement().append(this._pathFieldSet.getElement());
    }

    /**
     * Returns true if repo ID is set or the project uses TFVC
     */
    private _isRepoIdValid(): boolean {
        return this._selectedRepoType == RepositoryType.Tfvc || !!this._VCsettings.repositoryId;
    }

    /**
     * Returns true if the version is set or the project uses TFVC
     */
    private _isVersionValid(): boolean {
        return this._selectedRepoType == RepositoryType.Tfvc || !!this._VCsettings.version;
    }

    public getCurrentSettings(): VCPathInformation {
        return <VCPathInformation>$.extend({}, this._VCsettings);
    }

    /**
     * Returns true if a valid path is set
     */
    private _isPathValid(): boolean {
        if ($.isFunction(this._options.pathSelectionValidator) && this._VCsettings.path) {
            return this._options.pathSelectionValidator(this._VCsettings.path);
        }
        else {
            return !!this._VCsettings.path;
        }
    }

    /**
     * Returns true if all parts of the artifact ID are valid for the project
     */
    public isValid(): boolean {
        return this._isRepoIdValid() && this._isVersionValid() && this._isPathValid();
    }

    public validate(): boolean {
        if(this._selectedRepoType == RepositoryType.Git) {
            this._repoFieldSet.toggleError(!this._isRepoIdValid());
            this._branchFieldSet.toggleError(!this._isVersionValid());
        }
        this._pathFieldSet.toggleError(!this._isPathValid());

        return this.isValid();
    }

    /**
     * Extends options for the control
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "vcconfiguration-container"
        }, options));
    }

    /**
    * Initializes the widget configuration
    */
    public initialize() {
        super.initialize();

        this._hostTfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        var tfvcRestClient = VSS_Service.getClient(TfvcRestClient.TfvcHttpClient2_2);
        var projInfoPromise = tfvcRestClient.getProjectInfo(this._hostTfsContext.contextData.project.id);
        projInfoPromise.then((projInfo: VCContracts.VersionControlProjectInfo) => {
            this._projectInfo = projInfo;

            this._createControls(projInfo.project);

            var isHybrid: boolean = !!this._projectInfo.supportsGit && !!this._projectInfo.supportsTFVC;

            if (isHybrid) {
                var isConfiguredForTfvc: boolean = (this._VCsettings.path != null)
                    && TFS_Widget_Utilities.VersionControlHelper.GetRepoType(this._VCsettings.path) == RepositoryType.Tfvc;

                if (isConfiguredForTfvc) {
                    this._branchFieldSet.hideElement();
                    this.initializeForTfvc();
                }
                else {
                    this.initializeForGit();
                }
            }
            else if (this._projectInfo.supportsTFVC) {
                this._repoFieldSet.hideElement();
                this._branchFieldSet.hideElement();
                this.initializeForTfvc();
            }
            else {
                if (this._options && this._options.hideGitPathSelector) {
                    this._pathFieldSet.hideElement();
                }

                this.initializeForGit();
            }
        });
    }
}

export class GitRepositoryBasedSelectorMenu extends VCGitRepositorySelectorMenu.GitRepositorySelectorMenu {
    /**
     * This method is used to determine what to show on the menu selector.
     * We're overriding the parent behavior to show text when no repo is selected.
     */
    public _getItemDisplayText(item: any): string {
        if (item) {
            return super._getItemDisplayText(item);
        }
        else {
            return Resources.NoRepoSelectedText;
        }
    }

    public initialize() {
        super.initialize();
    }

    public initializeOptions(options?: GitRepositorySelectorMenuOptions) {
        super.initializeOptions($.extend({
            popupOptions: {
                leftOffsetPixels: -1 // The popup is positioned relative to the menu area above it excluding the border. We need to move left 1px to align
            },
            chevronClass: "bowtie-chevron-down-light",
        }, options));
    }
}


export interface GitRepositorySelectorMenuOptions extends VCGitRepositorySelectorMenu.GitRepositorySelectorMenuOptions { }

export class GitRepositorySelectorMenu extends GitRepositoryBasedSelectorMenu {

    /**
     * We don't want to initialize the selected repo when the control is created
     * so we can use conditional logic elsewhere to choose the repo
     * and avoid unnecessary web traffic
     */
    protected initializeSelectedRepository() { }

    public initialize() {
        super.initialize();
    }

    public initializeOptions(options?: GitRepositorySelectorMenuOptions) {
        super.initializeOptions(options);
    }
}

export interface GitVersionSelectorMenuOptions extends VCGitVersionSelectorMenu.GitVersionSelectorMenuOptions {
    repositoryContext: GitRepositoryContext;
}

export class GitVersionSelectorMenu extends VCGitVersionSelectorMenu.GitVersionSelectorMenu {
    public static DomClass_BranchIcon = "bowtie-icon bowtie-tfvc-branch";

    /**
     * Used to create the GitVersionSelectorControl earlier than after showing the popup for the first time
     */
    private _initializePopupContent() {
        // Normally the GitVersionSelectorControl doesn't get created/populated until the user clicks the GitVersionSelectorMenu showing the popup.
        // In our case the GitVersionSelectorControl needs to be created before then because if the user switches repositories without opening
        // the branch dropdown menu, we need this control to get populated with the branches of the selected repository.
        var popup = this._getPopupEnhancement();
        popup.setHtmlContent(popup._options.content.call(popup));
    }

    public initialize() {
        super.initialize();        
    }

    public initializeOptions(options?: GitVersionSelectorMenuOptions) {
        super.initializeOptions($.extend({
            popupOptions: {
                leftOffsetPixels: -1 // The popup is positioned relative to the menu area above it excluding the border. We need to move left 1px to align
            }
        }, options));
        if (options) {
            this._repositoryContext = options.repositoryContext;
        }
    }

    /**
     * Creates the backing control that retrieves the branches to show in the popup.
     * We want to override this to use our custom GitVersionSelectorControl.
     */
    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        return <GitVersionSelectorControl>Controls.Enhancement.enhance<GitVersionSelectorControlOptions>(
            GitVersionSelectorControl,
            $container, {
                repositoryContext: this._repositoryContext,
                disableTags: (this._options ? this._options.disableTags : null),
                showVersionActions: this._options.showVersionActions,
                allowUnmatchedSelection: this._options.popupOptions.allowUnmatchedSelection,
            });
    }

    /**
     * Used to get the icon that should be shown next to the selected item's text.
     * We want to always show the branch icon even when no branch is selected.
     */
    public _getItemIconClass(item: any): string {
        var itemIconClass = super._getItemIconClass(item);

        // This happens when the item is undefined/null which
        // means that nothing is selected. Since this is a branch selector,
        // let's default to the branch icon for the "Select a branch..." text.
        if (typeof itemIconClass == "undefined") {
            itemIconClass = GitVersionSelectorMenu.DomClass_BranchIcon;
        }

        return itemIconClass;
    }

    /**
     * Setting the repository also retrieves the branches for the backing control.
     * Passing in a callback allows us to take action after those branches have been retrieved.
     */
    public setRepositoryWithCallback(repositoryContext: GitRepositoryContext, callback: (items: VCSpecs.GitBranchVersionSpec[]) => void) {
        this._repositoryContext = repositoryContext;
        if (!this.getFilteredList()) {
            this._initializePopupContent();
        }
        if (this.getFilteredList()) {
            (<GitVersionSelectorControl>this.getFilteredList()).setRepositoryWithCallback(repositoryContext, callback);
        }
    }
}

export interface GitVersionSelectorControlOptions extends VCGitVersionSelectorControl.GitVersionSelectorControlOptions { }

export class GitVersionSelectorControl extends VCGitVersionSelectorControl.GitVersionSelectorControl {
    public _setRepoCallback: (items: any[]) => void;
    public _setRepoWithCallbackCalled: boolean;

    /**
     * We want to override this to allow us to hook in a custom callback once the branches are retrieved from the server.
     */
    public _beginGetListItems(tabId: string, callback: (items: any[]) => void) {
        var expandedCallback = this.getExtendedCallback(callback);

        super._beginGetListItems(tabId, expandedCallback);
    }

    public getExtendedCallback(callback: (items: any[]) => void): (items: any[]) => void {
        var expandedCallback = callback;

        if (this._setRepoWithCallbackCalled && $.isFunction(this._setRepoCallback)) {
            var setRepoCallback = this._setRepoCallback; // Copy
            expandedCallback = (items: any[]) => {
                callback(items);
                setRepoCallback(items);
            }
            this._setRepoWithCallbackCalled = false;
        }

        return expandedCallback;
    }

    /**
     * Setting the repository also retrieves the branches.
     * Passing in a callback allows us to take action after those branches have been retrieved.
     */
    public setRepositoryWithCallback(repositoryContext: GitRepositoryContext, callback: (items: VCSpecs.GitBranchVersionSpec[]) => void) {
        this._setRepoCallback = callback;
        this._setRepoWithCallbackCalled = true;
        this.setRepository(repositoryContext);
    }
}

export interface PathSelectorMenuOptions {
    popupOptions: any;
    onSourceItemPathChange: (selectedNode: any) => void;
    initialRepoType: RepositoryType;
    filter: (item: VCLegacyContracts.ItemModel) => boolean;
    onBeforeSelect?: (item: RepositoryContext | VCLegacyContracts.ItemModel) => boolean;
    clickToggles: boolean;
    customWatermark?: string;
}

export class PathSelectorMenu extends Controls.Control<PathSelectorMenuOptions> {
    private static DomClass_MenuContainer = "path-dropdown-menu";
    private static DomClass_MenuText = "path-text";
    private static DomClass_SourceTree = "source-explorer-tree";
    private static DomClass_EmptyTree = "empty-tree";
    private static DomClass_TreeWrapper = "tree-wrapper";
    private static DomClass_TreePopup = "tree-popup";

    private static JQuerySelector_MenuContainer = "." + PathSelectorMenu.DomClass_MenuContainer;
    private static JQuerySelector_MenuText = "." + PathSelectorMenu.DomClass_MenuText;
    private static JQuerySelector_SourceTree = "." + PathSelectorMenu.DomClass_SourceTree;

    public _showEmptyDropdown: boolean;
    private _repoType: RepositoryType;
    public _sourceExplorerTree: SourceExplorerTree;
    private _$sourceExplorerPath: JQuery;
    private _$sourceExplorerMenu: JQuery;
    public _$emptyExplorerTree: JQuery;
    private _popupEnhancement: PopupContent.PopupContentControl;

    /**
     * Creates the menu dropdown in the container argument
     */
    private _createMenuIn($container: JQuery): JQuery {
        var $sourceExplorerContainer = $("<div>")
            .addClass(PathSelectorMenu.DomClass_MenuContainer)
            .attr("role", "combobox")
            .attr("aria-haspopup", "tree")
            .attr("aria-expanded","false");

        // Path text
        this._$sourceExplorerPath = $("<span>").addClass(PathSelectorMenu.DomClass_MenuText);
        $sourceExplorerContainer.append(this._$sourceExplorerPath);

        // Arrow icon
        $sourceExplorerContainer.append($("<span>").addClass("drop-icon bowtie-icon bowtie-chevron-down-light"));

        $container.append($sourceExplorerContainer);

        return $sourceExplorerContainer;
    }

    private _bindKeyboardAccessibility($element: JQuery) {
        $element.attr("tabindex", 0);

        // Copied from FilteredListDropdownMenu and modified
        $element.bind("keydown", (e) => {
            switch (e.keyCode) {
                case Utils_UI.KeyCode.DOWN:
                    this._updateTreeVisibility();
                    this._popupEnhancement.show();
                    return false;
                case Utils_UI.KeyCode.UP:
                case Utils_UI.KeyCode.ESCAPE:
                    this._popupEnhancement.hide();
                    return false;
                case Utils_UI.KeyCode.ENTER:
                case Utils_UI.KeyCode.SPACE:
                    this._updateTreeVisibility();
                    this._popupEnhancement.toggle();
                    this._$sourceExplorerMenu.focus();
                    return false;
            }
        });
    }

    /**
     * Creates the source explorer tree in the container argument
     */
    private _createSourceExplorerTreeIn($container: JQuery): SourceExplorerTree {
        return <SourceExplorerTree>Controls.BaseControl.createIn(
            SourceExplorerTree,
            $container, {
                showFavorites: false,
                filter: this._options.filter,
                onBeforeSelect: this._options.onBeforeSelect,
                clickToggles: this._options.clickToggles
            });
    }

    /**
     * Creates the empty path message element in the container argument
     */
    private _createEmptyExplorerTreeIn($container: JQuery) {
        var $emptyTree = $("<div>")
            .addClass(PathSelectorMenu.DomClass_SourceTree)
            .addClass(PathSelectorMenu.DomClass_EmptyTree)
            .text(Resources.CodeScalar_ConfigurationSelectRepositoryAndBranch);

        $container.append($emptyTree);
        return $emptyTree;
    }

    private _createPopup($content: JQuery, $element: JQuery): PopupContent.PopupContentControl {
        return <PopupContent.PopupContentControl>Controls.Enhancement.enhance(PopupContent.PopupContentControl,
            $element,
            $.extend({
                cssClass: PathSelectorMenu.DomClass_TreePopup,
                content: () => { return $content; },
                menuContainer: $element.parent(),
                leftOffsetPixels: -1 // The popup is positioned relative to the menu area above it excluding the border. We need to move left 1px to align
            }, this._options.popupOptions));
    }

    /**
     * Updates the menu text
     */
    private _setMenuText(path: string) {
        if (!this._$sourceExplorerPath) {
            this._$sourceExplorerPath = this._$sourceExplorerMenu.find(PathSelectorMenu.JQuerySelector_MenuText);
        }

        this._$sourceExplorerPath.text(path);
        Utils_UI.tooltipIfOverflow(this._$sourceExplorerPath.get(0), { titleText: path });
    }

    /**
     * When the selected path is changed, set the text of the menu and hide the source explorer.
     * If there is a handler set in the options, call that too.
     */
    private _bindOnItemPathChanged() {
        var eventType = "source-item-path-changed";

        this._sourceExplorerTree._bind(eventType, (e?: any, selectedNode?: any) => {
            this._setMenuText(selectedNode.path);
            this._popupEnhancement.hide();

            if ($.isFunction(this._options.onSourceItemPathChange)) {
                this._options.onSourceItemPathChange(selectedNode);
            }

            this._$sourceExplorerMenu.focus();
        });
    }

    /**
     * Show the path selector only if we're fully configured, otherwise show the empty tree div
     */
    public _updateTreeVisibility(): void {
        if (this._showEmptyDropdown) {
            this._sourceExplorerTree.hideElement();
            this._$emptyExplorerTree.show();
        }
        else {
            this._$emptyExplorerTree.hide();
            this._sourceExplorerTree.showElement();
            this._sourceExplorerTree.focus();
        }
    }

    private _setRepoType(repoContext: RepositoryContext) {
        this._repoType = repoContext.getRepositoryType();
    }

    public setRepoAndVersion(repoContext: RepositoryContext, selectedVersion: string) {
        this._setRepoType(repoContext);
        this._showEmptyDropdown = (this._repoType != RepositoryType.Tfvc) && (!repoContext || !repoContext.getRepository() || !selectedVersion);

        this._sourceExplorerTree.setRepositoryAndVersion(repoContext, selectedVersion, false);
    }

    /**
     * Retrieves item info about the path from the server and sets the selected item in the source explorer tree
     * that matches. If the call to retrieve the item info fails, the path selector menu displays the text for when
     * no path is selected.
     * @param {string} path - The path to select
     * @param { () => void } errorHandler - A handler that gets called if this function fails to retrieve the path item info
     */
    public setSelectedPath(path: string, errorHandler?: () => void) {
        this._setMenuText(path);
        this._sourceExplorerTree.setSelectedItemPath(path, false, (error) => {
            this._setMenuText(this._options.customWatermark || Resources.CodeScalar_ConfigurationSelectAPath);

            if ($.isFunction(errorHandler)) {
                errorHandler();
            }
        });
    }

    public setSelectedNode(node) {
        this._sourceExplorerTree.setSelectedNode(node, false);

        if (!node) {
            this._setMenuText(this._options.customWatermark || Resources.CodeScalar_ConfigurationSelectAPath);
        }
    }

    public getRootPathNode(): any {
        return this._sourceExplorerTree.rootNode.children[0]; // The root of our path is the repo node which is the child of the actual root node
    }

    public initializeOptions(options?: PathSelectorMenuOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "path-selector",
            showFavorites: false
        }, options));
    }

    public initialize() {
        // Create menu
        this._$sourceExplorerMenu = this._createMenuIn(this.getElement());
        this._setMenuText(this._options.customWatermark || Resources.CodeScalar_ConfigurationSelectAPath);
        this._repoType = this._options.initialRepoType;
        this._showEmptyDropdown = this._repoType != RepositoryType.Tfvc;

        // Create tree
        var $treeWrapper = $("<div>").addClass(PathSelectorMenu.DomClass_TreeWrapper);
        this._sourceExplorerTree = this._createSourceExplorerTreeIn($treeWrapper);
        this._$emptyExplorerTree = this._createEmptyExplorerTreeIn($treeWrapper);

        // Create popup enhancement
        this._popupEnhancement = this._createPopup($treeWrapper, this.getElement());
        this._popupEnhancement._bind("popup-opened", () => this._onPopupStateChange(true));
        this._popupEnhancement._bind("popup-closed", () => this._onPopupStateChange(false));

        // Bind event handlers
        this._bindOnItemPathChanged();
        this._$sourceExplorerMenu.on("click", () => { this._updateTreeVisibility(); });
        this._bindKeyboardAccessibility(this._$sourceExplorerMenu);
        $treeWrapper.keydown((e) => {
            if (e.keyCode == Utils_UI.KeyCode.ESCAPE) {
                this._popupEnhancement.hide();
                this._$sourceExplorerMenu.focus();
            }
        });
    }

    public getSourceExplorerMenuElement(): JQuery {
        return this._$sourceExplorerMenu;
    }

    private _onPopupStateChange(isOpen: boolean) {
        this._$sourceExplorerMenu.attr("aria-expanded", isOpen.toString());
    }
}

export interface SourceExplorerTreeOptions extends VCSourceExplorerTree.SourceExplorerTreeOptions {
    filter: (item: VCLegacyContracts.ItemModel) => boolean;
    onBeforeSelect?: (item: RepositoryContext | VCLegacyContracts.ItemModel) => boolean;
}

export class SourceExplorerTree extends VCSourceExplorerTree.Tree {

    public _filter: (item: VCLegacyContracts.ItemModel) => boolean;
    private _onBeforeSelect: (item: RepositoryContext | VCLegacyContracts.ItemModel) => boolean;

    /**
     * Populates the parent node with its children.
     * We want to override this so we can filter out anything that isn't a folder.
     */
    protected _populateChildItems(parentNode, childItems: VCLegacyContracts.ItemModel[]) {
        super._populateChildItems(parentNode, SourceExplorerTree.getFilteredItems(childItems, this._filter));
    }

    public static getFilteredItems(
            childItems: VCLegacyContracts.ItemModel[]
            , filter: (item: VCLegacyContracts.ItemModel) => boolean
        ): VCLegacyContracts.ItemModel[] {
        // Get the children that are folders only
        var filteredChildItems: VCLegacyContracts.ItemModel[] = [];
        for (var i = childItems.length - 1; i >= 0; i--) {
            if (!filter || filter(childItems[i])) {
                filteredChildItems.push(childItems[i]);
            }
        }
        return filteredChildItems;
    }

    public initializeOptions(options?: SourceExplorerTreeOptions) {
        super.initializeOptions($.extend({
            contextMenu: null // Turn off context menu
        }, options));

        this._filter = options.filter;
        this._onBeforeSelect = options.onBeforeSelect;
    }

    public onItemClick(node: VCSourceExplorerTree.SourceExplorerTreeNode, nodeElement: any, e?: JQueryEventObject): any {

        if (this._options.clickToggles) {
            if (this._toggle(node, nodeElement)) {
                return false;
            }
        }

        if (this._options.clickSelects && (!this._onBeforeSelect || this._onBeforeSelect(node.tag))) {
            this.setSelectedNode(node);
        }
    };

}
