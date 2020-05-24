import { IFilterData } from "Build/Scenarios/Definitions/AllBuilds/Common";

import { Action } from "VSS/Flux/Action";

export interface AllBuildsUpdatedPayload {
    buildIds: number[];
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