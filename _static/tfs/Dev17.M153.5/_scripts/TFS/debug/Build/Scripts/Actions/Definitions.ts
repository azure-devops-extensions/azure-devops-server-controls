import { Action } from "VSS/Flux/Action";

import { BuildDefinition, BuildDefinitionReference } from "TFS/Build/Contracts";

import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";

export interface DefinitionUpdatedPayload {
    definitionId: number;
    definition?: BuildDefinition;
    behavior?: IDefinitionsBehavior;
}

export interface DefinitionsUpdatedPayload {
    // dictionary so we can track misses as well as hits
    definitions: IDictionaryNumberTo<BuildDefinitionReference>;
    behavior?: IDefinitionsBehavior;
}

export var definitionUpdated = new Action<DefinitionUpdatedPayload>();
export var definitionsUpdated = new Action<DefinitionsUpdatedPayload>();
export var definitionDeleted = new Action<BuildDefinitionReference>();