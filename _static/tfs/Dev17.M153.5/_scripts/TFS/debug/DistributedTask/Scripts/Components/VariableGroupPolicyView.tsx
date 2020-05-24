import * as React from "react";
import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import { VariableGroupPolicyActionCreator } from "DistributedTask/Scripts/Actions/VariableGroupPolicyActions";
import { VariableGroupPolicyStore, IVariableGroupPolicyState } from "DistributedTask/Scripts/Stores/VariableGroupPolicyStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { Toggle } from "OfficeFabric/Toggle";
import { autobind } from "OfficeFabric/Utilities";
import { Component, Props } from "VSS/Flux/Component";
import * as Events_Document from "VSS/Events/Document";

export interface IVariableGroupPolicyViewProps extends Props {
    variableGroupId: string;
}

export class VariableGroupPolicyView extends Component<IVariableGroupPolicyViewProps, IVariableGroupPolicyState> implements Events_Document.RunningDocument {
    constructor(props?: IVariableGroupPolicyViewProps) {
        super(props);

        this._store = StoreManager.GetStore<VariableGroupPolicyStore>(VariableGroupPolicyStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<VariableGroupPolicyActionCreator>(VariableGroupPolicyActionCreator);
        this.state = this._store.getState();
    }

    public render(): JSX.Element {
        return (
            <Toggle className="lib-vg-toggle"
                onChanged={this._allPipelinePolicyCheckChanged}
                checked={this.state.isAccessOnAllPipelines}
                onAriaLabel={Resources.AllowPipelineAccess}
                offAriaLabel={Resources.NotAllPipelineAccess}
                onText={Resources.AllowPipelineAccess}
                offText={Resources.AllowPipelineAccess} />
        );
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this.onStoreChange);
        this.setState(this._store.getState());
        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("VariableGroupPolicyView", this);

    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this.onStoreChange);
        Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
    }

    public isDirty(): boolean {
        return this._store.isDirty();
    }

    @autobind
    private _allPipelinePolicyCheckChanged(value: boolean) {
        // Raise action for change in policy value
        this._actionCreator.setPolicyForAllPipelinesCheck(value);
    }

    private onStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _store: VariableGroupPolicyStore;
    private _actionCreator: VariableGroupPolicyActionCreator;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
}