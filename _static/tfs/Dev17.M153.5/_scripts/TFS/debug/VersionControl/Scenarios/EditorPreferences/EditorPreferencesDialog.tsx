import * as React from "react";
import * as ReactDom from "react-dom";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";
import { autobind, shallowCompare } from "OfficeFabric/Utilities";

import { EditorPreferences as EditorUserPreferences } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface IEditorPreferencesDialogProps {
    preserveLineHeight: boolean;
    editorUserPreferences: EditorUserPreferences;
    onSavePreferences(preferences: EditorUserPreferences, uiSource?: string): void;
    onCancelled?(): void;
    uiSource?: string;
}

interface IEditorPreferencesDialogState extends EditorUserPreferences {
}

/**
 * Container and entry point for the Editor Preferences Dialog
 */
export namespace EditorPreferencesDialog {
    let _dialogContainer: HTMLElement = null;

    /**
     * Show the editor preferences dialog.
     */
    export function show(props: IEditorPreferencesDialogProps) {
        _dialogContainer = document.createElement("div");
        document.body.appendChild(_dialogContainer);
        ReactDom.render(<EditorPreferencesDialogImp {...props} />, _dialogContainer);
    }

    /**
     * Close the editor preferences dialog.
     */
    export function close() {
        if (_dialogContainer) {
            ReactDom.unmountComponentAtNode(_dialogContainer);
            _dialogContainer.parentElement.removeChild(_dialogContainer);
            _dialogContainer = null;
        }
    }
}

/**
 * Implementation of the Editor Preferences dialog
 */
class EditorPreferencesDialogImp extends React.Component<IEditorPreferencesDialogProps, IEditorPreferencesDialogState>
{
    constructor(props: IEditorPreferencesDialogProps) {
        super(props);

        this.state = { ...props.editorUserPreferences };
    }

    public render() {
        const saveEnabled = !shallowCompare(this.props.editorUserPreferences, this.state);

        return (
            <Dialog
                hidden={false}
                dialogContentProps={{ type: DialogType.close }}
                onDismiss={EditorPreferencesDialog.close}
                closeButtonAriaLabel={VCResources.DialogClose}
                title={VCResources.EditorPreferencesDialogTitle}
                modalProps={{ containerClassName: "vc-editor-preferences-dialog", isBlocking: true }}>

                {
                    this.props.preserveLineHeight &&
                    <MessageBar messageBarType={MessageBarType.info}>
                        Current view does not support settings that alter line synchronization.
                    </MessageBar>
                }
                <Checkbox
                    label={VCResources.EditorPreferencesDialogWhiteSpace}
                    onChange={this.onWhiteSpaceChanged}
                    checked={this.state.whiteSpaceEnabled} />
                <Checkbox
                    label={VCResources.EditorPreferencesDialogWordWrap}
                    disabled={this.props.preserveLineHeight}
                    onChange={this.onWordWrapChanged}
                    checked={this.state.wordWrapEnabled} />
                <Checkbox
                    label={VCResources.EditorPreferencesDialogFolding}
                    disabled={this.props.preserveLineHeight}
                    onChange={this.onFoldingChanged}
                    checked={this.state.foldingEnabled} />
                <Checkbox
                    label={VCResources.EditorPreferencesDialogMinimap}
                    onChange={this.onMinimapChanged}
                    checked={this.state.minimapEnabled} />

                <DialogFooter>
                    <PrimaryButton
                        ariaLabel={VCResources.ModalDialogSaveButton}
                        disabled={!saveEnabled}
                        onClick={this.onSaveClicked}>
                        {VCResources.ModalDialogSaveButton}
                    </PrimaryButton>
                    <DefaultButton
                        ariaLabel={VCResources.ModalDialogCancelButton}
                        onClick={this.onCancelClick}>
                        {VCResources.ModalDialogCancelButton}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    @autobind
    private onWhiteSpaceChanged(ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) {
        this.setState({
            whiteSpaceEnabled: isChecked,
        });
    }

    @autobind
    private onWordWrapChanged(ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) {
        this.setState({
            wordWrapEnabled: isChecked,
        });
    }

    @autobind
    private onFoldingChanged(ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) {
        this.setState({
            foldingEnabled: isChecked,
        });
    }

    @autobind
    private onMinimapChanged(ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) {
        this.setState({
            minimapEnabled: isChecked,
        });
    }

    @autobind
    private onSaveClicked() {
        this.props.onSavePreferences(this.state, this.props.uiSource);
        EditorPreferencesDialog.close();
    }

    @autobind
    private onCancelClick() {
        if (this.props.onCancelled) {
            this.props.onCancelled();
        }
        EditorPreferencesDialog.close();
    }
}
