import * as React from "react";

import { autobind, css } from "OfficeFabric/Utilities";
import * as Context from "VSS/Context";
import { publishEvent } from "VSS/Telemetry/Services";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import { MarkdownConstants } from "ContentRendering/MarkdownConstants";
import { MarkdownStatusBar } from "ContentRendering/MarkdownTextArea/MarkdownStatusBar";
import { MarkdownToolbar, MarkdownToolbarCommand } from "ContentRendering/MarkdownToolbar/MarkdownToolbar";
import { MarkdownToolbarHelper } from "ContentRendering/MarkdownToolbar/Utility";
import { MarkdownToolbarMentionCommands, MentionCommandType } from "Discussion/Scripts/MarkdownToolbarMentionCommands";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Areas, TelemetryConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { bowtieIcon } from "Wiki/Scripts/Helpers";
import { createWikiEventData } from "Wiki/Scenarios/Shared/Sources/TelemetryWriter";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/WikiToolbar";

export interface WikiToolbarProps {
    validAttachmentTypes: string[];
    getTextArea(): HTMLTextAreaElement;
    onBrowseAttachments(files: File[]): void;
    textChangedByToolbar(text: string, selectionStart: number, selectionEnd: number): void;
}

export interface WikiToolbarState {
    pasteTextType: PasteType;
}

export enum PasteType {
    text,
    html,
}

export class WikiToolbar extends React.PureComponent<WikiToolbarProps, WikiToolbarState> {
    private _toolbar: MarkdownToolbar;
    private _markdownToolbarMentionCommands: MarkdownToolbarMentionCommands;
    private _telemetryProperties: { [key: string]: any };

    constructor(props: WikiToolbarProps) {
        super(props);
        this.state = {
            pasteTextType: PasteType.text,
        };
        this._markdownToolbarMentionCommands = new MarkdownToolbarMentionCommands(this._getTextArea, this._textChangedByToolbar);
        this._setTelemetryProperties();
    }

    public render(): JSX.Element {
        return (
            <div className={"wiki-markdown-toolbar bowtie"}>
                <MarkdownToolbar
                    ref={this._refToolbar}
                    addAttachments={this._onBrowseAttachments}
                    getTextArea={this._getTextArea}
                    textChanged={this._textChangedByToolbar}
                    validAttachmentTypes={this.props.validAttachmentTypes}
                    commands={this._extraToolbarCommands()}
                />
                <MarkdownStatusBar
                    markdownDocumentLink={WikiResources.MarkdownDocumentLink}
                    telemetryArea={Areas.Wiki}
                    telemetryProperties={this._telemetryProperties}
                />
            </div>);
    }

    private _setTelemetryProperties(): void {
        const projectId: string = TfsContext.getDefault().contextData.project.id;
        this._telemetryProperties = { projectId: projectId };
    }

    public get shouldPasteHtml(): boolean {
        return PasteType.html === this.state.pasteTextType;
    }

    public handleKeyPress(event: React.KeyboardEvent<HTMLElement>): void {
        this._toolbar.handleKeyPress(event);
    }

    public insertText(insertedString: string, requirePreSpace: boolean): void {
        this._toolbar.insertText(insertedString, { requirePreSpace: requirePreSpace });
    }

    private _extraToolbarCommands(): MarkdownToolbarCommand[] {
        const commands: MarkdownToolbarCommand[] = this._markdownToolbarMentionCommands.getCommands([MentionCommandType.WorkItem]);

        const isCheckedState = (this.state.pasteTextType === PasteType.html);
        commands.push({
            key: "paste-menu-item",
            name: WikiResources.MarkdownPasteHTML,
            className: css("markdowntoolbar-button", { is_checked: isCheckedState }),
            iconProps: bowtieIcon("bowtie-paste-as-html"),
            onClick: this._togglePasteState,
            title: WikiResources.MarkdownPasteHTML,
            canCheck: true,
            checked: isCheckedState,
            ariaLabel: WikiResources.MarkdownPasteHTML,
        });

        commands.push({
            key: "toc-menu-item",
            name: WikiResources.InsertTOCText,
            className: css("markdowntoolbar-button"),
            icon: "CustomList",
            onClick: this._onTocMenuItemClick,
            title: WikiResources.InsertTOCText,
            ariaLabel: WikiResources.InsertTOCText,
        });

        return commands;
    }

    @autobind
    private _togglePasteState(): void {
        const checkedHtml = "pasteTypeHtml";
        const unCheckedHtml = "pasteTypeText";

        if (this.state.pasteTextType === PasteType.text) {
            this._markdownHTMLButtonTelemetry(checkedHtml);
            this.setState({ pasteTextType: PasteType.html });
        } else {
            this._markdownHTMLButtonTelemetry(unCheckedHtml);
            this.setState({ pasteTextType: PasteType.text });
        }
    }

    @autobind
    private _onTocMenuItemClick(): void {
        const textArea: HTMLTextAreaElement = this._getTextArea();

        if (textArea && BrowserCheckUtils.isEdge()) {
            /**
             * Hack: textArea.selectionEnd is not populated correctly until it has focus once.
             * https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8018707/
             */
            textArea.focus();
        }

        if (textArea
            && (textArea.textContent.length === textArea.selectionStart
                && textArea.textContent.length === textArea.selectionEnd)) {
            // If the selectionStart and selectionEnd is at the very end, put the [[_TOC_]] at the first.
            textArea.selectionStart = textArea.selectionEnd = 0;
        }

        if (textArea && (textArea.selectionStart !== textArea.selectionEnd)) {
            // When text is selected, put the [[_TOC_]] at the selectionStart only.
            // Hence making sure the selectionEnd is same as selectedStart.
            textArea.selectionEnd = textArea.selectionStart;
        }

        MarkdownToolbarHelper.insertTextAtStartOfEachLine(textArea, MarkdownConstants.TOCDefaultMarker + "\n", this._textChangedByToolbar);

        // Adding telemetry. Context.getPageContext() should not be used when moving to new web platform.
        publishEvent(createWikiEventData(TelemetryConstants.TOCAddedToPageContent, { UserId: Context.getPageContext().webContext.user.id }));
    }

    private _markdownHTMLButtonTelemetry(toggled: string): void {
        publishEvent(createWikiEventData(TelemetryConstants.MarkdownPasteTypeHtmlButtonClicked, { PasteType: toggled }));
    }

    @autobind
    private _getTextArea(): HTMLTextAreaElement {
        return this.props.getTextArea();
    }

    @autobind
    private _onBrowseAttachments(files: File[]): void {
        this.props.onBrowseAttachments(files);
    }

    @autobind
    private _refToolbar(toolbar: MarkdownToolbar): void {
        this._toolbar = toolbar;
    }

    @autobind
    private _textChangedByToolbar(text: string, selectionStart: number, selectionEnd: number): void {
        this.props.textChangedByToolbar(text, selectionStart, selectionEnd);
    }
}
