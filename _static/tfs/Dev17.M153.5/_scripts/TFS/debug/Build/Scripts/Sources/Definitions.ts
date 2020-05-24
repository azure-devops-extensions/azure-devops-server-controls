import Q = require("q");

import { definitionMetricsRetrieved, DefinitionMetric } from "Build/Scripts/Actions/DefinitionMetrics";
import { definitionDeleted, definitionUpdated, definitionsUpdated } from "Build/Scripts/Actions/Definitions";
import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";
import { FavoriteStoreNames } from "Build/Scripts/Constants";
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import { sanitizePath } from "Build/Scripts/Folders";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { getUtcDateString } from "Build/Scripts/Utilities/DateUtility";

import { GetDefinitionsResult, GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { BuildClientService } from "Build.Common/Scripts/ClientServices";

import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";

import { BuildDefinition, BuildDefinitionReference, TypeInfo } from "TFS/Build/Contracts";

import { ContractSerializer } from "VSS/Serialization";
import { VssConnection } from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";

export class DefinitionSource extends TfsService {
    private _initialized: boolean = false;
    private _buildService: BuildClientService;

    private _getOperations: IDictionaryNumberTo<IPromise<BuildDefinition>> = {};
    private _deleteOperations: IDictionaryNumberTo<IPromise<any>> = {};

    public initializeConnection(connection: VssConnection): void {
        super.initializeConnection(connection);

        this._buildService = this.getConnection().getService(BuildClientService);
    }

    public getDefinition(definitionId: number, ignore404?: boolean): IPromise<BuildDefinition> {
        return this._getDefinition(definitionId, ignore404);
    }

    public getDefinitions(filter?: GetDefinitionsOptions, behavior?: IDefinitionsBehavior): IPromise<GetDefinitionsResult> {
        if (filter) {
            if (filter.path) {
                filter.path = sanitizePath(filter.path);
            }

            if (filter.definitionIds) {
                let definitionIds = Utils_Array.unique(filter.definitionIds.split(",")).map(id => parseInt(id));
                filter.definitionIds = definitionIds.join(",");
            }
        }

        return this._buildService.getDefinitions(filter)
            .then((definitionsResult) => {
                let definitions: IDictionaryNumberTo<BuildDefinitionReference> = {};

                if (!!filter && filter.definitionIds) {
                    // we might not get back some definitions, if that's the case ensure that we update those states
                    let obtainedDefinitionIds = definitionsResult.definitions.map((definition) => {
                        return definition.id;
                    });

                    let toObtainDefinitionIds = filter.definitionIds.split(",").map((definitionId) => {
                        return parseInt(definitionId);
                    });

                    let notRetreivedDefinitionIds = Utils_Array.subtract(toObtainDefinitionIds, obtainedDefinitionIds);
                    notRetreivedDefinitionIds.forEach((id) => {
                        definitions[id] = null;
                    });
                }

                definitionsResult.definitions.forEach((definition) => {
                    definitions[definition.id] = definition;
                });
                this._invokeDefinitionsUpdated(definitions, behavior);

                return definitionsResult;
            }, (error) => {
                // don't pop a box for 404. the user might have View Builds but not View Definition permission, which is a valid case
                // instead, the consumer will have to deal with the IPendingResult.result being null
                if (error.status !== 404) {
                    raiseTfsError(error);
                }

                // no definitions
                return {
                    definitions: [],
                    continuationToken: null
                };
            });
    }

    public updateDefinition(definition: BuildDefinition): IPromise<void> {
        return this._buildService.updateDefinition(definition).then((definition) => {
            this._invokeDefinitionUpdated(definition.id, definition);
        }, (error) => {
            raiseTfsError(error);
        });
    }

    public updateDefinitionPath(definitionId: number, path: string): IPromise<BuildDefinition | void> {
        // get the latest version of the definition and update its path
        return this._getDefinition(definitionId, false)
            .then<void | BuildDefinition>((definition) => {// update path if necessary
                if (definition.path !== path) {
                    definition.path = path;
                    return this.updateDefinition(definition);
                }
                else {
                    return definition;
                }
            });
    }

    public deleteDefinition(definition: BuildDefinitionReference): IPromise<any> {
        if (!this._deleteOperations[definition.id]) {
            this._deleteOperations[definition.id] = this._buildService.deleteDefinition(definition.id)
                .then(() => {
                    delete this._deleteOperations[definition.id];
                    this._invokeDefinitionDeleted(definition);
                }, (err) => {
                    delete this._deleteOperations[definition.id];
                    raiseTfsError(err);
                });
        }

        return this._deleteOperations[definition.id];
    }

    public renameDefinition(definitionId: number, name: string): IPromise<BuildDefinition | void> {
        // get the latest version of the definition and rename it
        return this._getDefinition(definitionId, false)
            .then<BuildDefinition | void>((definition) => {// update path if necessary
                if (definition.name !== name) {
                    definition.name = name;
                    return this.updateDefinition(definition);
                }
                else {
                    return definition;
                }
            });
    }

    public initializeDefinitions(allDefinitions: BuildDefinitionReference[]): void {
        if (!this._initialized) {
            this._initialized = true;

            let definitionsById: IDictionaryNumberTo<BuildDefinitionReference> = {};
            allDefinitions.forEach((definition) => {
                definitionsById[definition.id] = definition;
            });

            this._invokeDefinitionsUpdated(definitionsById);
        }
    }

    private _getDefinition(definitionId: number, ignore404: boolean): IPromise<BuildDefinition> {
        if (!this._getOperations[definitionId]) {
            let deferred = Q.defer<BuildDefinition>();

            // passing minMetricsTime as a temporary workaround until the Summary tab has a data provider
            this._buildService.getDefinition(definitionId, null, <Date>(<any>getUtcDateString(7)))
                .then((definition) => {
                    delete this._getOperations[definitionId];

                    this._invokeDefinitionUpdated(definitionId, definition);

                    deferred.resolve(definition);
                }, (err) => {
                    delete this._getOperations[definitionId];

                    if (!ignore404 || err.status !== 404) {
                        raiseTfsError(err);
                    }

                    this._invokeDefinitionDeleted(<BuildDefinitionReference>{ id: definitionId });

                    deferred.reject(err);
                });

            this._getOperations[definitionId] = deferred.promise;
        }

        return this._getOperations[definitionId];
    }

    private _invokeDefinitionsUpdated(definitions: IDictionaryNumberTo<BuildDefinitionReference>, behavior?: IDefinitionsBehavior): void {
        let updatedMetrics: DefinitionMetric[] = [];

        for (let definitionId in definitions) {
            let definition = definitions[definitionId];
            if (definition && definition.metrics) {
                updatedMetrics.push({
                    definitionId: definition.id,
                    metrics: definition.metrics
                });
            }
        }
        definitionsUpdated.invoke({
            definitions: definitions,
            behavior: behavior
        });

        if (updatedMetrics.length > 0) {
            definitionMetricsRetrieved.invoke({
                metrics: updatedMetrics,
                behavior: behavior,
            });
        }
    }

    private _invokeDefinitionUpdated(definitionId: number, definition: BuildDefinition): void {
        definitionUpdated.invoke({
            definitionId: definitionId,
            definition: definition
        });

        if (definition && definition.metrics) {
            definitionMetricsRetrieved.invoke({
                metrics: [
                    {
                        definitionId: definitionId,
                        metrics: definition.metrics
                    }
                ]
            });
        }
    }

    private _invokeDefinitionDeleted(definition: BuildDefinitionReference): void {
        definitionDeleted.invoke(definition);
    }
}
