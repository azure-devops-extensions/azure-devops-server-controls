import { ProcessType, RepositoryTypes, RepositoryProperties } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { BuildDefinitionActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";

import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { IResourceFieldNamePayload, IResourceFieldTypePayload, ResourcesActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/ResourcesActions";
import { YamlDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlDefinitionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { BuildDefinition, YamlProcess, ServiceEndpointReference, AgentPoolQueueReference, VariableGroupReference, BuildProcessResources } from "TFS/Build/Contracts";

import * as UtilsString from "VSS/Utils/String";

export interface IResourceData {
    type: string;
    name: string;
}

export interface IProcessResourcesStoreState {
    resources: IResourceData[];
}

/**
 * @brief This store contains data related to resources of a Yaml definition
 * @returns
 */
export class ProcessResourcesStore extends Store {
    private _isYamlDefinition: boolean = false;
    private _buildDefinitionActions: BuildDefinitionActions;
    private _yamlDefinitionStore: YamlDefinitionStore;
    private _buildDefinition: BuildDefinition;
    private _currentState: IProcessResourcesStoreState = {} as IProcessResourcesStoreState;
    private _originalState: IProcessResourcesStoreState = {} as IProcessResourcesStoreState;

    constructor() {
        super();
        this._currentState = { resources: [] } as IProcessResourcesStoreState;
        this._originalState = { resources: [] } as IProcessResourcesStoreState;
    }

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_ProcessResourceStore;
    }

    public initialize(): void {
        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<BuildDefinitionActions>(BuildDefinitionActions);
        this._actionsHub = ActionsHubManager.GetActionsHub<ResourcesActions>(ResourcesActions);
        this._yamlDefinitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);

        this._buildDefinitionActions.updateBuildDefinition.addListener(this._initializeStates);
        this._buildDefinitionActions.createBuildDefinition.addListener(this._initializeStates);
        this._actionsHub.addResource.addListener(this._addResource);
        this._actionsHub.deleteResource.addListener(this._deleteResource);
        this._actionsHub.updateResourceFieldType.addListener(this._updateResourceType);
        this._actionsHub.updateResourceFieldName.addListener(this._updateResourceName);
        this._yamlDefinitionStore.addChangedListener(this._updateCurrentState);

        this._initializeStates(this._buildDefinition);
    }

    protected disposeInternal(): void {
        this._buildDefinitionActions.updateBuildDefinition.removeListener(this._initializeStates);
        this._buildDefinitionActions.createBuildDefinition.removeListener(this._initializeStates);
        this._actionsHub.addResource.removeListener(this._addResource);
        this._actionsHub.deleteResource.removeListener(this._deleteResource);
        this._actionsHub.updateResourceFieldType.removeListener(this._updateResourceType);
        this._actionsHub.updateResourceFieldName.removeListener(this._updateResourceName);
        this._yamlDefinitionStore.removeChangedListener(this._updateCurrentState);
    }

    public isDirty(): boolean {
        if (!this._isYamlDefinition) {
            return false;
        }

        let isDirty = (this._currentState.resources.length !== this._originalState.resources.length);

        if (!isDirty) {
            return this._currentState.resources.some((resource: IResourceData) => {
                const foundResource = this._originalState.resources.filter((resource) => {
                    return resource;
                });
                return foundResource.length === 0;
            });
        }
        return isDirty;
    }

    public isValid(): boolean {
        return (!this._isYamlDefinition || !this._currentState.resources.some((resource: IResourceData) => {
            return (!resource.type || resource.type.trim() === UtilsString.empty || !resource.name || resource.name.trim() === UtilsString.empty)
        }));
    }

    public getState(): IProcessResourcesStoreState {
        return this._currentState;
    }

    private _initializeStates = (definition: BuildDefinition) => {
        this._isYamlDefinition = this._yamlDefinitionStore.isYaml();

        if (definition) {
            let process = definition.process as YamlProcess;
            this._updateStates(this._currentState, process);
            this._updateStates(this._originalState, process);
            this._buildDefinition = definition;
            this.emitChanged();
        }
    }

    private _addResource = (payload: IEmptyActionPayload) => {
        if (!this._currentState.resources) {
            this._currentState.resources = [];
        }

        this._currentState.resources.push({type: ResourceTypes.QUEUE_TYPE} as IResourceData);

        this.emitChanged();
    }

    private _deleteResource = (index) => {
        if (this._currentState.resources && this._currentState.resources.length > index) {
            this._currentState.resources.splice(index, 1);
            this.emitChanged();
        } 
    }

    private _updateResourceType = (resourceTypePayload: IResourceFieldTypePayload) => {
            this._currentState.resources[resourceTypePayload.index].type = resourceTypePayload.value;
            this.emitChanged();
    }

    private _updateResourceName = (resourceNamePayload: IResourceFieldNamePayload) => {
        this._currentState.resources[resourceNamePayload.index].name = resourceNamePayload.value;
        this.emitChanged();
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        let process = buildDefinition.process as YamlProcess;
        if (process && this._currentState && this._currentState.resources) {
            process.resources = {} as BuildProcessResources;

            this._currentState.resources.forEach((resource: IResourceData) => {
                if (resource && resource.type) {
                    switch (resource.type) {
                        case ResourceTypes.SERVICE_ENDPOINT_TYPE:
                            if (!process.resources.endpoints) {
                                process.resources.endpoints = [];
                            }
                            const newEndpoint = { alias: resource.name } as ServiceEndpointReference;
                            const foundEndpoint = process.resources.endpoints.filter((elem) => {
                                return elem.alias === newEndpoint.alias;
                            });
                            if (foundEndpoint.length === 0 && resource.name && resource.name.trim() !== UtilsString.empty) {
                                process.resources.endpoints.push(newEndpoint);
                            }
                            break;
                        case ResourceTypes.QUEUE_TYPE:
                            if (!process.resources.queues) {
                                process.resources.queues = [];
                            }
                            const newQueue = { alias: resource.name } as AgentPoolQueueReference;
                            const foundQueue = process.resources.queues.filter((elem) => {
                                return elem.alias === newQueue.alias;
                            });
                            if (foundQueue.length === 0 && resource.name && resource.name.trim() !== UtilsString.empty) {
                                process.resources.queues.push(newQueue);
                            }
                            break;
                        case ResourceTypes.VARIABLE_GROUP_TYPE:
                            if (!process.resources.variableGroups) {
                                process.resources.variableGroups = [];
                            }

                            const newVariableGroup = { id: 0, alias: resource.name } as VariableGroupReference;
                            const foundVariableGroup = process.resources.variableGroups.filter((elem) => {
                                return elem.alias === newVariableGroup.alias;
                            });
                            if (foundVariableGroup.length === 0 && resource.name && resource.name.trim() !== UtilsString.empty) {
                                process.resources.variableGroups.push(newVariableGroup);
                            }
                            break;
                        default:
                            break;
                    };
                }
            });
        }

        return buildDefinition;
    }

    private _updateCurrentState = () =>
    {
        // don't provide a process so that the updated one is pulled from the YamlDefinitionStore
        this._updateStates(this._currentState);
    }

    private _updateStates = (state: IProcessResourcesStoreState, process?: YamlProcess) => {
        if (!process) {
            process = this._yamlDefinitionStore.getState().process;
        }

        if (!state) {
            state = this._currentState;
        }

        state.resources = [];

        if (state && process && process.resources) {
            if (process.resources.endpoints) {
                process.resources.endpoints.forEach((endpoint: ServiceEndpointReference, index: number) => {
                    const endpointName = endpoint.alias ? endpoint.alias : endpoint.id;
                    const newResource = { type: ResourceTypes.SERVICE_ENDPOINT_TYPE, name: endpointName } as IResourceData;
                    if (!this._isResourceAlreadyAdded(state, newResource)) {
                        state.resources.push(newResource);
                    }
                });
            }

            if (process.resources.queues) {
                process.resources.queues.forEach((queue: AgentPoolQueueReference, index: number) => {
                    const queueName = queue.alias ? queue.alias : queue.id ? queue.id.toString() : UtilsString.empty;
                    const newResource = { type: ResourceTypes.QUEUE_TYPE, name: queueName } as IResourceData;
                    if (!this._isResourceAlreadyAdded(state, newResource)) {
                        state.resources.push(newResource);
                    }
                });
            }

            if (process.resources.variableGroups) {
                process.resources.variableGroups.forEach((variableGroup: VariableGroupReference, index: number) => {
                    const variableGroupName = variableGroup.alias ? variableGroup.alias : variableGroup.id ? variableGroup.id.toString() : UtilsString.empty;
                    const newResource = { type: ResourceTypes.VARIABLE_GROUP_TYPE, name: variableGroupName } as IResourceData;
                    if (!this._isResourceAlreadyAdded(state, newResource)) {
                        state.resources.push(newResource);
                    }
                });
            }

            this.emitChanged();
        }
    }

    private _isResourceAlreadyAdded = (state: IProcessResourcesStoreState, resource:IResourceData): boolean => {
        const foundResource = state.resources.filter((elem) => {
            return elem.name === resource.name && elem.type === resource.type;
        });
        if (foundResource.length > 1) {
            return true;
        }
    }

    private _actionsHub: ResourcesActions;

}

export class ResourceTypes {
public static SERVICE_ENDPOINT_TYPE = "Service endpoint";
public static QUEUE_TYPE = "Queue";
public static VARIABLE_GROUP_TYPE = "Variable group";
}
