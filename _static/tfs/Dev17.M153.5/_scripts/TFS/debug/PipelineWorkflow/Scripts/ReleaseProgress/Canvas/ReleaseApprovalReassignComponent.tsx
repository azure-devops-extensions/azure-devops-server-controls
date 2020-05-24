/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { IdentityPickerInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/IdentityPickerInputComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";
import { ErrorComponent } from "DistributedTaskControls/SharedControls/ErrorComponent/ErrorComponent";

import { autobind, css } from "OfficeFabric/Utilities";
import { Dialog, DialogType, DialogFooter, IDialogContentProps } from "OfficeFabric/Dialog";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";

import { IdentityRef } from "VSS/WebApi/Contracts";
import * as IdentityPicker from "VSS/Identities/Picker/Controls";
import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalReassignComponent";

export interface IReleaseApprovalReassignComponentProps extends Base.IProps {
    originalApproverId: string;
    isReassignmentInProgress: boolean;
    errorMessage: string;
    onReassignClick: (selectedIdentity: IdentityRef, reassignComment: string) => void;
    onCloseDialog: () => void;
}

export interface IReleaseApprovalReassignState extends Base.IState {
    /**
     * This state takes care of whether the reassign button is disabled or not
     */
    isReassignButtonDisabled: boolean;

    /**
     * Comment
     */
    comment: string;

    /**
     * Selected identity
     */
    selectedIdentity: IdentityRef;

    /**
     * Is selected identity value valid
     */
    isSelectedIdentityValueValid: boolean;

    /**
     * Identity picker error message
     */
    identityPickerErrorMessage: string;
}

export class ReleaseApprovalReassignComponent extends Base.Component<IReleaseApprovalReassignComponentProps, IReleaseApprovalReassignState> {

    public constructor(props: IReleaseApprovalReassignComponentProps, ) {
        super(props, );
        this.state = {
            comment: Utils_String.empty,
            selectedIdentity: null,
            isReassignButtonDisabled: true,
            isSelectedIdentityValueValid: true,
            identityPickerErrorMessage: Utils_String.empty
        };
    }

    public render(): JSX.Element {

        return (
            <Dialog
                hidden={false}
                dialogContentProps={{
                    type: DialogType.close,
                    className: "reassign-dialog-content",
                    title: Resources.ReassignApproverComponentTitle,
                }}
                modalProps={{
                    className: "reassign-dialog",
                    containerClassName: "reassign-dialog-container"
                }}
                firstFocusableSelector={"identity-picker-input"}
                onDismiss={this._onCloseDialog}
                closeButtonAriaLabel={Resources.ReassignApproverCloseButtonAriaText} >

                {this._getErrorMessageSection()}

                {/*Place identity picker here */}
                {this._getIdentityPickerComponent()}

                {/* Comment box */}
                {this._getReassignCommentSection()}

                {/* Dialog footer */}
                {this._getDialogFooter()}

            </Dialog>
        );
    }

    private _getErrorMessageSection(): JSX.Element {
        const errorMessage = !!this.props.errorMessage;
        if (errorMessage) {
            return (
                <MessageBar
                    dismissButtonAriaLabel={Resources.CloseText}
                    className="pipeline-approval-reassign-message-bar"
                    messageBarType={MessageBarType.error}>
                    {this.props.errorMessage}
                </MessageBar>
            );
        }
    }

    private _getReassignCommentSection() {
        return (
            <div className="reassign-comment">
                <div>
                    {Resources.Comment}
                </div>
                <StringInputComponent
                    disabled={!!this.props.isReassignmentInProgress}
                    noAutoAdjustHeight={true}
                    ariaLabel={Resources.Comment}
                    value={this.state.comment}
                    onValueChanged={this._onUpdateComments}
                    isMultilineExpandable={true}
                    isResizable={false} />
            </div>
        );
    }

    private _getDialogFooter() {
        const isReassignButtonDisabled: boolean = !!this.state.isReassignButtonDisabled || !!this.props.isReassignmentInProgress;
        const reassignButtonText: string = !!this.props.isReassignmentInProgress ? Resources.ReassigningInProgress : Resources.ReassignApproverButtonText;

        return (
            <DialogFooter className="reassign-action-button">

                <PrimaryButton
                    disabled={isReassignButtonDisabled}
                    onClick={this._onReassignClick}
                    ariaLabel={Resources.ReassignApproverButtonText}>
                    {reassignButtonText}
                </PrimaryButton>

                <DefaultButton
                    disabled={!!this.props.isReassignmentInProgress}
                    onClick={this._onCloseDialog}
                    ariaLabel={Resources.CancelText}>
                    {Resources.CancelText}
                </DefaultButton>

            </DialogFooter>
        );
    }

    private _getIdentityPickerComponent(): JSX.Element {
        let errorComponentId: string = "release-approval-reassign-identity-picker-error-component-id";

        return (
            <div>
                <Label required={true} className="reassign-picker-title"> {Resources.ReassignSelectApproverText} </Label>
                <IdentityPickerInputComponent
                    disabled={!!this.props.isReassignmentInProgress}
                    required={true}
                    multiIdentitySearch={false}
                    isInvalid={!this.state.isSelectedIdentityValueValid}
                    onSelectedIdentitiesChanged={this._onSelectedIdentityChanged}
                    consumerId={this._identityPickerConsumerId}
                    ariaDescribedBy={errorComponentId}
                    operationScope={IdentityHelper.getIdentityPickerOperationScope()}>
                </IdentityPickerInputComponent>
                {(!this.state.isSelectedIdentityValueValid) ?
                    <div className="identity-picker-error-message"><ErrorComponent id={errorComponentId} cssClass={"approval-identity-picker-error"} errorMessage={this.state.identityPickerErrorMessage} /></div>
                    : null
                }
            </div>
        );
    }

    private _getIdentityPickerOptions(): IdentityPicker.IIdentityPickerSearchOptions {
        let options: IdentityPicker.IIdentityPickerSearchOptions;
        options = {
            multiIdentitySearch: false,
            operationScope: IdentityHelper.getIdentityPickerOperationScope(),
            consumerId: this._identityPickerConsumerId
        };
        return options;
    }

    @autobind
    private _onUpdateComments(newComment: string): void {
        this.setState({
            comment: newComment
        } as IReleaseApprovalReassignState);
    }

    @autobind
    private _onSelectedIdentityChanged(identity: Identities_Picker_RestClient.IEntity[]): void {
        let selectedIdentity = IdentityHelper.ConvertToWebIdentityRef(identity[0]);
        let isReassignedToOriginalApprover: boolean = false;

        if (selectedIdentity) {
            isReassignedToOriginalApprover = ReleaseApprovalReassignUtility.isReassignedIdentitySameAsApprover(selectedIdentity.id, this.props.originalApproverId);
        }

        this.setState({
            isReassignButtonDisabled: selectedIdentity ? isReassignedToOriginalApprover : true,
            isSelectedIdentityValueValid: selectedIdentity ? !isReassignedToOriginalApprover : true,
            selectedIdentity: selectedIdentity,
            identityPickerErrorMessage: Resources.ReassignIdentityPickerNotValid
        } as IReleaseApprovalReassignState);
    }

    @autobind
    private _onCloseDialog(): void {
        if (this.props.onCloseDialog) {
            this.props.onCloseDialog();
        }
    }

    @autobind
    private _onReassignClick(): void {
        //  Handle on reassign here
        if (this.props.onReassignClick) {
            this.props.onReassignClick(this.state.selectedIdentity, this.state.comment);
        }
    }

    private _identityPickerConsumerId: string = "4E250E55-B57F-4B12-B248-EB2F9CF59429";
}

export class ReleaseApprovalReassignUtility {

    /**
     * This function returns whether the ID of the new identity and the original approver matches
     * @param selectedIdentityId Id of the new identity selected
     * @param originalApproverId ID of the original approver
     */
    public static isReassignedIdentitySameAsApprover(selectedIdentityId: string, originalApproverId: string): boolean {
        return (!RMUtilsCore.ValidateParameters.isNullOrEmpty(selectedIdentityId) &&
            (Utils_String.ignoreCaseComparer(selectedIdentityId, originalApproverId) === 0));
    }
}