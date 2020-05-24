import ko = require("knockout");

import RepositoryEditor = require("Build/Scripts/RepositoryEditorViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");

import BuildClient = require("Build.Common/Scripts/Api2.2/ClientServices");
import { RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import Marked = require("Presentation/Scripts/marked");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");
import DTAgent_Client = require("TFS/DistributedTask/TaskAgentRestClient");
import DTContracts = require("TFS/DistributedTask/Contracts");
import ServiceEndpoint_Client = require("TFS/ServiceEndpoint/ServiceEndpointRestClient");
import ServiceEndpointContracts = require("TFS/ServiceEndpoint/Contracts");

import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";


export class SvnRepositoryEditorViewModel extends RepositoryEditor.RepositoryEditorViewModel {
    private _defaultBranch: string;
    private _mappings: BuildContracts.SvnMappingDetails[];
    private _timeOut: any;

    private _buildvNextClient: BuildClient.BuildClientService;
    private _dtAgentClient: DTAgent_Client.TaskAgentHttpClient;
    private _serviceEndpointClient: ServiceEndpoint_Client.ServiceEndpointHttpClient;
    private _projectId: string;

    private _connectionId: string;
    private _connectionReactor: any;

    private _defaultMapping: BuildContracts.SvnMappingDetails;

    private _cleanOptions: BuildContracts.RepositoryCleanOptions;

    /**
     * The repository clean option to use
     */
    public cleanOptions: KnockoutObservable<BuildContracts.RepositoryCleanOptions>;

    /**
     * The help text markdown for repository mappings
     */
    public svnMappingHelpMarkdown: string;

    /**
     * The help text markdown for repository branch
     */
    public svnBranchHelpMarkdown: string;

    /**
     * The help text markdown for SVN connection error
     */
    public svnRepositoryConnectionMarkDown: KnockoutObservable<string>;

    /**
     * The available General connection endpoints
     */
    public computedConnections: KnockoutObservableArray<ServiceEndpointContracts.ServiceEndpoint>;
    public hasConnections: KnockoutObservable<boolean>;
    public loadingConnections: KnockoutObservable<boolean>;

    /**
     * The selected SVN connection endpoint
     */
    public connection: KnockoutObservable<ServiceEndpointContracts.ServiceEndpoint>;
    public connectionId: KnockoutObservable<string>;

    /**
     * The ref textbox
     */
    public defaultBranch: KnockoutObservable<string>;

    /**
     * Svn mappings that are part of Svn workspace
     */
    public mappings: KnockoutObservableArray<SvnMappingViewModel>;

    /**
     * Clean option help markdown
     */
    public cleanOptionHelpMarkDown: KnockoutObservable<string>;

    /** Getter for markdown renderer, since base constructor needs it */
    private get markdownRenderer(): (markdown: string) => string {
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            return (new MarkdownRenderer()).renderHtml;
        }
        else {
            return Marked;
        }
    }


    constructor(repository: BuildContracts.BuildRepository) {
        super(repository);

        this.svnMappingHelpMarkdown = this.markdownRenderer(BuildResources.SvnMappingHelpText);
        this.svnBranchHelpMarkdown = this.markdownRenderer(BuildResources.SvnBranchHelpText);

        var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        this._buildvNextClient = Service.getCollectionService(BuildClient.BuildClientService);
        this._dtAgentClient = Service.getCollectionClient(DTAgent_Client.TaskAgentHttpClient);
        this._serviceEndpointClient = Service.getCollectionClient(ServiceEndpoint_Client.ServiceEndpointHttpClient);
        this._projectId = (tfsContext && tfsContext.navigation) ? tfsContext.navigation.projectId : null;
        this._connectionId = repository.properties ? repository.properties[RepositoryProperties.ConnectedServiceId] : null;

        this.update(repository);
        this.refreshConnectedServices();
    }

    /**
     * See base.
     */
    _initializeObservables(): void {
        super._initializeObservables();

        this._cleanOptions = BuildContracts.RepositoryCleanOptions.Source;
        this.cleanOptions = ko.observable(this._cleanOptions);

        this._defaultBranch = "";
        this.defaultBranch = ko.observable(this._defaultBranch);

        this._mappings = [];
        this.mappings = ko.observableArray([]);

        this.svnRepositoryConnectionMarkDown = ko.observable(null);
        this.computedConnections = ko.observableArray([]);
        this.connection = ko.observable(null);
        this.connectionId = ko.observable(null);
        this.hasConnections = ko.observable(false);
        this.loadingConnections = ko.observable(true);

        this.cleanOptionHelpMarkDown = ko.observable(null);
    }

    public refreshConnectedServices() {
        this.loadingConnections(true);
        this._serviceEndpointClient.getServiceEndpoints(this._projectId, "subversion").then(
            (connections: ServiceEndpointContracts.ServiceEndpoint[]) => {
                this._onConnectionsLoaded(connections.sort((a: ServiceEndpointContracts.ServiceEndpoint, b: ServiceEndpointContracts.ServiceEndpoint) => {
                    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                }));
            });
    }

    /**
     * Extracts a data contract from the editor
     */
    public getValue(): BuildContracts.BuildRepository {
        var properties: { [key: string]: string } = {};

        // Add workspace
        var workspace: BuildContracts.SvnWorkspace = { mappings: this._getWorkspaceMappings() };
        properties[RepositoryProperties.SvnMapping] = JSON.stringify(workspace);

        // Add connection
        if (this.connectionId()) {
            properties[RepositoryProperties.ConnectedServiceId] = this.connectionId();
        }

        // Add repository clean options
        let cleanOptions = this.cleanOptions.peek();
        properties[RepositoryProperties.CleanOptions] = cleanOptions.toString();

        return <BuildContracts.BuildRepository>{
            type: RepositoryTypes.Svn,
            name: this.name(),
            defaultBranch: this.defaultBranch(),
            url: this.url(),
            properties: properties,
            clean: "" + this.clean()
        };
    }

    /**
     * See base.
     */
    public update(repository: BuildContracts.BuildRepository): void {
        super.update(repository);

        this._connectionId = (repository && repository.properties) ? repository.properties[RepositoryProperties.ConnectedServiceId] : null;
        this.connectionId(this._connectionId);

        this._defaultBranch = repository.defaultBranch || "";
        this.defaultBranch(this._defaultBranch);

        this._cleanOptions = (repository.properties && repository.properties[RepositoryProperties.CleanOptions]) ? <BuildContracts.RepositoryCleanOptions><any>repository.properties[RepositoryProperties.CleanOptions] : BuildContracts.RepositoryCleanOptions.Source;
        this.cleanOptions(this._cleanOptions);

        this._defaultMapping = {
            serverPath: "$(build.sourceBranch)/",
            localPath: "",
            revision: "HEAD",
            depth: 3,
            ignoreExternals: true
        };
        // default mappings for a new definition and old definitions without mappings
        this._mappings = [this._defaultMapping];

        var workspace: BuildContracts.SvnWorkspace = <any>{};
        // Update workspace mappings
        if (repository.properties && repository.properties[RepositoryProperties.SvnMapping]) {
            workspace = JSON.parse(repository.properties[RepositoryProperties.SvnMapping]);
        }
        if (workspace.mappings) {
            this._mappings = workspace.mappings;
        }

        this._updateWorkspaceMappings(this._mappings);

        var cleanMarkdown = this.markdownRenderer(BuildResources.BuildRepositorySvnCleanHelpMarkDown);
        this.cleanOptionHelpMarkDown(cleanMarkdown);
    }

    /**
     * Gets the name of the html template used by the editor
     */
    public getTemplateName(): string {
        return "buildvnext_repository_editor_svn";
    }

    /**
     * Gets the default trigger filter.  Since Subversion uses paths as filters, we're providing the root folder.
     */
    public getDefaultPathFilter(): string {
        var mappings = this.mappings();
        var prefix = "";
        if (mappings && (mappings.length > 0)) {
            var path = mappings[0].serverPath();
            var idx = path.toLowerCase().indexOf("$(build.sourcebranch)");
            if (idx > 0) {
                prefix = path.substr(0, idx);
            }
        }
        return prefix + this.defaultBranch();
    }

    public ciTriggerRequiresBranchFilters(): boolean {
        return false;
    }

    public ciTriggerRequiresPathFilters(): boolean {
        return true;
    }

    /**
    * Gets the default branch to use for scheduled triggers.
    */
    public getDefaultScheduledBranch(): string {
        return this.defaultBranch();
    }

    /**
     * Marks the repository clean
     */
    public setClean(): void {
        super.setClean();
        this._connectionId = this.connectionId();
        this._defaultBranch = this.defaultBranch();
        this._cleanOptions = this.cleanOptions();

        var mappings = this.mappings();
        for (var i = 0, len = mappings.length; i < len; i++) {
            mappings[i]._setClean();
        }

        this._mappings = this._getWorkspaceMappings();
    }

    /**
     * Gets the type of editor control for this model
     */
    public getEditorControlType(): any {
        return SvnRepositoryEditorControl;
    }

    /**
     * See base.
     */
    _isDirty(): boolean {
        if (super._isDirty()) {
            return true;
        }

        if (this._mappingsIsDirty()) {
            return true;
        }

        var connectionId = this.connectionId() || "";
        var defaultBranch = this.defaultBranch() || "";

        var branchChanged = Utils_String.defaultComparer(this._defaultBranch, defaultBranch) !== 0;
        var connectionIdChanged = Utils_String.localeIgnoreCaseComparer(this._connectionId, connectionId) !== 0;
        var cleanOptionsChanged = this._cleanOptions != this.cleanOptions();  // 0 != "0" should be false, cleanOptions is from <select> and would be string, so use !=

        var isDirty = branchChanged || connectionIdChanged || cleanOptionsChanged;

        return isDirty;
    }

    _isInvalid(): boolean {
        if (this.loadingConnections()) {
            return false;
        }
        else {
            var invalidMappings = this._isInvalidMappings();
            var invalidDefaultBranch = this._isInvalidDefaultBranch();
            var invalidConnection = this._isInvalidConnection();

            var isInvalid = invalidMappings || invalidDefaultBranch || invalidConnection;

            return isInvalid;
        }
    }

    private _isInvalidMappings(): boolean {
        var mappingsLength = this._mappings ? this._mappings.length : 0;

        if (mappingsLength === 0) {
            return false;
        }

        var mappings = this.mappings();

        for (var i = 0, len = mappings.length; i < len; i++) {
            if (!(mappings[i]._isValidLocalPath() && mappings[i]._isValidServerPath() && mappings[i]._isValidRevision())) {
                return true;
            }
        }

        return false;
    }

    private _isInvalidDefaultBranch(): boolean {
        return !(this.defaultBranch() && (this.defaultBranch().length > 0));
    }

    private _isInvalidConnection(): boolean {
        return !(this.hasConnections() && this.connectionId());
    }

    private _setSvnRepositoryConnectionHelpMessage(message: string) {
        this.svnRepositoryConnectionMarkDown(this.markdownRenderer(message));
    }

    private _onConnectionsLoaded(connections: ServiceEndpointContracts.ServiceEndpoint[]) {
        var selectedConnectionId = this.connectionId() || this._connectionId;
        RepositoryEditor.getRepositoryConnection(connections, this._projectId, selectedConnectionId, this._serviceEndpointClient).then((currentConnection) => {
            this.hasConnections(connections && connections.length > 0);
            this.computedConnections(connections);
            this.connection(currentConnection);
            this.connectionId(currentConnection ? currentConnection.id : null);

            if (!this.hasConnections()) {
                this._setSvnRepositoryConnectionHelpMessage(BuildResources.SvnConnectionIsRequired);
            }
            else {
                this._setSvnRepositoryConnectionHelpMessage(BuildResources.SvnConnectionHelp);
            }

            this.loadingConnections(false);

            if (!this._connectionReactor) {
                this._connectionReactor = ko.computed(() => {
                    var connection = this.connection();
                    var loadingConnections = this.loadingConnections();
                    if (connection) {
                        this.connectionId(connection.id);
                    }
                });
                this._connectionReactor.extend({ throttle: 200 });
                this._addDisposable(this._connectionReactor);
            }
        });
    }

    public addMapping(model: SvnRepositoryEditorViewModel, evt: JQueryEventObject): void {
        this.mappings.push(new SvnMappingViewModel(this._defaultMapping));
    }

    public removeMapping(mapping: SvnMappingViewModel, evt: JQueryEventObject): void {
        var context = <SvnRepositoryEditorViewModel>(<KnockoutBindingContext>ko.contextFor(evt.target)).$parent;

        // warning message about deleting last mapping
        if (context.mappings().length != 1 || confirm(BuildResources.SvnDeleteLastWorkspaceMappingConfirmation)) {
            context.mappings.remove(mapping);
            mapping.dispose();
        }
    }

    private _getWorkspaceMappings(): BuildContracts.SvnMappingDetails[] {
        var mappings: BuildContracts.SvnMappingDetails[] = [];
        $.each(this.mappings(), (index, value: SvnMappingViewModel) => {
            var md: BuildContracts.SvnMappingDetails = {
                serverPath: value.serverPath().trim(),
                localPath: value.localPath().trim(),
                revision: value.revision().trim(),
                depth: value.depth(),
                ignoreExternals: value.ignoreExternals()
            };

            mappings.push(md);
        });
        return mappings;
    }

    private _updateWorkspaceMappings(mappings: BuildContracts.SvnMappingDetails[]) {
        var newMappings: SvnMappingViewModel[] = [];
        newMappings = $.map(mappings, (value: BuildContracts.SvnMappingDetails, index) => {
            return new SvnMappingViewModel({
                serverPath: value.serverPath,
                localPath: value.localPath.replace(/\\/g, "/"),
                revision: value.revision || "HEAD",
                depth: $.isNumeric(value.depth) ? value.depth : 3,
                ignoreExternals: value.ignoreExternals
            });
        });
        this.mappings(newMappings);
    }

    private _mappingsIsDirty(): boolean {
        var mappingsLength = this._mappings ? this._mappings.length : 0;

        if (this.mappings().length != mappingsLength) {
            return true;
        }

        var mappings = this.mappings();

        for (var i = 0, len = mappings.length; i < len; i++) {
            if (mappings[i]._isDirty()) {
                return true;
            }
        }

        return !Utils_Array.arrayEquals(this._mappings,
            mappings,
            (s: BuildContracts.SvnMappingDetails, t: SvnMappingViewModel) => {
                return (Utils_String.defaultComparer(s.serverPath, t.serverPath()) === 0) &&
                    (Utils_String.defaultComparer(s.localPath, t.localPath()) === 0) &&
                    (Utils_String.ignoreCaseComparer(s.revision, t.revision()) === 0) &&
                    (s.depth == t.depth()) &&
                    (s.ignoreExternals == t.ignoreExternals());
            },
            true);
    }
}

