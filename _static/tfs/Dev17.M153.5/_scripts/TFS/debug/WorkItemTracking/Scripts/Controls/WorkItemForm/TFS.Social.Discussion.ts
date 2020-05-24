/// <amd-dependency path='VSS/LoaderPlugins/Css!Mention' />

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VSS from "VSS/VSS";
import Events_Services = require("VSS/Events/Services");
import Resources = require("Mention/Scripts/Resources/TFS.Resources.Mention");
import * as WitResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { richTextPreRenderProcessor, richTextFilterContent } from "WorkItemTracking/Scripts/Utils/RichTextPreRenderUtility";
import * as Social_RichEditor_Async from "Mention/Scripts/TFS.Social.RichEditor";
import * as Social_RichText_Autocomplete_Async from "Mention/Scripts/TFS.Social.RichText.Autocomplete";
import Telemetry = require("Mention/Scripts/TFS.Social.Telemetry");

import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { PersonaCard } from "VSS/Identities/Picker/PersonaCard";
import Picker_Controls = require("VSS/Identities/Picker/Controls");
import VSS_Service = require("VSS/Service");

import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import { KeyCode } from "VSS/Utils/UI";
import VSS_Controls = require("VSS/Controls");
import VSS_Diag = require("VSS/Diag");
import VSS_RichEditor = require("VSS/Controls/RichEditor");
import { postMSJSON } from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import SpinnerOverlay = require("Presentation/Scripts/TFS/TFS.UI.SpinnerOverlay");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { KeyboardShortcuts } from "WorkItemTracking/Scripts/WorkItemFormShortcutGroup";
import { isNewHtmlEditorEnabled } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { DiscussionRichEditorControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/DiscussionRichEditorControl";
import { IDiscussionEditorControl, IMessageEntryControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/DiscussionEditorInterfaces";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export namespace Actions {
    /**
     * Fired after the contents of the discussion are updated.
     */
    export const UPDATED_DISCUSSION = "discussion-control-discussions-updated";
}

export interface IDiscussionMessage {
    user: {
        /**
        * Display name of the user. Only used for the UI.
        */
        displayName: string;
        /**
        * This property should be of the same type createAvatar expects.
        */
        identity: any;
    };
    timestamp: Date;
    content: string;
}

export interface IUpdatableControl<TData> {
    /**
    * Incrementally adds messages to the visible list.
    */
    append: (data: TData) => void;
    /**
    * Replaces the visible messages with the value provided.
    */
    update: (data: TData | IDiscussionMessage[]) => void;
}

export interface IDiscussionControlState {
    /**
    * The number of messages available.
    */
    totalCount: number;
}

export interface IDiscussionControlExtendedState extends IDiscussionControlState {
    /**
    * The number of messages visible.
    */
    visibleCount: number;
}

export interface IDiscussionControlData {
    /**
    * The messages to render. Either incrementally if calling append or a replacement if calling update.
    */
    messages: IDiscussionMessage[];
    /**
    * Optional state information for the Discussion Control. If state is passed that necesitates the onShowMore callback and it is not defined in options, an error will be raised.
    */
    state?: IDiscussionControlState;
}

export interface IDiscussionArtifactContext {
    /**
     * the type of the artifact
    */
    sourceArtifact: any;
    /**
     * the field in the artifact where the mention occurred
     */
    field: any;
    /**
    * the type of the artifact
    */
    artifactType: any;
    /**
     * the unique identifier of the artifact
     */
    workItemId: any;
}

export interface IDiscussionEditorControlOptions extends VSS_Controls.EnhancementOptions {
    /**
    * The type to be instantiated for adding/editing a discussion message.
    */
    messageEntryControlType: typeof VSS_RichEditor.RichEditor;
    /**
    * The options supplied when creating message entry control.
    */
    messageEntryControlOptions: VSS_RichEditor.IRichEditorOptions;
    /**
    * A required function to create the avatar for the specified identity.
    * @param identity Should be the same type as defined in IDiscussionMessage
    */
    createAvatar(identity: any): JQuery;
    /**
    * The identity of the current user. Should match type expected by createAvatar.
    */
    currentIdentity: any;
    /**
    * Flag indicate whether to hide avatar. Default to false.
    */
    hideAvatar?: boolean;
}

export interface IDiscussionControlOptions extends IDiscussionEditorControlOptions {
    /**
    * An optional function to be called when a user clicked Show More.
    */
    onShowMore?: (currentState: IDiscussionControlExtendedState) => boolean | void;
    /**
    * An optional function to be called when a user clicked Show More.  Must return a promise.
    * When the promise is resolved the new items will be added, until then the 'show more'
    * button will be disabled and a spinner will be displayed.
    */
    onShowMorePromise?: (currentState: IDiscussionControlExtendedState) => IPromise<IDiscussionControlData>;

    /**
    * Optional parameter to enable showing the contact card on people mentions.
    */
    enableContactCard?: boolean;
}

export class DiscussionEditorControl extends VSS_Controls.Control<IDiscussionEditorControlOptions> {
    private _messageEntryControl: VSS_RichEditor.RichEditor;
    private _messageEntryAutocompleteExtensionDisposeCallback: () => void;

    constructor(options: IDiscussionEditorControlOptions) {
        super(options);
    }

    public _createIn(container) {
        super._createIn(container);
        var element = this.getElement();

        element.addClass("discussion-editor-control");

        const $messageEntryContainer = $("<div/>")
            .addClass("discussion-message-entry")
            .appendTo(element);

        if (this._options.hideAvatar) {
            element.addClass("no-avatar");
        }
        else {
            const $entryLeftContainer = $("<div>")
                .addClass("discussion-messages-left")
                .appendTo($messageEntryContainer);

            const $avatar = this._options.createAvatar(this._options.currentIdentity);
            $avatar.appendTo($entryLeftContainer);
        }

        const $entryRightContainer = $("<div>")
            .addClass("discussion-messages-right")
            .appendTo($messageEntryContainer);

        if (!this._options.messageEntryControlOptions.altKeyShortcuts) {
            this._options.messageEntryControlOptions.altKeyShortcuts = KeyboardShortcuts.AltShortcuts;
        }

        if (!this._options.messageEntryControlOptions.ctrlKeyShortcuts) {
            this._options.messageEntryControlOptions.ctrlKeyShortcuts = KeyboardShortcuts.CtrlShortcuts;
        }

        this._messageEntryControl = <VSS_RichEditor.RichEditor>VSS_Controls.BaseControl.createIn(this._options.messageEntryControlType, $entryRightContainer, $.extend({}, this._options.messageEntryControlOptions));

        VSS.using(["Mention/Scripts/TFS.Social.RichEditor"], (SocialRichEditor: typeof Social_RichEditor_Async) => {
            // If it is disposed, and the async calls comes after that then we dont want to create the extension. This can happen if you quickly switching pages.
            if (!this.isDisposed()) {
                const messageEntryAutocompleteExtension = new SocialRichEditor.RichEditorAutocompleteExtension(this._messageEntryControl);
                this._messageEntryAutocompleteExtensionDisposeCallback = () => {
                    if (messageEntryAutocompleteExtension) {
                        messageEntryAutocompleteExtension.dispose();
                    }
                }
            }
        });

    }

    /**
     * Return rich editor control
     */
    public getMessageEntryControl(): VSS_RichEditor.RichEditor {
        return this._messageEntryControl;
    }

    public isVisible(): boolean {
        return this.getElement().is(":visible");
    }

    public setUploadAttachmentApiLocation(apiLocation: string): void {
        if (this._messageEntryControl) {
            this._messageEntryControl.setUploadAttachmentHandler((attachment: VSS_RichEditor.RichEditorAttachmentRequestData) => {
                const deferred = $.Deferred<VSS_RichEditor.RichEditorAttachmentOperationResult>();
                postMSJSON(apiLocation, attachment, deferred.resolve, deferred.reject);
                return deferred.promise();
            });
        }
    }

    public setFullScreen(fullScreen: boolean): void {
        // Not implemented
    }

    public setWorkItem(workItem: WorkItem): void{
        // Not implemented
    }

    public dispose(): void {
        if (this._messageEntryControl) {
            this._messageEntryControl.dispose();
        }
        if (this._messageEntryAutocompleteExtensionDisposeCallback) {
            this._messageEntryAutocompleteExtensionDisposeCallback();
        }
        super.dispose();
    }
}

export class DiscussionControl extends VSS_Controls.Control<IDiscussionControlOptions> implements IUpdatableControl<IDiscussionControlData> {
    private _discussionEditorControl: IDiscussionEditorControl;
    private _$discussion: JQuery;
    private _$discussionMessagesContainer: JQuery;
    private _$disussionErrorPane: JQuery;
    private _$showMoreContainer: JQuery;
    private _$showMoreLink: JQuery;
    private _$showMoreDisabled: JQuery;
    private _$showMoreError: JQuery;
    private _$state: JQuery;
    private _state: IDiscussionControlExtendedState;
    private _statusHelper: SpinnerOverlay.StatusIndicatorOverlayHelper;
    private _showMoreSpinner: StatusIndicator.StatusIndicator;
    private _$noCommentsZeroDayLabel: JQuery;

    constructor(options: IDiscussionControlOptions) {
        super(options);
    }

    /**
     * Return rich editor control
     */
    public getMessageEntryControl(): IMessageEntryControl {
        if (this._discussionEditorControl) {
            return this._discussionEditorControl.getMessageEntryControl();
        }
        return null;
    }

    public getDiscussionEditorControl(): IDiscussionEditorControl {
        return this._discussionEditorControl;
    }

    public pushDiscussionContext(discussionContext: IDiscussionArtifactContext) {
        var artifactContext = discussionContext ? {
            artifactId: discussionContext.workItemId,
            artifactType: discussionContext.artifactType,
            field: discussionContext.field,
            sourceArtifact: discussionContext.sourceArtifact
        } : undefined;

        VSS.using(["Mention/Scripts/TFS.Social.RichText.Autocomplete"], (SocialRichTextAutocomplete: typeof Social_RichText_Autocomplete_Async) => {
            SocialRichTextAutocomplete.RichTextAutocompleteControl.getInstance().pushArtifactContext(artifactContext);
        });
    }

    public popDiscussionContext() {
        VSS.using(["Mention/Scripts/TFS.Social.RichText.Autocomplete"], (SocialRichTextAutocomplete: typeof Social_RichText_Autocomplete_Async) => {
            SocialRichTextAutocomplete.RichTextAutocompleteControl.getInstance().popArtifactContext();
        });

    }

    public setDiscussionMessagesContainerTop(value: string) {
        this._$discussionMessagesContainer.css("top", value);
    }

    public getExtendedState(): IDiscussionControlExtendedState {
        if (this._state) {
            return { visibleCount: this._state.visibleCount, totalCount: this._state.totalCount };
        }
        else {
            return { visibleCount: 0, totalCount: 0 };
        }
    }

    public showDiscussionEditorControl(): void {
        if (this._discussionEditorControl) {
            this._discussionEditorControl.showElement();
        }
    }

    public hideDiscussionEditorControl(): void {
        if (this._discussionEditorControl) {
            this._discussionEditorControl.hideElement();
        }
    }

    public _createIn(container) {
        super._createIn(container);
        const element = this.getElement();

        element.addClass("discussion-control");

        if (isNewHtmlEditorEnabled()) {
            this._discussionEditorControl = new DiscussionRichEditorControl(element[0], this._options);
            this._windowResizeEventHandler = (ev: JQueryEventObject) => {
                // ignore window resize, only handle custom modal resize event
                if (!$.isWindow(ev.target)) {
                    const discussionRichEditorControl = this._discussionEditorControl as DiscussionRichEditorControl;
                    discussionRichEditorControl.refreshCommandBar();
                }
            };
            $(window).resize(this._windowResizeEventHandler);
        } else {
            if (require.defined("RoosterReact/rooster-react-amd")) {
                VSS_Diag.Debug.fail("RoosterReact module was included when it should not have been since feature flag is off");
            }
            this._discussionEditorControl = VSS_Controls.Control.create(DiscussionEditorControl, element, this._options);
        }

        this._$discussionMessagesContainer = $("<div/>")
            .addClass("discussion-messages-container")
            .appendTo(element);

        this._$discussion = $("<div/>")
            .addClass("discussion-messages")
            .appendTo(this._$discussionMessagesContainer)
            .on("dblclick", (e) => this._onDblClick(e));

        this._$showMoreContainer = $("<div>")
            .addClass("discussion-messages-right")
            .addClass("discussion-show-more")
            .css("display", "none")
            .appendTo(this._$discussionMessagesContainer);

        this._$showMoreLink = $("<a>")
            .on("click", (e) => this._onShowMoreClick(e))
            .appendTo(this._$showMoreContainer);

        this._$showMoreDisabled = $("<span>")
            .appendTo(this._$showMoreContainer)
            .addClass("discussion-show-more-disabled")
            .css("display", "none")
            .text(Resources.DiscussionShowMoreLinkText);

        this._$state = $("<span>")
            .addClass("discussion-state")
            .appendTo(this._$showMoreContainer);

        if (this._options.messageEntryControlOptions.linkClickHandler) {
            this._$discussion.on({ "click": this._options.messageEntryControlOptions.linkClickHandler }, "a");
        }
    }

    public append(data: IDiscussionControlData) {
        if (!data) {
            throw new Error("parameter data is required.");
        }

        this._render(data, (this._state && this._state.visibleCount) + data.messages.length);
        Events_Services.getService().fire(Actions.UPDATED_DISCUSSION, this, null);
    }

    public update(data: IDiscussionControlData | IDiscussionMessage[]) {
        if (!data) {
            throw new Error("parameter data is required.");
        }

        this._stopShowMoreProgress();

        this._$discussion.html("");

        var controlData: IDiscussionControlData;

        // using cast to any until we use a later version of tsc which correctly detects this case
        if (Array.isArray(data)) {
            controlData = {
                messages: <any>data,
                state: {
                    totalCount: (<any>data).length
                }
            };
        } else {
            controlData = <any>data;
        }

        this._render(controlData, controlData.messages.length);
        Events_Services.getService().fire(Actions.UPDATED_DISCUSSION, this, null);
    }

    public showError(error: string) {
        if (!this._$disussionErrorPane) {
            this._$disussionErrorPane = $("<span/>").addClass("error");
            this._$disussionErrorPane.appendTo(this._$discussionMessagesContainer);
        }

        this._$disussionErrorPane.text(error);
        this._$discussion.hide();
        this._$disussionErrorPane.show();
    }

    public clearErrors() {
        if (this._$disussionErrorPane) {
            this._$disussionErrorPane.hide();
        }

        if (this._$showMoreError) {
            this._$showMoreError.hide();
        }

        this._$discussion.show();
    }

    public _onShowMoreError(error: any) {
        if (!this._$showMoreError) {
            this._$showMoreError = $("<div/>").addClass("error");
            this._$showMoreError.appendTo(this._$showMoreContainer);
        }

        let errorMessage = (error && error.message) ?
            `${Resources.DiscussionShowMoreRetrievalError}: ${error.message}`
            : Resources.DiscussionShowMoreRetrievalError;

        this._$showMoreError.text(errorMessage);
        this._$showMoreError.show();
    }

    // Hide the discussion behind a background-colored element with "Loading" element.
    public startProgress(wait?: number) {
        if (!this._statusHelper) {
            this._statusHelper = new SpinnerOverlay.StatusIndicatorOverlayHelper(this._$discussionMessagesContainer);
        }

        this._statusHelper.startProgress(wait);
    }

    // Undo startProgress(wait)
    public stopProgress() {
        if (this._statusHelper) {
            this._statusHelper.stopProgress();
        }
    }

    // Show a spinner next to the 'show more' link and disable the link.
    private _startShowMoreProgress(wait?: number) {
        if (!this._showMoreEnabled()) {
            return;
        }

        if (!this._showMoreSpinner) {
            this._showMoreSpinner = <StatusIndicator.StatusIndicator>VSS_Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._$showMoreContainer, {
                center: false,
                throttleMinTime: 0,
                imageClass: "status-progress"
            });
        }

        if (wait) {
            this._showMoreSpinner.delayStart(wait);
        }
        else {
            this._showMoreSpinner.start();
        }

        this._$showMoreLink.hide();
        this._$showMoreDisabled.show();
    }

    // hide the spinner, if there is one, and enable the link.
    private _stopShowMoreProgress() {
        if (this._showMoreSpinner) {
            this._showMoreSpinner.complete();
            this._showMoreSpinner.dispose();
            this._showMoreSpinner = null;
        }

        this._$showMoreDisabled.hide();

        if (this._showMoreEnabled()) {
            this._$showMoreLink.show();
        }
    }

    public dispose() {
        this.stopProgress();
        if (this._showMoreSpinner) {
            this._showMoreSpinner.complete();
            this._showMoreSpinner.dispose();
        }

        if (this._discussionEditorControl) {
            this._windowResizeEventHandler && $(window).off("resize", this._windowResizeEventHandler);
            this._discussionEditorControl.dispose();
        }

        if (this._$showMoreLink) {
            this._$showMoreLink.off("click");
        }

        if (this._$discussion) {
            this._$discussion.off("dblclick");
            this._$discussion.off("click");
        }

        // Clean React cards
        const $messagesContainer = $(".discussion-messages-container").eq(0);
        const $cardsContainer = $messagesContainer.find('.cards-container');
        if ($cardsContainer.length !== 0) {
            ReactDOM.unmountComponentAtNode($cardsContainer[0]);
        }

        super.dispose();
    }

    public __test() {
        return {
            _state: this._state,
        };
    }

    private _windowResizeEventHandler: (ev: JQueryEventObject) => void;

    private _render(data: IDiscussionControlData, visibleCount: number) {
        this._state = $.extend(data.state, {
            visibleCount: visibleCount
        });

        if (this._showMoreEnabled()) {
            this._$showMoreLink.text(Resources.DiscussionShowMoreLinkText);
            this._$state.text(Utils_String.format(Resources.DiscussionStateTextFormat, this._state.visibleCount, this._state.totalCount));
            this._$showMoreContainer.css("display", "");
        } else {
            this._$showMoreLink.text("");
            this._$state.text("");
            this._$showMoreContainer.css("display", "none");
        }

        // there are no comments in a readonly experience meaning there is no editor control
        if (visibleCount === 0 && this.getElement().is(":visible") && !this._discussionEditorControl.isVisible()) {
            if (!this._$noCommentsZeroDayLabel) {
                this._$noCommentsZeroDayLabel = $(Utils_String.format("<label>{0}</label>", WitResources.NoCommentsText))
                    .addClass("zero-comments-label")
                    .appendTo(this._$discussionMessagesContainer);
            }
        }
        else if (this._$noCommentsZeroDayLabel) {
            this._$noCommentsZeroDayLabel.remove();
            this._$noCommentsZeroDayLabel = null;
        }

        data.messages.forEach((message) => { this._renderMessage(message); });

        var telemetryProperties: Telemetry.IDiscussionRenderEvent = {
            messageCount: data.messages.length.toString(),
            totalCount: this._state && this._state.totalCount.toString(),
            visibleCount: this._state && this._state.visibleCount.toString(),
        };

        Telemetry.EventLogging.publishDiscussionRenderEvent(telemetryProperties);
    }

    // Callback for getting identity response
    private _renderProfileCard(uniqueAttribute: string, anchor: JQuery) {
        // Get location to render
        const $messagesContainer = $(".discussion-messages-container").eq(0);
        let $cardsContainer = $messagesContainer.find('.cards-container');
        if ($cardsContainer.length === 0) {
            $cardsContainer = $("<div class='cards-container' />")
                .appendTo($messagesContainer);
        }

        // Build and render component
        const personaCardElementProperties = {
            uniqueAttribute: uniqueAttribute,
            target: anchor[0],
            entityOperationsFacade: VSS_Service.getService(Picker_Controls.EntityOperationsFacade),
            consumerId: "059A4AF6-4F10-442A-B1E1-F79A80647606",
            onDismissCallback: () => {
                anchor.attr("aria-expanded", "false");
                ReactDOM.unmountComponentAtNode($cardsContainer[0]);
            }
        };

        const personaCardElement = React.createElement(PersonaCard, personaCardElementProperties);
        ReactDOM.render(
            personaCardElement,
            $cardsContainer[0]
        );
        anchor.attr("aria-expanded", "true");
    }

    private _renderMessage(message: IDiscussionMessage): void {
        const $message = $("<div/>")
            .addClass("discussion-messages-item")
            .appendTo(this._$discussion);

        const $avatar = this._options.createAvatar(message.user.identity);
        let $avatarContainer = null;

        // Attach profile card to avatar
        if (FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.ReactProfileCard)) {
            const { uniqueName, displayName } = message.user.identity;
            $avatar.attr("alt", displayName);

            $avatarContainer = $("<button>")
                .addClass("discussion-messages-left avatar-button cursor-hover-card")
                .attr("aria-expanded", "false")
                .on("click", () => this._renderProfileCard(uniqueName, $avatarContainer))
                .appendTo($message);
        }
        else {
            $avatarContainer = $("<div>")
                .addClass("discussion-messages-left")
                .appendTo($message);
        }
        $avatar.appendTo($avatarContainer);

        const $messageEntryRight = $("<div>")
            .addClass("discussion-messages-right")
            .appendTo($message);

        const $userTimestampContainer = $("<div>")
            .addClass("discussion-messages-user-container")
            .appendTo($messageEntryRight);

        $("<span>")
            .addClass("discussion-messages-user")
            .text(message.user.displayName)
            .appendTo($userTimestampContainer);

        let $timestampSpan = $("<span>")
            .addClass("discussion-messages-timestamp")
            .text(Utils_String.format(Resources.DiscussionUserCommentedTextFormat, Utils_Date.ago(message.timestamp)))
            .appendTo($userTimestampContainer);
        RichContentTooltip.add(Utils_Date.localeFormat(message.timestamp, "F"), $timestampSpan); // always add tooltip which is full datetime

        var $messageContent = $("<div>")
            .addClass("discussion-messages-messagecontent")
            .appendTo($messageEntryRight);

        DiscussionControl._renderMessageContent(message.content, $messageContent, this._options.enableContactCard);
    }

    private _showMoreEnabled(): boolean {
        return this._state && (this._state.totalCount > this._state.visibleCount);
    }

    private _onShowMoreClick(event: JQueryEventObject): boolean | void {
        if (!this._showMoreEnabled()) {
            VSS_Diag.logWarning("showMoreLink was clicked and showMore isn't enabled.");
            return;
        }

        if (!this._options.onShowMore && !this._options.onShowMorePromise) {
            VSS_Diag.logWarning("showMoreLink was clicked and there is no onShowMore or onShowMorePromise handler in _options");
            return;
        }

        var telemetryProperties: Telemetry.IDiscussionShowMoreEvent = {
            totalCount: this._state && this._state.totalCount.toString(),
            visibleCount: this._state && this._state.visibleCount.toString(),
        };

        Telemetry.EventLogging.publishDiscussionShowMoreClickEvent(telemetryProperties);

        if (this._options.onShowMore) {
            this._options.onShowMore(this.getExtendedState());
        }
        else {
            this.clearErrors();
            this._startShowMoreProgress();

            this._options.onShowMorePromise(this.getExtendedState()).then(
                (discussionData: IDiscussionControlData) => {
                    this._stopShowMoreProgress();

                    if (discussionData) {
                        this.append(discussionData);
                    }
                },
                (error: any) => {
                    this._onShowMoreError(error);
                    this._stopShowMoreProgress();
                });
        }
    }

    private _onDblClick(e?: JQueryEventObject): any {
        if (e && e.target) {
            const $src = $(e.target);

            if ($src.is('img') && $src.attr("src")) {

                // Make sure this isn't the identity image, no point in showing that in a different frame.
                if ($src.parent() && !$src.parent().hasClass("discussion-messages-left")) {
                    const url = $src.attr("src");
                    const openedWindow = window.open(url, "_blank");

                    if (openedWindow) {
                        // Ensure no hijacking is possible.
                        openedWindow.opener = null;
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }
    }

    private static _renderMessageContent(content: string, $container: JQuery, enableContactCard: boolean) {
        richTextFilterContent(content).then((filteredContent) => {
            $container.html(filteredContent);
            richTextPreRenderProcessor($container, enableContactCard);
        });
    }
}