import ko = require("knockout");

import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import RepositoryEditor = require("Build/Scripts/RepositoryEditorViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import { BuildCustomerIntelligenceInfo, RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import Marked = require("Presentation/Scripts/marked");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");
import DTAgent_Client = require("TFS/DistributedTask/TaskAgentRestClient");
import DTContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Client = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

import Performance = require("VSS/Performance");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";


export class GitRepositoryEditorViewModel extends RepositoryEditor.RepositoryEditorViewModel {
    private _username: string;
    private _password: string;
    private _defaultBranch: string;
    private _checkoutSubmodules: boolean;
    private _cleanOptions: BuildContracts.RepositoryCleanOptions;
    private _projectId: string;
    private _shallowRepository: boolean;
    private _fetchDepth: number;
    private _gitLfsSupport: boolean;
    private _skipSyncSource: boolean;

    private _dtAgentClient: DTAgent_Client.TaskAgentHttpClient;
    private _serviceEndpointClient: ServiceEndpoint_Client.ServiceEndpointHttpClient;
    private _serviceEndpointId: string;
    private _serviceEndpointReactor: KnockoutComputed<any>;

    /**
     * The selected service endpoint
     */
    public serviceEndpoint: KnockoutObservable<ServiceEndpointContracts.ServiceEndpoint>;
    public serviceEndpointId: KnockoutObservable<string>;

    /**
     * The available Git connection endpoints
     */
    public computedServiceEndpoints: KnockoutObservableArray<ServiceEndpointContracts.ServiceEndpoint>;
    public hasServiceEndpoints: KnockoutObservable<boolean>;
    public loadingServiceEndpoints: KnockoutObservable<boolean>;

    /**
     * The ref textbox
     */
    public defaultBranch: KnockoutObservable<string>;

    /**
     * Whether to enable submodule support
     */
    public checkoutSubmodules: KnockoutObservable<boolean>;

    /**
     * The repository clean option to use
     */
    public cleanOptions: KnockoutObservable<BuildContracts.RepositoryCleanOptions>;

    /**
     * Whether to enable git-lfs support
     */
    public gitLfsSupport: KnockoutObservable<boolean>;

    /**
     * Whether to skip sync source
     */
    public skipSyncSource: KnockoutObservable<boolean>;

    /**
    * Whether to enable shallow repository support
    */
    public shallowRepository: KnockoutObservable<boolean>;

    /**
    * The number of depth to fetch
    */
    public fetchDepth: KnockoutObservable<number>;

    /**
     * The help text markdown for the connection input
     */
    public gitRepositoryConnectionMarkdown: KnockoutObservable<string>;

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

    constructor(repository: BuildContracts.BuildRepository) {
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


        var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        this._projectId = (tfsContext && tfsContext.navigation) ? tfsContext.navigation.projectId : null;
        this._dtAgentClient = Service.getCollectionClient(DTAgent_Client.TaskAgentHttpClient);
        this._serviceEndpointClient = Service.getCollectionClient(ServiceEndpoint_Client.ServiceEndpointHttpClient);

        this.update(repository);
        this.refreshServiceEndpoints();
    }

    /**
     * See base.
     */
    _initializeObservables(): void {
        super._initializeObservables();

        this._defaultBranch = "";
        this.defaultBranch = ko.observable(this._defaultBranch);

        this._checkoutSubmodules = false;
        this.checkoutSubmodules = ko.observable(this._checkoutSubmodules);

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

        this.gitRepositoryConnectionMarkdown = ko.observable(null);
        this.computedServiceEndpoints = ko.observableArray([]);
        this.serviceEndpoint = ko.observable(null);
        this.serviceEndpointId = ko.observable(null);
        this.hasServiceEndpoints = ko.observable(false);
        this.loadingServiceEndpoints = ko.observable(true);

        this.cleanOptionHelpMarkDown = ko.observable(null);
    }

    /**
     * Extracts a data contract from the editor
     */
    public getValue(): BuildContracts.BuildRepository {
        var properties: { [key: string]: string } = {};

        // Add connection
        var serviceEndpointId = this.serviceEndpointId();
        if (serviceEndpointId) {
            properties[RepositoryProperties.ConnectedServiceId] = serviceEndpointId;
        }

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
            type: RepositoryTypes.Git,
            name: this.name(),
            defaultBranch: this.defaultBranch(),
            url: this.url(),
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

        this._serviceEndpointId = repository.properties ? repository.properties[RepositoryProperties.ConnectedServiceId] : null;
        this.serviceEndpointId(this._serviceEndpointId);

        this._defaultBranch = repository.defaultBranch || "";
        this.defaultBranch(this._defaultBranch);

        this._checkoutSubmodules = repository.checkoutSubmodules === true;
        this.checkoutSubmodules(this._checkoutSubmodules);

        var cleanMarkdown = Marked(BuildResources.BuildRepositoryGitCleanHelpMarkDown);
        this.cleanOptionHelpMarkDown(cleanMarkdown);

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
    }

