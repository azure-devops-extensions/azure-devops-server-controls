import * as React from "react";
import { TextField } from "OfficeFabric/TextField";
import {
    Dialog,
    DialogType,
    DialogFooter,
} from "OfficeFabric/Dialog";
import {
    DefaultButton,
    PrimaryButton,
    IconButton,
} from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";
import * as ProjectOverviewResources from "ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview";
import { DescriptionEditingToggleType } from "ProjectOverview/Scripts/Constants";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/DescriptionEditor";

export interface DescriptionEditorProps {
    initialText: string;
    errorMessage: string;
    isEditingDisabled: boolean;
    clearErrorMessage: () => void;
    onSaveClicked: (newText: string) => void;
    toggleEditing: (toggleType: DescriptionEditingToggleType) => void;
    publishProjectDescriptionDiscardClicked: () => void;
    publishProjectDescriptionDiscardDialogOKClicked: () => void;
    publishProjectDescriptionDiscardDialogCancelClicked: () => void;
    publishProjectDescriptionDiscardDialogDismissed: () => void;
}

export interface DescriptionEditorState {
    text: string;
    showDiscardDialog: boolean;
}

const saveButtonCSSClass = "bowtie bowtie-icon bowtie-save";
const undoButtonCSSClass = "bowtie bowtie-icon bowtie-edit-undo";
const MaxProjectDescriptionLength = 16000;

export class DescriptionEditor extends React.Component<DescriptionEditorProps, DescriptionEditorState> {
    private _textControl: TextField;

    constructor(props: DescriptionEditorProps, context?: any) {
        super(props, context);
        this.state = {
            text: this.props.initialText,
            showDiscardDialog: false,
        };
    }

    public componentDidMount(): void {
        addEventListener("beforeunload", this._navigateAwayHandler);
        this._focusInTextArea();
    }

    public componentWillUnmount(): void {
        removeEventListener("beforeunload", this._navigateAwayHandler);
    }

    public componentDidUpdate(): void {
        if (this.props.errorMessage) {
            this._focusInTextArea();
        }
    }

    public render(): JSX.Element {
        return (
            <div
                className="edit-description-container"
                onBlur={this._onClickOut}>
                <TextField
                    ref={(d) => this._textControl = d}
                    className="edit-description"
                    inputClassName="office-fabric-input-class project-description-textarea"
                    autoAdjustHeight={true}
                    multiline={true}
                    resizable={false}
                    placeholder={ProjectOverviewResources.ProjectDescription_AdminPlaceHolder}
                    value={this.state.text}
                    maxLength={MaxProjectDescriptionLength}
                    onBeforeChange={this._beforeDescriptionChanged}
                    errorMessage={this.props.errorMessage}
                    disabled={this.props.isEditingDisabled} />
                <div className="buttons-container">
                    <IconButton
                        className={css("save-button", this._getSaveButtonCSSClass())}
                        ariaLabel={ProjectOverviewResources.ProjectDescription_SaveButtonLabel}
                        onClick={this._onSave}
                        disabled={!(this._isDirty())} />
                    <IconButton
                        className={css("undo-button", this._getDiscardButtonCSSClass())}
                        ariaLabel={ProjectOverviewResources.ProjectDescription_DiscardButtonLabel}
                        onClick={this._onDiscard}
                        disabled={!(this._isDirty())} />
                </div>
                <div className="clear-floats" />
                <Dialog
                    hidden={!this.state.showDiscardDialog}
                    modalProps={{
                        isBlocking: true,
                    }}
                    dialogContentProps={{
                        type: DialogType.close,
                        closeButtonAriaLabel: ProjectOverviewResources.CloseButtonAriaLabel,
                        subText: ProjectOverviewResources.ProjectDescription_UnsavedDescriptionDiscardMessage,
                    }}
                    onDismiss={this._onDiscardDialogDismissed}
                    title={ProjectOverviewResources.ProjectDescription_DiscardChangesTitle}
                >
                    <DialogFooter>
                        <PrimaryButton
                            onClick={this._onDiscardDialogOKClicked}>
                            {ProjectOverviewResources.ProjectDescription_DiscardDialogOK}
                        </PrimaryButton>
                        <DefaultButton onClick={this._onDiscardDialogCancelClicked}>
                            {ProjectOverviewResources.ProjectDescription_DiscardDialogCancel}
                        </DefaultButton>
                    </DialogFooter>
                </Dialog>
            </div>
        );
    }