export class SvnMappingViewModel extends TaskModels.ChangeTrackerModel {
    private _mapping: BuildContracts.SvnMappingDetails;
    public serverPath: KnockoutObservable<string>;
    public localPath: KnockoutObservable<string>;
    public revision: KnockoutObservable<string>;
    public depth: KnockoutObservable<number>;
    public ignoreExternals: KnockoutObservable<boolean>;

    constructor(mapping: BuildContracts.SvnMappingDetails) {
        super();
        this._mapping = mapping;
        this.serverPath(this._mapping.serverPath || "");
        this.localPath(this._mapping.localPath || "");
        this.revision(this._mapping.revision || "");
        var curDepth: number = $.isNumeric(this._mapping.depth) ? this._mapping.depth : 3;
        this.depth(curDepth);
        var curIgnoreExternals = true;
        if (this._mapping.ignoreExternals != null && this._mapping.ignoreExternals != undefined) {
            curIgnoreExternals = this._mapping.ignoreExternals;
        }
        this.ignoreExternals(curIgnoreExternals);
    }

    _initializeObservables(): void {
        super._initializeObservables();
        this.localPath = ko.observable("");
        this.serverPath = ko.observable("");
        this.revision = ko.observable("HEAD");
        var defaultDepth = 3;
        this.depth = ko.observable(defaultDepth);
        var defaultIgnoreExternals = true;
        this.ignoreExternals = ko.observable(defaultIgnoreExternals);
    }

