import BladeConfiguration = require("Dashboards/Scripts/BladeConfiguration");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import { SettingsField, SettingsFieldOptionsForJQueryElement } from "Dashboards/Scripts/SettingsField";

import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");

import GitRestClient = require("TFS/VersionControl/GitRestClient");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TfvcRestClient = require("TFS/VersionControl/TfvcRestClient");
import VCContracts = require("TFS/VersionControl/Contracts");
import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
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

import Controls = require("VSS/Controls");
import PopupContent = require("VSS/Controls/PopupContent");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS_Service = require("VSS/Service");

import Base = require("Widgets/Scripts/VSS.Control.BaseWidgetConfiguration");
import CodeScalar = require("Widgets/Scripts/CodeScalar");
import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import WidgetLiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import VCPathSelectorControl = require("Widgets/Scripts/Shared/VCPathSelectorControl");

var TfsContext = TFS_Host_TfsContext.TfsContext;

export class CodeScalarConfiguration extends Base.BaseWidgetConfiguration<Dashboard_Shared_Contracts.WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {
    private static DomClass_RepoSelectorContainer = "repo-selector-container";
    private static DomClass_BranchSelectorContainer = "branch-selector-container";
    private static DomClass_PathSelectorContainer = "path-selector-container";
    
    private static DefaultWidgetName = Resources.CodeScalar_DefaultWidgetName; //TODO: Extract from WidgetMetadata

    private _hostTfsContext: TFS_Host_TfsContext.TfsContext;
    private _widgetSettings: CodeScalar.ICodeScalarWidgetSettings;
    private _projectInfo: VCContracts.VersionControlProjectInfo;
    private _selectedRepoType: RepositoryType;

    private _liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;

    private _gitRepoSelector: VCPathSelectorControl.GitRepositorySelectorMenu;
    private _gitBranchSelector: CodeScalarGitVersionSelectorMenu;
    private _pathSelector: CodeScalarPathSelectorMenu;

    private _$repoFieldSet: SettingsField<Controls.Control<any>>;
    private _$branchFieldSet: SettingsField<Controls.Control<any>>;
    private _$pathFieldSet: SettingsField<Controls.Control<any>>;

    private newWidgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;

    constructor(options: any) {
        super(options);
    }

