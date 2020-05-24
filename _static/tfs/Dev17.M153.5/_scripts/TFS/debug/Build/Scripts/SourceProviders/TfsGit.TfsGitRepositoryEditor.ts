import ko = require("knockout");

import RepositoryEditor = require("Build/Scripts/RepositoryEditorViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BaseSourceProvider = require("Build/Scripts/SourceProviders/BaseSourceProvider");
import { defaultSourceLabelFormat } from "Build/Scripts/SourceProviders/TfsGit.Common";

import { RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import Marked = require("Presentation/Scripts/marked");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildContracts = require("TFS/Build/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");

import AddPathDialog_NO_REQUIRE = require("VersionControl/Scripts/Controls/AddPathDialog");
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");
import VersionSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

import Dialogs = require("VSS/Controls/Dialogs");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { MarkdownRenderer } from "ContentRendering/Markdown";

/**
 * Viewmodel for Team Foundation git repositories
 */
export class TfGitRepositoryEditorViewModel extends RepositoryEditor.RepositoryEditorViewModel {
    private _gitHttpClient: VCWebApi.GitHttpClient;
    private _repository: string;
    private _branch: string;
    private _checkoutSubmodules: boolean;
    private _cleanOptions: BuildContracts.RepositoryCleanOptions;
    private _labelSources: BuildContracts.BuildResult;
    private _reportBuildStatus: boolean;
    private _sourceLabelFormat: string;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _gitLfsSupport: boolean;
    private _skipSyncSource: boolean;
    private _shallowRepository: boolean;
    private _fetchDepth: number;
    /**
    * current repositoryContext
    */
    public repositoryContext: KnockoutObservable<GitRepositoryContext>;

    /**
     * The available git repositories
     */
    public gitRepositories: KnockoutObservableArray<VCContracts.GitRepository>;

    /**
     * Branch name of the repository.
     */
    public branch: KnockoutObservable<string>;

    /**
     * Name of the repository.
     */
    public repository: KnockoutObservable<string>;

    /**
     * Whether to enable submodule support
     */
    public checkoutSubmodules: KnockoutObservable<boolean>;

    /**
     * The repository clean option to use
     */
    public cleanOptions: KnockoutObservable<BuildContracts.RepositoryCleanOptions>;

    /**
     * When to label sources as part of the build
     */
    public labelSources: KnockoutObservable<BuildContracts.BuildResult>;

    /**
     * The format to use for the source label
     */
    public sourceLabelFormat: KnockoutObservable<string>;

    /**
     * Whether to report build status on build completion
     */
    public reportBuildStatus: KnockoutObservable<boolean>;

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
     * Current selected repository.
     */
    public gitRepository: KnockoutObservable<VCContracts.GitRepository>;

    // help markdown
    public cleanOptionHelpMarkDown: string;
    public reportBuildStatusHelpMarkdown: string;
    public shallowRepositoryHelpMarkdown: string;
    public gitLfsSupportHelpMarkdown: string;
    public skipSyncSourceHelpMarkdown: string;

    constructor(repository: BuildContracts.BuildRepository, gitRepositories: VCContracts.GitRepository[]) {
        super(repository);

        let renderer: (markdown: string) => string;
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.MarkdownRendering)) {
            renderer = (new MarkdownRenderer()).renderHtml;
        }
        else {
            renderer = Marked;
        }

        this.cleanOptionHelpMarkDown = renderer(BuildResources.BuildRepositoryGitCleanHelpMarkDown);
        this.reportBuildStatusHelpMarkdown = renderer(BuildResources.TfsGitReportBuildStatusHelpMarkdown);
        this.shallowRepositoryHelpMarkdown = renderer(BuildResources.BuildRepositoryGitShallowHelpMarkDown);
        this.gitLfsSupportHelpMarkdown = renderer(BuildResources.BuildRepositoryGitLfsSupportHelpMarkDown);
        this.skipSyncSourceHelpMarkdown = renderer(BuildResources.BuildRepositorySkipSyncSourceHelpMarkDown);


        this.gitRepositories(gitRepositories);
        this.update(repository);

        this._tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    }

    /**
     * See base.
     */
    _initializeObservables(): void {
        super._initializeObservables();

        this._repository = "";
        this.repository = ko.observable(this._repository);

        this._branch = "";
        this.branch = ko.observable(this._branch);

        this._checkoutSubmodules = false;
        this.checkoutSubmodules = ko.observable(this._checkoutSubmodules);

        this._cleanOptions = BuildContracts.RepositoryCleanOptions.Source;
        this.cleanOptions = ko.observable(this._cleanOptions);

        this._labelSources = BuildContracts.BuildResult.None;
        this.labelSources = ko.observable(this._labelSources);

        this._sourceLabelFormat = defaultSourceLabelFormat;
        this.sourceLabelFormat = ko.observable(this._sourceLabelFormat);

        this._reportBuildStatus = false;
        this.reportBuildStatus = ko.observable(this._reportBuildStatus);

        this._gitLfsSupport = false;
        this.gitLfsSupport = ko.observable(this._gitLfsSupport);

        this._skipSyncSource = false;
        this.skipSyncSource = ko.observable(this._skipSyncSource);

        this._shallowRepository = false;
        this.shallowRepository = ko.observable(this._shallowRepository);

        this._fetchDepth = 15;
        this.fetchDepth = ko.observable(this._fetchDepth);

        this.repositoryContext = ko.observable(null);
        this.gitRepositories = ko.observableArray([]);

        var repositorySubscription = ko.computed(() => {
            var repositoryId = this.repository();
            // this will bind this computed to gitRepositories
            var repository = this._getRepository(repositoryId);
            if (repository) {
                this.repositoryContext(GitRepositoryContext.create(repository));
            }
        });
        this._addDisposable(repositorySubscription);

        this.gitRepository = ko.observable(null);
    }

    /**
     * Extracts a data contract from the editor
     */
    public getValue(): BuildContracts.BuildRepository {
        // peeking at everything to avoid inadvertently triggering subscriptions
        let repository = <BuildContracts.BuildRepository>{
            id: this.repository.peek(),
            type: RepositoryTypes.TfsGit,
            name: this.name.peek(),
            defaultBranch: this.branch.peek(),
            url: this.url.peek(),
            checkoutSubmodules: this.checkoutSubmodules.peek(),
            clean: "" + this.clean.peek(),
            properties: {}
        };

        let labelSources = this.labelSources.peek();
        repository.properties[RepositoryProperties.LabelSources] = labelSources.toString();
        // using != to compare strings to numbers
        if (labelSources != BuildContracts.BuildResult.None) {
            repository.properties[RepositoryProperties.LabelSourcesFormat] = this.sourceLabelFormat.peek() || "";
        }

        let reportBuildStatus = this.reportBuildStatus.peek();
        repository.properties[RepositoryProperties.ReportBuildStatus] = reportBuildStatus.toString();

        let shallowRepository = this.shallowRepository.peek();
        if (shallowRepository) {
            let fetchDepth = this.fetchDepth.peek();
            repository.properties[RepositoryProperties.FetchDepth] = fetchDepth.toString();
        }
        else {
            repository.properties[RepositoryProperties.FetchDepth] = "0";
        }

        let gitLfsSupport = this.gitLfsSupport.peek();
        repository.properties[RepositoryProperties.GitLfsSupport] = gitLfsSupport.toString();

        let skipSyncSource = this.skipSyncSource.peek();
        repository.properties[RepositoryProperties.SkipSyncSource] = skipSyncSource.toString();

        let cleanOptions = this.cleanOptions.peek();
        repository.properties[RepositoryProperties.CleanOptions] = cleanOptions.toString();

        return repository;
    }

    /**
     * See base.
     */
    public update(repository: BuildContracts.BuildRepository): void {
        super.update(repository);

        this._repository = repository.id;
        this.repository(this._repository);

        this._branch = repository.defaultBranch;
        this.branch(this._branch);

        this._checkoutSubmodules = repository.checkoutSubmodules === true;
        this.checkoutSubmodules(this._checkoutSubmodules);

        this._shallowRepository = (repository.properties && repository.properties.hasOwnProperty(RepositoryProperties.FetchDepth)) ? Utils_Number.parseInvariant(repository.properties[RepositoryProperties.FetchDepth]) > 0 : false;
        this.shallowRepository(this._shallowRepository);

        this._labelSources = (repository.properties && repository.properties[RepositoryProperties.LabelSources]) ? <BuildContracts.BuildResult><any>repository.properties[RepositoryProperties.LabelSources] : BuildContracts.BuildResult.None;
        this.labelSources(this._labelSources);

        this._sourceLabelFormat = repository.properties ? repository.properties[RepositoryProperties.LabelSourcesFormat] : "";
        this.sourceLabelFormat(this._sourceLabelFormat);

        this._fetchDepth = (repository.properties && repository.properties.hasOwnProperty(RepositoryProperties.FetchDepth)) ? Utils_Number.parseInvariant(repository.properties[RepositoryProperties.FetchDepth]) : 15;
        this.fetchDepth(this._fetchDepth);

        this._reportBuildStatus = (repository.properties && repository.properties[RepositoryProperties.ReportBuildStatus]) ? Utils_String.ignoreCaseComparer(repository.properties[RepositoryProperties.ReportBuildStatus], "true") === 0 : false;
        this.reportBuildStatus(this._reportBuildStatus);

        this._gitLfsSupport = (repository.properties && repository.properties[RepositoryProperties.GitLfsSupport]) ? Utils_String.ignoreCaseComparer(repository.properties[RepositoryProperties.GitLfsSupport], "true") === 0 : false;
        this.gitLfsSupport(this._gitLfsSupport);

        this._skipSyncSource = (repository.properties && repository.properties[RepositoryProperties.SkipSyncSource]) ? Utils_String.ignoreCaseComparer(repository.properties[RepositoryProperties.SkipSyncSource], "true") === 0 : false;
        this.skipSyncSource(this._skipSyncSource);

        this._cleanOptions = (repository.properties && repository.properties[RepositoryProperties.CleanOptions]) ? <BuildContracts.RepositoryCleanOptions><any>repository.properties[RepositoryProperties.CleanOptions] : BuildContracts.RepositoryCleanOptions.Source;
        this.cleanOptions(this._cleanOptions);

        this.gitRepository(this._getRepositoryByName(this.name() || this._tfsContext.navigation.project));
    }

    /**
     * Gets the name of the html template used by the editor
     */
    public getTemplateName(): string {
        return "buildvnext_repository_editor_tfgit";
    }

    /**
     * Marks the repository clean
     */
    public setClean(): void {
        super.setClean();
        this._repository = this.repository();
        this._branch = this.branch();
        this._checkoutSubmodules = this.checkoutSubmodules();
        this._cleanOptions = this.cleanOptions();
        this._shallowRepository = this.shallowRepository();
        this._fetchDepth = this.fetchDepth();
        this._labelSources = this.labelSources();
        this._sourceLabelFormat = this.sourceLabelFormat();
        this._reportBuildStatus = this.reportBuildStatus();
        this._gitLfsSupport = this.gitLfsSupport();
        this._skipSyncSource = this.skipSyncSource();
    }

    /**
     * Gets the default trigger filter
     */
    public getDefaultBranchFilter(): string {
        return this.branch();
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
     * Indicates whether the model supports a path picker dialog
     */
    public supportsPathDialog(): boolean {
        return true;
    }

    /**
     * Shows a path picker dialog
     */
    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        VSS.using(["VersionControl/Scripts/Controls/AddPathDialog"], (AddPathDialog: typeof AddPathDialog_NO_REQUIRE) => {
            var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            var dialogModel = new AddPathDialog.AddPathDialogModel();

            dialogModel.initialPath = "/";

            // Initialize input model
            dialogModel.inputModel = new AddPathDialog.InputModel();
            dialogModel.inputModel.path(initialValue);

            // find the git repository
            var repository = this._getRepository(this.repository());

            // set the branch
            dialogModel.setBranch(this.branch());

            // set the repository context
            dialogModel.repositoryContext = new GitRepositoryContext(tfsContext, repository);

            // set the callback
            dialogModel.okCallback = callback;

            // Show the dialog
            Dialogs.show(AddPathDialog.AddPathDialog, dialogModel);
        });
    }

    /**
     * Fetch the content of the file from Git.
     * @param path file path in source provider
     * @param callback success callback function called once the content is available
     * @param errorCallback error callback function to notify the error to caller
     */
    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var repository = this._getRepository(this.repository());
        var repositoryContext = new GitRepositoryContext(tfsContext, repository);
        var repoClient = repositoryContext.getClient();
        var version = new VersionSpecs.GitBranchVersionSpec(this.branch().replace("refs/heads/", "")).toVersionString();

        repoClient.beginGetItemContent(repositoryContext, path, version, callback, errorCallback);
    }

    /**
     * Gets the type of editor control for this model
     */
    public getEditorControlType(): any {
        return TfGitRepositoryEditorControl;
    }

    public onItemChanged(repository: VCContracts.GitRepository) {
        this.repository(repository.id);
        this.name(repository.name);
        this.branch(repository.defaultBranch || "");
        this.url(repository.remoteUrl);
    }

    /**
     * See base.
     */
    _isDirty(): boolean {
        if (super._isDirty()) {
            return true;
        }

        // source label is case-sensitive.  labelSources is bound to a dropdown so it gets string values
        return Utils_String.localeIgnoreCaseComparer(this._repository, this.repository()) !== 0 ||
            Utils_String.localeIgnoreCaseComparer(this._branch, this.branch()) !== 0 ||
            this._checkoutSubmodules !== this.checkoutSubmodules() ||
            this._cleanOptions != this.cleanOptions() ||  // 0 != "0" should be false, cleanOptions is from <select> and would be string, so use !=
            this._shallowRepository !== this.shallowRepository() ||
            this._fetchDepth !== this.fetchDepth() ||
            this._labelSources != this.labelSources() ||
            this._sourceLabelFormat !== this.sourceLabelFormat() ||
            this._reportBuildStatus !== this.reportBuildStatus() ||
            this._gitLfsSupport !== this.gitLfsSupport() ||
            this._skipSyncSource !== this.skipSyncSource();
    }

    _isInvalid(): boolean {
        return this._isSourceLabelFormatInvalid();
    }

    _isSourceLabelFormatInvalid(): boolean {
        // using != to compare string to number
        let sourceLabelFormat = this.sourceLabelFormat() || "";
        return this.labelSources() != BuildContracts.BuildResult.None
            && sourceLabelFormat.trim().length === 0;
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

    private _getRepository(repositoryId: string): VCContracts.GitRepository {
        return Utils_Array.first(this.gitRepositories(), (gitRepository: VCContracts.GitRepository) => {
            return Utils_String.localeIgnoreCaseComparer(repositoryId, gitRepository.id) === 0;
        });
    }

    private _getRepositoryByName(name: string): VCContracts.GitRepository {
        return Utils_Array.first(this.gitRepositories(), (r: VCContracts.GitRepository) => {
            return Utils_String.localeIgnoreCaseComparer(r.name, name) === 0;
        });
    }
}

export class TfGitRepositoryEditorControl extends BaseSourceProvider.RepositoryEditorControl {
    constructor(viewModel: BaseSourceProvider.RepositoryEditorWrapperViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();
    }
}