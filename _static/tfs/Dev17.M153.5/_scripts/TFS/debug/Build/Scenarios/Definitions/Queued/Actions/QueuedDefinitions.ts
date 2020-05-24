import {IBuildFilter} from "Build.Common/Scripts/ClientContracts";
import {GetDefinitionsOptions} from "Build.Common/Scripts/ClientContracts";

import {Action} from "VSS/Flux/Action";

export interface QueuedDefinitionBuildsUpdatedPayload {
    buildIds: number[];
    filter?: IBuildFilter;
}

export var queuedDefinitionBuildsUpdated = new Action<QueuedDefinitionBuildsUpdatedPayload>();

export var filterApplied = new Action<void>();

export interface QueuedDefinitionSearchDefinitionsUpdatedPayload {
    filter: GetDefinitionsOptions;
    definitionIds: number[];
}

export var searchDefinitionsUpdated = new Action<QueuedDefinitionSearchDefinitionsUpdatedPayload>();