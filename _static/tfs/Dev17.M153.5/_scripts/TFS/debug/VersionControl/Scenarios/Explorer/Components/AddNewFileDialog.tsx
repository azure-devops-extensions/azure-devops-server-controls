import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { TextField } from "OfficeFabric/TextField";
import { Async } from "OfficeFabric/Utilities";
import * as React from "react";
import { localeIgnoreCaseComparer, format } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { AddNewFilePromptState } from "VersionControl/Scenarios/Explorer/Stores/AddNewFilePromptStore";
import { TextFieldParentAddon } from "VersionControl/Scenarios/Shared/Committing/TextFieldParentAddon";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { combinePaths, getFolderName, getFileName, pathSeparator, validatePartialPath, validateFilename, validateMaxLength } from "VersionControl/Scripts/VersionControlPath";

import "VSS/LoaderPlugins/Css!VersionControl/AddNewFileDialog";

export interface AddNewFileDialogState {
    newFileName: string;
    newFileNameErrorMessage: string;
    placeholderName: string;
    placeholderNameErrorMessage: string;
    isValid: boolean;
}

export const initialState: Readonly<AddNewFileDialogState> = {
    newFileName: "",
    newFileNameErrorMessage: undefined,
    placeholderName: "",
    placeholderNameErrorMessage: undefined,
    isValid: false,
};

export interface AddNewFileDialogProps extends AddNewFilePromptState {
    onTargetFolderChanged(newSubfolder: string): void;
    onDismiss(): void;
    onAddNewFile(newItemPath: string): void;
}

const fetchSubfolderDelayInMilliseconds = 800;

export class AddNewFileDialog extends React.PureComponent<AddNewFileDialogProps, AddNewFileDialogState>{
    public state = initialState;

    private lastTriggeredNewSubfolder = "";

    public componentWillReceiveProps(nextProps: AddNewFileDialogProps) {
        if (nextProps.existingPaths !== this.props.existingPaths) {
            this.setState(state => {
                // Validate for duplicate with new paths, but only if there's some name already,
                // because we don't want to generate an emptyness error the first time.
                if (state.newFileName) {
                    const updater = getNewFileNameUpdater(state.newFileName);
                    return updater(state, nextProps);
                }
            });
        }
    }

    public render(): JSX.Element {
        return (
            <Dialog
                modalProps={{ containerClassName: "vc-add-new-file-dialog", isBlocking: true }}
                hidden={false}
                dialogContentProps={{ type: DialogType.close }}
                title={this.props.isCreatingFolder ? VCResources.AddNewFolder : VCResources.AddNewFile}
                firstFocusableSelector="file-name-input"
                closeButtonAriaLabel={VCResources.DialogClose}
                onDismiss={this.props.onDismiss} >

                <TextField
                    className="new-file-name-fixed-container"
                    label={getNewNameLabel(this.props)}
                    value={this.state.newFileName}
                    required={true}
                    errorMessage={this.state.newFileNameErrorMessage}
                    prefix={this.props.folderPath}
                    onRenderPrefix={this.props.folderPath && TextFieldParentAddon}
                    description={VCResources.AddFileDialogSubfolderDescription}
                    inputClassName="file-name-input"
                    onChanged={this.editNewFileName}
                    onKeyDown={this.onKeyDown}
                />

                {
                    this.props.isCreatingFolder &&
                    <TextField
                        className="new-placeholder-name-fixed-container"
                        label={VCResources.AddFileDialogFilenameLabel}
                        value={this.state.placeholderName}
                        required={true}
                        errorMessage={this.state.placeholderNameErrorMessage}
                        description={VCResources.AddFileDialogGitPlaceholderDescription}
                        onChanged={this.editPlaceholderName}
                        onKeyDown={this.onKeyDown}
                    />
                }

                <DialogFooter>
                    <PrimaryButton
                        disabled={!this.state.isValid}
                        onClick={this.addNewFile}>
                        {VCResources.ModalDialogCreateButton}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this.props.onDismiss}>
                        {VCResources.EditFileCancel}
                    </DefaultButton>
                </DialogFooter>
            </Dialog >
        );
    }

    private onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.which === KeyCode.ENTER && this.state.isValid) {
            this.addNewFile();
        }
    }
    private addNewFile = (): void => {
        triggerOnAddNewFile(this.state, this.props);
    }

    private editNewFileName = (newValue: string): void => {
        this.setState(getNewFileNameUpdater(newValue), this.debouncedOnTargetFolderChanged);
    }

    private editPlaceholderName = (newValue: string): void => {
        this.setState(getPlaceholderNameUpdater(newValue));
    }

    private onTargetFolderChanged = () => {
        const newSubfolder = getFolderName(this.state.newFileName);
        if (newSubfolder !== this.lastTriggeredNewSubfolder) {
            this.lastTriggeredNewSubfolder = newSubfolder;
            this.props.onTargetFolderChanged(newSubfolder);
        }
    }

    private debouncedOnTargetFolderChanged = new Async().debounce(this.onTargetFolderChanged, fetchSubfolderDelayInMilliseconds, { trailing: true });
}

