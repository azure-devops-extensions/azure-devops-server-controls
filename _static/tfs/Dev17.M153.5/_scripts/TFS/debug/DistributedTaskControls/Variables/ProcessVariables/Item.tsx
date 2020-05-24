/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { ProcessVariablesControllerView } from "DistributedTaskControls/Variables/ProcessVariables/ControllerView";
import { ProcessVariableOverview } from "DistributedTaskControls/Variables/ProcessVariables/Overview";
import { IProcessVariablesOptions } from "DistributedTaskControls/Variables/Common/Types";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/ProcessVariables/Item";

/**
 * @brief Process variable implementation of Item interface for TwoPanelSelector
 */
export class ProcessVariablesItem implements Item {

    constructor(private _title: string, protected _options: IProcessVariablesOptions) {
    }

    /**
     *  Get the overview component.
     */
    public getOverview(instanceId?: string): JSX.Element {

        if (!this._overView) {
            this._overView = (
                <ProcessVariableOverview instanceId={instanceId} item={this} title={this._title} supportsScopes={this._options.supportScopes} />
            );
        }

        return this._overView;
    }

    /**
     *  Get the details component.
     */
    public getDetails(instanceId?: string): JSX.Element {

        if (!this._details) {
            this._details = (
                <div className="process-variables-details-container">
                    <ProcessVariablesControllerView
                        instanceId={instanceId}
                        options={this._options} />
                </div>
            );
        }

        return this._details;
    }

    /**
     *  Unique key for the item under the scope of the top level container. 
     */
    public getKey(): string {
        return "common.process-variables";
    }

    protected _overView: JSX.Element;
    protected _details: JSX.Element;
}