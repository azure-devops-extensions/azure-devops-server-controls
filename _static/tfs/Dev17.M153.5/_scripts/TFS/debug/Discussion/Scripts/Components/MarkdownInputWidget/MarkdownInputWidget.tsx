import "VSS/LoaderPlugins/Css!Discussion/Components/MarkdownInputWidget/MarkdownInputWidget";

import * as React from "react";
import { TelemetryEventData, publishEvent } from "VSS/Telemetry/Services";
import { autobind, css, getNativeProps, htmlElementProperties } from "OfficeFabric/Utilities";
import { MarkdownTextArea, IMarkdownTextAreaProps } from "ContentRendering/MarkdownTextArea/MarkdownTextArea";
import { DropTarget } from "VSSPreview/Flux/Components/DropTarget";
import { DropOverlay } from "VSSPreview/Flux/Components/DropOverlay";
import { MarkdownToolbar, MarkdownToolbarCommand } from "ContentRendering/MarkdownToolbar/MarkdownToolbar";
import { DISCUSSION_AREA, CREATE_ATTACHMENT } from "Discussion/Scripts/CustomerIntelligenceConstants";
import { MarkdownToolbarMentionCommands, MentionCommandType } from "Discussion/Scripts/MarkdownToolbarMentionCommands";
import { DiscussionHelpers } from "Discussion/Scripts/DiscussionHelpers";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Controls from "VSS/Controls";
import { IAutocompleteOptions, AutocompleteEnhancement, IAutocompletePluginConfig } from "Mention/Scripts/TFS.Mention.Autocomplete.Controls";
import { IAutocompleteReplacement, IAutocompletePluginOptions } from "Mention/Scripts/TFS.Mention.Autocomplete";
import { MentionPluginType, getMentionPlugins } from "Mention/Scripts/TFS.Mention.PluginRegistration";

/**
 * Most of the props carry over from IMarkdownTextAreaProps. But there are a few
 * additional things when using the full widget instead of just the text area
 */
export interface IMarkdownInputWidgetProps extends IMarkdownTextAreaProps {
    /**
     * Optional are for buttons to the right of the toolbar
     */
    buttonArea?: JSX.Element;

    /**
     * If attachmensts are enabled, you should provide a file type list
     * so that when browsing for attachments, we can filter by appropriate types
     */
    validAttachmentTypes?: string[];

    /**
     * Artifact URI to use for telemetry
     */
    artifactUri?: string;
}

export interface IMarkdownInputWidgetState {
    draggingOver?: boolean;
    setSelectionStart?: number,
    setSelectionEnd?: number
}

/**
 * This widget combines MarkdownTextArea, MarkdownToolbar, DropTarget, and DropOverlay to provide
 * a more complete discussion experience. This is a text area that supports markdown, syntax highlighting, mentions
 * It also supports attachments via paste, drag/drop, and browse
 * It has an optional button area for adding additional commands such as submit and cancel buttons
 */
export class MarkdownInputWidget extends React.PureComponent<IMarkdownInputWidgetProps, IMarkdownInputWidgetState> {
    private _textControl: HTMLTextAreaElement;
    private _toolbar: MarkdownToolbar;
    private _shouldSetTextSelection: boolean;
    private _telemetryProperties: { [key: string]: any };

    private _mentionEnhancement: Controls.Enhancement<IAutocompleteOptions>;

    constructor(props: IMarkdownInputWidgetProps) {
        super(props);
        this.state = {};
        this._setTelemetryProperties();
    }

    public render(): JSX.Element {
        if (this.props.enableAttachments) {
            return <DropTarget className={"markdowninputwidget-droptarget"}
                onDragEnter={this._onDragEnter}
                onDragLeave={this._onDragLeave}
                getDropEffect={this._getDropEffect}
                onDrop={this._onDropAttachments}>
                {this._innerControl()}
            </DropTarget>
        }
        else {
            return this._innerControl();
        }
    }

    public componentDidUpdate(prevProps?: IMarkdownInputWidgetProps, prevState?: IMarkdownInputWidgetState): void {
        if (this._shouldSetTextSelection) {
            this._shouldSetTextSelection = false;
            this._textControl.selectionStart = this.state.setSelectionStart;
            this._textControl.selectionEnd = this.state.setSelectionEnd;
        }
    }

    public componentWillUnmount(): void {
        if (this._mentionEnhancement) {
            this._mentionEnhancement.dispose();
            this._mentionEnhancement = null;
        }
    }