export type StateUpdater = (state: AddNewFileDialogState, props: AddNewFileDialogProps) => AddNewFileDialogState;

export function getNewFileNameUpdater(newFileName: string): StateUpdater {
    newFileName = newFileName.trim();

    return (state: AddNewFileDialogState, props: AddNewFileDialogProps): AddNewFileDialogState => {
        const newFileNameErrorMessage = validateNewFileName(newFileName, props, props.isCreatingFolder && state.placeholderName);

        return computeIsValid(props, {
            ...state,
            newFileName,
            newFileNameErrorMessage,
        });
    };
}

export function getPlaceholderNameUpdater(placeholderName: string): StateUpdater {
    placeholderName = placeholderName.trim();

    return (state: AddNewFileDialogState, props: AddNewFileDialogProps): AddNewFileDialogState => {
        const placeholderNameErrorMessage = props.isCreatingFolder &&
            validatePlaceholderName(placeholderName, props, state.newFileName);

        return computeIsValid(props, {
            ...state,
            placeholderName,
            placeholderNameErrorMessage,
        });
    };
}

function computeIsValid(props: AddNewFileDialogProps, state: AddNewFileDialogState): AddNewFileDialogState {
    return {
        ...state,
        isValid:
            state.newFileName &&
            !state.newFileNameErrorMessage &&
            (!props.isCreatingFolder ||
            state.placeholderName &&
            !state.placeholderNameErrorMessage),
    };
}

function validateNewFileName(newFileName: string, props: AddNewFileDialogProps, placeholderName: string): string {
    if (!newFileName || endsWith(newFileName, pathSeparator)) {
        return format(VCResources.ValidationMessageIsRequired, getNewNameLabel(props));
    }

    const errorMessage = validatePartialPath(newFileName, props.folderPath, props.isGit ? RepositoryType.Git : RepositoryType.Tfvc);
    if (errorMessage) {
        return errorMessage;
    }

    const maxLengthErrorMessage = validateMaxLength(props.folderPath, newFileName, props.isCreatingFolder && placeholderName);
    if (maxLengthErrorMessage) {
        return maxLengthErrorMessage;
    }

    if (props.fileUsedAsFolder) {
        return format(VCResources.AddFileDialogFileUsedAsFolder, getFileName(props.fileUsedAsFolder));
    }

    const fullPath = combinePaths(props.folderPath, newFileName);
    if (props.isLoadingChildItems || props.newSubfolder !== getFolderName(newFileName)) {
        return VCResources.AddFileDialogSubfolderVerifying;
    } else if (checkFileExists(fullPath, props)) {
        return format(VCResources.AddFileDialogAlreadyExistsErrorFormat, fullPath);
    }
}

function checkFileExists(fullPath: string, props: AddNewFileDialogProps): boolean {
    const found = props.existingPaths.filter(path => localeIgnoreCaseComparer(path, fullPath) === 0);
    return found.length > 0;
}

function validatePlaceholderName(placeholderName: string, props: AddNewFileDialogProps, newFileName: string): string | undefined {
    if (!props.isCreatingFolder) {
        return undefined;
    }

    if (!placeholderName) {
        return format(VCResources.ValidationMessageIsRequired, VCResources.AddFileDialogFilenameLabel);
    }

    const errorMessage = validateFilename(placeholderName, props.folderPath, props.isGit ? RepositoryType.Git : RepositoryType.Tfvc);
    if (errorMessage) {
        return errorMessage;
    }

    const maxLengthErrorMessage = validateMaxLength(props.folderPath, newFileName, placeholderName);
    if (maxLengthErrorMessage) {
        return maxLengthErrorMessage;
    }
}

export function triggerOnAddNewFile(state: AddNewFileDialogState, props: AddNewFileDialogProps): void {
    props.onAddNewFile(combinePaths(
        props.folderPath,
        state.newFileName,
        props.isCreatingFolder && state.placeholderName));
}

function getNewNameLabel({ isCreatingFolder }: AddNewFileDialogProps) {
    return isCreatingFolder
        ? VCResources.AddFileDialogFolderNameLabel
        : VCResources.AddFileDialogFilenameLabel;
}

function endsWith(text: string, part: string): boolean {
    return text.substr(-part.length) === part;
}
