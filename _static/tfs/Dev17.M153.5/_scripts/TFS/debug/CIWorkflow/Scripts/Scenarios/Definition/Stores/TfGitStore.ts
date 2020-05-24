import { RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ITfGitPayload, SourcesSelectionActionsCreator, IProjectUpdate  } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { ICommonGitState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CommonGitState";
import { GitCommonPropertiesModel } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/GitCommonPropertiesModel";
import { ISourceLabelProps } from "CIWorkflow/Scripts/Common/ScmUtils";
import { TfSourceControlStoreBase } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfSourceControlStoreBase";
import { ISourcesVersionControlState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStoreBase";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Boolean } from "DistributedTaskControls/Common/Primitives";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildRepository, BuildResult, BuildDefinition, RepositoryCleanOptions, DefinitionTriggerType  } from "TFS/Build/Contracts";
import { ProjectVisibility } from "TFS/Core/Contracts";
import { GitRepository, VersionControlProjectInfo } from "TFS/VersionControl/Contracts";

import * as AddPathDialog_NO_REQUIRE from "VersionControl/Scripts/Controls/AddPathDialog";
import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VersionSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCWebApi from "VersionControl/Scripts/TFS.VersionControl.WebApi";

import * as Context from "VSS/Context";
import * as Service from "VSS/Service";
import * as Dialogs from "VSS/Controls/Dialogs";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export interface ITfGitState extends ISourcesVersionControlState, ICommonGitState {
    repository: GitRepository;
    version: VersionSpecs.VersionSpec;
    sourceLabel: ISourceLabelProps;
    projectVisibility: ProjectVisibility;
    errorMessage?: string;
}

/**
 * @brief Store for select code source in build definition work flow
 */
export class TfGitStore extends TfSourceControlStoreBase {
    private _gitCommonPropertiesModel: GitCommonPropertiesModel;
    private _fetchRepositoryPromise: IPromise<GitRepository>;
    private _fetchedRepositoryName: string;
    private _visibilityConflict: boolean;
    private _errorMessage: string;

    constructor() {
        super();

        this._initializeRepository(this._repository);
        this._initializeRepository(this._originalRepository);

        // showPathDialog function below requires these scripts, so loading them here in anticipation that user will click on browse
        VSS.using(["VersionControl/Scripts/Controls/AddPathDialog"], (AddPathDialog: typeof AddPathDialog_NO_REQUIRE) => {
        });

        this._gitCommonPropertiesModel = new GitCommonPropertiesModel(this._repository, this._originalRepository, this.isRepositoryCleanEnabled.bind(this));
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_TfGitStore;
    }

    public initialize(): void {
        super.initialize();
        this._buildDefinitionActions.createBuildDefinition.addListener(this._handleCreateBuildDefinition);
        this._sourceSelectionActionsCreator.ChangeTfGitSource.addListener(this._handleChangeTfGitSource);
        this._sourceSelectionActionsCreator.TfSourceProjectChanged.addListener(this._handleTfSourceProjectChanged);
    }

    protected disposeInternal(): void {
        this._sourceSelectionActionsCreator.ChangeTfGitSource.removeListener(this._handleChangeTfGitSource);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateBuildDefinition);
        this._sourceSelectionActionsCreator.TfSourceProjectChanged.addListener(this._handleTfSourceProjectChanged);

        super.disposeInternal();
    }

    protected updateStatesFromBuildDefinition(definition: BuildDefinition) {
        super.updateStatesFromBuildDefinition(definition);

        this._gitCommonPropertiesModel.updateRepositoryFromBuildDefinition(this._repository, this._originalRepository);

        this._setDefaultRepositoryProperties(this._repository);
        this._setDefaultRepositoryProperties(this._originalRepository);
    }

    private _initializeRepository(repository: BuildRepository) {
        repository.type = RepositoryTypes.TfsGit;
        repository.properties = repository.properties || {};
        repository.properties[RepositoryProperties.LabelSources] = BuildResult.None.toString();
        repository.properties[RepositoryProperties.LabelSourcesFormat] = this.getDefaultSourceLabelFormat();
        repository.properties[RepositoryProperties.ReportBuildStatus] = Boolean.trueString;
    }

    private _handleChangeTfGitSource = (payload: ITfGitPayload) => {
        this._visibilityConflict = false;
        this.updateStateFromChangePayload(payload);
        this.emitChanged();
    }

    private _handleTfSourceProjectChanged = (projectUpdate: IProjectUpdate) => {
        // only update the project if the new selected project supports git and is different from the current one
        // otherwise keep the old selection in case the user comes back
        if (!this._projectInfo || (projectUpdate.projectInfo.supportsGit && projectUpdate.projectInfo.project.id !== this._projectInfo.project.id)) {
            this._projectInfo = projectUpdate.projectInfo;
            this._visibilityConflict = projectUpdate.visibilityConflict;
            if (!projectUpdate.visibilityConflict) {
                const repo: BuildRepository = {} as BuildRepository;
                this._initializeRepository(repo);
                this._repository = repo;
                if (!this._repository.defaultBranch)
                {
                    this._repository.defaultBranch = MasterBranch;
                }
            }

            this.emitChanged();
        }
    }

    private _handleCreateBuildDefinition = (payload: BuildDefinition) => {
        if (payload && payload.repository && Utils_String.equals(this.getRepositoryType(), payload.repository.type, true)) {
            this._repository.id = payload.repository.id;
            this._repository.name = payload.repository.name;
            this._repository.url = payload.repository.url;
            this._repository.defaultBranch = this.getVersionSpec(payload.repository.defaultBranch).toFullName();
            this.emitChanged();
        }
    }

    public isDirty(): boolean {
        return (
            this._repository.id !== this._originalRepository.id ||
            this._repository.defaultBranch !== this._originalRepository.defaultBranch ||
            this._gitCommonPropertiesModel.isDirty() ||
            super.isDirty()
        );
    }

    public isValid(): boolean {
        this._errorMessage = this._visibilityConflict ? Resources.PublicProjectCannotUsePrivateRepoError : Utils_String.empty;
        return (
            !this._visibilityConflict &&
            !!this._repository.id &&
            !!this._repository.defaultBranch &&
            this._gitCommonPropertiesModel.isValid() &&
            super.isLabelFormatValid()
        );
    }

    public getCurrentBuildRepository(repositoryName: string): IPromise<BuildRepository> {
        return this._getGitRepository(repositoryName).then((gitRepository: GitRepository) => {
            const buildRepository = {
                id: gitRepository.id,
                name: gitRepository.name,
                defaultBranch: gitRepository.defaultBranch ? gitRepository.defaultBranch : MasterBranch,
                url: gitRepository.url,
                project: {
                    id: Context.getDefaultWebContext().project.id
                },
                checkoutSubmodules: false,
                clean: null,
                properties: null,
                rootFolder: null,
                type: RepositoryTypes.TfsGit
            } as BuildRepository;
            return buildRepository;
        });
    }

    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
        VSS.using(["VersionControl/Scripts/Controls/AddPathDialog"], (AddPathDialog: typeof AddPathDialog_NO_REQUIRE) => {
            let tfsContext = TfsContext.getDefault();
            let dialogModel = new AddPathDialog.AddPathDialogModel();

            dialogModel.initialPath = Utils_String.empty;

            dialogModel.inputModel = new AddPathDialog.InputModel();
            dialogModel.inputModel.path(initialValue);

            let repository = this._getSelectedRepository();
            dialogModel.setBranch(this.getVersionSpec(this._repository.defaultBranch).toDisplayText());
            dialogModel.repositoryContext = new GitRepositoryContext(tfsContext, repository);

            dialogModel.okCallback = callback;

            Dialogs.show(AddPathDialog.AddPathDialog, dialogModel);
        });
    }

    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        let tfsContext = TfsContext.getDefault();
        let repository = this._getSelectedRepository();
        let repositoryContext = new GitRepositoryContext(tfsContext, repository);
        let repoClient = repositoryContext.getClient();
        let version = new VersionSpecs.GitBranchVersionSpec(this._repository.defaultBranch.replace("refs/heads/", "")).toVersionString();

        repoClient.beginGetItemContent(repositoryContext, path, version, callback, errorCallback);
    }

    public isWebhookPresent(type: DefinitionTriggerType): boolean {
        return false;
    }

    public getState(): ITfGitState {
        let advancedOptions: ISourcesVersionControlState = super.getState();

        return JQueryWrapper.extend(
            {
                repository: this._getSelectedRepository(),
                cleanOptions: this._gitCommonPropertiesModel.getCleanOption(),
                version: this.getVersionSpec(this._repository.defaultBranch),
                skipSyncSourcesStatus: this._gitCommonPropertiesModel.getSkipSyncStatus(),
                gitLfsSupportStatus: this._gitCommonPropertiesModel.getGitLfsSupportStatus(),
                shallowFetchStatus: this._gitCommonPropertiesModel.getShallowFetchStatus(),
                depth: this._gitCommonPropertiesModel.getFetchDepth(),
                reportBuildStatus: this._getReportBuildStatusOption(),
                sourceLabel: this._getSelectedSourceLabel(),
                checkoutSubmodules: this._gitCommonPropertiesModel.isCheckoutSubmodulesEnabled(),
                checkoutNestedSubmodules: this._gitCommonPropertiesModel.isCheckoutNestedSubmodulesEnabled(),
                errorMessage: this._errorMessage,
                projectVisibility: DefaultRepositorySource.instance().getProjectVisibility(TfsContext.getDefault().contextData.project.id)
            }, advancedOptions) as ITfGitState;
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        buildDefinition = super.updateVisitor(buildDefinition);
        this._gitCommonPropertiesModel.updateVisitor(buildDefinition.repository);
        return buildDefinition;
    }

    public isFetchDepthValid(value: string): boolean {
        return this._gitCommonPropertiesModel.isFetchDepthValid(value);
    }

    protected areRepositoryPropertiesDirty(): boolean {
        let isDirty = (
            !Utils_String.equals(this._repository.properties[RepositoryProperties.ReportBuildStatus], this._originalRepository.properties[RepositoryProperties.ReportBuildStatus], true) ||
            this._gitCommonPropertiesModel.areRepositoryPropertiesDirty()
        );

        return isDirty || super.areRepositoryPropertiesDirty();
    }

    private _getGitRepository(repositoryName: string, forceFetch?: boolean): IPromise<GitRepository> {
        let isNewRepository: boolean = repositoryName !== this._fetchedRepositoryName;

        if (forceFetch || isNewRepository || !this._fetchRepositoryPromise) {
            this._fetchedRepositoryName = repositoryName;
            this._fetchRepositoryPromise = this._getRepository(TfsContext.getDefault(), repositoryName);
        }

        return this._fetchRepositoryPromise;
    }

    private _getRepository(tfsContext: TfsContext, repositoryId: string): IPromise<GitRepository> {
        let tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
        let gitHttpClient = tfsConnection.getHttpClient<VCWebApi.GitHttpClient>(VCWebApi.GitHttpClient);
        return gitHttpClient.beginGetRepository(tfsContext.navigation.projectId, repositoryId);
    }

    private _getSelectedRepository(): GitRepository {
        return {
            id: this._repository.id,
            name: this._repository.name,
            project: {
                id: this._projectInfo ? this._projectInfo.project.id : Context.getDefaultWebContext().project.id
            }
        } as GitRepository;
    }

    public getVersionSpec(branchName: string): VersionSpecs.GitBranchVersionSpec {
        return new VersionSpecs.GitBranchVersionSpec(getRefFriendlyName(branchName));
    }

    protected getRepositoryType(): string {
        return RepositoryTypes.TfsGit;
    }

    protected updateStateFromChangePayload(payload: ITfGitPayload) {
        if (payload.repository) {
            if (!Utils_String.equals(this._repository.id, payload.repository.id, true)) {
                this._repository.defaultBranch = null;
            }

            this._repository.id = payload.repository.id;
            this._repository.url = payload.repository.remoteUrl;
            this._repository.name = payload.repository.name;
            this._repository.defaultBranch = payload.repository.defaultBranch;
        }

        if (payload.version) {
            this._repository.defaultBranch = this.getVersionSpec(payload.version.toDisplayText()).toFullName();
        }

        // If we have a repository but no branches yet, set it to master
        if (!this._repository.defaultBranch) {
            this._repository.defaultBranch = MasterBranch;
        }

        if (payload.reportBuildStatus !== undefined) {
            this._repository.properties[RepositoryProperties.ReportBuildStatus] = payload.reportBuildStatus.toString();
        }

        this._gitCommonPropertiesModel.updateStateChangeFromPayload(payload);

        super.updateStateFromChangePayload(payload);
    }

    private _setDefaultRepositoryProperties(repository: BuildRepository): void {
        if (!repository.properties) {
            repository.properties = {};
        }

        if (!repository.properties[RepositoryProperties.LabelSources]) {
            repository.properties[RepositoryProperties.LabelSources] = "0";
        }

        if (!repository.properties[RepositoryProperties.LabelSourcesFormat]) {
            repository.properties[RepositoryProperties.LabelSourcesFormat] = this.getDefaultSourceLabelFormat();
        }

        if (!repository.properties[RepositoryProperties.ReportBuildStatus]) {
            repository.properties[RepositoryProperties.ReportBuildStatus] = Boolean.falseString;
        }
    }

    public getBranches(): string[] {
        return [];
    }
}

const MasterBranch = "refs/heads/master";
