/**
 * @brief Core properties of a Deploy pipeline definition
 */

import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as RegexConstants from "DistributedTaskControls/Common/RegexConstants";

import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DefinitionUtils } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionUtils";
import { IUpdateDefinitionActionPayload, DefinitionActionsHub, IChangeDefinitionNamePayload } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActions";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Core information being maintained in the store
 * @important Make sure that isDirty(), isValid() and updateVisitor() methods are update if the interface is changed
 */
export interface ICoreDefinition {
    name: string;
    releaseNameFormat: string;
    id: number;
    revision: number;
    folderPath: string;
}

/**
 * @brief The store contains core properties of a DeployPipeline definition
 */
export class CoreDefinitionStore extends DataStoreBase {

    constructor() {
        super();
        this._currentState = {} as ICoreDefinition;
        this._originalState = {} as ICoreDefinition;
        this._definitionActionsHub = ActionsHubManager.GetActionsHub<DefinitionActionsHub>(DefinitionActionsHub);
    }

    /**
     * @brief Returns the store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineCoreDefinitionStoreKey;
    }

    /**
     * @brief Initializing the Store
     * - Creating and adding stores to store-list
     * - Initialize action listeners
     */
    public initialize(): void {
        Diag.logVerbose("[CoreDefinitionStore.initiliaze]: store getting initialized.");
        this._definitionActionsHub.createDefinition.addListener(this._handleCreateDefinition);
        this._definitionActionsHub.updateDefinition.addListener(this._handleUpdateDefinition);
        this._definitionActionsHub.changeDefinitionName.addListener(this._handleChangeDefinitionName);
    }

    /**
     * @brief Cleanup on dispose
     */
    public disposeInternal(): void {
        Diag.logVerbose("[CoreDefinitionStore.disposeInternal]: store getting disposed");

        this._definitionActionsHub.createDefinition.removeListener(this._handleCreateDefinition);
        this._definitionActionsHub.updateDefinition.removeListener(this._handleUpdateDefinition);
        this._definitionActionsHub.changeDefinitionName.removeListener(this._handleChangeDefinitionName);
    }

    /**
     * @brief Return if store is dirty
     */
    public isDirty(): boolean {
        return (this._originalState.id <= 0)
            || (this._currentState.name !== this._originalState.name)
            || (this._currentState.releaseNameFormat !== this._originalState.releaseNameFormat);
    }

    /**
     * @brief Return if store is valid
     */
    public isValid(): boolean {
        let definitionName = (this._currentState.name ? this._currentState.name.trim() : Utils_String.empty);
        return DefinitionUtils.isDefinitionNameValid(definitionName);
    }

    public updateVisitor(definition: PipelineDefinition): PipelineDefinition {
        definition.name = this._currentState.name;
        definition.id = this._currentState.id;
        definition.releaseNameFormat = this._currentState.releaseNameFormat;
        definition.revision = this._currentState.revision;
        definition.path = this._currentState.folderPath;
        return definition;
    }

    /**
     * @brief Returns the current state of the store
     */
    public getState(): ICoreDefinition {
        return this._currentState;
    }

    private _handleCreateDefinition = (definition: PipelineDefinition) => {
        this._handleCreateOrUpdateDefinition(definition);
        this.emitChanged();
    }

    private _handleUpdateDefinition = (actionPayload: IUpdateDefinitionActionPayload) => {
        this._handleCreateOrUpdateDefinition(actionPayload.definition);
        if (actionPayload.forceUpdate)
        {
            this.emitChanged();
        }
    }

    private _handleCreateOrUpdateDefinition(definition: PipelineDefinition): void {
        this._initializeState(this._currentState, definition);
        this._initializeState(this._originalState, definition);
    }

    private _handleChangeDefinitionName = (releaseDefinitionNamePayload: IChangeDefinitionNamePayload) => {
        // Name will be updated when:
        // 1. Default name is not provided, i.e., the action is not related to assigning unique name to release definition
        // 2. Default name matches with current name, i.e., actoin called to assign unique name and user till then has not changed the name
        if (!releaseDefinitionNamePayload.defaultName || releaseDefinitionNamePayload.defaultName === this._currentState.name) {
            this._currentState.name = releaseDefinitionNamePayload.name;
            this.emitChanged();
        }
    }

    private _initializeState(state: ICoreDefinition, definition: PipelineDefinition): void {
        state.id = definition.id;
        state.name = definition.name;
        state.releaseNameFormat = definition.releaseNameFormat;
        state.revision = definition.revision;
        state.folderPath = definition.path;
    }

    private _currentState: ICoreDefinition;
    private _originalState: ICoreDefinition;
    private _definitionActionsHub: DefinitionActionsHub;
}

