/// <reference types="react" />

import * as React from "react";

import { ProcessVariablesV2ControllerView } from "DistributedTaskControls/Variables/ProcessVariablesV2/ControllerView";
import { ProcessVariablesItem } from "DistributedTaskControls/Variables/ProcessVariables/Item";
import { ListGridPivotView } from "DistributedTaskControls/Variables/ProcessVariablesPivotView/ListGridPivotView";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/ProcessVariablesV2/Item";

/**
 * @brief Process variable implementation of Item interface for TwoPanelSelector
 */
export class ProcessVariablesV2Item extends ProcessVariablesItem {

    /**
     *  Get the details component.
     */
    public getDetails(instanceId?: string): JSX.Element {
        if (!this._details) {
            this._details = (
                <div className="process-variables-v2-details-container">
                    {this._getDetails()}
                </div>
            );
        }

        return this._details;
    }

    private _getDetails(): JSX.Element {

        if (this._options.supportGridView) {
            return (
                <ListGridPivotView
                    options={this._options} />);
        }
        else {
            return this._getListView();
        }
    }

    private _getListView(): JSX.Element {
        return (
            <ProcessVariablesV2ControllerView
                options={this._options} />
        );
    }
}
