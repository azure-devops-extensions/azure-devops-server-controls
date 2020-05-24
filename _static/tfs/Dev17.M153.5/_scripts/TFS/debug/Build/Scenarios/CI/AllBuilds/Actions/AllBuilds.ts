import { IFilterData } from "Build/Scenarios/CI/AllBuilds/Common";

import { Action } from "VSS/Flux/Action";
import { Build, BuildDefinitionReference } from "TFS/Build/Contracts";

export interface AllBuildsUpdatedPayload {
    builds: Build[];
    filter: IFilterData;
    append?: boolean;
}

export class AllBuildsActionHub {
    private _allBuildsUpdated: Action<AllBuildsUpdatedPayload> = null;

    constructor() {
        this._allBuildsUpdated = new Action<AllBuildsUpdatedPayload>();
    }

    public get allBuildsUpdated() {
        return this._allBuildsUpdated;
    }
}

var __allBuildsActionHub = null;

export function getAllBuildsActionHub(): AllBuildsActionHub {
    if (!__allBuildsActionHub) {
        __allBuildsActionHub = new AllBuildsActionHub();
    }

    return __allBuildsActionHub;
}