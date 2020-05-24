import * as React from "react";
import * as Controls from "VSS/Controls";

import { autobind, css } from "OfficeFabric/Utilities";

import { MarkdownSyntax } from "Discussion/Scripts/CommonConstants";
import { AutocompleteEnhancement } from "Mention/Scripts/TFS.Mention.Autocomplete.Controls";
import * as CommonMarkdownToolbar from "ContentRendering/MarkdownToolbar/MarkdownToolbar"
import { MarkdownToolbarHelper } from "ContentRendering/MarkdownToolbar/Utility"
import * as MentionResources from "Mention/Scripts/Resources/TFS.Resources.Mention";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export enum MentionCommandType {
    People,
    WorkItem,
    PullRequest,
}

/**
This provides MarkdownToolbar commands to add mentions and WIT.
Will be used to extend the common MarkdownToolbar
 */
export class MarkdownToolbarMentionCommands {
    private getTextArea: () => HTMLTextAreaElement;
    private textChanged: (text: string, selectionStart: number, selectionEnd: number) => void;

    constructor(getTextArea: () => HTMLTextAreaElement,
        textChanged: (text: string, selectionStart: number, selectionEnd: number) => void) {
        this.getTextArea = getTextArea;
        this.textChanged = textChanged;
    }

    public getCommands(commandTypes: MentionCommandType[]): CommonMarkdownToolbar.MarkdownToolbarCommand[] {
        let buttonClass = "markdowntoolbar-button";
        let insertLocation = 8;
        let commands = [];

        for (const commandType of commandTypes) {
            switch (commandType) {
                case MentionCommandType.People:
                    commands.push({ index: insertLocation++, key: "mention-menu-item", name: MentionResources.MentionSomeone, className: buttonClass, iconProps: { className: "bowtie-icon markdowntoolbar-icon-at" }, title: MentionResources.MentionSomeone, onClick: this._onMention, ariaLabel: MentionResources.MentionSomeone });
                    break;
                case MentionCommandType.WorkItem:
                    commands.push({ index: insertLocation++, key: "wit-menu-item", name: MentionResources.MentionWorkItem, className: buttonClass, iconProps: { className: "bowtie-icon markdowntoolbar-icon-hash" }, title: MentionResources.MentionWorkItem, onClick: this._onLinkWIT, ariaLabel: MentionResources.MentionWorkItem });
                    break;
                case MentionCommandType.PullRequest:
                    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsMentions, false)) {
                        commands.push({ index: insertLocation++, key: "pr-menu-item", name: MentionResources.MentionPR, className: buttonClass, iconProps: { className: "bowtie-icon bowtie-tfvc-pull-request pr-icon" }, title: MentionResources.MentionPR, onClick: this._onLinkPR, ariaLabel: MentionResources.MentionPR });
                    }
                    break;
            }
        }

        return commands;
    }

    @autobind
    private _onMention(): void {
        this._insertMention(MarkdownSyntax.Mention);
    }

    @autobind
    private _onLinkWIT(): void {
        this._insertMention(MarkdownSyntax.LinkWIT);
    }

    @autobind
    private _onLinkPR(): void {
        this._insertMention(MarkdownSyntax.LinkPR);
    }

    private _insertMention(insertedString: string): void {
        let textArea = this.getTextArea();
        if (!textArea) {
            return;
        }

        let currentText = textArea.value;
        let selectionStart = textArea.selectionStart;
        let selectionEnd = textArea.selectionEnd;
        let newText = insertedString;

        // The preceding character needs to be whitespace
        if (selectionStart > 0 && !(/\s/.test(currentText[selectionStart - 1]))) {
            newText = " " + newText;
        }

        textArea.focus();
        if (MarkdownToolbarHelper.browserSupportsInsertText()) {
            // If the browser supports it, insertText is a better way to programatically change the text which supports undo/redo
            // This will also trigger any events on the parent control as if the user typed in this text
            document.execCommand("insertText", false, newText + (""));
            this.textChanged(null, textArea.selectionStart, textArea.selectionEnd);
        }
        else {
            let firstPart = currentText.substring(0, selectionStart);
            let endPart = currentText.substring(selectionEnd);
            let newCursorPosition = firstPart.length + newText.length;

            // otherwise, the parent control needs to deal with the new text
            newText += "";
            this.textChanged(firstPart + newText + endPart, newCursorPosition, newCursorPosition);

            let enhancement = Controls.Enhancement.getInstance(AutocompleteEnhancement, $(textArea)) as AutocompleteEnhancement;
            if (enhancement) {
                enhancement.runAutocomplete({
                    textBeforeSelection: firstPart + newText,
                    textInSelection: "",
                    textAfterSelection: endPart
                });
            }
        }
    }
}