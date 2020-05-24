import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Dialog, DialogType, DialogFooter, IDialogProps } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { TextField } from "OfficeFabric/TextField";
import * as React from "react";
import { FileInputControlResult } from "VSS/Controls/FileInput";
import { announce } from "VSS/Utils/Accessibility";
import { format, localeIgnoreCaseComparer } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { ViewMode, ZeroDataExperienceViewMode, IInternalLinkedArtifactDisplayData  } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { NewCommitDescriptor } from "VersionControl/Scenarios/Explorer/ActionCreator";
import { CommitPromptState } from "VersionControl/Scenarios/Shared/Committing/CommitPromptStore";
import { TextFieldParentAddon } from "VersionControl/Scenarios/Shared/Committing/TextFieldParentAddon";
import { FileInput } from "VersionControl/Scenarios/Shared/FileInput";
import { WorkItemListSelector } from "VersionControl/Scenarios/Shared/WorkItemListSelector";
import { hasIllegalNtfsChars } from "VersionControl/Scripts/FileSpecUtility";
import { BranchNameValidator } from "VersionControl/Scripts/RefNameValidator";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { mapWorkItemIdToLinkedArtifact } from "VersionControl/Scripts/Utils/WorkItemLinkUtils";
import { getFileName, combinePaths, validateMaxLength } from "VersionControl/Scripts/VersionControlPath";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/Committing/CommitDialog";

export interface CommitDialogProps extends CommitPromptState {
    tfsContext: TfsContext;
    rootPath?: string;
    isRenaming?: boolean;
    currentBranchName: string;
    canCreatePullRequest: boolean;
    onSave(newCommit: NewCommitDescriptor): void;
    onDismiss(): void;
}

export interface CommitDialogState {
    comment: string;
    autoComment: string;
    newBranchName: string;
    newBranchNameErrorMessage: string;
    hasToCreatePullRequest: boolean;
    /**
     * The new name of a renamed item, or the name of a creating folder.
     */
    newItemName: string;
    newItemNameErrorMessage: string;
    isNewItemNameErrorInitiallyHidden: boolean;
    linkedWorkItemIds: number[];
    filesToBeUploaded: FileInputControlResult[];
}

/**
 * A component that displays a dialog with required data to commit file changes.
 */
export class CommitDialog extends React.PureComponent<CommitDialogProps, CommitDialogState> {
    private newItemNameTextField: TextField;
    private commentTextField: TextField;

    constructor(props: CommitDialogProps) {
        super(props);

        const newItemName = props.isRenaming ? props.itemName : "";

        this.state = {
            comment: props.initialComment,
            autoComment: props.initialComment,
            newBranchName: props.currentBranchName,
            newBranchNameErrorMessage: this.getErrorBranchName(""),
            hasToCreatePullRequest: false,
            newItemName,
            newItemNameErrorMessage: this.getErrorNewItemName(newItemName),
            isNewItemNameErrorInitiallyHidden: true,
            linkedWorkItemIds: [],
            filesToBeUploaded: [],
        };
    }

    public componentWillReceiveProps(nextProps: CommitDialogProps) {
        if (nextProps.isSaving && !this.props.isSaving) {
            announce(nextProps.isGit ? VCResources.CommitSaving : VCResources.CheckinSaving);
        }
    }

    public componentDidUpdate(prevProps: CommitDialogProps) {
        if (this.props.errorMessage && !prevProps.errorMessage) {
            // HACK Even on this method, input are still disabled since we were saving,
            // so focus wouldn't get set without setTimeout, which does happen once they are back enabled.
            setTimeout(this.setInitialFocus);
        }
    }

