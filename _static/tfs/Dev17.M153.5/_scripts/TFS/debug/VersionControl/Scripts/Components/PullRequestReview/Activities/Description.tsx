import Q = require("q");
import React = require("react");

import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");

import CommentParser = require("VersionControl/Scripts/CommentParser");
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

import VCContracts = require("TFS/VersionControl/Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as TFSResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { DiscussionAttachment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";
import { IAttachmentValidation } from "VersionControl/Scripts/Stores/PullRequestReview/IAttachmentsStore";
import { MarkdownInputWidget } from "Discussion/Scripts/Components/MarkdownInputWidget/MarkdownInputWidget"
import { RenderedContent } from "Discussion/Scripts/Components/RenderedContent/RenderedContent";

import { css, autobind } from "OfficeFabric/Utilities";
import { IconButton, PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import "VSS/LoaderPlugins/Css!VersionControl/DescriptionEdit";

export interface DescriptionProps extends Activity.IActivityProps {
    pullRequest: IPullRequest;
    getUniqueFileName(fileName: string): string; // generate a unique storage name based on a file name
    attachmentErrors: IDictionaryStringTo<string>; // file name to error
    headingLevel?: number;
    hasPermissionToUpdateDescription: boolean;
}

export interface DescriptionState extends Activity.IActivityState {
    pendingChange?: boolean;
    pendingAttachments?: string[]; // attachment file names
    isEditing?: boolean;
    editedDescription?: string;
    attachmentUploadError?: boolean;
    validationError?: string;
    validAttachmentTypes?: string[];
}

export class Description extends Activity.Component<DescriptionProps, DescriptionState> {
    private _textControl: HTMLTextAreaElement;
    private _shouldFocusTextArea: boolean;

    constructor(props: DescriptionProps) {
        super(props);

        // this.state may be null, so just the $.extend is not sufficient, the assignment is necessary
        this.state = {
            pendingChange: false,
            pendingAttachments: [],
        };
    }

    public render(): JSX.Element {
        let shortDesc: JSX.Element;
        if (this.props.pullRequest.description && this.props.pullRequest.description.length > 0) {
            shortDesc = <span>{CommentParser.Parser.getShortComment(this.props.pullRequest.description, null, true)}</span>;
        }
        else {
            shortDesc = <em>{VCResources.PullRequest_Activity_Description_Label}</em>;
        }

        const className = css(
            "vc-pullrequest-description-title",
            { ["editing"]: this.state.isEditing });

        const headingLevel = this.props.headingLevel || 3;

        let errorString: string = null;
        let retryAction: JSX.Element = null;
        if (this.state.validationError) {
            errorString = this.state.validationError;
        }
        else if (this.state.attachmentUploadError) {
            errorString = VCResources.AttachmentError;
            retryAction = <DefaultButton
                className={"vc-discussion-retry-button"}
                onClick={this._retryAttachments} >
                {VCResources.AttachmentRetry}
            </DefaultButton>;
        }

        const editor = this.state.isEditing ?
            <MarkdownInputWidget
                className={"description-edit"}
                textAreaRef={this._setTextAreaRef}
                artifactUri={this.props.pullRequest.artifactId}
                onTextChange={this._onTextChange}
                value={this.state.editedDescription}
                onKeyDown={this._onKeyDown}
                onAttachmentsAdded={this._addAttachments}
                error={errorString}
                dismissError={this.state.validationError && this._clearError}
                statusBarActions={retryAction}
                enableAttachments={true}
                aria-label={VCResources.PullRequest_CommentTextAreaAriaLabel}
                validAttachmentTypes={this.state.validAttachmentTypes}
                buttonArea={this._buttons()} /> : null;

        const isEditable = this.props.hasPermissionToUpdateDescription && this.props.pullRequest.status === VCContracts.PullRequestStatus.Active;
        const showEditButton = isEditable && !this.state.pendingChange && !this.state.isEditing;
        const description = this.state.isEditing ? this.state.editedDescription : this.props.pullRequest.description;
        const renderer = Flux.instance().storesHub.discussionsStore.getDiscussionRenderer().render;

        return this._renderContainer(
            null,
            (<div className={className}>
                <span className="inline-title-text" role="heading" aria-level={headingLevel}>{VCResources.PullRequest_Activity_Description_Label}</span>
                {showEditButton ? this._editButton() : null}
            </div>),
            null,
            <div className={"vc-prdetails-description-area"}>
                {editor}
                <RenderedContent content={description || ""} render={renderer} taskItemClicked={showEditButton && this._onTaskItemClicked} />
            </div>,
            null,
            <span>{shortDesc}</span>,
            null,
            null);
    }

    public componentWillReceiveProps(nextProps: DescriptionProps): void {
        if (this.state.pendingChange && this.props.pullRequest.description !== nextProps.pullRequest.description) {
            this.setState({
                pendingChange: false
            });
        }
    }

    public componentDidMount(): void {
        this.setState({
            validAttachmentTypes: Flux.instance().storesHub.attachmentStore.getAllowedAttachments()
        });
    }

    private _editButton(): JSX.Element {
        return <IconButton
            className={"inline-edit-button"}
            onClick={this._startEdit}
            title={VCResources.PullRequest_Edit_Description}
            aria-label={VCResources.PullRequest_Edit_Description}
            iconProps={{ className: "bowtie-icon bowtie-edit" }} />;
    }

    private _buttons(): JSX.Element {
        return <span className={"vc-discussion-thread-buttonarea"}>
            <PrimaryButton
                className={"cta"}
                aria-label={TFSResources.InlineEdit_Save}
                onClick={this._submit} >
                {TFSResources.InlineEdit_Save}
            </PrimaryButton>
            <DefaultButton
                aria-label={TFSResources.InlineEdit_Cancel}
                onClick={this._cancel} >
                {TFSResources.InlineEdit_Cancel}
            </DefaultButton>
        </span>;
    }

    @autobind
    private _onTextChange(newValue: string): void {
        Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestPendingDescription(newValue);

        this.setState({
            editedDescription: newValue
        });
    }

    // callback from the edit control to submit the new description to the server
    @autobind
    private _submit(): void {
        const pendingDescription = this.state.editedDescription;

        if (this.props.pullRequest.description === pendingDescription) {
            // description didn't change; do not update the PR
            this.setState(
                {
                    pendingChange: false,
                    pendingAttachments: [],
                    isEditing: false
                } as DescriptionState);
        }
        else {
            // description changed; update the PR
            this.setState(
                {
                    pendingChange: true,
                    pendingAttachments: [],
                    isEditing: false
                } as DescriptionState,
                () => {
                    Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestPendingDescription(null);
                    Flux.instance().actionCreator.pullRequestActionCreator.savePullRequestDescriptionWithAttachments(
                        this.props.pullRequest.pullRequestId,
                        pendingDescription,
                        () => {
                            Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestPendingDescription(pendingDescription);
                            this.setState({
                                pendingChange: false,
                                editedDescription: pendingDescription,
                                isEditing: true
                            } as DescriptionState);
                        });
                });
        }
    }

    @autobind
    private _cancel(): void {
        this.setState({
            pendingAttachments: [],
            isEditing: false,
            editedDescription: null,
            attachmentUploadError: false,
            validationError: undefined
        });
        Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestPendingDescription(null);
    }

    @autobind
    private _startEdit() {

        this._shouldFocusTextArea = true;
        this.setState({
            isEditing: true,
            editedDescription: this.props.pullRequest.description
        });

        // A null value signifies that we're not currently trying to edit the description, so when we start editing set the value
        // to the empty string, which signifies that we're editing but the pending description is blank (e.g. an empty text box)
        const pendingDescription = Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail().pendingDescription || "";
        Flux.instance().actionCreator.pullRequestActionCreator.updatePullRequestPendingDescription(pendingDescription);
    }

    @autobind
    private _retryAttachments(): void {
        Flux.instance().actionCreator.attachmentActionCreator.commitAttachments(this.props.pullRequest.pendingDescription);
    }

    private _validateAttachment(fileName: string, file: File): IAttachmentValidation {
        return Flux.instance().storesHub.attachmentStore.validateFile(fileName, file);
    }

    @autobind
    private _onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (event.ctrlKey && event.key === "Enter") {
            this._submit();
        }
        else if (event.key === "Escape") {
            if (this.state.editedDescription === this.props.pullRequest.description) {
                this._cancel();
            }
        }
    }

    @autobind
    private _addAttachments(files: File[]) {
        if (!files || files.length === 0) {
            return;
        }

        let markdownText = "";

        let error: string;
        for (const file of files) {
            const isImage = file.type.indexOf("image/") === 0;
            let fileName = file.name;

            // file.name should only be undefined when pasting images
            // browse and drag/drop will supply a file name
            if (!fileName) {
                const imageType = file.type.substring("image/".length);
                fileName = GUIDUtils.newGuid() + "." + imageType;
            }

            const validation = this._validateAttachment(fileName, file);
            if (!validation.valid) {
                error = validation.errorMsg;
                continue;
            }

            const uniqueName = this.props.getUniqueFileName(fileName);

            const blob = new Blob([file], { type: file.type });
            const blobUrl = URL.createObjectURL(blob);
            markdownText += (isImage ? "![" : "[") + fileName + "](" + blobUrl + ") ";

            this._addAttachment(uniqueName, file, blobUrl);
        }

        if (markdownText && this._textControl) {
            const selectionStart = this._textControl.selectionStart;
            const selectionEnd = this._textControl.selectionEnd;
            const currentText = this._textControl.value;

            const firstPart = currentText.substring(0, selectionStart);
            const endPart = currentText.substring(selectionEnd);
            const newText = firstPart + markdownText + endPart;

            this._onTextChange(newText);
        }

        if (error != this.state.validationError) {
            this.setState({ validationError: error });
        }
    }

    private _addAttachment(fileName: string, file: File, blobUrl: string): void {
        const newAttachment: DiscussionAttachment = {
            fileName,
            file,
            url: blobUrl,
            uploadFinished: false
        };
        Flux.instance().actionCreator.attachmentActionCreator.addAttachment(newAttachment);
        const pendingAttachments = this.state.pendingAttachments || [];
        pendingAttachments.push(newAttachment.fileName);
        this.setState({
            pendingAttachments
        } as DescriptionState);
    }

    @autobind
    private _setTextAreaRef(textArea: HTMLTextAreaElement): void {
        this._textControl = textArea;

        if (this._shouldFocusTextArea) {
            this._shouldFocusTextArea = false;
            this._textControl.focus();
            this._textControl.selectionStart = this._textControl.selectionEnd = this._textControl.textContent.length;
        }
    }

    @autobind
    private _clearError() {
        this.setState({ validationError: undefined });
    }

    @autobind
    private _onTaskItemClicked(newContent: string): void {
        this.setState({
            pendingChange: true,
            pendingAttachments: [],
            isEditing: false
        } as DescriptionState, () => {
            Flux.instance().actionCreator.pullRequestActionCreator.savePullRequestDescription(this.props.pullRequest.pullRequestId, newContent);
        });
    }
}