    /**
     * Notifies live preview that the configuration changed and sends the current artifact ID
     */
    private _notifyConfigurationChange(): void {   
        this.setupValidationState();  
        if (this._isValid()) {
            this.newWidgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, WidgetHelpers.WidgetEvent.Args(this._getCustomSettings()));
        }
    }

    /**
     * Returns the stringified JSON widget Settings
     */
    private _getWidgetSettingsAsString(): string {
        return JSON.stringify(this._widgetSettings);
    }

    private _updateLiveTitle(): void {
        // It would be helpful, if we could get the updated name from the widget, but until then we use the below logic
        var widgetName = this._widgetSettings.path;
        if (this._selectedRepoType == RepositoryType.Git && this._widgetSettings.path == '/') {
            // Root folder, so use the repo name 
            widgetName = this._gitRepoSelector.getSelectedRepository().name;
        } else {
            // Not a Root folder, so get the folder name
            var folderNamePosition = widgetName.lastIndexOf('/');
            if (folderNamePosition > -1) {
                widgetName = widgetName.substring(widgetName.lastIndexOf('/') + 1);
            }
        }

        // In case of Git, append the branch name in parenthesis
        if (this._selectedRepoType == RepositoryType.Git) {
            widgetName += ' (' + (this._gitBranchSelector.getSelectedVersion() as any).toDisplayText() + ')';
        }

        this._liveTitleState.updateTitleOnLatestArtifact(this.configureName, widgetName);
        this._liveTitleState.appendToSettings(this._widgetSettings);
    }

    /**
     * Returns a version spec for the default branch of the given repo or null if the default is not set for the repo
     */
    private _getRepoDefaultVersion(repository: VCContracts.GitRepository): VCSpecs.GitBranchVersionSpec {
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
    private _onRepoChanged(selectedRepo: VCContracts.GitRepository): void {
        var repoContext: RepositoryContext;

        // Until GitRepositorySelectorMenu is updated to return something other than GitRepository we have no way to tell what kind of repo
        // we have selected unless we look at the name of the repo. Only TFVC is allowed to use $ in its name.
        if (TFS_Widget_Utilities.VersionControlHelper.GetRepoType(selectedRepo.name) == RepositoryType.Git)
        {
            repoContext = GitRepositoryContext.create(selectedRepo, this._hostTfsContext);
            this._selectedRepoType = RepositoryType.Git;

            // Change the context of the branch selector
            // This involves querying the server for the branches in the repo so we use a callback for setting the selected branch
            this._gitBranchSelector.setRepositoryWithCallback(<GitRepositoryContext>repoContext, (items: VCSpecs.GitBranchVersionSpec[]) => {
                // Update the config
                this._widgetSettings.repositoryId = selectedRepo.id;

                // Use the default if it is set. Otherwise use the first branch         
                var versionSpec = this._getRepoDefaultVersion(selectedRepo);
                if (!versionSpec && items.length > 0) {
                    versionSpec = items[0];
                }

                // This does NOT fire a change event (only selecting from the popup itself does that), so we need to call onBranchChanged ourselves
                this._gitBranchSelector.setSelectedItem(versionSpec);
                this._$branchFieldSet.showElement();
                this._onBranchChanged(versionSpec);
            });
        }
        else {
            this._$branchFieldSet.hideElement();
            this._widgetSettings.repositoryId = null;
            this._widgetSettings.version = null;
            this._selectedRepoType = RepositoryType.Tfvc;
            repoContext = TfvcRepositoryContext.create(this._hostTfsContext, true);

            this._pathSelector.setRepoAndVersion(repoContext, null);
            this._pathSelector.setSelectedNode(this._pathSelector.getRootPathNode());
        }
    }

    /**
     * Updates the version of the configuration and calls for the path selector to update its selected path
     */
    private _onBranchChanged(selectedVersion: VCSpecs.GitBranchVersionSpec): void {
        var versionString = selectedVersion ? selectedVersion.toVersionString() : null;

        // Update the config
        this._widgetSettings.version = versionString;

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
    }

    /**
     * Updates the path of the configuration, validates the config, and notifies live preview of the change to the config
     */
    private _onSourceItemPathChange(selectedNode?: any): void {
        // Update the config
        this._widgetSettings.path = selectedNode ? selectedNode.path : null;

        // NOTE: Since this is the last in the chain of possible changes, we need to notify about the change if we're valid
        this._clearValidationStates();
        if (this._isValid()) {
            this._updateLiveTitle();
            this._notifyConfigurationChange();
        }
    }

    /**
     * Returns a dummy GitRepository to be inserted into the GitRepositorySelectorMenu
     * @returns Dummy GitRepository with name set to $/<project name>
     */
    private _createTfvcRepoMenuItem(): VCContracts.GitRepository {
        return <VCContracts.GitRepository>{ name: TFS_Widget_Utilities.VersionControlHelper.TfvcPathRoot + (this.tfsContext.project.name) };
    }

    /**
     * Adds the repo selector to the container argument
     */
    private _createRepositorySelectorIn($container: JQuery): VCPathSelectorControl.GitRepositorySelectorMenu {
        // Make an entry for TFVC if we're in hybrid mode (GIT and TFVC)
        var tfvcRepository: VCContracts.GitRepository;
        if (!!this._projectInfo.supportsGit && !!this._projectInfo.supportsTFVC) {
            tfvcRepository = this._createTfvcRepoMenuItem();
        }

        // Set the selected entry to TFVC if we're configured to it
        var initialSelectedRepository: VCContracts.GitRepository;
        if (this._widgetSettings.path != null && (this._widgetSettings.path.indexOf(TFS_Widget_Utilities.VersionControlHelper.TfvcPathRoot) == 0)) {
            initialSelectedRepository = tfvcRepository;
        }

        var gitRepoMenu = <VCPathSelectorControl.GitRepositorySelectorMenu>Controls.BaseControl.createIn<VCPathSelectorControl.GitRepositorySelectorMenuOptions>(
            VCPathSelectorControl.GitRepositorySelectorMenu,
            $container, {
                tfsContext: this._hostTfsContext,
                projectId: this.tfsContext.project.id,
                projectInfo: this._projectInfo,
                showRepositoryActions: false, // Don't allow creating/modifying repos from the popup
                onItemChanged: Utils_Core.delegate(this, this._onRepoChanged),
                tfvcRepository: tfvcRepository,
                initialSelectedItem: initialSelectedRepository,
                showItemIcons: true
            } as VCPathSelectorControl.GitRepositorySelectorMenuOptions);

        return gitRepoMenu;
    }

    /**
     * Adds the branch selector to the container argument
     */
    private _createBranchSelectorIn($container: JQuery, project: TFS_Core_Contracts.TeamProjectReference): CodeScalarGitVersionSelectorMenu {
        var gitBranchMenu = <CodeScalarGitVersionSelectorMenu>Controls.BaseControl.createIn(
            CodeScalarGitVersionSelectorMenu,
            $container, {
                onItemChanged: Utils_Core.delegate(this, this._onBranchChanged),
                showVersionActions: false, // Don't allow creating/modifying branches from the popup
                disableTags: true, // We only want branches. No tags.
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
    private _createPathSelectorIn($container: JQuery): CodeScalarPathSelectorMenu {
        var pathMenu = <CodeScalarPathSelectorMenu> Controls.BaseControl.createIn(
            CodeScalarPathSelectorMenu,
            $container, {
                initialRepoType: this._selectedRepoType,
                onSourceItemPathChange: Utils_Core.delegate(this, this._onSourceItemPathChange)
            });

        return pathMenu;
    }

    /**
     * Creates and adds the controls used for configuration by a git repo
     */
    private _createControls(project: TFS_Core_Contracts.TeamProjectReference): void {
        // Create Repo Menu
        var $repoMenuContainer = $("<div>").addClass(CodeScalarConfiguration.DomClass_RepoSelectorContainer);
        this._gitRepoSelector = this._createRepositorySelectorIn($repoMenuContainer);
        this._$repoFieldSet = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.CodeScalar_ConfigurationRepositoryLabel,
            initialErrorMessage: Resources.CodeScalar_ConfigurationNoRepositorySelected,
        }, $repoMenuContainer);

        // Create Branch Menu
        var $branchMenuContainer = $("<div>").addClass(CodeScalarConfiguration.DomClass_BranchSelectorContainer);
        this._gitBranchSelector = this._createBranchSelectorIn($branchMenuContainer, project);
        this._$branchFieldSet = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.CodeScalar_ConfigurationBranchLabel,
            initialErrorMessage: Resources.CodeScalar_ConfigurationNoBranchSelected,
        }, $branchMenuContainer);
        
        // Create Path Tree
        var $pathTreeContainer = $("<div>").addClass(CodeScalarConfiguration.DomClass_PathSelectorContainer);
        this._pathSelector = this._createPathSelectorIn($pathTreeContainer);
        this._$pathFieldSet = SettingsField.createSettingsFieldForJQueryElement({
            labelText: Resources.CodeScalar_ConfigurationPathLabel,
            initialErrorMessage: Resources.CodeScalar_ConfigurationNoPathSelected,
            labelTargetElement: this._pathSelector.getSourceExplorerMenuElement(),
        }, $pathTreeContainer);

        // Add the controls to the config blade
        this.getElement()
            .append(this._$repoFieldSet.getElement())
            .append(this._$branchFieldSet.getElement())
            .append(this._$pathFieldSet.getElement());
    }

    /**
     * Sets the selections of the controls based upon the saved widget configuration in the order: repo, branch, path.
     * Failing to set a control cascades down to remaining controls and unsets the configuration for those controls.
     * For example, failing to set branch means path doesn't get set, and the version and path fields of the configuration
     * would be emptied.
     */
    private _setInitialStateForGitControlsUsingConfiguration(repository: VCContracts.GitRepository): void {
        // Set initial selections
        if (repository) {
            // Set initial repo selection
            this._gitRepoSelector.setSelectedRepository(repository);

            // Get branch name from version
            var branchSpec: VCSpecs.GitBranchVersionSpec = <VCSpecs.GitBranchVersionSpec>VCSpecs.VersionSpec.parse(this._widgetSettings.version);

            // Set initial branch selection
            var repoContext = GitRepositoryContext.create(repository, this._hostTfsContext);
            this._gitBranchSelector.setRepositoryWithCallback(repoContext, (items) => {
                // Set the initial selection if it exists in the list of branches
                if (branchSpec && items.some((value) => { return value.branchName == branchSpec.branchName; })) {
                    this._gitBranchSelector.setSelectedVersion(branchSpec);
                }
                // Branch wasn't found in the list. Clear the branch and path portions of the settings.
                else {
                    this._widgetSettings.version = null;
                    this._widgetSettings.path = null;
                }

                // Set initial path selection
                if (this._widgetSettings.version) {
                    this._pathSelector.setRepoAndVersion(repoContext, this._widgetSettings.version);

                    if (this._widgetSettings.path) {
                        this._pathSelector.setSelectedPath(this._widgetSettings.path, () => {
                            // Path wasn't found. Clear the path portion of the settings.
                            this._widgetSettings.path = null;
                        });
                    }
                }
            });
        }
        else {
            // We don't have a repository. Clear all settings.
            this._widgetSettings = <CodeScalar.ICodeScalarWidgetSettings>{};
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
    private _setInitialStateForGitControlsUsingDefaults(): void {
        // Clear all settings
        this._widgetSettings = <CodeScalar.ICodeScalarWidgetSettings>{};

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
            var repositoriesPromise = gitRestClient.getRepositories(this.tfsContext.project.id, false);

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
    private initializeForGit(): void {
        // The widget is configured, so we can look up the repo info directly
        this._selectedRepoType = RepositoryType.Git;

        if (this._widgetSettings && this._widgetSettings.repositoryId && this._widgetSettings.version && this._widgetSettings.path) {
            var gitRestClient = GitRestClient.getClient();

            var repositoryPromise = gitRestClient.getRepository(this._widgetSettings.repositoryId);

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
    private initializeForTfvc(): void {
        // Set initial selection
        // Use the root path if path has not been set
        this._selectedRepoType = RepositoryType.Tfvc;

        var repoContext = TfvcRepositoryContext.create(this._hostTfsContext);
        if (!this._widgetSettings.path) {
            this._widgetSettings.path = repoContext.getRootPath();
            this._notifyConfigurationChange();
        }
        this._pathSelector.setRepoAndVersion(repoContext, null);
        this._pathSelector.setSelectedPath(this._widgetSettings.path);

        this.getElement().append(this._$pathFieldSet.getElement());
    }

    /**
     * Returns true if repo ID is set or the project uses TFVC
     */
    private _isRepoIdValid(): boolean {
        return this._selectedRepoType == RepositoryType.Tfvc || !!this._widgetSettings.repositoryId;
    }

    /**
     * Returns true if the version is set or the project uses TFVC
     */
    private _isVersionValid(): boolean {
        return this._selectedRepoType == RepositoryType.Tfvc || !!this._widgetSettings.version;
    }

    /**
     * Returns true if the path is set
     */
    private _isPathValid(): boolean {
        return !!this._widgetSettings.path;
    }

    /**
     * Returns true if all parts of the artifact ID are valid for the project
     */
    private _isValid(): boolean {
        return this._isRepoIdValid() && this._isVersionValid() && this._isPathValid();
    }

    /**
     * Hides validation error messages and enables the save button
     */
    private _clearValidationStates(): void {
        this._$repoFieldSet.hideError();
        this._$branchFieldSet.hideError();
        this._$pathFieldSet.hideError();
    }

    /**
     * Validates the widget configuration for Save
     * AND ensure any errors are visible
     * @returns {string} : The error message OR null if no error message 
     */
    public setupValidationState(): void {
        if (this._selectedRepoType == RepositoryType.Git) {
            this._$repoFieldSet.toggleError(!this._isRepoIdValid());
            this._$branchFieldSet.toggleError(!this._isVersionValid());
        }
        this._$pathFieldSet.toggleError(!this._isPathValid());
    }

    /**
     * Extends options for the control
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "codescalarconfiguration-container vcconfiguration-container"
        }, options));
    }

    /**
    * Initializes the widget configuration
    */
    public initialize() {
        super.initialize();
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public load(widgetSettings: WidgetContracts.WidgetSettings,
        widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {
        
        this.newWidgetConfigurationContext = widgetConfigurationContext;

        var unparsedConfiguration = widgetSettings.customSettings;
        this._widgetSettings = JSON.parse(unparsedConfiguration.data) || {}; // Set to an empty JSON object if the config is null

        this._hostTfsContext = TfsContext.getDefault();

        var tfvcRestClient = VSS_Service.getClient(TfvcRestClient.TfvcHttpClient2_2);
        var projInfoPromise = tfvcRestClient.getProjectInfo(this.tfsContext.project.id);
        return projInfoPromise.then((projInfo: VCContracts.VersionControlProjectInfo) => {
            this._projectInfo = projInfo;

            this._createControls(projInfo.project);

            //Create liveTitle editor state. We'll update whenever selection changes occur.
            this._liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(this._widgetSettings, CodeScalarConfiguration.DefaultWidgetName);

            var isHybrid: boolean = !!this._projectInfo.supportsGit && !!this._projectInfo.supportsTFVC;

            if (isHybrid) {
                var isConfiguredForTfvc: boolean = (this._widgetSettings.path != null)
                    && (this._widgetSettings.path.indexOf(TFS_Widget_Utilities.VersionControlHelper.TfvcPathRoot) == 0);

                if (isConfiguredForTfvc) {
                    this._$branchFieldSet.hideElement();
                    this.initializeForTfvc();
                }
                else {
                    this.initializeForGit();
                }
            }
            else if (this._projectInfo.supportsTFVC) {
                this._$repoFieldSet.hideElement();
                this._$branchFieldSet.hideElement();
                this.initializeForTfvc();
            }
            else {
                this.initializeForGit();
            }

            return WidgetHelpers.WidgetStatusHelper.Success();

        }, (e) => {
            var error: string = TFS_Widget_Utilities.ErrorParser.stringifyError(e);
            return WidgetHelpers.WidgetStatusHelper.Failure(error);
        });
    }

    public _getCustomSettings(): WidgetContracts.CustomSettings {        
        return { data: this._getWidgetSettingsAsString() };
    }

    /**
     * @implements {WidgetContracts.IWidgetConfiguration}
     */
    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        this.setupValidationState();

        if (this._isValid()) {
            return WidgetHelpers.WidgetConfigurationSave.Valid(this._getCustomSettings());
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }   
    }
    
}

SDK.VSS.register("dashboards.codeScalarConfiguration", () => CodeScalarConfiguration);
SDK.registerContent("dashboards.codeScalarConfiguration-init", (context) => {
    return Controls.create(CodeScalarConfiguration, context.$container, context.options);
});

export interface CodeScalarGitVersionSelectorMenuOptions extends VCGitVersionSelectorMenu.GitVersionSelectorMenuOptions {
    repositoryContext: GitRepositoryContext;
}

export class CodeScalarGitVersionSelectorMenu extends VCGitVersionSelectorMenu.GitVersionSelectorMenu {
    private static DomClass_BranchIcon = "bowtie-icon bowtie-tfvc-branch";

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

    public initializeOptions(options?: CodeScalarGitVersionSelectorMenuOptions) {
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
        return <CodeScalarGitVersionSelectorControl>Controls.Enhancement.enhance<CodeScalarGitVersionSelectorControlOptions>(
            CodeScalarGitVersionSelectorControl,
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
            itemIconClass = CodeScalarGitVersionSelectorMenu.DomClass_BranchIcon;
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
            (<CodeScalarGitVersionSelectorControl>this.getFilteredList()).setRepositoryWithCallback(repositoryContext, callback);
        }
    }
}

export interface CodeScalarGitVersionSelectorControlOptions extends VCGitVersionSelectorControl.GitVersionSelectorControlOptions { }

export class CodeScalarGitVersionSelectorControl extends VCGitVersionSelectorControl.GitVersionSelectorControl {
    private _setRepoCallback: (items: any[]) => void;
    private _setRepoWithCallbackCalled: boolean;

    /**
     * We want to override this to allow us to hook in a custom callback once the branches are retrieved from the server.
     */
    public _beginGetListItems(tabId: string, callback: (items: any[]) => void) {
        var expandedCallback = callback;

        if (this._setRepoWithCallbackCalled && $.isFunction(this._setRepoCallback)) {
            var setRepoCallback = this._setRepoCallback; // Copy
            expandedCallback = (items: any[]) => {
                callback(items);
                setRepoCallback(items);
            }
            this._setRepoWithCallbackCalled = false;
        }

        super._beginGetListItems(tabId, expandedCallback);
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

export interface CodeScalarPathSelectorMenuOptions {
    popupOptions: any;
    onSourceItemPathChange: (selectedNode: any) => void;
    initialRepoType: RepositoryType;
}

export class CodeScalarPathSelectorMenu extends Controls.Control<CodeScalarPathSelectorMenuOptions> {
    private static DomClass_MenuContainer = "path-dropdown-menu";
    private static DomClass_MenuText = "path-text";
    private static DomClass_SourceTree = "source-explorer-tree";
    private static DomClass_EmptyTree = "empty-tree";
    private static DomClass_TreeWrapper = "tree-wrapper";
    private static DomClass_TreePopup = "tree-popup";

    private static JQuerySelector_MenuContainer = "." + CodeScalarPathSelectorMenu.DomClass_MenuContainer;
    private static JQuerySelector_MenuText = "." + CodeScalarPathSelectorMenu.DomClass_MenuText;
    private static JQuerySelector_SourceTree = "." + CodeScalarPathSelectorMenu.DomClass_SourceTree;

    private _showEmptyDropdown: boolean;
    private _repoType: RepositoryType;
    private _sourceExplorerTree: CodeScalarSourceExplorerTree;
    private _$sourceExplorerPath: JQuery;
    private _$sourceExplorerMenu: JQuery;
    private _$emptyExplorerTree: JQuery;
    private _popupEnhancement: PopupContent.PopupContentControl;

    /**
     * Creates the menu dropdown in the container argument
     */
    private _createMenuIn($container: JQuery): JQuery {
        var $sourceExplorerContainer = $("<div>")
            .addClass(CodeScalarPathSelectorMenu.DomClass_MenuContainer)
            .attr("role", "combobox")
            .attr("aria-haspopup", "tree")
            .attr("aria-expanded", "false");

        // Path text
        this._$sourceExplorerPath = $("<span>").addClass(CodeScalarPathSelectorMenu.DomClass_MenuText);
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
                    this._sourceExplorerTree.focus();
                    return false;
                case Utils_UI.KeyCode.UP:
                case Utils_UI.KeyCode.ESCAPE:
                    this._popupEnhancement.hide();
                    return false;
                case Utils_UI.KeyCode.ENTER:
                case Utils_UI.KeyCode.SPACE:
                    this._updateTreeVisibility();
                    this._popupEnhancement.toggle();
                    this._sourceExplorerTree.focus();
                    return false;
            }
        });
    }

    /**
     * Creates the source explorer tree in the container argument
     */
    private _createSourceExplorerTreeIn($container: JQuery): CodeScalarSourceExplorerTree {
        return <CodeScalarSourceExplorerTree>Controls.BaseControl.createIn(
            CodeScalarSourceExplorerTree,
            $container, {
                showFavorites: false
            });
    }

    /**
     * Creates the empty path message element in the container argument
     */
    private _createEmptyExplorerTreeIn($container: JQuery) {
        var $emptyTree = $("<div>")
            .addClass(CodeScalarPathSelectorMenu.DomClass_SourceTree)
            .addClass(CodeScalarPathSelectorMenu.DomClass_EmptyTree)
            .text(Resources.CodeScalar_ConfigurationSelectRepositoryAndBranch);

        $container.append($emptyTree);
        return $emptyTree;
    }

    private _createPopup($content: JQuery, $element: JQuery): PopupContent.PopupContentControl {
        return <PopupContent.PopupContentControl>Controls.Enhancement.enhance(PopupContent.PopupContentControl,
            $element,
            $.extend({
                cssClass: CodeScalarPathSelectorMenu.DomClass_TreePopup,
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
            this._$sourceExplorerPath = this._$sourceExplorerMenu.find(CodeScalarPathSelectorMenu.JQuerySelector_MenuText);
        }

        this._$sourceExplorerPath.text(path);
    }

    /**
     * When the selected path is changed, set the text of the menu and hide the source explorer.
     * If there is a handler set in the options, call that too.
     */
    private _bindOnItemPathChanged() {
        var eventType = "source-item-path-changed";
        
        this._sourceExplorerTree._bind(eventType, (e?: any, selectedNode?: any) => {
            this._setMenuText(selectedNode.path);
            this._closePopup();

            if ($.isFunction(this._options.onSourceItemPathChange)) {
                this._options.onSourceItemPathChange(selectedNode);
            }
        });
    }

    /**
     * Show the path selector only if we're fully configured, otherwise show the empty tree div
     */
    private _updateTreeVisibility(): void {
        if (this._showEmptyDropdown) {
            this._sourceExplorerTree.hideElement();
            this._$emptyExplorerTree.show();
        }
        else {
            this._$emptyExplorerTree.hide();
            this._sourceExplorerTree.showElement();
        }
    }

    private _setRepoType(repoContext: RepositoryContext) {
        this._repoType = repoContext.getRepositoryType();
    }

    private _closePopup() {
        this._popupEnhancement.hide();

        // Once the popup is closed, keyboard focus is completely lost, so we need to re-focus on the dropdown
        this._$sourceExplorerMenu.focus();
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
            this._setMenuText(Resources.CodeScalar_ConfigurationSelectAPath);

            if ($.isFunction(errorHandler)) {
                errorHandler();
            }
        });
    }

    public setSelectedNode(node) {
        this._sourceExplorerTree.setSelectedNode(node, false);

        if (!node) {
            this._setMenuText(Resources.CodeScalar_ConfigurationSelectAPath);
        }
    }

    public getRootPathNode(): any {
        // We would always have a root node, unless something went really bad
        return this._sourceExplorerTree.rootNode.children[0]; // The root of our path is the repo node which is the child of the actual root node
    }

    public initializeOptions(options?: CodeScalarPathSelectorMenuOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "path-selector",
            showFavorites: false
        }, options));
    }

    public initialize() {
        // Create menu
        this._$sourceExplorerMenu = this._createMenuIn(this.getElement());
        this._setMenuText(Resources.CodeScalar_ConfigurationSelectAPath);
        this._repoType = this._options.initialRepoType;
        this._showEmptyDropdown = this._repoType != RepositoryType.Tfvc;

        // Create tree
        var $treeWrapper = $("<div>").addClass(CodeScalarPathSelectorMenu.DomClass_TreeWrapper);
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
                this._closePopup();
                return false;
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

export class CodeScalarSourceExplorerTree extends VCSourceExplorerTree.Tree {
    /**
     * Populates the parent node with its children.
     * We want to override this so we can filter out anything that isn't a folder.
     */
    protected _populateChildItems(parentNode, childItems: VCLegacyContracts.ItemModel[]) {
        // Get the children that are folders only
        var folderChildItems: VCLegacyContracts.ItemModel[] = [];
        for (var i = childItems.length - 1; i >= 0; i--) {
            if (childItems[i].isFolder) {
                folderChildItems.push(childItems[i]);
            }
        }

        super._populateChildItems(parentNode, folderChildItems);
    }

    public initializeOptions(options?: VCSourceExplorerTree.SourceExplorerTreeOptions) {
        super.initializeOptions($.extend({
            clickToggles: false, // We only want clicking the expand arrow to open a folder
            contextMenu: null // Turn off context menu
        }, options));
    }
}
