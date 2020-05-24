
/**
 * @brief Common Service client interface
 * @detail All the service client methods that are common to both CI and CD workflow should be added here.
 */
export interface IServiceClientBase {

    createDefinition<Definition>(definition: Definition, definitionToCloneId?: number, definitionToCloneRevision?: number): IPromise<Definition>;

    updateDefinition<Definition>(definition: Definition, secretsSourceDefinitionId?: number);

    getDefinition<Definition>(definitionId: number, revision?: number, minMetricsTime?: Date, propertyFilters?: string[]): IPromise<Definition>;

    getDefinitionRevisions<DefinitionRevision>(definitionId: number): IPromise<DefinitionRevision[]>;

    getSettings<DefinitionSettings>(): IPromise<DefinitionSettings>;

    getDefinitionRevision<TUnusedTypeParameter>(definitionId: number, revision: number): IPromise<string>;
}

