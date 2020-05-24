import * as BuildContracts from "TFS/Build/Contracts";

import {Action} from "VSS/Flux/Action";

import * as VSS_Events from "VSS/Events/Services";

export interface Payload {
    definitionIds: number[];
}

export var histogramsUpdated = new Action<Payload>();