    /**
     * Gets the name of the html template used by the editor
     */
    public getTemplateName(): string {
        return "buildvnext_repository_editor_git";
    }

    /**
     * Gets the default trigger filter
     */
    public getDefaultBranchFilter(): string {
        return this.defaultBranch();
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
        this._serviceEndpointId = this.serviceEndpointId();
        this._defaultBranch = this.defaultBranch();
        this._checkoutSubmodules = this.checkoutSubmodules();
        this._cleanOptions = this.cleanOptions();
        this._shallowRepository = this.shallowRepository();
        this._fetchDepth = this.fetchDepth();
        this._gitLfsSupport = this.gitLfsSupport();
        this._skipSyncSource = this.skipSyncSource();
    }

    /**
     * Gets the type of editor control for this model
     */
    public getEditorControlType(): any {
        return GitRepositoryEditorControl;
    }

    /**
     * See base.
     */
    _isDirty(): boolean {
        if (super._isDirty()) {
            return true;
        }

        var defaultBranch = this.defaultBranch();
        var serviceEndpointId = this.serviceEndpointId();
        var checkoutSubmodules = this.checkoutSubmodules();

        return Utils_String.localeIgnoreCaseComparer(this._defaultBranch, defaultBranch) !== 0 ||
            Utils_String.localeIgnoreCaseComparer(this._serviceEndpointId, serviceEndpointId) !== 0 ||
            this._checkoutSubmodules !== checkoutSubmodules ||
            this._cleanOptions != this.cleanOptions() ||  // 0 != "0" should be false, cleanOptions is from <select> and would be string, so use !=
            this._shallowRepository !== this.shallowRepository() ||
            this._fetchDepth !== this.fetchDepth() ||
            this._gitLfsSupport !== this.gitLfsSupport() ||
            this._skipSyncSource !== this.skipSyncSource();
    }

    _isInvalid(): boolean {
        return !this.serviceEndpointId();
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

    public refreshServiceEndpoints() {
        let performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "GitRefreshServiceEndPoints");
        this.loadingServiceEndpoints(true);
        this._serviceEndpointClient.getServiceEndpoints(this._projectId, "git").then(
            (connections: ServiceEndpointContracts.ServiceEndpoint[]) => {
                this._onServiceEndpointsLoaded(connections.sort((a: ServiceEndpointContracts.ServiceEndpoint, b: ServiceEndpointContracts.ServiceEndpoint) => {
                    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                }));
                performance.end();
            }, (error) => {
                VSS.handleError(error);
                performance.end();
            });
    }

    private _onServiceEndpointsLoaded(connections: ServiceEndpointContracts.ServiceEndpoint[]) {
        var selectedConnectionId = this.serviceEndpointId() || this._serviceEndpointId;
        RepositoryEditor.getRepositoryConnection(connections, this._projectId, selectedConnectionId, this._serviceEndpointClient).then((currentConnection) => {
            this.hasServiceEndpoints(connections && connections.length > 0);
            this.computedServiceEndpoints(connections);
            this.serviceEndpoint(currentConnection);
            this.serviceEndpointId(currentConnection ? currentConnection.id : null);

            if (!this.hasServiceEndpoints()) {
                this.gitRepositoryConnectionMarkdown(BuildResources.ExternalGitConnectionIsRequired);
            }
            else {
                this.gitRepositoryConnectionMarkdown(BuildResources.ExternalGitConnectionHelp);
            }

            this.loadingServiceEndpoints(false);

            if (!this._serviceEndpointReactor) {
                this._serviceEndpointReactor = ko.computed(() => {
                    var connection = this.serviceEndpoint();
                    var loadingConnections = this.loadingServiceEndpoints();
                    if (connection) {
                        this.serviceEndpointId(connection.id);
                    }
                });
                this._serviceEndpointReactor.extend({ throttle: 200 });
                this._addDisposable(this._serviceEndpointReactor);
            }
        });
    }
}

export class GitRepositoryEditorControl extends BaseSourceProvider.RepositoryEditorControl {
    constructor(viewModel: BaseSourceProvider.RepositoryEditorWrapperViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();

        $(".git-manage-link").attr("href", TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "services", { "area": "admin" }));
    }

    dispose(): void {
        super.dispose();
    }
}