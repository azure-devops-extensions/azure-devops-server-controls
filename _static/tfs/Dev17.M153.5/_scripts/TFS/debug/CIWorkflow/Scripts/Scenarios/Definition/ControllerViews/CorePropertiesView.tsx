/// <reference types="react" />

import * as React from "react";

import { DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BuildDefinitionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActionsCreator";
import { Name } from "CIWorkflow/Scripts/Scenarios/Definition/Components/Name";
import { CoreDefinitionStore, ICoreDefinitionState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/CorePropertiesView";

export interface ICorePropertiesViewProps extends Base.IProps {
    isDraftDefinition: boolean;
    isReadOnly?: boolean;
}

export class CorePropertiesView extends Base.Component<ICorePropertiesViewProps, ICoreDefinitionState> {
    private _coreDefinitionStore: CoreDefinitionStore;
    private _actionCreator: BuildDefinitionActionsCreator;

    constructor(props: ICorePropertiesViewProps) {
        super(props);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._actionCreator = ActionCreatorManager.GetActionCreator<BuildDefinitionActionsCreator>(BuildDefinitionActionsCreator);
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
        return (
            <div className="ci-core-properties">
                <div className="title-container">
                    <Name
                        label={Resources.NameLabel}
                        placeHolder={Resources.NamePlaceHolder}
                        onNameChange={this._handleNameChange.bind(this)}
                        value={this.state.name}
                        disabled={!!this.props.isReadOnly || this.props.isDraftDefinition} />
                </div>
            </div>
        );
    }

    private _handleNameChange(name: string) {
        this._actionCreator.changeName(name);
    }

    private _onChange = () => {
        this.setState(this._coreDefinitionStore.getState());
    }
}
