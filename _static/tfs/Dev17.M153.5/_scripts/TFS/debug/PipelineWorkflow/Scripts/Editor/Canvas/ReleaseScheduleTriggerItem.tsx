/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";

import { DefinitionScheduleTriggerView } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerView";

export class ReleaseScheduleTriggerItem implements Item {

    constructor(private _definitionId: number) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {

        return (
            <div className="release-schedule-trigger-container" key={this.getKey()}>
                <DefinitionScheduleTriggerView></DefinitionScheduleTriggerView>
            </div>);
    }

    public getKey(): string {
        return "release-schedule-trigger-" + this._definitionId.toString();
    }
}
