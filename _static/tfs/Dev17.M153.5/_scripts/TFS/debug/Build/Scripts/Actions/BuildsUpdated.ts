import * as BuildRealtime from "Build/Scripts/Realtime";

import * as BuildContracts from "TFS/Build/Contracts";

import { Action } from "VSS/Flux/Action";

import * as VSS_Events from "VSS/Events/Services";

export interface Payload {
    builds: BuildContracts.Build[];
}

export class BuildsUpdatedActionHub {
    private _buildsUpdated: Action<Payload>;
    private _buildStateUpdated: Action<BuildContracts.Build>;
    private _definitionMetricsUpdated: Action<Payload>;

    constructor() {
        this._buildsUpdated = new Action<Payload>();
        this._buildStateUpdated = new Action<BuildContracts.Build>();
        this._definitionMetricsUpdated = new Action<Payload>();
    }

    public get buildsUpdated() {
        return this._buildsUpdated;
    }

    public get buildStateUpdated() {
        return this._buildStateUpdated;
    }

    public get definitionMetricsUpdated() {
        return this._definitionMetricsUpdated;
    }
}

// map SignalR event to action
VSS_Events.getService().attachEvent(BuildRealtime.BuildRealtimeEvent.BUILD_UPDATED, (sender: any, buildEvent: BuildContracts.BuildUpdatedEvent) => {
    const actionHub = getBuildsUpdatedActionHub();
    actionHub.buildsUpdated.invoke({
        builds: [buildEvent.build]
    });
    actionHub.buildStateUpdated.invoke(buildEvent.build);
    actionHub.definitionMetricsUpdated.invoke({
        builds: [buildEvent.build]
    });
});

var __buildsUpdatedActionHub = null;
export function getBuildsUpdatedActionHub(): BuildsUpdatedActionHub {
    if (!__buildsUpdatedActionHub) {
        __buildsUpdatedActionHub = new BuildsUpdatedActionHub();
    }

    return __buildsUpdatedActionHub;
}