// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { EnvironmentTriggerActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerActionCreator";
import { EnvironmentNameActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameActionCreator";
import { EnvironmentNameStore, IEnvironmentNameState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameStore";
import { EnvironmentName as EnvironmentNameComponent} from "PipelineWorkflow/Scripts/SharedComponents/Environment/EnvironmentName";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/EnvironmentName";

export interface IEnvironmentTitleState extends IEnvironmentNameState {
    showEnvironmentNameDuplicateInfo: boolean;
    duplicateEnvironmentNameInfoMessage: string;
}

export class EnvironmentName extends Base.Component<Base.IProps, IEnvironmentTitleState> {

    constructor(props: Base.IProps) {
        super(props);
        this._actionCreator = ActionCreatorManager.GetActionCreator<EnvironmentNameActionCreator>(EnvironmentNameActionCreator,
            this.props.instanceId);

        this._store = StoreManager.GetStore<EnvironmentNameStore>(EnvironmentNameStore, this.props.instanceId);

        this._environmentListstore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onChange);
        this.setState(this._store.getState() as IEnvironmentTitleState);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    /**
     * @brief Renders an Environment Properties view
     */
    public render(): JSX.Element {
        return (
            <div className="environment-name-container">
                <EnvironmentNameComponent
                    environmentName={this.state.environmentName}
                    onEnvironmentNameChanged={this._onEnvironmentNameChanged}
                    onBlur={this._handleBlur}
                    onError={this._onGetErrorMessage} />
                {
                    this.state.showEnvironmentNameDuplicateInfo &&
                    <MessageBar
                        className="duplicate-environment-name-infobar"
                        messageBarType={MessageBarType.info}
                        onDismiss={this._onDismissMessage}
                        dismissButtonAriaLabel={DTCResources.CloseButtonText}>
                        {this.state.duplicateEnvironmentNameInfoMessage}
                    </MessageBar>
                }
            </div>
        );
    }

    private _handleBlur = () => {
        let originalEnvironmentName: string = this.state.environmentName;
        let currentEnvironmentId: number = this._environmentListstore.getEnvironmentIdFromInstanceId(this.props.instanceId);
        let newEnvironmentName: string = this._environmentListstore.getUniqueEnvironmentName(originalEnvironmentName, currentEnvironmentId);
        if (Utils_String.localeIgnoreCaseComparer(originalEnvironmentName, newEnvironmentName) !== 0) {
            this._udpateEnvironmentName(newEnvironmentName);
            this._showDuplicateNameInfoBar(originalEnvironmentName);
        }
    }

    private _showDuplicateNameInfoBar(originalEnvironmentName: string): void {
        let infoMessage: string = Utils_String.localeFormat(Resources.DuplicateEnvironmentNameInfoMessage, originalEnvironmentName);
        this.setState((prevState) => {
            const nextState = { ...prevState };
            nextState.showEnvironmentNameDuplicateInfo = true;
            nextState.duplicateEnvironmentNameInfoMessage = infoMessage;
            return nextState;
        });
    }

    private _onDismissMessage = () => {
        this._hideDuplicateNameInfoBar();
    }

    private _onChange = () => {
        let storeState = this._store.getState();
        if (!Utils_String.equals(this.state.environmentName, storeState.environmentName)) {
            this.setState(this._store.getState() as IEnvironmentTitleState);
        }
    }

    private _hideDuplicateNameInfoBar(): void {
        this.setState((prevState) => {
            const nextState = { ...prevState };
            nextState.showEnvironmentNameDuplicateInfo = false;
            nextState.duplicateEnvironmentNameInfoMessage = null;
            return nextState;
        });
    }

    private _onEnvironmentNameChanged = (newValue: string): void => {
        this._udpateEnvironmentName(newValue);
        this._hideDuplicateNameInfoBar();
    }

    private _udpateEnvironmentName(environmentName: string): void {
        let environments = this._environmentListstore.getCurrentState();
        let currentEnvironmentId: number = this._environmentListstore.getEnvironmentIdFromInstanceId(this.props.instanceId);

        // Trigger update environment name action for all trigger store instance. Once environment name change we need to update trigger condition 
        // if condition type is of PostEnvironmentDeployment trigger. At this stage we don't know which all instances of trigger need to be updated
        // hence need to raise action for all instances
        if (currentEnvironmentId) {
            environments.forEach((environment) => {
                // No need to raise action for the same environment instance as one can't have post environment deplpyment trigger
                // condition for the same environment
                let instanceId: string = this._environmentListstore.getEnvironmentInstanceId(environment.id);

                if (instanceId !== this.props.instanceId) {
                    let environmentTriggerActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentTriggerActionCreator>(EnvironmentTriggerActionCreator,
                        instanceId);

                    environmentTriggerActionCreator.updateEnvironmentName({
                        environmentId: currentEnvironmentId,
                        environmentName: environmentName
                    });
                }
            });

            // We need to raise environment name change action only after update environment name action for all trigger store instance
            // reason is that trigger store doesn't emit change with the above action to avoid any performance impac. Below action will emit change
            // and hence all store will check for dirty and isvalid
            this._actionCreator.updateEnvironmentName(environmentName, currentEnvironmentId);
        }
    }

    private _onGetErrorMessage = (newValue: string): string => {
        return this._store.getEnvironmentNameValidationErrorMessage(newValue);
    }

    private _actionCreator: EnvironmentNameActionCreator;
    private _store: EnvironmentNameStore;
    private _environmentListstore: EnvironmentListStore;
}





