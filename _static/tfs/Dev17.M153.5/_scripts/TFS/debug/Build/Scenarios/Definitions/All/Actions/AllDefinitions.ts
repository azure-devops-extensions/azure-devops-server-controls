import { GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";

import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";

import { Action } from "VSS/Flux/Action";

export interface AllDefinitionsUpdatedPayload {
    filter: GetDefinitionsOptions;
    append: boolean;
    definitionIds: number[];
    continuationToken: string;
    behavior?: IDefinitionsBehavior;
}
export var allDefinitionsUpdated = new Action<AllDefinitionsUpdatedPayload>();

export interface AllDefinitionsSearchRequestedPayload {
    searchText: string;
}
export var allDefinitionsSearchTriggered = new Action<AllDefinitionsSearchRequestedPayload>();