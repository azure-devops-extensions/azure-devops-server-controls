// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";
import { IdentityPickerComponent } from "DistributedTaskControls/Components/IdentityPicker";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { EnvironmentOwnerActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwnerActionCreator";
import { EnvironmentOwnerStore, IEnvironmenOwnerState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwnerStore";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as IdentityPicker from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwner";

export class EnvironmentOwner extends Base.Component<Base.IProps, IEnvironmenOwnerState> {

    constructor(props: Base.IProps) {
        super(props);
        this._actionCreator = ActionCreatorManager.GetActionCreator<EnvironmentOwnerActionCreator>(EnvironmentOwnerActionCreator, this.props.instanceId);
        this._store = StoreManager.GetStore<EnvironmentOwnerStore>(EnvironmentOwnerStore, this.props.instanceId);
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    /**
     * @brief Renders an Environment Properties view
     */
    public render(): JSX.Element {

        let isValid = this._store.isValid();
        let errorMessage = this._store.getReasonForInvalidState();
        return (
            <div className="environment-owner-container">
                <div className="environment-owner-label">{Resources.EnvironmentOwner}</div>
                <div className={"environment-owner-identity-picker " + (isValid ? "valid" : "invalid")}>
                    <IdentityPickerComponent onSelectedIdentitiesChanged={this._onEnvironmentOwnerChanged}
                        consumerId={this._identityPickerConsumerId}
                        options={this._getIdentityPickerOptions()}>
                    </IdentityPickerComponent>
                </div>
                {(!isValid) ?
                    <div className="environment-owner-identity-picker-error"><ErrorComponent errorMessage={errorMessage} /></div>
                    : null
                }
            </div>
        );
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _onEnvironmentOwnerChanged = (owners: Identities_Picker_RestClient.IEntity[]): void => {
        this._actionCreator.updateEnvironmentOwner(owners[0]);
    }

    private _getIdentityPickerOptions(): IdentityPicker.IIdentityPickerSearchOptions {
        let options: IdentityPicker.IIdentityPickerSearchOptions;
        options = {
            ariaLabel: Resources.EnvironmentOwner,
            items: this._store.getEnvironmentOwnerId(),
            operationScope: IdentityHelper.getIdentityPickerOperationScope(),
            multiIdentitySearch: false, // ensure only single identity can be specified
            consumerId: this._identityPickerConsumerId
        };
        return options;
    }

    private _actionCreator: EnvironmentOwnerActionCreator;
    private _store: EnvironmentOwnerStore;
    private _identityPickerConsumerId: string = "86580C4B-ED4B-4120-B6A2-B0CB19D3FF2D";
}