    _isDirty(): boolean {
        if (super._isDirty()) {
            return true;
        }

        if (!this._mapping) {
            return false;
        }

        var localPathDirty = Utils_String.defaultComparer(this.localPath(), this._mapping.localPath) !== 0;
        var serverPathDirty = Utils_String.defaultComparer(this.serverPath(), this._mapping.serverPath) !== 0;
        var revisionDirty = Utils_String.ignoreCaseComparer(this.revision(), this._mapping.revision) !== 0;

        // We have to use != instead of !== because sometimes this._mapping.depth has type "number",
        // but sometimes "string" 
        var depthDirty = this.depth() != this._mapping.depth;
        var ignoreExternalsDirty = this.ignoreExternals() != this._mapping.ignoreExternals;

        if (localPathDirty || serverPathDirty || revisionDirty || depthDirty || ignoreExternalsDirty) {
            return true;
        }

        return false;
    }

    _setClean(): void {
        var md: BuildContracts.SvnMappingDetails = {
            serverPath: this.serverPath().trim(),
            localPath: this.localPath().trim(),
            revision: this.revision().trim(),
            depth: this.depth(),
            ignoreExternals: this.ignoreExternals()
        };

        this._mapping = md;
    }

    _isValidLocalPath(): boolean {
        if (this.localPath()) {
            var localPath = this.localPath().trim();

            return !((localPath.indexOf(":") >= 0) ||
                (localPath.indexOf("..") >= 0) ||
                Utils_String.startsWith(localPath, "/") ||
                Utils_String.startsWith(localPath, "\\"))
        }
        return true;
    }

    _isValidServerPath(): boolean {
        if (this.serverPath()) {
            var serverPath = this.serverPath().trim();

            return !((serverPath.indexOf(":") >= 0) ||
                (serverPath.indexOf("..") >= 0) ||
                Utils_String.startsWith(serverPath, "/") ||
                Utils_String.startsWith(serverPath, "\\"))
        }
        return true;
    }

    _isValidRevision(): boolean {
        if (this.revision()) {
            var revision = this.revision().trim();

            if ((revision.length === 0) ||
                (Utils_String.ignoreCaseComparer(revision, "HEAD") === 0)) {
                return true;
            }

            return Utils_Number.isPositiveNumber(revision);
        }

        return true;
    }
}

export class SvnRepositoryEditorControl extends BaseSourceProvider.RepositoryEditorControl {
    constructor(viewModel: BaseSourceProvider.RepositoryEditorWrapperViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();

        $(".svn-manage-link").attr("href", TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl("", "services", { "area": "admin" }));
    }

    dispose(): void {
        super.dispose();
    }
}