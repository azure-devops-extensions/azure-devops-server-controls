/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { MessageBarComponent } from "DistributedTaskControls/Components/MessageBarComponent";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { ISaveAsTemplateDialogState, SaveAsTemplateDialogStore } from "PipelineWorkflow/Scripts/Editor/Environment/SaveAsTemplateDialogStore";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { SaveAsTemplateDialogActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/SaveAsTemplateDialogActionCreator";

import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { MessageBarType } from "OfficeFabric/MessageBar";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { TextField } from "OfficeFabric/TextField";

import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Environment/SaveAsTemplateDialogComponent";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface ISaveAsTemplateDialogComponentProps extends ComponentBase.IProps {
    environment: PipelineDefinitionEnvironment;
}

export class SaveAsTemplateDialogComponent extends ComponentBase.Component<ISaveAsTemplateDialogComponentProps, ISaveAsTemplateDialogState> {

    public componentWillMount() {
        this._saveAsTemplateDialogStore = StoreManager.GetStore<SaveAsTemplateDialogStore>(SaveAsTemplateDialogStore);
        this._saveAsTemplateDialogActionCreator = ActionCreatorManager.GetActionCreator<SaveAsTemplateDialogActionCreator>(SaveAsTemplateDialogActionCreator);

        this.setState(
            this._saveAsTemplateDialogStore.getState()
        );

        this._saveAsTemplateDialogStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this._saveAsTemplateDialogStore.removeChangedListener(this._onChange);
    }

    private _onChange = (): void => {
        this.setState(
            this._saveAsTemplateDialogStore.getState()
        );
    }

    public render(): JSX.Element {

        const saveAsTemplateDialogNameFieldClass: string = "environment-save-as-template-dialog-name-field";
        return (
            <Dialog
                modalProps={{
                    className: css("environment-save-as-template-dialog", "dialog-fabric-style-overrides"),
                    containerClassName: css("environment-save-as-template-dialog-container", "dialog-fabric-container-title-overflow-overrides", "overflow-ellipsis-title"),
                    isBlocking: true
                }}
                dialogContentProps={{
                    type: DialogType.close
                }}
                title={Resources.SaveAsTemplateDialogHeading}
                hidden={!this.state.isVisible}
                onDismiss={this._onCloseDialog}
                closeButtonAriaLabel={Resources.ARIALabelCloseTheDialog}
                firstFocusableSelector={saveAsTemplateDialogNameFieldClass}>

                {
                    this.state.errorMessage &&
                    (<MessageBarComponent
                        messageBarType={MessageBarType.error}
                        onDismiss={this._onDismissErrorMessage}
                        isMultiline={true}>
                        {this.state.errorMessage}
                    </MessageBarComponent>)
                }

                <div className="input-field-component">
                    <StringInputComponent
                        label={Resources.NameText}
                        required={true}
                        value={this.state.name}
                        onValueChanged={this._onNameChanged}
                        getErrorMessage={this._onGetErrorMessageOnNameChange}
                        inputClassName={saveAsTemplateDialogNameFieldClass} />
                </div>

                <div className="input-field-component">
                    <MultiLineInputComponent
                        label={Resources.DescriptionText}
                        isNotResizable={true}
                        value={this.state.description}
                        onValueChanged={this._onDescriptionChanged} />
                </div>

                <MessageBarComponent
                    messageBarType={MessageBarType.info}>
                    {Resources.SaveAsTemplateDialogVariableInfoText}
                </MessageBarComponent>

                <DialogFooter>
                    <PrimaryButton
                        onClick={this._saveAsTemplate}
                        disabled={!this.state.name}
                        ariaLabel={Resources.ARIALabelCreateTemplate}>
                        {Resources.OkText}
                    </PrimaryButton>

                    <DefaultButton
                        onClick={this._onCloseDialog}
                        ariaLabel={Resources.ARIALabelCloseSaveTemplateDialog}>
                        {Resources.CancelText}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _onDismissErrorMessage = (): void => {
        this._saveAsTemplateDialogActionCreator.onDismissErrorMessage();
    }

    private _onNameChanged = (name: string): void => {
        this._saveAsTemplateDialogActionCreator.changeName(name);
    }

    private _onDescriptionChanged = (description: string): void => {
        this._saveAsTemplateDialogActionCreator.changeDescription(description);
    }

    private _saveAsTemplate = (): void => {
        this._saveAsTemplateDialogActionCreator.onCreateClick(this.state.name, this.state.description, this.props.environment);
    }

    private _onCloseDialog = (): void => {
        this._saveAsTemplateDialogActionCreator.onCancelClick();
    }

    private _onGetErrorMessageOnNameChange = (value: string): string => {
        if (!value) {
            return Resources.RequiredInputErrorMessage;
        }
        return Utils_String.empty;
    }

    private _saveAsTemplateDialogStore: SaveAsTemplateDialogStore;
    private _saveAsTemplateDialogActionCreator: SaveAsTemplateDialogActionCreator;
}