/// <reference types="jquery" />

import Controls = require("VSS/Controls");
import Core = require("VSS/Utils/Core");

import MentionResources = require("Mention/Scripts/Resources/TFS.Resources.Mention");
import Mention = require("Mention/Scripts/TFS.Mention");
import MentionAutocompleteControls = require("Mention/Scripts/TFS.Mention.Autocomplete.Controls");
import MentionHelpers = require("Mention/Scripts/TFS.Mention.Helpers");
import Telemetry = require("Mention/Scripts/TFS.Social.Telemetry");
import { MentionPluginType, getMentionPlugins } from "Mention/Scripts/TFS.Mention.PluginRegistration";

export interface IMentionableOptions {
    artifactUri: string;
    autocompleteEnhancement?: MentionAutocompleteControls.AutocompleteEnhancement;
    autocompleteOptions?: MentionAutocompleteControls.IAutocompleteOptions;
}

enum MentionableMode {
    Uninitialized = 0,
    Preview,
    Edit
}

export module MentionableEvents {
    export var PREVIEW = "mention-mentionable-preview";
    export var EDIT = "mention-mentionable-edit";
}

export class MentionableEnhancement extends Controls.Enhancement<IMentionableOptions> {
    private _autocompleteEnhancement: MentionAutocompleteControls.AutocompleteEnhancement;
    private _$previewContainer: JQuery;
    private _currentMode: MentionableMode = MentionableMode.Uninitialized;

    public constructor(options?: IMentionableOptions, enhancementOptions?: Controls.EnhancementOptions) {
        super(options, enhancementOptions);
    }

    public initialize() {
        if (!MentionHelpers.environmentIsSupported()) {
            return;
        }

        this._autocompleteEnhancement = this._options.autocompleteEnhancement
        || <MentionAutocompleteControls.AutocompleteEnhancement>Controls.Enhancement.enhance(MentionAutocompleteControls.AutocompleteEnhancement, this.getElement(), this._getAutocompleteOptions());

        this._$previewContainer = $("<div>")
            .hide()
            .insertAfter(this.getElement())
            .addClass("mention-preview-area");

        this._showPreview();

        if (!this.getElement().is("[readonly],[disabled]")) {
            // we need to list out all of the specific styles because using a short-hand style name 
            // like "border" is not guarenteed to work with JQuery.
            var cssToClone = [
                "border-top-color",
                "border-top-style",
                "border-top-width",
                "border-bottom-color",
                "border-bottom-style",
                "border-bottom-width",
                "border-left-color",
                "border-left-style",
                "border-left-width",
                "border-right-color",
                "border-right-style",
                "border-right-width",
                "background-color"];
            var originalCssValues = [];
            this._$previewContainer.hover(
                () => {
                    for (var i in cssToClone) {
                        originalCssValues[i] = this._$previewContainer.css(cssToClone[i]);
                        var cssValue = this.getElement().css(cssToClone[i]);
                        this._$previewContainer.css(cssToClone[i], cssValue);
                    }
                },() => {
                    for (var i in cssToClone) {
                        this._$previewContainer.css(cssToClone[i], originalCssValues[i]);
                    }
                });

            this.getElement().blur(() =>
                this._showPreview()
                );
            this.getElement().focus(() =>
                this._showEdit()
                );
            this._$previewContainer.click(() =>
                this._showEdit()
                );
        }

        DiscussionCommentControlShim.insertMentionEditModeActionsIntoStatusLine(this.getElement());
    }

    public dispose() {
        if (this._autocompleteEnhancement) {
            this._autocompleteEnhancement.dispose();
        }
        super.dispose();
    }

    private _getAutocompleteOptions(): MentionAutocompleteControls.IAutocompleteOptions {
        return <MentionAutocompleteControls.IAutocompleteOptions>$.extend(<MentionAutocompleteControls.IAutocompleteOptions>{
            artifactUri: this._options.artifactUri,
            pluginConfigs: getMentionPlugins([MentionPluginType.WorkItem, MentionPluginType.Person, MentionPluginType.PullRequest])
        }, this._options.autocompleteOptions);
    }

    private _showPreview() {
        if (this._currentMode !== MentionableMode.Preview) {
            var startTime = new Date().getTime();
            var telemetryProperties: Telemetry.IMentionablePreviewEvent = {
                artifactUri: this._options.artifactUri
            };

            this._currentMode = MentionableMode.Preview;
            this._$previewContainer.empty();

            var text = this.getElement().val();
            Mention.MentionProcessor.getDefault().parseInput(text).then(parts => {
                var nonTextPartsCount = 0;
                for (var i in parts) {
                    if (parts[i].Type !== Mention.TextPartType.Text) {
                        nonTextPartsCount++;
                    }
                }
                telemetryProperties.nonTextPartsCount = nonTextPartsCount.toString();
    
                if (nonTextPartsCount == 0) {
                    this._$previewContainer.hide();
                    this.getElement().show();
                    
                    this._fire(MentionableEvents.PREVIEW);
                }
                else {
                    var htmlPromise = Mention.MentionProcessor.getDefault().renderParts(this._$previewContainer, parts, telemetryProperties);
                    htmlPromise.done((html) => {
                        this.getElement().hide();
                        this._$previewContainer.show();
    
                        telemetryProperties.durationInMSec = (new Date().getTime() - startTime).toString();
                        Telemetry.EventLogging.publishMentionablePreviewEvent(telemetryProperties);
                        this._fire(MentionableEvents.PREVIEW);
                    });
                }
            });
        }
    }

    private _showEdit() {
        if (this._currentMode !== MentionableMode.Edit) {
            this._currentMode = MentionableMode.Edit;

            this._$previewContainer.hide();
            this.getElement().show();
            this.getElement().focus();
            if (this._autocompleteEnhancement) {
                this._autocompleteEnhancement.prefetch();
            }

            Telemetry.EventLogging.publishMentionableEditEvent({
                artifactUri: this._options.artifactUri
            });
            this._fire(MentionableEvents.EDIT);
        }
    }
}

class DiscussionCommentControlShim {
    public static insertMentionEditModeActionsIntoStatusLine($discussionTextArea: JQuery) {
        DiscussionCommentControlShim.insertEditModeActionIntoStatusLine($discussionTextArea, MentionResources.DiscussionMentionWorkItemTip);
        DiscussionCommentControlShim.insertEditModeActionIntoStatusLine($discussionTextArea, MentionResources.DiscussionMentionPersonTip);
    }

    public static insertEditModeActionIntoStatusLine($discussionTextArea: JQuery, text: string) {
        var existingEditModeActions = $discussionTextArea
            .closest(".comment-column")
            .find(".discussion-comment-status .discussion-action.edit-mode");
        if (existingEditModeActions.length > 0) {
            var $lastAction = existingEditModeActions[existingEditModeActions.length - 1];
            var $span = $("<span>")
                .addClass("discussion-action edit-mode")
                .insertAfter($lastAction);
            var $a = $("<a>")
                .addClass("mention-actions disabled-link")
                .text(text)
                .appendTo($span);
        }
    }
}

Controls.Enhancement.registerEnhancement(MentionableEnhancement, ".mention.mentionable");
