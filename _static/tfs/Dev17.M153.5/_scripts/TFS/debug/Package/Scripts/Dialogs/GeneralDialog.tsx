import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { IIconProps } from "OfficeFabric/Icon";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";
import { autobind, css } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";

import { PackageMessagePanel } from "Package/Scripts/Components/PackageMessagePanel";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Dialogs/GeneralDialog";

export interface IGeneralDialogProps extends Props {
    headerText: string;
    onSaveCallback: (parameter?: string) => void;
    onDismissCallback: () => void;
    saveButtonText: string;
    confirmText?: string;
    confirmTextLearnMoreLink?: string;
    dialogClassName?: string;
    messageBarMessage?: string;
    onSavePrimaryButtonText?: string;
    saveButtonClassName?: string;
    saveButtonDisabled?: boolean;
    severeWarningText?: string;
    severeWarningLearnMoreLink?: string;
    textField?: boolean;
    textFieldDefaultValue?: string;
    textFieldLabel?: string;
    textFieldPlaceholder?: string;
}

export interface IGeneralDialogState extends State {
    textFieldMessage?: string;
    showProgress?: boolean;
}

export class GeneralDialog extends Component<IGeneralDialogProps, IGeneralDialogState> {
    constructor(props: IGeneralDialogProps) {
        super(props);

        this.state = {
            textFieldMessage: null
        };
    }

    public render(): JSX.Element {
        return (
            <Dialog
                hidden={false}
                modalProps={{
                    isBlocking: true,
                    containerClassName: css("general-dialog", this.props.dialogClassName)
                }}
                dialogContentProps={{
                    type: this.state.showProgress ? DialogType.normal : DialogType.close
                }}
                forceFocusInsideTrap={true}
                onDismiss={this._closeDialog}
                title={this.props.headerText}
            >
                {
                    <div>
                        {this.props.messageBarMessage && (
                            <div className={"dialog-message-bar"}>
                                <PackageMessagePanel message={this.props.messageBarMessage} />
                            </div>
                        )}
                        {(this.props.severeWarningText || this.props.severeWarningLearnMoreLink) && (
                            <MessageBar
                                className="dialog-message-bar"
                                messageBarType={MessageBarType.severeWarning}
                                isMultiline={true}
                            >
                                {this.props.severeWarningText && this.props.severeWarningText}
                                {this.props.severeWarningLearnMoreLink && (
                                    <Link
                                        className="dialog-link"
                                        href={this.props.severeWarningLearnMoreLink}
                                        target="_blank"
                                    >
                                        {PackageResources.LearnMore}
                                    </Link>
                                )}
                            </MessageBar>
                        )}
                        <span>
                            {this.props.confirmText}
                            {this.props.confirmTextLearnMoreLink && (
                                <Link href={this.props.confirmTextLearnMoreLink} target="_blank">
                                    {PackageResources.LearnMore}
                                </Link>
                            )}
                        </span>
                        {this.props.textField && (
                            <TextField
                                inputClassName="dialog-content-textarea"
                                defaultValue={this.props.textFieldDefaultValue}
                                label={this.props.textFieldLabel}
                                placeholder={this.props.textFieldPlaceholder}
                                rows={3}
                                multiline={true}
                                resizable={false}
                                maxLength={255}
                                onChanged={this._onChanged}
                            />
                        )}
                    </div>
                }
                <DialogFooter>{this._renderButtons()}</DialogFooter>
            </Dialog>
        );
    }

    private _renderButtons(): JSX.Element {
        return (
            <div className="general-dialog-footer">
                <PrimaryButton
                    className={css("save-button", this.props.saveButtonClassName)}
                    onClick={this._save}
                    disabled={this.state.showProgress || this.props.saveButtonDisabled}
                    iconProps={this._getPrimaryButtonIconProps()}
                >
                    {this._getPrimaryButtonText()}
                </PrimaryButton>
                <DefaultButton
                    className={"general-dialog-cancel-button"}
                    onClick={this._closeDialog}
                    text={PackageResources.Dialog_CancelButtonText}
                    disabled={this.state.showProgress}
                />
            </div>
        );
    }

    private _getPrimaryButtonIconProps(): IIconProps {
        if (this.state.showProgress) {
            return {
                className: css("bowtie-icon bowtie-spinner save-progress")
            } as IIconProps;
        }

        return null;
    }

    private _getPrimaryButtonText(): string {
        if (this.state.showProgress && this.props.onSavePrimaryButtonText) {
            return this.props.onSavePrimaryButtonText;
        }
        return this.props.saveButtonText;
    }

    @autobind
    private _closeDialog(): void {
        this.props.onDismissCallback();
    }

    @autobind
    private _save(): void {
        this.setState({ showProgress: true }, () => {
            this.props.onSaveCallback(this.state.textFieldMessage);
        });
    }

    @autobind
    private _onChanged(message: string): void {
        this.setState({
            textFieldMessage: message
        });
    }
}
