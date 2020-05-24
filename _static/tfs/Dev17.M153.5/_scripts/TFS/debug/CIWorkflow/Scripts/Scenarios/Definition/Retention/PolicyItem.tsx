import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { ItemKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { RetentionPolicyItemOverview } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyItemOverview";
import { RetentionPolicyStore } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyStore";
import { RetentionPolicyView } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyView";

import { Item } from "DistributedTaskControls/Common/Item";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";

export class RetentionPolicyItem implements Item {

    private _overview: JSX.Element;
    private _details: JSX.Element;
    private _uniquePolicyInstanceId: string;

    constructor(private _policyStore: DataStoreBase, private _onRemoveDelegate: (id: string) => void, private _isReadOnly?: boolean) {
        this._uniquePolicyInstanceId = this._policyStore.getInstanceId();
    }

    public getOverview(instanceId?: string): JSX.Element {
        this._overview = (
            <RetentionPolicyItemOverview
                key={this.getKey()}
                item={this}
                policyInstanceId={this._uniquePolicyInstanceId}
                instanceId={instanceId}
                onRemove={this._onRemoveDelegate}
                isReadOnly={this._isReadOnly}
                isDraggable={!this._isReadOnly} />
        );

        return this._overview;
    }

    public getDetails(): JSX.Element {
        if (!this._details) {
            this._details = (
                <RetentionPolicyView
                    key={this.getKey()}
                    policyInstanceId={this._uniquePolicyInstanceId}
                    heading={Resources.SettingsLabel}
                    onRemove={this._onRemoveDelegate}
                    disabled={this._isReadOnly} />
            );
        }

        return this._details;
    }

    public getStore(): DataStoreBase {
        return this._policyStore;
    }

    public getKey(): string {
        return this._uniquePolicyInstanceId;
    }
}
