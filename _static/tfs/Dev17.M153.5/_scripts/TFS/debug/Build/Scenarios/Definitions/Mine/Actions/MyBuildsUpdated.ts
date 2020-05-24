import BuildContracts = require("TFS/Build/Contracts");

import {Action} from "VSS/Flux/Action";

export interface Payload {
    builds: BuildContracts.Build[];
}

export var myBuildsUpdated = new Action<Payload>();