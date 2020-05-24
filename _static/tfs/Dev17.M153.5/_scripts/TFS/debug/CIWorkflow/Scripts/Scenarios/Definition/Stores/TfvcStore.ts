import { RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { TfvcConstants } from "CIWorkflow/Scripts/Common/Constants";
import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ITfvcPayload, IProjectUpdate } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { TfSourceControlStoreBase } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfSourceControlStoreBase";
import {  ISourceLabelProps } from "CIWorkflow/Scripts/Common/ScmUtils";
import { TfvcMappingHelper, ITfvcMappingItem } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcMappingHelper";
import { ISourcesVersionControlState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStoreBase";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildRepository, BuildResult, BuildDefinition, DefinitionTriggerType, RepositoryCleanOptions, BuildWorkspace, MappingDetails } from "TFS/Build/Contracts";
import { GitRepository, VersionControlProjectInfo } from "TFS/VersionControl/Contracts";

import * as AddPathDialog_NO_REQUIRE from "VersionControl/Scripts/Controls/AddPathDialog";
import * as VCClient from "VersionControl/Scripts/TFS.VersionControl.ClientServices";
import * as VersionSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import * as Dialogs from "VSS/Controls/Dialogs";
import * as Diag from "VSS/Diag";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export interface ITfvcState extends ISourcesVersionControlState {
    name: string;
    rootFolder: string;
    url: string;
    tfvcAsGit: GitRepository;
    projectInfo: VersionControlProjectInfo;
    mappings: ITfvcMappingItem[];
    sourceLabel: ISourceLabelProps;
    cleanOptions?: string;
    baseMappingIndex?: number;
    focusIndex?: number;
}

/**
 * @brief Store for select code source in build definition work flow
 */
export class TfvcStore extends TfSourceControlStoreBase {
    private _mappingHelper: TfvcMappingHelper;
    private static _defaultLocalpath: string = "\\";
    private _baseMappingIndex: number = 0;

    constructor() {
        super();

        this._initializeRepository(this._repository, true);
        this._initializeRepository(this._originalRepository, false);

        // showPathDialog function below requires these scripts, so loading them here in anticipation that user will click on browse
        VSS.using(["VersionControl/Scripts/Controls/AddPathDialog"], (AddPathDialog: typeof AddPathDialog_NO_REQUIRE) => {
        });
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_TfvcStore;
    }

    public initialize(): void {
        super.initialize();

        this._buildDefinitionActions.createBuildDefinition.addListener(this._handleCreateBuildDefinition);
        this._sourceSelectionActionsCreator.ChangeTfvcSource.addListener(this._handleChangeTfvcSource);
        this._sourceSelectionActionsCreator.TfSourceProjectChanged.addListener(this._handleTfSourceProjectChanged);
        this._sourceSelectionActionsCreator.AddNewTfvcMapping.addListener(this._handleAddNewTfvcMapping);

        this._mappingHelper = new TfvcMappingHelper();
    }

    public validateServerMapping(mappingDetail: ITfvcMappingItem): string {
        return this._validateModifiedMapping(mappingDetail, true);
    }

    public validateLocalMapping(mappingDetail: ITfvcMappingItem): string {
        return this._validateModifiedMapping(mappingDetail, false);
    }

    protected disposeInternal(): void {
        this._sourceSelectionActionsCreator.ChangeTfvcSource.removeListener(this._handleChangeTfvcSource);
        this._sourceSelectionActionsCreator.AddNewTfvcMapping.removeListener(this._handleAddNewTfvcMapping);
        this._sourceSelectionActionsCreator.TfSourceProjectChanged.removeListener(this._handleTfSourceProjectChanged);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._handleCreateBuildDefinition);

        super.disposeInternal();
    }

    protected updateStatesFromBuildDefinition(definition: BuildDefinition) {

        super.updateStatesFromBuildDefinition(definition);

        this._setDefaultRepositoryProperties(this._repository);
        this._setDefaultRepositoryProperties(this._originalRepository);
    }

    private _setDefaultRepositoryProperties(repository: BuildRepository): void {
        let workspace: BuildWorkspace = { mappings: [] };
        workspace = {
            mappings: [
                {
                    mappingType: TfvcConstants.MappingType_Map,
                    serverPath: this._repository.rootFolder,
                    localPath: TfvcStore._defaultLocalpath
                },
            ]
        };
        if (!repository.properties) {
            repository.properties = {};
        }
        if (!repository.properties[RepositoryProperties.CleanOptions]) {
            repository.properties[RepositoryProperties.CleanOptions] = "0";
        }
        if (!repository.properties[RepositoryProperties.LabelSources]) {
            repository.properties[RepositoryProperties.LabelSources] = "0";
        }
        if (!repository.properties[RepositoryProperties.TfvcMapping]) {
            repository.properties[RepositoryProperties.TfvcMapping] = JSON.stringify(workspace);
        }
    }

    private _initializeRepository(repository: BuildRepository, includeWorkspacemappings: boolean, IgnorePassedRepository?: boolean): void {
        let repositoryName = !IgnorePassedRepository ? NavigationUtils.getRepositoryNameFromUrl() : null;
        if (!repositoryName)
        {
            repositoryName = this._projectInfo ? this._projectInfo.project.name : TfsContext.getDefault().navigation.project;
        }
        let tfsContext = TfsContext.getDefault();
        repository.type = RepositoryTypes.TfsVersionControl;
        repository.clean = Boolean.falseString;
        repository.rootFolder = TfvcConstants.DefaultTfvcPrefix + repositoryName;
        repository.defaultBranch = repository.rootFolder; // defaultBranch is used by the queue build dialog
        repository.url = tfsContext.navigation.collection && tfsContext.navigation.collection.uri;
        repository.name = repositoryName;

        let workspace: BuildWorkspace = { mappings: [] };
        if (includeWorkspacemappings) {
            workspace = {
                mappings: [
                    {
                        mappingType: TfvcConstants.MappingType_Map,
                        serverPath: repository.rootFolder,
                        localPath: "\\"
                    },
                ]
            };
        }

        repository.properties = repository.properties || {};
        repository.properties[RepositoryProperties.TfvcMapping] = JSON.stringify(workspace);

        repository.properties[RepositoryProperties.LabelSources] = Utils_String.empty + BuildResult.None;
        repository.properties[RepositoryProperties.LabelSourcesFormat] = this.getDefaultSourceLabelFormat();
    }

    private _getTfvcRepositoryAsGit(): GitRepository {
        let tfvcRepository = null;
        if (this._projectInfo && this._projectInfo.supportsTFVC) {
            // This is how VersionControl shows both tfvc and git in the same control - see /Tfs/Service/WebAccess/VersionControl/Scripts/Views/BaseView.ts
            tfvcRepository = {
                name: TfvcConstants.DefaultTfvcPrefix + this._projectInfo.project.name,
                project: this._projectInfo.project
            } as GitRepository;
        }

        return tfvcRepository;
    }

    private _handleTfSourceProjectChanged = (projectUpdate: IProjectUpdate) => {
         // Since there is no project selection in tfvc only change the project if the current project does not have tfvc repos
         if (!this._projectInfo || !this._projectInfo.supportsTFVC)
         {
            this._projectInfo = projectUpdate.projectInfo;
            const repo: BuildRepository = {} as BuildRepository;
            this._initializeRepository(repo, true, true);
            this._repository = repo;
            this.emitChanged();
        }
    }

    private _handleChangeTfvcSource = (payload: ITfvcPayload) => {
        this.updateStateFromChangePayload(payload);
        this.emitChanged();
    }

    private _handleAddNewTfvcMapping = () => {
        let newMapping = this._getNewMapping();
        let workspace: BuildWorkspace = JSON.parse(this._repository.properties[RepositoryProperties.TfvcMapping]);
        workspace.mappings.push(newMapping);

        this._repository.properties[RepositoryProperties.TfvcMapping] = JSON.stringify(workspace);

        this.emitChanged();
    }

    private _getNewMapping(): MappingDetails {
        return {
            mappingType: TfvcConstants.MappingType_Map,
            serverPath: Utils_String.empty,
            localPath: TfvcStore._defaultLocalpath
        };
    }

    private _handleCreateBuildDefinition = (payload: BuildDefinition) => {
        if (payload && payload.repository && Utils_String.equals(this.getRepositoryType(), payload.repository.type, true)) {
            this._repository.name = payload.repository.name;
            this._repository.url = payload.repository.url;
            this._repository.rootFolder = payload.repository.rootFolder;

            this.emitChanged();
        }
    }

    public isDirty(): boolean {
        return (this._areMappingsDirty() || super.isDirty());
    }

    public isValid(): boolean {
        return (this._areMappingsValid() && super.isLabelFormatValid());
    }

    private _areMappingsDirty(): boolean {
        let newWorkspace: BuildWorkspace = JSON.parse(this._repository.properties[RepositoryProperties.TfvcMapping]);
        let originalWorkspace: BuildWorkspace = JSON.parse(this._originalRepository.properties[RepositoryProperties.TfvcMapping]);

        if (newWorkspace.mappings && newWorkspace.mappings.length !== originalWorkspace.mappings.length) {
            return true;
        }

        for (let i = 0, len = newWorkspace.mappings.length; i < len; i++) {
            if (this._isMappingDirty(newWorkspace.mappings[i], originalWorkspace.mappings[i])) {
                return true;
            }
        }
    }

    private _isMappingDirty(newMapping: MappingDetails, oldMapping: MappingDetails): boolean {
        if (!newMapping) {
            return false;
        }

        return Utils_String.localeIgnoreCaseComparer(newMapping.mappingType, oldMapping.mappingType) !== 0 ||
            Utils_String.localeIgnoreCaseComparer(newMapping.serverPath, oldMapping.serverPath) !== 0 ||
            (Utils_String.localeIgnoreCaseComparer(newMapping.localPath, oldMapping.localPath) !== 0 &&
                this._isLocalPathVisible(newMapping));
    }

    private _areMappingsValid(): boolean {
        let newWorkspace: BuildWorkspace = JSON.parse(this._repository.properties[RepositoryProperties.TfvcMapping]);
        return this._validateMappings(newWorkspace.mappings).isValid;
    }

    private _validateMappings(mappings: MappingDetails[], updateServerPathDuplicateStatus?: (valid: boolean, index: number, path: string, invalidFormat: boolean) => void, updateLocalPathDuplicateStatus?: (valid: boolean, index: number, path: string, invalidFormat: boolean) => void): WorkspaceStatus {

        let serverPaths: string[] = [];
        let localPaths: string[] = [];
        let isServerPathValid: boolean = true;
        let isLocalPathValid: boolean = true;
        let workspaceStatus: WorkspaceStatus = { isValid: (mappings && mappings.length > 0), mappingsStatus: []};

        // If the mapppings list is empty
        if (!workspaceStatus.isValid)
        {
            return workspaceStatus;
        }

        mappings.forEach((value, index, array) => {
            isServerPathValid = true;
            isLocalPathValid = true;

            let cleanServerPath = this._mappingHelper.getCleanTfvcPath(value.serverPath);
            let cleanLocalPath = this._mappingHelper.getCleanTfvcPath(value.localPath);

            // check for duplicated server paths
            if (serverPaths.some((path, index, array) => {
                return  cleanServerPath === path;
            })) {
                isServerPathValid = false;
                workspaceStatus.isValid = false;

                if (updateServerPathDuplicateStatus) {
                    updateServerPathDuplicateStatus(false, index, cleanServerPath, false);
                }
            }
            else {
                serverPaths.push(cleanServerPath);
                if (updateServerPathDuplicateStatus && index === 0) {
                    updateServerPathDuplicateStatus(true, index, cleanServerPath, false);
                }
            }

            // check for duplicated local paths
            if (this._isLocalPathVisible(value)) {
                if (localPaths.some((path, index, array) => {
                    return cleanLocalPath === path;
                })) {
                    isLocalPathValid = false;
                    workspaceStatus.isValid = false;

                    if (updateLocalPathDuplicateStatus) {
                        updateLocalPathDuplicateStatus(false, index, cleanLocalPath, false);
                    }
                }
                else {
                    localPaths.push(cleanLocalPath);

                    if (updateLocalPathDuplicateStatus && index === 0) {
                        updateLocalPathDuplicateStatus(true, index, cleanLocalPath, false);
                    }
                }
            }

            if (this._isServerPathInvalid(value)) {
                isServerPathValid = false;
                workspaceStatus.isValid = false;

                if (updateServerPathDuplicateStatus) {
                    updateServerPathDuplicateStatus(false, index, cleanServerPath, true);
                }
            }

            const mappingStatus = { isServerPathValid: isServerPathValid, isLocalPathValid: isLocalPathValid } as MappingStatus;
            workspaceStatus.mappingsStatus.push(mappingStatus);
        });

        return workspaceStatus;
    }

    private _isServerPathInvalid(mapping: MappingDetails): boolean {
        let serverPath = mapping.serverPath.trim();
        return serverPath.length === 0 ||
            serverPath.indexOf(TfvcConstants.DefaultTfvcPrefix) !== 0;
    }

    private _isLocalPathVisible(mapping: MappingDetails): boolean {
        // local path shouldn't be invalid if there is no local path
        return Utils_String.localeIgnoreCaseComparer(mapping.mappingType, TfvcConstants.MappingType_Map) === 0;
    }

    private _validateModifiedMapping(mappingDetail: ITfvcMappingItem, validateServerMapping: boolean): string {
        let isValid: boolean = true;
        let isDuplicateValue: boolean = false;
        let errorMessage: string = Utils_String.empty;
        let newWorkspace: BuildWorkspace = JSON.parse(this._repository.properties[RepositoryProperties.TfvcMapping]);
        newWorkspace.mappings[mappingDetail.index] = mappingDetail.mapping;

        let onDuplicateMappingFound = (valid: boolean, index: number, path: string, invalidFormat: boolean) => {
            let currentPath: string = validateServerMapping ? mappingDetail.mapping.serverPath : mappingDetail.mapping.localPath;
            if (mappingDetail.index <= index && currentPath === path) {
                isValid = valid;
                if (!valid && !invalidFormat) {
                    isDuplicateValue = true;
                }
            }
        };

        const workspaceStatus = this._validateMappings(
            newWorkspace.mappings,
            validateServerMapping ? onDuplicateMappingFound : null,
            !validateServerMapping ? onDuplicateMappingFound : null
        );

        const isMappingValid = (validateServerMapping && workspaceStatus.mappingsStatus[mappingDetail.index].isServerPathValid) || (!validateServerMapping && workspaceStatus.mappingsStatus[mappingDetail.index].isLocalPathValid);

        if (!isValid || !isMappingValid) {
            if (isDuplicateValue) {
                errorMessage = Resources.DuplicateMappingError;
            }
            else {
                errorMessage = Resources.InvalidMappingValue;
            }
        }

        return errorMessage;
    }

    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode, selctedFromPicker?: boolean) => void) {
        VSS.using(["VersionControl/Scripts/Controls/AddPathDialog"], (AddPathDialog: typeof AddPathDialog_NO_REQUIRE) => {
            let tfsContext = TfsContext.getDefault();
            let dialogModel = new AddPathDialog.AddPathDialogModel();

            dialogModel.initialPath = TfvcConstants.DefaultTfvcPrefix;
            dialogModel.addSlashToPathToGetSelection = false;

            // Initialize input model
            dialogModel.inputModel = new AddPathDialog.InputModel();
            dialogModel.inputModel.path(initialValue);

            // set the repository context
            dialogModel.repositoryContext = new TfvcRepositoryContext(tfsContext, "");

            // set the callabck
            dialogModel.okCallback = (result) => { callback(result, true); };

            // Show the dialog
            Dialogs.show(AddPathDialog.AddPathDialog, dialogModel);
        });
    }

    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        let tfsContext = TfsContext.getDefault();
        let repositoryContext = VCClient.getContext(tfsContext);
        let repoClient = repositoryContext.getClient();
        let version = new VersionSpecs.LatestVersionSpec().toVersionString();

        repoClient.beginGetItemContent(repositoryContext, path, version, callback, errorCallback);
    }

    public isWebhookPresent(type: DefinitionTriggerType): boolean {
        return false;
    }

    public getState(): ITfvcState {
        let advancedOptions: ISourcesVersionControlState = super.getState();

        return JQueryWrapper.extend(
            {
                name: this._repository.name,
                url: this._repository.url,
                rootFolder: TfvcConstants.DefaultTfvcPrefix,
                tfvcAsGit: this._getTfvcRepositoryAsGit(),
                projectInfo: this._projectInfo,
                mappings: this._getMappingItemsFromBuildRepository(),
                reportBuildStatus: this._getReportBuildStatusOption(),
                sourceLabel: this._getSelectedSourceLabel(),
                cleanOptions: this._getSelectedCleanOption(),
                baseMappingIndex: this._baseMappingIndex
            }, advancedOptions) as ITfvcState;
    }

    private _getMappingItemsFromBuildRepository(): ITfvcMappingItem[] {
        let newWorkspace: BuildWorkspace = JSON.parse(this._repository.properties[RepositoryProperties.TfvcMapping]);

        return this._getMappings(newWorkspace.mappings);
    }

    private _getMappings(mappings: MappingDetails[]): ITfvcMappingItem[] {
        let mappingItems: ITfvcMappingItem[] = [];
        mappings.forEach((value: MappingDetails, index: number, array: MappingDetails[]) => {
            mappingItems.push({
                mapping: {
                    serverPath: value.serverPath,
                    localPath: value.localPath,
                    mappingType: value.mappingType
                },
                index: index,
                isDeleted: false,
                displayedLocalPath: this._mappingHelper.convertLocalPathToDisplay(value.localPath)
            });
        });

        return mappingItems;
    }

    protected getRepositoryType(): string {
        return RepositoryTypes.TfsVersionControl;
    }

    protected updateStateFromChangePayload(payload: ITfvcPayload) {
        if (payload.mapping) {
            let workspace: BuildWorkspace;
            try {
                workspace = JSON.parse(this._repository.properties[RepositoryProperties.TfvcMapping]);
            } catch (e) {
                Diag.logError("[Tfvcmapping._parseValue]: Json parsing Error " + e);
                return;
            }

            if (payload.mapping.isDeleted) {
                if (!this._baseMappingIndex) {
                    this._baseMappingIndex = workspace.mappings.length;
                }
                else {
                    this._baseMappingIndex = this._baseMappingIndex + workspace.mappings.length;
                }
                workspace.mappings.splice(payload.mapping.index, 1);
            }
            else {
                let existingServerPath: string = workspace.mappings[payload.mapping.index].serverPath;
                let existingLocalPath: string = workspace.mappings[payload.mapping.index].localPath;
                workspace.mappings[payload.mapping.index] = payload.mapping.mapping;

                if (!Utils_String.equals(existingLocalPath.substr(1), payload.mapping.displayedLocalPath, true)) {
                    workspace.mappings[payload.mapping.index].localPath = TfvcStore._defaultLocalpath + payload.mapping.displayedLocalPath;
                }

                else {
                    if (!Utils_String.equals(existingServerPath, payload.mapping.mapping.serverPath, true)) {
                        // try and generate local path mapping from server path if applicable and not already edited.
                        // Local path should be genrated only when server path is selected from picker.
                        if (payload.mapping.selectedFromPicker) {
                            let mappingItems: ITfvcMappingItem[] = this._getMappings(workspace.mappings);

                            //Old value for serverPath should be used so we can figure out which paths are generated vs. manually input
                            mappingItems[payload.mapping.index].mapping.serverPath = existingServerPath;

                            let mappingsForLocalPathGeneration: ITfvcMappingItem[] = this._mappingHelper.getMappingsEligibleForGeneration(mappingItems);

                            let currentMapping = Utils_Array.first(mappingsForLocalPathGeneration, (mappingForLocalPathGeneration) => {
                                return mappingForLocalPathGeneration.index === payload.mapping.index;
                            });
                            if (currentMapping) {
                                currentMapping.mapping.serverPath = payload.mapping.mapping.serverPath;
                            }

                            this._mappingHelper.generateLocalMappings(mappingsForLocalPathGeneration);

                            mappingsForLocalPathGeneration.forEach((item: ITfvcMappingItem, index: number, arry: ITfvcMappingItem[]) => {
                                workspace.mappings[item.index] = item.mapping;
                            });
                        }
                    }
                }
            }

            this._repository.properties[RepositoryProperties.TfvcMapping] = JSON.stringify(workspace);
        }

        if (payload.cleanOption) {
            this._repository.properties[RepositoryProperties.CleanOptions] = payload.cleanOption;
        }

        super.updateStateFromChangePayload(payload);
    }

    private _getSelectedCleanOption(): string {
        return this._repository.properties[RepositoryProperties.CleanOptions] || RepositoryCleanOptions.Source.toString();
    }

    public getBranches(): string[] {
        return [];
    }
}

class MappingStatus {
    public isLocalPathValid: boolean;
    public isServerPathValid: boolean;
}

class WorkspaceStatus {
    public isValid: boolean;
    public mappingsStatus: MappingStatus[];
}


