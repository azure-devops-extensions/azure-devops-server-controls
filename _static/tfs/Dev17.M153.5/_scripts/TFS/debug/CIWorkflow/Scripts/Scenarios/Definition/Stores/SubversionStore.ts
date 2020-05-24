import { RepositoryProperties, RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { SourcesSelectionActionsCreator, ISvnPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { ExternalVersionControlStoreBase, IExternalVersionControlBaseState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/ExternalVersionControlStoreBase";
import { ISourcesVersionControlState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStoreBase";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ServiceEndpointType } from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Boolean } from "DistributedTaskControls/Common/Primitives";

import { BuildRepository, BuildDefinition, DefinitionTriggerType, RepositoryCleanOptions, SvnMappingDetails, SvnWorkspace } from "TFS/Build/Contracts";

import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { Uri as Utils_Uri } from "VSS/Utils/Url";
import * as Diag from "VSS/Diag";

export interface ISvnState extends IExternalVersionControlBaseState {
    defaultBranch: string;
    properties: IDictionaryStringTo<string>;
    url: string;
    cleanOptions?: string;
    mappings?: ISubversionMappingItem[];
    mappingIsDeleted?: boolean;
}

export interface ISubversionMappingItem {
    mapping: SvnMappingDetails;
    index: number;
    isDeleted: boolean;
    displayedLocalPath?: string;
    isServerPathDuplicate?: boolean;
    isLocalPathDuplicate?: boolean;
}

export class SubversionStore extends ExternalVersionControlStoreBase {
    public static _defaultServerPath: string = "$(build.sourceBranch)/";
    public static _defaultRevision: string = "HEAD";

    private _sourcesActionCreator: SourcesSelectionActionsCreator;
    private static _defaultBranch: string = "trunk";
    private static _colonInPath: string = ":";
    private static _ellipseInPath: string = "..";
    private static _frontSlashInPath: string = "/";
    private static _backwardSlashInPath: string = "\\";
    private _mappingIsDeleted: boolean = false;

    constructor() {
        super();

        this._initializeRepository(this._repository);
        this._initializeRepository(this._originalRepository, true);
        let defaultMapping: SvnMappingDetails = this._getNewMapping();
        let workspace: SvnWorkspace = {
            mappings: [defaultMapping]
        };
        this._repository.properties[RepositoryProperties.SvnMapping] = JSON.stringify(workspace);
        this._sourcesActionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
    }

    public initialize(): void {
        super.initialize();

        this._sourcesActionCreator.ChangeSvnSource.addListener(this._handleChangeSvnSource);
        this._sourcesActionCreator.AddNewSubversionMapping.addListener(this._handleAddNewSubversionMapping);
    }

    protected disposeInternal(): void {
        this._sourcesActionCreator.ChangeSvnSource.removeListener(this._handleChangeSvnSource);
        this._sourcesActionCreator.AddNewSubversionMapping.removeListener(this._handleAddNewSubversionMapping);

        super.disposeInternal();
    }

    public getState(): ISvnState {
        let advancedOptions: ISourcesVersionControlState = super.getState();

        return JQueryWrapper.extend(
            {
                newConnectionName: this._getNewConnectionName(),
                selectedConnectionId: this._repository.properties[RepositoryProperties.ConnectedServiceId],
                url: this._repository.url,
                defaultBranch: this._getBranchDisplayName(),
                connections: this._connections,
                cleanOptions: this._getSelectedCleanOption(),
                mappings: this._getMappingItemsFromBuildRepository(),
                properties: this._getSourceProperties(),
                showAddConnection: this._showAddConnection,
                errorMessage: this._errorMessage,
                endpointType: this._getServiceEndpointType(),
                mappingIsDeleted: this._mappingIsDeleted
            }, advancedOptions) as ISvnState;
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_SubversionStore;
    }

    public isValid() {
        return (!!this._repository.properties && !!this._repository.properties[RepositoryProperties.ConnectedServiceId] &&
            !!this._repository.defaultBranch && !this._repositoryMappingsInValid());
    }

    public showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) {
    }

    public fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void) {
        if (errorCallback) {
            let errorMessage = Utils_String.format(Resources.RepositoryNotSupportedForFileContent, this._repository.name);
            errorCallback(errorMessage);
        }
    }

    public isWebhookPresent(type: DefinitionTriggerType): boolean {
        return false;
    }

    public isDirty(): boolean {
        return (this._repository.clean !== this._originalRepository.clean ||
            this._repository.checkoutSubmodules !== this._originalRepository.checkoutSubmodules ||
            this._repository.defaultBranch !== this._originalRepository.defaultBranch ||
            this._areMappingsDirty() ||
            this._areCleanOptionsDirty() ||
            this.areRepositoryPropertiesDirty());
    }

    public validateRevision(mapping: SvnMappingDetails): string {
        let errorMessage: string = Utils_String.empty;
        if (mapping.revision) {
            let revision: string = mapping.revision;
            if (!this._isRevisionValid(revision)) {
                errorMessage = Resources.InvalidMappingValue;
            }
        }
        return errorMessage;
    }

    public validateServerPath(mapping: SvnMappingDetails): string {
        let errorMessage: string = Utils_String.empty;
        if (mapping.serverPath) {
            let serverPath: string = mapping.serverPath.trim();
            if (!this._isPathValid(serverPath)) {
                errorMessage = Resources.InvalidMappingValue;
            }
        }
        return errorMessage;
    }

    public validateLocalPath(mapping: SvnMappingDetails): string {
        let errorMessage: string = Utils_String.empty;
        if (mapping.localPath) {
            let localPath: string = mapping.localPath.trim();
            if (!this._isPathValid(localPath)) {
                errorMessage = Resources.InvalidMappingValue;
            }
        }
        return errorMessage;
    }

    public getServiceEndpointType(): string {
        return ServiceEndpointType.Subversion;
    }

    protected getRepositoryType(): string {
        return RepositoryTypes.Svn;
    }

    protected updateStatesFromBuildDefinition(definition: BuildDefinition) {
        super.updateStatesFromBuildDefinition(definition);

        this._setDefaulRepositoryProperties(this._repository);
        this._setDefaulRepositoryProperties(this._originalRepository);
        this._mappingIsDeleted = false;
    }

    protected areRepositoryPropertiesDirty(): boolean {
        const isDirty: boolean = (!!this._repository.properties &&
            this._repository.properties[RepositoryProperties.ConnectedServiceId] !== this._originalRepository.properties[RepositoryProperties.ConnectedServiceId]);

        return isDirty || super.areRepositoryPropertiesDirty();
    }

    protected setSelectedConnection(connectionId: string): void {
        super.setSelectedConnection(connectionId);

        // Set the name of the repository from the URL (mimicking the back-end)
        if (connectionId) {
            const connection = Utils_Array.first(this._connections, c => c.id === connectionId);
            if (connection && connection.url) {
                const uri = new Utils_Uri(connection.url);
                let name = uri.host;
                if (uri.path) {
                    // trim leading and trailing slashes
                    const pathname = uri.path.replace(/^\/|\/$/g, "");
                    if (pathname.length > 0) {
                        name = pathname;
                    }
                }
                this._repository.name = name;
            }
            else {
                this._repository.name = Utils_String.empty;
            }
        }
        else {
            this._repository.name = Utils_String.empty;
        }
    }

    private _setDefaulRepositoryProperties(repository: BuildRepository): void {
        let workspace: SvnWorkspace = { mappings: [] };
        workspace = {
            mappings: [
                {
                    serverPath: SubversionStore._defaultServerPath,
                    localPath: Utils_String.empty,
                    revision: SubversionStore._defaultRevision,
                    depth: 3,
                    ignoreExternals: true
                }
            ]
        };
        if (!repository.properties) {
            repository.properties = {};
        }

        const connectionId = NavigationUtils.getConnectionIdFromUrl();
        if (connectionId)
        {
            repository.properties[RepositoryProperties.ConnectedServiceId] = connectionId;
        }

        if (!repository.properties[RepositoryProperties.CleanOptions]) {
            repository.properties[RepositoryProperties.CleanOptions] = "0";
        }
        if (!repository.properties[RepositoryProperties.SvnMapping]) {
            repository.properties[RepositoryProperties.SvnMapping] = JSON.stringify(workspace);
        }
    }

    private _initializeRepository(repository: BuildRepository, ignorePassedData: boolean = false): void {
        repository.type = RepositoryTypes.Svn;
        repository.clean = Boolean.falseString;
        const repositoryName = !ignorePassedData ? NavigationUtils.getRepositoryNameFromUrl() : null;
        if (repositoryName)
        {
            repository.name = repositoryName;
        }
        const branchName = !ignorePassedData ? NavigationUtils.getBranchNameFromUrl() : null;
        repository.defaultBranch = branchName || ignorePassedData ? branchName : SubversionStore._defaultBranch;

        const connectionId = !ignorePassedData ? NavigationUtils.getConnectionIdFromUrl() : null;
        if (connectionId)
        {
            repository.properties = {};
            repository.properties[RepositoryProperties.ConnectedServiceId] = connectionId;
        }
    }

    private _areCleanOptionsDirty(): boolean {
        if (!!this._repository.properties &&
             this.isRepositoryCleanEnabled() &&
             this._repository.properties[RepositoryProperties.CleanOptions] !== this._originalRepository.properties[RepositoryProperties.CleanOptions]) {
            return true;
        }
        return false;
    }

    private _areMappingsDirty(): boolean {
        let newWorkspace: SvnWorkspace = JSON.parse(this._repository.properties[RepositoryProperties.SvnMapping]);
        let originalWorkspace: SvnWorkspace = JSON.parse(this._originalRepository.properties[RepositoryProperties.SvnMapping]);

        if (newWorkspace.mappings && newWorkspace.mappings.length !== originalWorkspace.mappings.length) {
            return true;
        }

        for (let i = 0, len = newWorkspace.mappings.length; i < len; i++) {
            if (this._isMappingDirty(newWorkspace.mappings[i], originalWorkspace.mappings[i])) {
                return true;
            }
        }
    }

    private _isMappingDirty(newMapping: SvnMappingDetails, oldMapping: SvnMappingDetails): boolean {
        if (!newMapping) {
            return false;
        }

        return (newMapping.depth !== oldMapping.depth) ||
            Utils_String.localeIgnoreCaseComparer(newMapping.serverPath, oldMapping.serverPath) !== 0 ||
            Utils_String.localeIgnoreCaseComparer(newMapping.localPath, oldMapping.localPath) !== 0 ||
            newMapping.ignoreExternals !== oldMapping.ignoreExternals ||
            Utils_String.localeIgnoreCaseComparer(newMapping.revision, oldMapping.revision) !== 0 ;
    }

    private _getMappingItemsFromBuildRepository(): ISubversionMappingItem[] {
        let newWorkspace: SvnWorkspace = {
            mappings: []
        };
        if (!!this._repository.properties && this._repository.properties[RepositoryProperties.SvnMapping]) {
            newWorkspace = JSON.parse(this._repository.properties[RepositoryProperties.SvnMapping]);
        }

        return this._getMappings(newWorkspace.mappings);
    }

    private _getMappings(mappings: SvnMappingDetails[]): ISubversionMappingItem[] {
        let mappingItems: ISubversionMappingItem[] = [];
        mappings.forEach((value: SvnMappingDetails, index: number, array: SvnMappingDetails[]) => {
            mappingItems.push({
                mapping: value,
                index: index,
                isDeleted: false,
            });
        });

        return mappingItems;
    }

    private _handleAddNewSubversionMapping = () => {
        let newMapping = this._getNewMapping();
        let workspace: SvnWorkspace = {
            mappings: []
        };

        if (this._repository.properties && this._repository.properties[RepositoryProperties.SvnMapping]) {
            workspace = JSON.parse(this._repository.properties[RepositoryProperties.SvnMapping]);
        }

        workspace.mappings.push(newMapping);

        this._repository.properties[RepositoryProperties.SvnMapping] = JSON.stringify(workspace);

        this.emitChanged();
    }

    private _getNewMapping(): SvnMappingDetails {
        return {
            serverPath: SubversionStore._defaultServerPath,
            localPath: Utils_String.empty,
            revision: SubversionStore._defaultRevision,
            depth: 3,
            ignoreExternals: true
        };
    }

    private _getSelectedCleanOption(): string {
        return this._repository.properties[RepositoryProperties.CleanOptions] || RepositoryCleanOptions.Source.toString();
    }

    private _getBranchDisplayName(): string {
        return getRefFriendlyName(this._repository.defaultBranch);
    }

    private _getSourceProperties(): IDictionaryStringTo<string> {
        return this._repository.properties;
    }

    private _handleChangeSvnSource = (payload: ISvnPayload) => {
        if (Utils_String.equals(payload.type, this.getRepositoryType(), true)) {
            this._updateStateFromChangePayload(payload);
            this.emitChanged();
        }
    }

    private  _getServiceEndpointType(): string {
        return ServiceEndpointType.Subversion;
    }

    private _updateStateFromChangePayload(payload: ISvnPayload): void {
        super.updateStateFromChangePayload(payload);

        if (payload.showAddConnection !== undefined) {
            this._showAddConnection = payload.showAddConnection;
        }

        if (payload.branchName !== undefined) {
            this._repository.defaultBranch = payload.branchName;
        }

        if (payload.cleanOption) {
            this._repository.properties[RepositoryProperties.CleanOptions] = payload.cleanOption;
        }

        if (payload.mapping) {
            let workspace: SvnWorkspace;
            try {
                workspace = JSON.parse(this._repository.properties[RepositoryProperties.SvnMapping]);
                if (payload.mapping.isDeleted) {
                    this._mappingIsDeleted = true;
                    workspace.mappings.splice(payload.mapping.index, 1);
                }
                else {
                    workspace.mappings[payload.mapping.index] = payload.mapping.mapping;
                }

                this._repository.properties[RepositoryProperties.SvnMapping] = JSON.stringify(workspace);
            }
            catch (e) {
                Diag.logError("[SubversionMapping._parseValue]: Json parsing Error " + e);
            }
        }

        if (payload.connectionId &&
            !Utils_String.equals(this._repository.properties[RepositoryProperties.ConnectedServiceId], payload.connectionId, true)) {
            this._clearRepositoryData();
            this.setSelectedConnection(payload.connectionId);
        }
    }

    private _getNewConnectionName(): string {
        let existingConnectionsCount = this._connections ? this._connections.length + 1 : 1;
        return Utils_String.format(Resources.SourcesConnectionNameFormat, this.getRepositoryType(), existingConnectionsCount);
    }

    private _repositoryMappingsInValid(): boolean {
        if (!!this._repository.properties && this._repository.properties[RepositoryProperties.SvnMapping]) {
            let svnWorkSpace: SvnWorkspace = JSON.parse(this._repository.properties[RepositoryProperties.SvnMapping]);
            for (let i = 0, len = svnWorkSpace.mappings.length; i < len; i++) {
                if (this.validateRevision(svnWorkSpace.mappings[i]) ||
                    this.validateServerPath(svnWorkSpace.mappings[i]) ||
                    this.validateLocalPath(svnWorkSpace.mappings[i])) {
                    return true;
                }
            }
            return false;
        }
        return false;
    }

    private _isRevisionValid(revision: string): boolean {
        if ((revision.length === 0) ||
            (Utils_String.ignoreCaseComparer(revision, SubversionStore._defaultRevision) === 0)) {
            return true;
        }
        return Utils_Number.isPositiveNumber(revision);
    }

    private _isPathValid(path: string): boolean {
        return !((path.indexOf(SubversionStore._colonInPath) >= 0) ||
            (path.indexOf(SubversionStore._ellipseInPath) >= 0) ||
            Utils_String.startsWith(path, SubversionStore._frontSlashInPath) ||
            Utils_String.startsWith(path, SubversionStore._backwardSlashInPath));
    }

    private _clearRepositoryData(): void {
        this._repository.name = Utils_String.empty;
        this._repository.url = Utils_String.empty;
        this._repository.defaultBranch = SubversionStore._defaultBranch;
    }

    public getBranches(): string[] {
        return [];
    }
}
