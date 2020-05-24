/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Name } from "DistributedTaskControls/SharedControls/Name/Name";

import { DefinitionActionsCreator } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActionsCreator";
import { CoreDefinitionStore, ICoreDefinition } from "PipelineWorkflow/Scripts/Editor/Definition/CoreDefinitionStore";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Definition/CorePropertiesView";

export class CorePropertiesView extends Base.Component<Base.IProps, ICoreDefinition> {

    constructor(props: Base.IProps) {
        super(props);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
    }

    public componentWillMount(): void {
        this.setState(this._coreDefinitionStore.getState());
    }

    public componentDidMount(): void {
        this.setState(this._coreDefinitionStore.getState());
        this._coreDefinitionStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._coreDefinitionStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let isNameDisabled: boolean = false;

        return (
            <div className="cd-core-properties">
                <div className="title-container">
                    <Name
                        label={Resources.NameText}
                        placeHolder={Resources.NewEnvironmentDefinitionText}
                        onNameChange={this._handleNameChange}
                        value={this.state.name}
                        disabled={isNameDisabled} />
                </div>
            </div>
        );
    }

    private _handleNameChange = (name: string) => {
        ActionCreatorManager.GetActionCreator<DefinitionActionsCreator>(DefinitionActionsCreator)
            .changeDefinitionName(name);
    }

    private _onChange = () => {
        this.setState(this._coreDefinitionStore.getState());
    }

    private _coreDefinitionStore: CoreDefinitionStore;
}
