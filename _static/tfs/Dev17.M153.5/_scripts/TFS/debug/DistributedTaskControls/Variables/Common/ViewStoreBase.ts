import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { IVariablesState } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { IVariable } from "DistributedTaskControls/Variables/Common/Types";

export abstract class VariablesViewStoreBase extends ViewStoreBase {

    public abstract getState(): IVariablesState;

    public abstract getCurrentVariablesArray(): IVariable[];
}