    private _innerControl(): JSX.Element {
        const { ref, className, buttonArea, validAttachmentTypes, onKeyDown, textAreaRef, ...textAreaProps } = this.props;
        var markdownToolbarMentionCommands = new MarkdownToolbarMentionCommands(this._getTextArea, this._toolbarTextChange);
        const commands: MentionCommandType[] = [
            MentionCommandType.People,
            MentionCommandType.WorkItem,
            MentionCommandType.PullRequest,
        ];

        return <div className={this.props.className}>
            <div>
                <DropOverlay className={"markdowninputwidget-dropoverlay"} showOverlay={this.state.draggingOver} >
                    <MarkdownTextArea
                        {...textAreaProps}
                        textAreaRef={this._setTextArea}
                        className={"markdowninputwidget-textarea"}
                        onKeyDown={this._onKeyDown}
                        onAttachmentsAdded={this._onPasteAttachments}
                        telemetryArea={DISCUSSION_AREA}
                        telemetryProperties={this._telemetryProperties}
                    />
                </DropOverlay>
            </div>
            <div className={"markdowninputwidget-toolbararea"}>
                <MarkdownToolbar
                    ref={this._setToolbar}
                    getTextArea={this._getTextArea}
                    textChanged={this._toolbarTextChange}
                    addAttachments={this._onBrowseAttachments}
                    validAttachmentTypes={this.props.validAttachmentTypes}
                    enableAttachments={this.props.enableAttachments}
                    commands={markdownToolbarMentionCommands.getCommands(commands)} />
                <span className={"markdowninputwidget-buttonarea"}>
                    {this.props.buttonArea}
                </span>
            </div>
        </div>;
    }

    private _mentionOptions(textArea: HTMLTextAreaElement): IAutocompleteOptions {
        return {
            artifactUri: this.props.artifactUri,
            pluginConfigs: getMentionPlugins([MentionPluginType.WorkItem, MentionPluginType.Person, MentionPluginType.PullRequest]),
            select: (replacement: IAutocompleteReplacement) => {
                if (this.props.onTextChange) {
                    this.props.onTextChange(textArea.value);
                }
            }
        };
    }

    private _setTelemetryProperties(): void {
        const projectId: string = TfsContext.getDefault().contextData.project.id;
        this._telemetryProperties = { projectId: projectId };
    }

    @autobind
    private _getTextArea(): HTMLTextAreaElement {
        return this._textControl;
    }

    @autobind
    private _setTextArea(textArea: HTMLTextAreaElement): void {
        this._textControl = textArea;

        if (!this._mentionEnhancement && textArea) {
            this._mentionEnhancement = Controls.Enhancement.enhance(AutocompleteEnhancement, $(textArea), this._mentionOptions(textArea));
        }

        if (this.props.textAreaRef) {
            this.props.textAreaRef(textArea);
        }
    }

    @autobind
    private _setToolbar(toolbar: MarkdownToolbar): void {
        this._toolbar = toolbar;
    }

    @autobind
    private _toolbarTextChange(newText: string, selectionStart: number, selectionEnd: number): void {
        if (newText) {
            this.props.onTextChange(newText);
        }

        this._shouldSetTextSelection = true;
        this.setState({
            setSelectionStart: selectionStart,
            setSelectionEnd: selectionEnd
        });
    }

    @autobind
    private _onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        this._toolbar && this._toolbar.handleKeyPress(event);
        this.props.onKeyDown && this.props.onKeyDown(event);
    }

    @autobind
    private _onDragEnter(): void {
        this.setState({ draggingOver: true });
    }

    @autobind
    private _onDragLeave(): void {
        this.setState({ draggingOver: false });
    }

    @autobind
    private _onPasteAttachments(files: File[]): void {
        this.props.onAttachmentsAdded && this.props.onAttachmentsAdded(files);
        this._attachmentTelemetry("paste", files);
    }

    @autobind
    private _onBrowseAttachments(files: File[]): void {
        this.props.onAttachmentsAdded && this.props.onAttachmentsAdded(files);
        this._attachmentTelemetry("browse", files);
    }

    @autobind
    private _getDropEffect(dataTransfer: DataTransfer): string {
        if (((dataTransfer.items != null) && (dataTransfer.items[0].kind === "file")) ||
            /* IE browser dependent check */
            (dataTransfer.types[0] === "Files") ||
            /* Safari browser dependent check */
            (dataTransfer.types[0] === "public.file-url")) {
            return "copy";
        } else {
            return "none";
        }
    }

    @autobind
    private _onDropAttachments(dataTransfer: DataTransfer): void {
        if (((dataTransfer.items != null) && (dataTransfer.items[0].kind === "file")) ||
            /* IE browser dependent check */
            (dataTransfer.types[0] === "Files") ||
            /* Safari browser dependent check */
            (dataTransfer.types[0] === "public.file-url")) {
            let files: File[] = DiscussionHelpers.getFileArrayFromDataTransfer(dataTransfer);
            this.props.onAttachmentsAdded && this.props.onAttachmentsAdded(files);
            this._attachmentTelemetry("drag", files);
        }
    }

    private _attachmentTelemetry(attachmentType: string, files: File[]): void {
        let telemEvent = new TelemetryEventData(
            DISCUSSION_AREA,
            CREATE_ATTACHMENT, {
                artifactUri: this.props.artifactUri,
                type: attachmentType,
                fileType: files.map(f => f.type).toString(),
                fileSize: files.map(f => f.size).toString()
            });
        publishEvent(telemEvent);
    }
}
