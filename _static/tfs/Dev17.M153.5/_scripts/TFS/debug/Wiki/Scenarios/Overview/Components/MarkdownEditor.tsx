import * as React from "react";

import { Async, autobind, css } from "OfficeFabric/Utilities";
import { WikiMarkdownRenderer } from "Wiki/Scenarios/Shared/Components/WikiMarkdownRenderer";
import { GuidSuffixedFile, UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";

import { MarkdownEditable } from "Wiki/Scenarios/Overview/Components/MarkdownEditable";
import { ContainerProps } from "Wiki/Scenarios/Overview/Components/OverviewContainer";
import { WikiToolbar } from "Wiki/Scenarios/Overview/Components/WikiToolbar";
import { UnsavedAttachmentsState } from "Wiki/Scenarios/Overview/Stores/AttachmentsStore";
import { PreviewMode } from "Wiki/Scripts/CommonConstants";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/MarkdownEditor";

export interface MarkdownEditorProps extends ContainerProps {
    initialContent: string;
    isPageContentLoading: boolean;
    onChange(): void;
    previewMode: PreviewMode;
}

export interface MarkdownEditorState extends UnsavedAttachmentsState {
    previewContent: string;
}

export class MarkdownEditor extends React.Component<MarkdownEditorProps, MarkdownEditorState> {
    private _timerId: number;
    private _async: Async;
    private _markdownEditable: MarkdownEditable;
    private _wikiToolbar: WikiToolbar;

    constructor(props: MarkdownEditorProps) {
        super(props);

        this._async = new Async();

        this.state = {
            previewContent: this.props.initialContent,
            ...this.props.storesHub.state.unsavedAttachmentsState,
        };
    }

    public componentWillMount(): void {
        this.props.storesHub.attachmentsStore.addChangedListener(this._onAttachmentsStoreChanged);
    }

    public componentWillReceiveProps(nextProps: MarkdownEditorProps): void {
        if (this.props.previewMode !== nextProps.previewMode) {
            this._updatePreview();
            return;
        }

        if (this.props.previewMode === PreviewMode.Live && !this._timerId) {
            this._timerId = this._async.setTimeout(this._updatePreview, this._getPreviewUpdateLag(this.state.previewContent));
        }
    }

    public componentWillUnmount(): void {
        if (this.props.storesHub.attachmentsStore) {
            this.props.storesHub.attachmentsStore.removeChangedListener(this._onAttachmentsStoreChanged);
        }

        this._async.dispose();
    }

    public render(): JSX.Element {
        return (
            <div className={css("markdown-editor", `preview-${PreviewMode[this.props.previewMode]}`)}>
                {this.props.previewMode !== PreviewMode.Full &&
                    <WikiToolbar
                        validAttachmentTypes={this.props.storesHub.attachmentsStore.allowedAttachmentTypes}
                        getTextArea={this._getTextArea}
                        onBrowseAttachments={this._onBrowseAttachments}
                        textChangedByToolbar={this._textChangedByToolbar}
                        ref={this._refWikiToolbar}
                    />
                }
                {!this.props.isPageContentLoading &&
                    <div className={"edit-preview-container"}>
                        <MarkdownEditable
                            initialContent={this.props.initialContent}
                            sizeOfAddedAttachments={this.state.totalSizeOfAttachments}
                            getToolbar={this._getMarkdownToolbar}
                            onAttach={this._onAttach}
                            onChange={this.props.onChange}
                            ref={this._refMarkdownEditable}
                            validAttachmentTypes={this.props.storesHub.attachmentsStore.allowedAttachmentTypes}
                            onError={this.props.actionCreator.showPageError}
                            onClearError={this.props.actionCreator.clearPageError}
                            actionCreator={this.props.actionCreator}
                            key={"editable"}
                        />
                        {this.props.previewMode !== PreviewMode.Off &&
                            <WikiMarkdownRenderer
                                content={this.state.previewContent}
                                wiki={this.props.storesHub.state.sharedState.commonState.wiki}
                                repositoryContext={this.props.storesHub.state.sharedState.commonState.repositoryContext}
                                urlParameters={this.props.storesHub.state.sharedState.urlState}
                                onFragmentLinkClick={this._onFragmentLinkClick}
                                key={"preview"}
                                viewMode={this.props.previewMode}
                                totalAttachmentsSize={this.state.totalSizeOfAttachments}
                                unsavedAttachmentsMap={this.state.attachments}
                                wikiPagesPromiseMethod={this.props.actionCreator.getPagesToFilter}
                            />
                        }
                    </div>
                }
            </div>
        );
    }

    @autobind
    private _onFragmentLinkClick(linkParameters: UrlParameters): void {
        this.props.actionCreator.updateUrlSilently(linkParameters, false, false);
    }

    public get content(): string {
        return this._markdownEditable ? this._getTextArea() && this._getTextArea().value : this.props.initialContent;
    }

    public setFocusOnEditor(): void {
        if (!this._markdownEditable) {
            return;
        }

        const textArea = this._getTextArea();
        if (textArea) {
            textArea.focus();
        }
    }

    /**
     * Returns the throttling interval based on the content size
     * We thought of having constant throttling and debouncing.
     * Constant throttling is ruled out as small sized pages shouldn't pay the cost
     * Debouncing - If someone is typing very fast, It might be annoying when no update is seen
     * 250 - I arrived at this magic number by trying out pages of different length on dev boxes.
     *
     * @param content content to be passed to markdown-renderer
     */
    private _getPreviewUpdateLag(content: string): number {
        const minLag = 50;
        const maxLag = 1000;

        let lag = 0;
        if (content) {
            lag = content.length / 250;
        }

        if (lag < minLag) {
            return minLag;
        }

        if (lag > maxLag) {
            return maxLag;
        }

        return lag;
    }

    @autobind
    private _getTextArea(): HTMLTextAreaElement {
        return this._markdownEditable ? this._markdownEditable.textArea : null;
    }

    @autobind
    private _getMarkdownToolbar(): WikiToolbar {
        return this._wikiToolbar;
    }

    @autobind
    private _onAttach(files: GuidSuffixedFile[]): void {
        this.props.actionCreator.addAttachments(files);
    }

    @autobind
    private _onAttachmentsStoreChanged(): void {
        this.setState(this.props.storesHub.state.unsavedAttachmentsState);
    }

    @autobind
    private _onBrowseAttachments(files: File[]): void {
        this._markdownEditable.addAttachments(files);
    }

    @autobind
    private _refMarkdownEditable(editable: MarkdownEditable): void {
        this._markdownEditable = editable;
    }

    @autobind
    private _refWikiToolbar(wikiToolbar: WikiToolbar): void {
        this._wikiToolbar = wikiToolbar;
    }

    @autobind
    private _resetTimer(): void {
        this._async.clearTimeout(this._timerId);
        this._timerId = null;
    }

    @autobind
    private _textChangedByToolbar(newText: string, selectionStart: number, selectionEnd: number): void {
        this._markdownEditable.setText(newText, selectionStart, selectionEnd); // For IE and Firefox
    }

    @autobind
    private _updatePreview(): void {
        this.setState({ previewContent: this.content } as MarkdownEditorState, this._resetTimer);
    }
}