    public render(): JSX.Element {
        const title = this.isNewBranch()
            ? VCResources.EditFileCommitToNewBranch
            : this.getSaveButtonText();

        return (
            <Dialog
                modalProps={{ containerClassName: "vc-commit-dialog", isBlocking: true }}
                hidden={false}
                dialogContentProps={{ type: DialogType.close, className: "vc-commit-dialog-content" }}
                title={title}
                closeButtonAriaLabel={VCResources.DialogClose}
                onDismiss={this.props.onDismiss}>
                {
                    this.props.errorMessage &&
                    <MessageBar messageBarType={MessageBarType.error}>{this.props.errorMessage}</MessageBar>
                }
                {
                    (this.props.isRenaming || this.props.isCreatingFolder) &&
                    this.renderNewItemName()
                }
                {
                    this.props.isUploading &&
                    <FileInput
                        isGit={this.props.isGit}
                        rootPath={this.props.rootPath}
                        editingPath={this.props.editingPath}
                        initialDrop={this.props.initialDrop}
                        onUploadedFileStateChaged={this.setUploadedFileState}
                        filesToBeUploaded={this.state.filesToBeUploaded}
                        fileAlreadyExists={this.fileAlreadyExists}
                    />
                }
                <div className="comment-container">
                    <Label className="right-side-label" disabled>
                        {this.state.comment && this.state.comment !== this.state.autoComment ? this.state.autoComment : ""}
                    </Label>
                    <TextField
                        label={VCResources.CommitCommentLabel}
                        ref={this.captureCommentTextField}
                        placeholder={this.state.autoComment}
                        multiline
                        resizable={false}
                        disabled={this.props.isSaving || this.props.gatedCheckin !== undefined}
                        value={this.state.comment}
                        onChanged={this.setComment}
                        onKeyDown={this.saveOnCtrlEnter}
                    />
                </div>
                {
                    this.props.isGit &&
                    <div className="new-branch-name-fixed-container">
                        <Label className="right-side-label" disabled>
                            {this.isNewBranch() ? format(VCResources.CommitBranchBasedOnLabel, this.props.currentBranchName) : ""}
                        </Label>
                        <TextField
                            label={VCResources.CommitBranchNameLabel}
                            placeholder={this.props.currentBranchName}
                            disabled={this.props.isSaving}
                            value={this.state.newBranchName}
                            onChanged={this.setNewBranchName}
                            errorMessage={this.state.newBranchNameErrorMessage}
                        />
                    </div>
                }
                {
                    !this.props.gatedCheckin &&
                    <WorkItemListSelector
                        tfsContext={this.props.tfsContext}
                        linkedArtifacts={this.state.linkedWorkItemIds.map(mapWorkItemIdToLinkedArtifact)}
                        onWorkItemAdd={this.addWorkItem}
                        checkWorkItemExists={this.containsWorkItem}
                        onRemoveLinkedArtifact={this.removeWorkItem}
                        viewOptions={{ viewMode: ViewMode.List }}
                        zeroDataOptions={{ zeroDataExperienceViewMode: ZeroDataExperienceViewMode.Hidden }}
                        linkTypeRefNames={null}
                        hostArtifactId={null}
                        dropIconCss="bowtie-chevron-down-light"
                        label={VCResources.CreateBranchDialogWorkItemsLabel}
                    />
                }
                <div className="create-pull-request-container">
                    {
                        this.isNewBranch() &&
                        <Checkbox
                            label={VCResources.CreatePullRequestLabel}
                            checked={this.state.hasToCreatePullRequest}
                            disabled={!this.props.canCreatePullRequest || this.props.isSaving}
                            onChange={this.toggleCreatePullRequest}
                        />
                    }
                </div>
                {this.renderFooter()}
            </Dialog>);
    }

    private renderNewItemName() {
        const label = this.props.isRenaming
            ? VCResources.CommitNewItemNameLabel
            : VCResources.CommitNewFolderNameLabel;

        const parentPath = this.props.isCreatingFolder && this.props.editingPath;

        return (
            <TextField
                className="new-item-name-fixed-container"
                ref={this.captureNewItemNameTextField}
                label={label}
                prefix={parentPath}
                onRenderPrefix={parentPath && TextFieldParentAddon}
                placeholder={VCResources.CommitNewItemNameWatermark}
                disabled={this.props.isSaving}
                value={this.state.newItemName}
                onChanged={this.setNewItemName}
                onKeyDown={this.saveOnEnter}
                errorMessage={!this.state.isNewItemNameErrorInitiallyHidden && this.state.newItemNameErrorMessage}
            />);
    }