    private _focusInTextArea = (): void => {
        this._textControl.focus();

        //This is hack added to set cursor at the end of the text (browsers: Edge and FireFox)
        this._textControl.setSelectionStart(this._textControl.value.length);
        this._textControl.setSelectionEnd(this._textControl.value.length);
    }

    private _navigateAwayHandler = (event: BeforeUnloadEvent): void => {
        if (this._isDirty()) {
            event.returnValue = ProjectOverviewResources.ProjectDescription_UnsavedDescriptionNavigateAwayMessage;
        }
    }

    private _isDirty(): boolean {
        return this.props.initialText !== this.state.text && !this.props.isEditingDisabled;
    }

    private _onSave = (): void => {
        if (this._isDirty()) {
            if (this.props.errorMessage) {
                this.props.clearErrorMessage();
            }

            this.props.onSaveClicked(this.state.text);
        }
    }

    private _onDiscard = (): void => {
        if (this._isDirty()) {
            this.props.publishProjectDescriptionDiscardClicked();
            if (this.props.errorMessage) {
                this.props.clearErrorMessage();
            }

            this._showDiscardDialog();
        }
    }

    private _onClickOut = (): void => {
        if (!this._isDirty() && !this.props.isEditingDisabled) {
            this.props.toggleEditing(DescriptionEditingToggleType.OnClickOutToggle);
        }
    }

    private _getSaveButtonCSSClass(): string {
        if (this._isDirty()) {
            return saveButtonCSSClass;
        } else {
            return saveButtonCSSClass + " disabled";
        }
    }

    private _getDiscardButtonCSSClass(): string {
        if (this._isDirty()) {
            return undoButtonCSSClass;
        } else {
            return undoButtonCSSClass + " disabled";
        }
    }

    private _beforeDescriptionChanged = (newValue: string): void => {
        if (this.props.errorMessage) {
            this.props.clearErrorMessage();
        }

        this.setState((prevState) => {
            return {
                text: newValue,
                showDiscardDialog: prevState.showDiscardDialog,
            }
        });
    }

    //Following are functions for Discard Dialog

    private _showDiscardDialog = (): void => {
        this.setState((prevState) => {
            return {
                text: prevState.text,
                showDiscardDialog: true,
            }
        });
    }

    private _closeDiscardDialog = (): void => {
        this.setState((prevState) => {
            return {
                text: prevState.text,
                showDiscardDialog: false,
            }
        });
    }

    //In following functions showDiscardDialog state check is added to avoid telemetry logging two times
    //due to OfficeFabric component - 'Dialog' executing extra 'onDismiss' call

    private _onDiscardDialogOKClicked = (): void => {
        if (this.state.showDiscardDialog) {
            this.props.publishProjectDescriptionDiscardDialogOKClicked();
            this._closeDiscardDialog();
            this.props.toggleEditing(DescriptionEditingToggleType.OnDiscardToggle);
        }
    }

    private _onDiscardDialogCancelClicked = (): void => {
        if (this.state.showDiscardDialog) {
            this.props.publishProjectDescriptionDiscardDialogCancelClicked();
            this._closeDiscardDialog();
        }

        this._focusInTextArea();
    }

    private _onDiscardDialogDismissed = (): void => {
        if (this.state.showDiscardDialog) {
            this.props.publishProjectDescriptionDiscardDialogDismissed();
            this._closeDiscardDialog();
        }

        this._focusInTextArea();
    }
}