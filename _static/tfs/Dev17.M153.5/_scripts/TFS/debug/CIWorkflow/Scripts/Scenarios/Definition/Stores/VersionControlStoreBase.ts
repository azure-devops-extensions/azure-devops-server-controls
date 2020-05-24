import * as Q from "q";

import { RepositoryProperties } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { ISourceControlPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import { BuildRepository, BuildDefinition, RepositoryCleanOptions, DefinitionTriggerType } from "TFS/Build/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface ISourcesVersionControlState {
    cleanRepository: string;
    isCleanRepositoryEnabled: boolean;
}

/**
 * @brief Store for select code source in build definition work flow
 */
export abstract class VersionControlStoreBase extends Store {
    protected _repository: BuildRepository;
    protected _originalRepository: BuildRepository;
    protected _definitionId: number;

    private _actions: Actions.BuildDefinitionActions;

    constructor() {
        super();
        this.setInitialRepositories();
    }

    public setInitialRepositories(): void {
        this._repository = <BuildRepository>{
            properties: {},
            clean: "undefined"
        };

        this._repository.properties[RepositoryProperties.CleanOptions] = RepositoryCleanOptions.Source.toString();

        this._originalRepository = <BuildRepository>{
            properties: {},
            clean: "undefined"
        };

        this._originalRepository.properties[RepositoryProperties.CleanOptions] = RepositoryCleanOptions.Source.toString();
    }

    public static getKey(): string {
        return Utils_String.empty;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._actions.updateBuildDefinition.addListener(this._handleUpdateBuildDefinition);
    }

    protected disposeInternal(): void {
        this._actions.updateBuildDefinition.removeListener(this._handleUpdateBuildDefinition);
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        buildDefinition.repository = JSON.parse(JSON.stringify(this._repository));
        return buildDefinition;
    }

    public isDirty(): boolean {
        return (
            this._repository.clean !== this._originalRepository.clean ||
            this.areRepositoryPropertiesDirty()
        );
    }

    public abstract isValid(): boolean;

    public abstract showPathDialog(initialValue: string, callback: (selectedValue: ISelectedPathNode) => void): void;

    protected abstract getRepositoryType(): string;

    public abstract getBranches(): string[];

    public abstract fetchRepositoryFileContent(path: string, callback: (content: any) => void, errorCallback: (error: any) => void): void;

    public abstract isWebhookPresent(type: DefinitionTriggerType): boolean;

    public getState(): ISourcesVersionControlState {
        let cleanOptionText: string = this._getCleanRepositoryOption(this._repository.clean);

        return <ISourcesVersionControlState>{
            cleanRepository: cleanOptionText,
            isCleanRepositoryEnabled: this.isRepositoryCleanEnabled()
        };
    }

    public getCurrentBuildRepository(repositoryType: string): IPromise<BuildRepository> {
        const repositoryName = NavigationUtils.getRepositoryNameFromUrl();
        const buildRepository =  {
            name: repositoryName,
            type: repositoryType
        } as BuildRepository;
        return Q.resolve(buildRepository);
    }

    public getBuildRepository(): BuildRepository {
        return this._repository;
    }

    private _handleUpdateBuildDefinition = (defintion: BuildDefinition) => {
        if (Utils_String.equals(defintion.repository.type, this.getBuildRepository().type, true)) {
            this.updateStatesFromBuildDefinition(defintion);
            this.emitChanged();
        }
    }

    private _getCleanRepositoryOption(repositoryCleanOption: string): string {
        if (repositoryCleanOption === null || repositoryCleanOption === undefined ||
            (repositoryCleanOption && Utils_String.equals(repositoryCleanOption.trim(), "undefined"))) {
            return Boolean.falseString;
        }
        else {
            return repositoryCleanOption;
        }
    }

    protected updateStatesFromBuildDefinition(definition: BuildDefinition) {

        this._definitionId = definition.id;

        if (definition.repository && Utils_String.equals(definition.repository.type, this.getRepositoryType(), true)) {
            this._repository = JSON.parse(JSON.stringify(definition.repository));
            this._originalRepository = JSON.parse(JSON.stringify(definition.repository));
        }
    }

    protected updateStateFromChangePayload(payload: ISourceControlPayload): void {
        if (payload.cleanRepository !== undefined) {
            this._repository.clean = payload.cleanRepository.toString();
        }
    }

    protected isRepositoryCleanEnabled(): boolean {
        //This returns true when clean is set to 'true'
        return (Utils_String.equals(this._repository.clean, Boolean.trueString, true));
    }

    protected areRepositoryPropertiesDirty(): boolean {
        return false;
    }
}
