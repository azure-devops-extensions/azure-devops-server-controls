/// <reference types="react" />

import * as React from "react";

import { CounterVariableControllerView } from "./CounterVariableControllerView";
import { CounterVariableOverview } from "./CounterVariableOverview";

import { Item } from "DistributedTaskControls/Common/Item";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/CounterVariables/CounterVariables";

export class CounterVariableItem implements Item {
    constructor() {
    }

    public getOverview(instanceId?: string): JSX.Element {
        if (!this._overview) {
            this._overview = (
                <CounterVariableOverview instanceId={instanceId} item={this} />
            );
        }

        return this._overview;
    }

    public getDetails(instanceId?: string): JSX.Element {
        if (!this._details) {
            this._details = (
                <div className="counter-variables-details-container">
                    <CounterVariableControllerView
                        instanceId={instanceId} />
                </div>
            );
        }

        return this._details;
    }

    public getKey(): string {
        return "common.variables-counter";
    }

    private _overview: JSX.Element;
    private _details: JSX.Element;
}
