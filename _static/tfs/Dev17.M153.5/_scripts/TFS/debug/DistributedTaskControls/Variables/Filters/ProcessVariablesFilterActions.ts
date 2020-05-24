import { Action } from "VSS/Flux/Action";

import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { VariableActionHubKeys } from "DistributedTaskControls/Variables/Common/Constants";

import { Filter } from "VSSUI/Utilities/Filter";

export class ProcessVariablesFilterActions extends ActionsHubBase {

    public initialize(instanceId?: string): void {
        this._filter = new Action<Filter>();
        this._defaultFilterTrigger = new Action<number>();
    }

    public static getKey(): string {
        return VariableActionHubKeys.VariablesSection_FiltersActionsHub;
    }

    public get filter(): Action<Filter> {
        return this._filter;
    }

    public get defaultFilterTrigger(): Action<number> {
        return this._defaultFilterTrigger;
    }

    private _defaultFilterTrigger: Action<number>;
    private _filter: Action<Filter>;
}

