/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { IVariableGroupOptions } from "DistributedTaskControls/Variables/Common/Types";
import { VariableGroupControllerView } from "DistributedTaskControls/Variables/VariableGroup/VariableGroupControllerView";
import { VariableGroupOverview } from "DistributedTaskControls/Variables/VariableGroup/VariableGroupOverview";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/VariableGroup/VariableGroupItem";

/**
 * @brief Linked Variable Groups implementation of Item interface for TwoPanelSelector
 */
export class VariableGroupItem implements Item {

    constructor(private _options: IVariableGroupOptions) {
    }

    /**
     *  Get the overview component.
     */
    public getOverview(instanceId?: string): JSX.Element {

        if (!this._overview) {
            this._overview = (
                <VariableGroupOverview instanceId={instanceId} item={this} />
            );
        }

        return this._overview;
    }

    /**
     *  Get the details component.
     */
    public getDetails(instanceId?: string): JSX.Element {

        if (!this._details) {
            this._details = (
                <div className="variable-group-details-container">
                    <VariableGroupControllerView
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
        return "common.variables-group";
    }

    private _overview: JSX.Element;
    private _details: JSX.Element;
}