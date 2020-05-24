import { Action } from "VSS/Flux/Action";

import { BuildMetric } from "TFS/Build/Contracts";

import { IDefinitionsBehavior } from "Build/Scripts/Behaviors";

export interface DefinitionMetric {
    definitionId: number;
    metrics: BuildMetric[];
}

export interface DefinitionMetricsRetrievedPayload {
    metrics: DefinitionMetric[];
    behavior?: IDefinitionsBehavior;
}

export let definitionMetricsRetrieved = new Action<DefinitionMetricsRetrievedPayload>();