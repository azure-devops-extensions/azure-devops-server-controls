/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { IntegrationsOptionsDetailsView } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/IntegrationsOptionsDetailsView";
import { OptionsOverview } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsOverview";

export class IntegrationsOptionsItem implements Item {

    constructor(private _title: string) {
    }

    /**
     *  Get the overview component.
     */
    public getOverview(instanceId?: string): JSX.Element {

        if (!this._overView) {
            this._overView = (
                <OptionsOverview instanceId={instanceId} item={this} title={this._title} cssClass={"integrations-options-overview"} />
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
                    <IntegrationsOptionsDetailsView
                        instanceId={instanceId} />
            );
        }

        return this._details;
    }

    /**
     *  Unique key for the item under the scope of the top level container. 
     */
    public getKey(): string {
        return "common.options.integrations";
    }

    protected _overView: JSX.Element;
    protected _details: JSX.Element;
}