    private renderFooter() {
        if (this.props.isSaving) {
            return <Spinner label={this.props.isGit ? VCResources.CommitSaving : VCResources.CheckinSaving} />;
        }

        if (!this.props.gatedCheckin) {
            return (
                <DialogFooter>
                    <PrimaryButton
                        disabled={!this.canSave()}
                        onClick={this.save}>
                        {this.getSaveButtonText()}
                    </PrimaryButton>
                    <DefaultButton
                        disabled={this.props.isSaving}
                        onClick={this.props.onDismiss}>
                        {VCResources.EditFileCancel}
                    </DefaultButton>
                </DialogFooter>);
        } else {
            if (this.props.gatedCheckin.buildId) {
                return (
                    <div>
                        <span>
                            {format(VCResources.CommitQueuedGatedCheckin, this.props.gatedCheckin.shelvesetName, this.props.gatedCheckin.affectedBuildDefinitionNames[0])}
                        </span>
                    </div>
                );
            }

            let affectedDefinitions = this.props.gatedCheckin.affectedBuildDefinitionNames.map(
                (name, idx) => {
                    return (
                        <li key={idx}>
                            {name}
                        </li>);
                }
            )
            return (
                <div>
                    <span>
                        {VCResources.CommitRequiresGatedCheckin}
                    </span>
                    <ul>
                        {affectedDefinitions}
                    </ul>
                </div>
            )
        }
    }

    private captureCommentTextField = (ref: TextField) => {
        this.commentTextField = ref;
        if (ref) {
            this.setInitialFocus();
        }
    }

    private captureNewItemNameTextField = (ref: TextField) => {
        this.newItemNameTextField = ref;
        if (ref) {
            this.setInitialFocus();
        }
    }

    private canSave() {
        return this.isValid() && !this.props.isSaving;
    }

