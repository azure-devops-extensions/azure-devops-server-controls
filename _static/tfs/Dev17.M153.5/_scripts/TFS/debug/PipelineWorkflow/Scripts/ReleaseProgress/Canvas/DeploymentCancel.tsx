import * as React from "react";

import { css, Async, autobind } from "OfficeFabric/Utilities";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter, IDialogContentProps } from "OfficeFabric/Dialog";
import { IModalProps } from "OfficeFabric/Modal";
import { TextField } from "OfficeFabric/TextField";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { Item } from "DistributedTaskControls/Common/Item";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";

import * as Utils_String from "VSS/Utils/String";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IDeploymentCancelProgressState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancelActions";
import { DeploymentCancelDetailsViewStore, IDeploymentCancelItemDetailsViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancelDetailsViewStore";
import { DeploymentCancelActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancelActionCreator";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/DeploymentCancel";

export interface IDeploymentCancelProps extends Base.IProps {
    onDeploymentCancelCompleted: () => void;
}

export class DeploymentCancel extends Base.Component<IDeploymentCancelProps, IDeploymentCancelItemDetailsViewState> {

    public componentWillMount() {

        this._actionsCreator = ActionCreatorManager.GetActionCreator<DeploymentCancelActionCreator>(
            DeploymentCancelActionCreator, this.props.instanceId);

        this._viewStore = this.getViewStore();
        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    protected getViewStore() {
        return StoreManager.GetStore<DeploymentCancelDetailsViewStore>(DeploymentCancelDetailsViewStore, this.props.instanceId);
    }

    public render(): JSX.Element {
        let errorMessage: JSX.Element = null;
        let saveButtonSpinner: JSX.Element = null;
        let saveDisabled: boolean = false;
        let cancelDisabled: boolean = false;
        let textfieldDisabled: boolean = false;


        let dialogClassName = "cancel-environment-dialog";
        let dialogcontentProps: IDialogContentProps = {
            type: DialogType.normal
        };
        let modalProps: IModalProps = {
            className: dialogClassName,
            containerClassName: "CancelDialog",
            isBlocking: false,
            onLayerDidMount: this.onLayerDidMount,
            onDismissed: this.props.onDeploymentCancelCompleted
        };

        if (this.state.progressState === IDeploymentCancelProgressState.Error &&  
            this.state.errorMessage && 
            this.state.errorMessage !== Utils_String.empty) {
            errorMessage = <MessageBar messageBarType={MessageBarType.error} className="cancel-error-message">
                {this.state.errorMessage}            
            </MessageBar>;
        }

        if (this.state.progressState === IDeploymentCancelProgressState.InProgress) {
            saveDisabled = true;
            cancelDisabled = true;
            textfieldDisabled = true;
            saveButtonSpinner = <div className="save-progress-spinner">
                <Spinner 
                    type={SpinnerType.normal}  
                    label={Resources.EnvironmentStatusCanceling} 
                    ariaLabel={Resources.EnvironmentStatusCanceling} />
            </div>;
        }

        let environmentName = this._viewStore.getReleaseEnvironmentName();

        let dialogTextAreaClassName: string = "cancel-dialog-input-text-area";
        let dialogVisible: boolean = this._isDialogVisible(this.state.progressState);

        return <Dialog hidden={!dialogVisible} onDismiss={this.dismissDialog} modalProps={modalProps} dialogContentProps={dialogcontentProps}
            title={Resources.CancelDeploymentHeading} firstFocusableSelector={dialogTextAreaClassName} >
            <div className="cancel-deployment-subheading">{Utils_String.format(Resources.CancelDeploymentDescription, environmentName)}</div>
            <TextField 
                inputClassName={dialogTextAreaClassName} 
                className="cancel-comment-text" 
                multiline 
                resizable={false} 
                rows={4} 
                ariaLabel={Resources.Comment}
                value={this.state.comment}
                placeholder={Resources.CancelCommentPlacehodler} 
                onChanged={this.onTextChange} 
                disabled={textfieldDisabled} 
                autoFocus={true} />
            {errorMessage}
            {saveButtonSpinner}
            <DialogFooter>
                <PrimaryButton className="dialog-submit-button" disabled={saveDisabled} onClick={this.saveButtonClick.bind(this)}>
                    {this.state.progressState === IDeploymentCancelProgressState.Error ? Resources.RetryButton : Resources.Yes}
                </PrimaryButton>
                <DefaultButton className="dialog-cancel-button" disabled={cancelDisabled} onClick={this.cancelDialog.bind(this)}>
                    {Resources.No}
                </DefaultButton>
            </DialogFooter>
        </Dialog>;
    }

    private _isDialogVisible(progressState: IDeploymentCancelProgressState): boolean {
        let isVisible = false;
        if (progressState) {
            isVisible =  progressState === IDeploymentCancelProgressState.Error 
                || progressState === IDeploymentCancelProgressState.Initial 
                || progressState === IDeploymentCancelProgressState.InProgress;
        }
        return isVisible;
    }

    @autobind
    private dismissDialog (): void {
        this._actionsCreator.hideDialog();
    }

    @autobind
    private cancelDialog(): void {
        this._actionsCreator.hideDialog();
    }

    @autobind
    private saveButtonClick(): void {
        let releaseId = this._viewStore.getReleaseId();
        let environment = this._viewStore.getReleaseEnvironment();
        
        this._actionsCreator.cancel(releaseId, environment, this.state.comment ? this.state.comment.trim() : Utils_String.empty);
    }

    @autobind
    private onTextChange (newValue: string): void {
        let valueToSet: string = newValue;
        this.setState({ comment: valueToSet} as IDeploymentCancelItemDetailsViewState);
    }

    @autobind
    private onLayerDidMount(): void {
        this.setState(this.getDialogInitialState());
    }

    private getDialogInitialState(): IDeploymentCancelItemDetailsViewState {
        let state = {
            comment: Utils_String.empty,
            errorMessage: Utils_String.empty,
            progressState: this.state.progressState ? this.state.progressState : IDeploymentCancelProgressState.Initial 
        } as IDeploymentCancelItemDetailsViewState;

        return state;
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    private _viewStore: DeploymentCancelDetailsViewStore;
    private _actionsCreator: DeploymentCancelActionCreator;
}