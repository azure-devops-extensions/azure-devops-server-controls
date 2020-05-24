import ko = require("knockout");

import GitHubHelper = require("Build/Scripts/GitHubIntegration");
import RepositoryEditor = require("Build/Scripts/RepositoryEditorViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import {GitHubConstants} from "Build/Scripts/GitHubIntegration";

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");
import { BuildCustomerIntelligenceInfo, RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import Marked = require("Presentation/Scripts/marked");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");
import DTContracts = require("TFS/DistributedTask/Contracts");
import DTAgent_Client = require("TFS/DistributedTask/TaskAgentRestClient");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");
import ServiceEndpoint_Client = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");

import AddPathDialog_NO_REQUIRE = require("VersionControl/Scripts/Controls/AddPathDialog");

import SHCommon = require("VSS/Common/Contracts/FormInput");
import Dialogs = require("VSS/Controls/Dialogs");
import Performance = require("VSS/Performance");
import Service = require("VSS/Service");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";


export class GitHubRepositoryEditorViewModel extends RepositoryEditor.RepositoryEditorViewModel {
    private _buildvNextClient: BuildClient.BuildClientService;
    private _dtAgentClient: DTAgent_Client.TaskAgentHttpClient;
    private _serviceEndpointClient: ServiceEndpoint_Client.ServiceEndpointHttpClient;
    private _savedConnectionId: string;
    private _savedRepositoryUrl: string;
    private _savedBranchName: string;
    private _savedCheckoutSubmodules: boolean;
    private _reposLookup: { [key: string]: any };
    private _projectId: string;
    private _definitionId: number;
    private _selectedConnectionId: string;
    private _connectionReactor: any;
    private _repoReactor: any;
    private _branchReactor: any;
    private _shallowRepository: boolean;
    private _fetchDepth: number;
    private _gitLfsSupport: boolean;
    private _skipSyncSource: boolean;
    private _cleanOptions: BuildContracts.RepositoryCleanOptions;

    public computedConnections: KnockoutObservableArray<ServiceEndpointContracts.ServiceEndpoint>;
    public computedRepositoryUrls: KnockoutObservableArray<SHCommon.InputValue>;
    public computedBranchNames: KnockoutObservableArray<string>;

    public selectedConnection: KnockoutObservable<ServiceEndpointContracts.ServiceEndpoint>;
    public selectedConnectionId: KnockoutObservable<string>;
    public selectedRepositoryUrl: KnockoutObservable<string>;
    public selectedBranchName: KnockoutObservable<string>;
    public checkoutSubmodules: KnockoutObservable<boolean>;
    public cleanOptions: KnockoutObservable<BuildContracts.RepositoryCleanOptions>;
    public shallowRepository: KnockoutObservable<boolean>;
    public fetchDepth: KnockoutObservable<number>;
    public gitLfsSupport: KnockoutObservable<boolean>;
    public skipSyncSource: KnockoutObservable<boolean>;

    public invalidAccessToken: KnockoutObservable<boolean>;
    public accessTokenErrorMessage: KnockoutObservable<string>;

    public showRepositorySpinner: KnockoutObservable<boolean>;
    public showBranchSpinner: KnockoutObservable<boolean>;
    public hasConnections: KnockoutObservable<boolean>;

    /**
     * Clean option help markdown
     */
    public cleanOptionHelpMarkDown: KnockoutObservable<string>;

    /**
    * Shallow repository help markdown
    */
    public shallowRepositoryHelpMarkdown: string;

    /**
    * Git-lfs help markdown
    */
    public gitLfsSupportHelpMarkdown: string;

    /**
    * Skip sync source help markdown
    */
    public skipSyncSourceHelpMarkdown: string;


    constructor(definitionId: number, repository: BuildContracts.BuildRepository) {
        super(repository);

        let renderer: (markdown: string) => string;
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            renderer = (new MarkdownRenderer()).renderHtml;
        }
        else {
            renderer = Marked;
        }

        this.shallowRepositoryHelpMarkdown = renderer(BuildResources.BuildRepositoryGitShallowHelpMarkDown);
        this.gitLfsSupportHelpMarkdown = renderer(BuildResources.BuildRepositoryGitLfsSupportHelpMarkDown);
        this.skipSyncSourceHelpMarkdown = renderer(BuildResources.BuildRepositorySkipSyncSourceHelpMarkDown);


        this._definitionId = definitionId;
        this._savedConnectionId = repository.properties ? repository.properties[GitHubHelper.GitHubConstants.connectedServiceId] : undefined;
        this._savedRepositoryUrl = repository.url ? repository.url : undefined;
        this._savedBranchName = repository.defaultBranch ? repository.defaultBranch : undefined;

        var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        this._buildvNextClient = Service.getCollectionService(BuildClient.BuildClientService);
        this._dtAgentClient = Service.getCollectionClient(DTAgent_Client.TaskAgentHttpClient);
        this._serviceEndpointClient = Service.getCollectionClient(ServiceEndpoint_Client.ServiceEndpointHttpClient);
        this._projectId = (tfsContext && tfsContext.navigation) ? tfsContext.navigation.projectId : undefined;

        this.refreshConnectedServices();
        this.update(repository);
    }

    public refreshConnectedServices() {
        let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "GitHubRefreshServiceEndPoints");
        this._serviceEndpointClient.getServiceEndpoints(this._projectId, "GitHub").then(
            (connections: ServiceEndpointContracts.ServiceEndpoint[]) => {
                this._onConnectionsLoaded(connections.sort((a: ServiceEndpointContracts.ServiceEndpoint, b: ServiceEndpointContracts.ServiceEndpoint) => {
                    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                }));
                performance.end();
            }, (error) => {
                VSS.handleError(error);
                performance.end();
            });
    }

    _onConnectionsLoaded(connections: ServiceEndpointContracts.ServiceEndpoint[]) {
        var selectedConnectionId = this._selectedConnectionId ? this._selectedConnectionId : this._savedConnectionId;
        RepositoryEditor.getRepositoryConnection(connections, this._projectId, selectedConnectionId, this._serviceEndpointClient).then((currentConnection) => {
            this.computedConnections(connections);
            this.selectedConnection(currentConnection);
            this.selectedConnectionId(currentConnection ? currentConnection.id : undefined);
            this.hasConnections(connections && connections.length > 0);
            if (!connections || connections.length == 0) {
                this._setAccessTokenError(BuildResources.GitHubConnectionIsRequired);
            }

            if (!this._connectionReactor) {
                this._connectionReactor = ko.computed(() => {
                    var connection = this.selectedConnection();
                    if (connection) {
                        this.selectedConnectionId(connection.id);
                    }
                });
                this._connectionReactor.extend({ throttle: 200 });
                this._addDisposable(this._connectionReactor);
            }

            if (!this._repoReactor) {
                this._repoReactor = ko.computed(() => {
                    this._selectedConnectionId = this.selectedConnectionId();
                    this._onSelectedConnectionIdChanged(this._selectedConnectionId);
                });
                this._repoReactor.extend({ throttle: 200 });
                this._addDisposable(this._repoReactor);
            }

            if (!this._branchReactor) {
                this._branchReactor = ko.computed(() => {
                    var selectedRepositoryUrl = this.selectedRepositoryUrl();
                    this._onSelectedRepositoryChanged(selectedRepositoryUrl);
                });
                this._branchReactor.extend({ throttle: 200 });
                this._addDisposable(this._branchReactor);
            }
        });
    }

    _onSelectedConnectionIdChanged(selectedConnectionId: string) {
        if (this._selectedConnectionId) {
            this._clearAccessTokenError();
            this._queryRepositories(this._selectedConnectionId, this._projectId);
        }
        else {
            this.computedRepositoryUrls([]);
        }
    }

    _onSelectedRepositoryChanged(selectedRepo: string) {
        var selectedRepoBranchesUrl = this._getRepositoryBranchesUrl(selectedRepo);
        if (selectedRepoBranchesUrl && this._selectedConnectionId) {
            this._clearAccessTokenError();
            this._queryBranches(this._selectedConnectionId, this._projectId, selectedRepoBranchesUrl);
        }
        else {
            this.computedBranchNames([]);
        }
    }

    _getRepositoryBranchesUrl(repository: string) {
        var repositoryBranchesUrl = "";
        if (repository && this._reposLookup) {
            repositoryBranchesUrl = this._reposLookup[repository].data[GitHubHelper.GitHubConstants.branchesUrl];
        }
        return repositoryBranchesUrl;
    }

    _queryRepositories(connectionId: string, projectId: string) {

        this.showRepositorySpinner(true);
        this.computedBranchNames([]);

        // Setup the repository query.
        var dictionary: { [key: string]: any } = {};
        dictionary[GitHubHelper.GitHubConstants.repositoryType] = RepositoryTypes.GitHub;
        dictionary[GitHubHelper.GitHubConstants.connectedServiceId] = connectionId;
        dictionary[GitHubHelper.GitHubConstants.project] = projectId;

        var inputValues: SHCommon.InputValues[] = [];
        inputValues.push(<SHCommon.InputValues>{ inputId: GitHubHelper.GitHubConstants.repos });

        var query: SHCommon.InputValuesQuery = <SHCommon.InputValuesQuery>{
            currentValues: dictionary,
            inputValues: inputValues
        };

        // Query for the repositories.
        this._buildvNextClient.beginQueryInputValues(query).then(
            (query: SHCommon.InputValuesQuery) => {

                // Ensure this result is for the currently selected query.  The selection
                // could have changed while the query was in-progress.
                if (query.currentValues[GitHubHelper.GitHubConstants.connectedServiceId] == this._selectedConnectionId) {

                    // Extract the repositoties from the query result.
                    var repos: SHCommon.InputValue[] = [];
                    $.each(query.inputValues, (i: number, entry: SHCommon.InputValues) => {
                        if (entry.error && entry.error.message) {
                            this._setAccessTokenError(entry.error.message);
                        } else {
                            $.each(entry.possibleValues, (j: number, value: SHCommon.InputValue) => {
                                repos.push(value);
                            });
                        }
                    });

                    // Set the repositories for this connection id.
                    this._setComputedRespoitories(repos);
                    this.showRepositorySpinner(false);
                }
            },
            (error) => {

                // Ensure this result is for the currently selected query.  The selection
                // could have changed while the query was in-progress.
                if (query.currentValues[GitHubHelper.GitHubConstants.connectedServiceId] == this._selectedConnectionId) {
                    this.computedRepositoryUrls([]);
                    this.computedBranchNames([]);
                    this._setAccessTokenError(error.message || error);
                    this.showRepositorySpinner(false);
                }
            });
    }

    _queryBranches(connectionId: string, projectId: string, repositoryUrl: string) {

        this.computedBranchNames([]);
        this.showBranchSpinner(true);

        // Setup the branch query.
        var dictionary: { [key: string]: any } = {};
        dictionary[GitHubHelper.GitHubConstants.repositoryType] = RepositoryTypes.GitHub;
        dictionary[GitHubHelper.GitHubConstants.connectedServiceId] = connectionId;
        dictionary[GitHubHelper.GitHubConstants.project] = projectId;
        dictionary[GitHubHelper.GitHubConstants.branchesUrl] = repositoryUrl;

        var inputValues: SHCommon.InputValues[] = [];
        inputValues.push(<SHCommon.InputValues>{ inputId: GitHubHelper.GitHubConstants.repoBranches });
        var query: SHCommon.InputValuesQuery = <SHCommon.InputValuesQuery>{
            currentValues: dictionary,
            inputValues: inputValues
        };

        // Query for the branches.
        this._buildvNextClient.beginQueryInputValues(query).then(
            (query: SHCommon.InputValuesQuery) => {

                // Ensure this result is for the currently selected query.  The selection
                // could have changed while the query was in-progress.
                if (query.currentValues[GitHubHelper.GitHubConstants.connectedServiceId] == this._selectedConnectionId &&
                    query.currentValues[GitHubHelper.GitHubConstants.branchesUrl] == this._getRepositoryBranchesUrl(this.selectedRepositoryUrl())) {

                    // Extract the branch names from the query result.
                    var branches: string[] = [];
                    $.each(query.inputValues, (i: number, entry: SHCommon.InputValues) => {
                        if (entry.error && entry.error.message) {
                            this._setAccessTokenError(entry.error.message);
                        } else {
                            $.each(entry.possibleValues, (j: number, value: SHCommon.InputValue) => {
                                branches.push(value.displayValue);
                            });
                        }
                    });

                    // Set the branches for the repository url.
                    this._setComputedBranches(branches);
                    this.showBranchSpinner(false);
                }
            },
            (error) => {

                // Ensure this result is for the currently selected query.  The selection
                // could have changed while the query was in-progress.
                if (query.currentValues[GitHubHelper.GitHubConstants.connectedServiceId] == this._selectedConnectionId &&
                    query.currentValues[GitHubHelper.GitHubConstants.branchesUrl] == this._getRepositoryBranchesUrl(this.selectedRepositoryUrl())) {

                    // There was an error querying for branches.
                    this.computedBranchNames([]);
                    this._setAccessTokenError(error.message || error);
                    this.showBranchSpinner(false);
                }
            });
    }

    _setComputedRespoitories(repos: SHCommon.InputValue[]) {
        this._reposLookup = {};
        var selectedRepoExists: boolean = false;

        if (repos) {
            $.each(repos, (i: number, value: SHCommon.InputValue) => {
                this._reposLookup[value.value] = value;
                selectedRepoExists = selectedRepoExists || (value.value === this._savedRepositoryUrl);
            });
            this.computedRepositoryUrls(repos);
            this.selectedRepositoryUrl(selectedRepoExists ? this._savedRepositoryUrl : "");
        }
        else {
            this.computedRepositoryUrls([]);
            this.selectedRepositoryUrl("");
        }
    }

    _setComputedBranches(branches: string[]) {
        var selectedBranchExists: boolean = false;
        if (branches) {
            $.each(branches, (i: number, branch: string) => {
                selectedBranchExists = selectedBranchExists || branch === this._savedBranchName;
            });
            this.computedBranchNames(branches);
            this.selectedBranchName(selectedBranchExists ? this._savedBranchName : "");
        }
        else {
            this.computedBranchNames([]);
            this.selectedBranchName("");
        }
    }

    /**
     * See base.
     */
    _initializeObservables(): void {
        super._initializeObservables();

        this._savedBranchName = "";
        this.selectedBranchName = ko.observable(this._savedBranchName);

        this._savedCheckoutSubmodules = false;
        this.checkoutSubmodules = ko.observable(this._savedCheckoutSubmodules);

        this._cleanOptions = BuildContracts.RepositoryCleanOptions.Source;
        this.cleanOptions = ko.observable(this._cleanOptions);

        this._gitLfsSupport = false;
        this.gitLfsSupport = ko.observable(this._gitLfsSupport);

        this._skipSyncSource = false;
        this.skipSyncSource = ko.observable(this._skipSyncSource);

        this._shallowRepository = false;
        this.shallowRepository = ko.observable(this._shallowRepository);

        this._fetchDepth = 15;
        this.fetchDepth = ko.observable(this._fetchDepth);

        this.computedConnections = ko.observableArray<ServiceEndpointContracts.ServiceEndpoint>();
        this.selectedConnection = ko.observable(undefined);

        this._selectedConnectionId = undefined;
        this.selectedConnectionId = ko.observable(this._selectedConnectionId);

        this.computedRepositoryUrls = ko.observableArray<SHCommon.InputValue>();
        this.computedBranchNames = ko.observableArray<string>();

        this._savedRepositoryUrl = "";
        this.selectedRepositoryUrl = ko.observable(this._savedRepositoryUrl);

        this.showRepositorySpinner = ko.observable(false);
        this.showBranchSpinner = ko.observable(false);
        this.hasConnections = ko.observable(false);

        this.invalidAccessToken = ko.observable(false);
        this.accessTokenErrorMessage = ko.observable(null);

        this.cleanOptionHelpMarkDown = ko.observable(null);
    }

    _setAccessTokenError(message: string) {
        this.invalidAccessToken(true);
        this.accessTokenErrorMessage(message);
    }

    _clearAccessTokenError() {
        this.invalidAccessToken(false);
        this.accessTokenErrorMessage(null);
    }

    /**
     * Extracts a data contract from the editor
     */
    public getValue(): BuildContracts.BuildRepository {
        var currentRepositoryUrl = this.selectedRepositoryUrl();
        var currentRepoData = (currentRepositoryUrl && this._reposLookup) ? this._reposLookup[currentRepositoryUrl] : null;
        var fullName = (currentRepoData) ? currentRepoData.displayValue : "";
        var cloneUrl = (currentRepositoryUrl) ? currentRepositoryUrl : "";

        if (currentRepoData) {
            currentRepoData.data[GitHubHelper.GitHubConstants.branch] = this.selectedBranchName();
        }

        var properties: { [key: string]: string } = {};
        if (this.selectedConnection()) {
            properties[GitHubHelper.GitHubConstants.connectedServiceId] = this.selectedConnection().id;
        }
        properties[GitHubHelper.GitHubConstants.apiUrl] = (currentRepoData) ? currentRepoData.data[GitHubHelper.GitHubConstants.apiUrl] : "";
        properties[GitHubHelper.GitHubConstants.branchesUrl] = (currentRepoData) ? currentRepoData.data[GitHubHelper.GitHubConstants.branchesUrl] : "";
        properties[GitHubHelper.GitHubConstants.cloneUrl] = cloneUrl;
        properties[GitHubHelper.GitHubConstants.refsUrl] = (currentRepoData) ? currentRepoData.data[GitHubHelper.GitHubConstants.refsUrl] : "";

        // Add git-lfs option
        let gitLfsSupport = this.gitLfsSupport.peek();
        properties[RepositoryProperties.GitLfsSupport] = gitLfsSupport.toString();

        // Add skip sync source option
        let skipSyncSource = this.skipSyncSource.peek();
        properties[RepositoryProperties.SkipSyncSource] = skipSyncSource.toString();

        // Add shallow repository option
        let shallowRepository = this.shallowRepository.peek();
        if (shallowRepository) {
            let fetchDepth = this.fetchDepth.peek();
            properties[RepositoryProperties.FetchDepth] = fetchDepth.toString();
        }
        else {
            properties[RepositoryProperties.FetchDepth] = "0";
        }

        // Add repository clean options
        let cleanOptions = this.cleanOptions.peek();
        properties[RepositoryProperties.CleanOptions] = cleanOptions.toString();

        return <BuildContracts.BuildRepository>{
            type: RepositoryTypes.GitHub,
            name: fullName,
            defaultBranch: this.selectedBranchName(),
            url: cloneUrl,
            properties: properties,
            checkoutSubmodules: this.checkoutSubmodules(),
            clean: "" + this.clean()
        };
    }

    /**
     * See base.
     */
    public update(repository: BuildContracts.BuildRepository): void {
        super.update(repository);

        this._savedConnectionId = (repository && repository.properties) ? repository.properties[GitHubHelper.GitHubConstants.connectedServiceId] : undefined;
        this.selectedConnectionId(this._savedConnectionId);

        this._savedRepositoryUrl = repository ? repository.url : undefined;
        this.selectedRepositoryUrl(this._savedRepositoryUrl);

        this._savedBranchName = repository ? repository.defaultBranch : undefined;
        this.selectedBranchName(this._savedBranchName);

        this.name(repository.name);

        this._savedCheckoutSubmodules = repository.checkoutSubmodules === true;
        this.checkoutSubmodules(this._savedCheckoutSubmodules);

        this._shallowRepository = (repository.properties && repository.properties.hasOwnProperty(RepositoryProperties.FetchDepth)) ? Utils_Number.parseInvariant(repository.properties[RepositoryProperties.FetchDepth]) > 0 : false;
        this.shallowRepository(this._shallowRepository);

        this._fetchDepth = (repository.properties && repository.properties.hasOwnProperty(RepositoryProperties.FetchDepth)) ? Utils_Number.parseInvariant(repository.properties[RepositoryProperties.FetchDepth]) : 15;
        this.fetchDepth(this._fetchDepth);

        this._gitLfsSupport = (repository.properties && repository.properties[RepositoryProperties.GitLfsSupport]) ? Utils_String.ignoreCaseComparer(repository.properties[RepositoryProperties.GitLfsSupport], "true") === 0 : false;
        this.gitLfsSupport(this._gitLfsSupport);

        this._skipSyncSource = (repository.properties && repository.properties[RepositoryProperties.SkipSyncSource]) ? Utils_String.ignoreCaseComparer(repository.properties[RepositoryProperties.SkipSyncSource], "true") === 0 : false;
        this.skipSyncSource(this._skipSyncSource);

        this._cleanOptions = (repository.properties && repository.properties[RepositoryProperties.CleanOptions]) ? <BuildContracts.RepositoryCleanOptions><any>repository.properties[RepositoryProperties.CleanOptions] : BuildContracts.RepositoryCleanOptions.Source;
        this.cleanOptions(this._cleanOptions);

        var cleanMarkdown = Marked(BuildResources.BuildRepositoryGitCleanHelpMarkDown);
        this.cleanOptionHelpMarkDown(cleanMarkdown);
    }

    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        if (this._definitionId) {
            this._reposLookup[this.selectedRepositoryUrl()].data[GitHubHelper.GitHubConstants.definitionId] = this._definitionId;
        }

        var gitHubRepository = new GitHubHelper.GitHubRepository(this._reposLookup[this.selectedRepositoryUrl()]);
        VSS.using(["VersionControl/Scripts/Controls/AddPathDialog"], (AddPathDialog: typeof AddPathDialog_NO_REQUIRE) => {
            var dialogModel = new AddPathDialog.AddPathDialogModel();

            dialogModel.initialPath = "/";

            // Initialize input model
            dialogModel.inputModel = new AddPathDialog.InputModel();
            dialogModel.inputModel.path(initialValue);

            // Set repository context
            dialogModel.repositoryContext = GitHubHelper.GitHubRepositoryContext.create(gitHubRepository, tfsContext);

            // Set ok callback which is called when dialog closed with ok button
            dialogModel.okCallback = callback;

            // Show the dialog
            Dialogs.show(AddPathDialog.AddPathDialog, dialogModel);
        });
    }

    /**
     * Fetch the content of the file from GitHub.
     * @param path file path in source provider
     * @param callback success callback function called once the content is available
     * @param errorCallback error callback function to notify the error to caller
     */
    
    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var gitHubRepository = new GitHubHelper.GitHubRepository(this._reposLookup[this.selectedRepositoryUrl()]);
        var repositoryContext = GitHubHelper.GitHubRepositoryContext.create(gitHubRepository, tfsContext);
        var repoClient = repositoryContext.getClient();
        var version = gitHubRepository.data[GitHubConstants.branch];
        
        repoClient.beginGetItemContent(repositoryContext, path, version, callback, errorCallback);
    }

    /**
     * Indicates whether the model supports a path picker dialog
     */
    public supportsPathDialog(): boolean {
        return true;
    }

    /**
     * Gets the default trigger filter
     */
    public getDefaultBranchFilter(): string {
        return this.selectedBranchName();
    }

    public getDefaultScheduledBranch(): string {
        return this.getDefaultBranchFilter();
    }

    public ciTriggerRequiresBranchFilters(): boolean {
        return true;
    }

    public ciTriggerRequiresPathFilters(): boolean {
        return false;
    }

    /**
     * Marks the repository clean
     */
    public setClean(): void {
        super.setClean();
        this._savedConnectionId = this.selectedConnectionId();
        this._savedRepositoryUrl = this.selectedRepositoryUrl();
        this._savedBranchName = this.selectedBranchName();
        this._savedCheckoutSubmodules = this.checkoutSubmodules();
        this._shallowRepository = this.shallowRepository();
        this._fetchDepth = this.fetchDepth();
        this._gitLfsSupport = this.gitLfsSupport();
        this._skipSyncSource = this.skipSyncSource();
        this._cleanOptions = this.cleanOptions();
    }

    /**
     * See base.
     */
    _isDirty(): boolean {
        if (super._isDirty()) {
            return true;
        }

        var selectedConnectionId = this.selectedConnectionId();
        var selectedRepositoryUrl = this.selectedRepositoryUrl();
        var selectedBranchName = this.selectedBranchName();
        var selectedCheckoutSubmodules = this.checkoutSubmodules();

        var connectionIdChanged = selectedConnectionId != undefined && Utils_String.localeIgnoreCaseComparer(this._savedConnectionId, selectedConnectionId) !== 0;
        var repoChanged = selectedRepositoryUrl != undefined && (Utils_String.localeIgnoreCaseComparer(this._savedRepositoryUrl, selectedRepositoryUrl) !== 0);
        var branchNameChanged = Utils_String.localeIgnoreCaseComparer(this._savedBranchName, selectedBranchName) !== 0;
        var checkoutSubmodulesChanged = this._savedCheckoutSubmodules != selectedCheckoutSubmodules;
        var shallowRepositoryChanged = this._shallowRepository !== this.shallowRepository();
        var fetchDepthChanged = this._fetchDepth !== this.fetchDepth();
        var gitLfsSupportChanged = this._gitLfsSupport !== this.gitLfsSupport();
        var skipSyncSourceChanged = this._skipSyncSource !== this.skipSyncSource();
        var cleanOptionsChanged = this._cleanOptions != this.cleanOptions(); // 0 != "0" should be false, cleanOptions is from <select> and would be string, so use !=
        var isDirty = connectionIdChanged || repoChanged || branchNameChanged || checkoutSubmodulesChanged || shallowRepositoryChanged || fetchDepthChanged || gitLfsSupportChanged || skipSyncSourceChanged || cleanOptionsChanged;

        return isDirty;
    }

    _isInvalid(): boolean {
        var selectedBranch = this.selectedBranchName();
        return this.invalidAccessToken() || !selectedBranch;
    }

    _fetchDepthInvalid(): boolean {
        // fetch depth box can't be empty
        var depth = this.fetchDepth();
        var strDepth = depth.toString().trim();
        if (strDepth.length === 0) {
            return true;
        }

        // fetch depth must be a positive number
        if (!Utils_Number.isPositiveNumber(depth)) {
            return true;
        }

        return false;
    }

    /**
     * Gets the name of the html template used by the editor
     */
    public getTemplateName(): string {
        return "buildvnext_repository_editor_github";
    }

    public getEditorControlType(): any {
        return GitHubRepositoryEditorControl;
    }
}

export class GitHubRepositoryEditorControl extends BaseSourceProvider.RepositoryEditorControl {
    constructor(viewModel: BaseSourceProvider.RepositoryEditorWrapperViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();

        $(".github-manage-link").attr("href", TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "services", { "area": "admin" }));
    }

    dispose(): void {
        super.dispose();
    }
}