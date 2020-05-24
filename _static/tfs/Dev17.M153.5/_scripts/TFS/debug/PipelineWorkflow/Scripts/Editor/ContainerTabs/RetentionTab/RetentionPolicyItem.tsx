/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";

import { RetentionPolicyView } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyView";
import { RetentionPolicyItemOverview } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyItemOverview";

export interface IRetentionPolicyItemArgs {
    instanceId: string;
}

export class RetentionPolicyItem implements Item {

    constructor(private _args: IRetentionPolicyItemArgs) {
    }

    public getOverview(): JSX.Element {
        if (!this._overView) {
            this._overView = (
                <RetentionPolicyItemOverview
                    key={this.getKey()}
                    item={this}
                    instanceId={this._args.instanceId} />
            );
        }
        return this._overView;
    }

    public getDetails(): JSX.Element {
        if (!this._details) {
            this._details = (
                <RetentionPolicyView
                    key={this.getKey()}
                    instanceId={this._args.instanceId} />
            );
        }

        return this._details;
    }

    public getKey(): string {
        return "retention-policy" + this._args.instanceId;
    }

    private _overView: JSX.Element;
    private _details: JSX.Element;
}