    private saveOnCtrlEnter = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.ctrlKey) {
            this.saveOnEnter(event);
        }
    }

    private saveOnEnter = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.which === KeyCode.ENTER && this.canSave()) {
            this.save();
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private getSaveButtonText(): string {
        return this.props.isGit ? VCResources.EditFileCommit : VCResources.EditFileCheckin;
    }

    public setUploadedFileState = (filesToBeUploaded: FileInputControlResult[]): void => {
        const autoComment = this.getDefaultUploadFilesComment(filesToBeUploaded);

        this.setState({
            filesToBeUploaded,
            autoComment
        } as CommitDialogState);
    }

    public setComment = (comment: string): void => {
        this.setState({
            comment,
        } as CommitDialogState);
    }

    public setNewBranchName = (newBranchName: string): void => {
        this.setState({
            newBranchName,
            newBranchNameErrorMessage: this.getErrorBranchName(newBranchName),
        } as CommitDialogState);
    }

    public toggleCreatePullRequest = (): void => {
        this.setState(state => ({
            hasToCreatePullRequest: !state.hasToCreatePullRequest,
        }));
    }

    public setNewItemName = (newItemName: string): void => {
        newItemName = newItemName ? newItemName.trim() : "";

        const autoComment = this.props.isRenaming
            ? format(VCResources.DefaultRenameCommentFormatFromTo, this.props.itemName, newItemName)
            : this.props.isCreatingFolder
            ? format(VCResources.DefaultCreateFolderCommentFormat, newItemName)
            : this.state.autoComment;

        const comment = this.state.autoComment === this.state.comment
            ? autoComment
            : this.state.comment;

        this.setState({
            autoComment,
            comment,
            newItemName,
            newItemNameErrorMessage: this.getErrorNewItemName(newItemName),
            isNewItemNameErrorInitiallyHidden: false,
        } as CommitDialogState);
    }

    public save = (): void => {
        if (!this.isValid()) {
            throw new Error("Save should not be enabled if dialog is not valid.");
        }

        this.props.onSave({
            comment: this.state.comment || this.state.autoComment,
            isCommentDefault: !this.state.comment || this.state.comment === this.state.autoComment,
            newBranchName: this.isNewBranch() && this.state.newBranchName,
            hasToCreatePullRequest: this.isNewBranch() && this.state.hasToCreatePullRequest,
            newItemName: this.state.newItemName,
            linkedWorkItemIds: this.state.linkedWorkItemIds,
            filesToBeUploaded: this.state.filesToBeUploaded,
        });
    }

    public isValid(): boolean {
        return !this.state.newBranchNameErrorMessage &&
            !((this.props.isRenaming || this.props.isCreatingFolder) && this.state.newItemNameErrorMessage) &&
            !(this.props.isUploading && this.state.filesToBeUploaded.length === 0);
    }

    private getErrorBranchName = (branchName: string): string | undefined => {
        if (!branchName || branchName === this.props.currentBranchName) {
            return undefined;
        }

        const validator = new BranchNameValidator(this.props.existingBranches || []);
        const result = validator.validate(branchName);
        return result.allValid ? undefined : result.error;
    }

    private getErrorNewItemName = (newItemName: string): string => {
        if (!newItemName) {
            const fieldTitle = this.props.isRenaming ? VCResources.CommitNewItemNameLabel : VCResources.CommitNewFolderNameLabel;
            return format(VCResources.ValidationMessageIsRequired, fieldTitle);
        }

        if (this.props.isRenaming && newItemName === this.props.itemName) {
            return VCResources.CommitRenameToSameNameError;
        }

        const maxLengthErrorMessage = validateMaxLength(this.props.editingPath, newItemName);
        if (maxLengthErrorMessage) {
            return maxLengthErrorMessage;
        }

        if (this.fileAlreadyExists(newItemName)) {
            return VCResources.CommitNewItemNameAlreadyExists;
        }

        if (hasIllegalNtfsChars(newItemName)) {
            return format(VCResources.InvalidFileName, newItemName);
        }
    }

    private getDefaultUploadFilesComment(filesToBeUploaded: FileInputControlResult[]): string {
        if (!filesToBeUploaded || filesToBeUploaded.length === 0) {
            return "";
        }
        else {
            let editCount = 0;

            if (this.props.existingFileList) {
                for (const file of filesToBeUploaded) {
                    if (this.fileAlreadyExists(file.name)) {
                        editCount++;
                    }
                }
            }

            if (filesToBeUploaded.length === 1) {
                if (editCount > 0) {
                    return format(VCResources.AddFileDialogDefaultCommentSingleFileWithEdit, filesToBeUploaded[0].name);
                }
                else {
                    return format(VCResources.AddFileDialogDefaultCommentSingleFile, filesToBeUploaded[0].name);
                }
            }
            else {
                const parentFolderName = getFileName(this.props.editingPath) || this.props.rootPath;
                if (editCount > 0 && editCount < filesToBeUploaded.length) {
                    return format(VCResources.AddFileDialogDefaultCommentMultipleFilesWithAddsAndEdits, filesToBeUploaded.length, parentFolderName);
                }
                else if (editCount > 0) {
                    return format(VCResources.AddFileDialogDefaultCommentMultipleFilesWithEdits, filesToBeUploaded.length, parentFolderName);
                }
                else {
                    return format(VCResources.AddFileDialogDefaultCommentMultipleFiles, filesToBeUploaded.length, parentFolderName);
                }
            }
        }
    }

    private fileAlreadyExists = (fileToCheck: string): boolean => {
        const newPath = combinePaths(this.props.editingPath, fileToCheck);

        return this.props.existingFileList &&
            this.props.existingFileList
            .filter(item => localeIgnoreCaseComparer(item.serverItem, newPath) === 0)
            .length > 0;
    }

    private addWorkItem = (workItemId: number): void => {
        this.setState({
            linkedWorkItemIds: this.state.linkedWorkItemIds.concat([workItemId]),
        } as CommitDialogState);
    }

    private removeWorkItem = (workItem: IInternalLinkedArtifactDisplayData ): void => {
        this.setState({
            linkedWorkItemIds: this.state.linkedWorkItemIds.filter(id => id !== Number(workItem.id)),
        } as CommitDialogState);
    }

    private containsWorkItem = (workItemId: number): boolean => {
        return this.state.linkedWorkItemIds.indexOf(workItemId) >= 0;
    }

    private isNewBranch(): boolean {
        return this.state.newBranchName && this.state.newBranchName !== this.props.currentBranchName;
    }

    private setInitialFocus = () => {
        if (this.newItemNameTextField) {
            this.newItemNameTextField.focus();
            this.newItemNameTextField.setSelectionStart(0);
            if (this.state.newItemName) {
                const dotIndex = this.state.newItemName.lastIndexOf(".");
                this.newItemNameTextField.setSelectionEnd(dotIndex > 0 ? dotIndex : this.state.newItemName.length);
            }
        } else if (this.commentTextField) {
            this.commentTextField.focus();
        }
    }
}
