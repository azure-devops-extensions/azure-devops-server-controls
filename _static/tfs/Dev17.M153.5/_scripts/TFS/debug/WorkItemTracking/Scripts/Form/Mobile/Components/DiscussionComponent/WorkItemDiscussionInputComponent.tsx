import * as React from "react";
import * as VSS from "VSS/VSS";

import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as CommentUtils from "WorkItemTracking/Scripts/Utils/CommentUtils";
import * as MentionAutocompleteControls from "Mention/Scripts/TFS.Mention.Autocomplete.Controls";

import { autobind } from "OfficeFabric/Utilities";
import { TextArea } from "Presentation/Scripts/TFS/Components/Textarea";
import { Enhancement } from "VSS/Controls";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { DiscussionTelemetryUtils } from "WorkItemTracking/Scripts/Form/Mobile/MobileTelemetryUtils";
import { MentionProcessor, MentionsRenderer } from "Mention/Scripts/TFS.Mention";
import { PeopleMentionParser, PersonAutocompleteProvider, PeopleHtmlMentionsRenderingProvider } from "Mention/Scripts/TFS.Mention.People";
import { WorkItemsMentionParser, WorkItemAutocompleteProvider, WorkItemHtmlMentionsRenderingProvider } from "Mention/Scripts/TFS.Mention.WorkItems";
import { MentionPluginType, getMentionPlugins } from "Mention/Scripts/TFS.Mention.PluginRegistration";
import { DiscussionRenderer, defaultMarkdownOptions } from "Discussion/Scripts/DiscussionRenderer";
import { BlockingOverlayComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/BlockingOverlayComponent";

export interface IState {
    sendEnabled: boolean;
    content: string;
    isSaving: boolean;
}

const UNPROCESSED_DISCUSSION_TEXT = "UnprocessedDiscussionText";

export class WorkItemDiscussionInputComponent extends WorkItemBindableComponent<{}, IState> {
    private _textarea: TextArea;
    private _renderer: DiscussionRenderer;
    private _discussionRenderingPromise : IPromise<string | void>;

    constructor(props, context) {
        super(props, context);

        this.state = {
            sendEnabled: false,
            content: "",
            isSaving: false
        };

        this._renderer = this._getDiscussionRenderer();
    }

    public render(): JSX.Element {
        const MIN_TEXTAREA_HEIGHT: number = 55;
        const MAX_TEXTAREA_HEIGHT: number = 485;

        return <div className="discussion-input-container">
            {
                this.state.isSaving && <BlockingOverlayComponent />
            }
            <TextArea className="discussion-input-field" ref={this._refTextControl}
                placeholder={WorkItemTrackingResources.MobileDiscussionAddComment}
                aria-label={WorkItemTrackingResources.MobileDiscussionAddComment}
                onChange={this._onMessageTextChange}
                autogrow={false}
                value={this.state.content}
                minInputHeight={MIN_TEXTAREA_HEIGHT}
                maxInputHeight={MAX_TEXTAREA_HEIGHT}
                onBlur={this._processPendingMentions}
            />
            <button aria-label={WorkItemTrackingResources.MobileDiscussionMessageSend} className="bowtie-icon bowtie-send"
                onClick={this._onSubmit}
                disabled={!this.state.sendEnabled} />
        </div>;
    }

    protected _bind(workItem: WorkItem, isDisabledView?: boolean) {
        this._initializeMentions();

        const messageText = workItem.getFieldValue(WITConstants.CoreFieldRefNames.History) && this._formContext.workItem.relatedData[UNPROCESSED_DISCUSSION_TEXT]
            ? this._formContext.workItem.relatedData[UNPROCESSED_DISCUSSION_TEXT] as string
            : "";
        this._setMessageText(messageText);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this._disposeMentions();
    }

    protected _unbind() {
        this._disposeMentions();
    }

    private _initializeMentions() {
        if (this._textarea && this._textarea.getElement()) {
            Enhancement.enhance(MentionAutocompleteControls.AutocompleteEnhancement, $(this._textarea.getElement()), this._getAutocompleteOptions());
        }
    }

    @autobind
    private _refTextControl(textarea: any) { // have to use any because incorrect type inference.
        this._textarea = textarea;
    }

    private _getAutocompleteOptions(): MentionAutocompleteControls.IAutocompleteOptions {
        let pluginConfigs = getMentionPlugins([MentionPluginType.WorkItem, MentionPluginType.PullRequest]);
        pluginConfigs.push({
            factory: options => {
                return new PersonAutocompleteProvider({
                    ...options,
                    useRemainingSpace: true
                })}
            });

        return {
            pluginConfigs: pluginConfigs
        };
    }

    private _disposeMentions() {
        const enhancement = Enhancement.getInstance(MentionAutocompleteControls.AutocompleteEnhancement, $(this._textarea.getElement()));
        if (enhancement) {
            enhancement.dispose();
        }
    }

    @autobind
    private _onSubmit(): void {
        if (this._isDirty()) {
            this._toggleSaving(true);
            this._processDiscussionText().then((renderedHtmlString: string) => {
                this._toggleSaving(false); // hide our own overlay before saveComments kicks its own.
                CommentUtils.saveComments(this._formContext.workItem)
                    .then(() => {
                        WorkItemDiscussionInputComponent._saveCommentsTelemetry(renderedHtmlString, this._textarea);
                        this._setMessageText("");
                        this._formContext.workItem.relatedData[UNPROCESSED_DISCUSSION_TEXT] = "";
                    }, this._handleError);
            }, this._handleError);
        }
    }

    private _processDiscussionText(): IPromise<string | void> {
        const text = this._getMessageText();

        // In case if first call did not finish and text is changed, discard current promise and initiate another call
        if (this._discussionRenderingPromise && this._formContext.workItem.relatedData[UNPROCESSED_DISCUSSION_TEXT] === text) {
            return this._discussionRenderingPromise;
        }

        this._formContext.workItem.relatedData[UNPROCESSED_DISCUSSION_TEXT] = text;

        this._discussionRenderingPromise = this._renderer.render(text).then((result: JQuery) => {
            const renderedHtmlString = this._getHtmlString(result);
            this._flush(renderedHtmlString);
            this._discussionRenderingPromise = null;
            return renderedHtmlString;
        }).then(null, error => {
            this._discussionRenderingPromise = null;
        });

        return this._discussionRenderingPromise;
    }

    /**
     * We use our own {@link BlockingOverlayComponent} to block user input at the time of markdown processing.
     * After that saveComments will trigger its own {@link BlockingOverlayComponent}.
     * @param isSaving if true - display {@link BlockingOverlayComponent}.
     */
    @autobind
    private _toggleSaving(isSaving: boolean) {
        this.setState({
            isSaving,
        } as IState);
    }

    @autobind
    private _handleError(error: TfsError) {
        this._toggleSaving(false);
        VSS.handleError(error);
    }

    private _getHtmlString(result: JQuery) {
        let span = $("<span>");
        result.appendTo(span);
        return span.html();
    }

    private _getDiscussionRenderer(): DiscussionRenderer {
        const renderer = new MentionsRenderer();
        renderer.registerProvider(() => new PeopleHtmlMentionsRenderingProvider());
        renderer.registerProvider(() => new WorkItemHtmlMentionsRenderingProvider());
        const processor = new MentionProcessor(renderer);
        processor.registerParser(PeopleMentionParser.getDefault);
        processor.registerParser(WorkItemsMentionParser.getDefault);
        return new DiscussionRenderer({ mentionProcessor: processor, markdownOptions: { ...defaultMarkdownOptions(), katex: false } });
    }

    @autobind
    private _onMessageTextChange(event: React.FormEvent<HTMLTextAreaElement>) {
        const value = this._getMessageText();
        this._flush(value);
        this.setState({
            sendEnabled: this._isDirty(),
            content: value
        } as IState);
    }

    @autobind
    private _processPendingMentions(event: React.FormEvent<HTMLTextAreaElement>) {
        if (this._isDirty()) {
            this._processDiscussionText().then($.noop, this._handleError);
        }
    }

    private _isDirty(): boolean {
        return this._getMessageText().trim() !== "";
    }

    private _flush(value: string): void {
        if (value.trim() === "") { // if whitespace - convert it to an empty string;
            value = "";
        }
        if (this._formContext && this._formContext.workItem) {
            this._formContext.workItem.setFieldValue(WITConstants.CoreFieldRefNames.History, value);
        }
    }

    private _getMessageText() {
        if (this._textarea) {
            return this._textarea.value || "";
        }
        return "";
    }

    private _setMessageText(value: string) {
        this.setState({
            sendEnabled: value.trim() !== "",
            content: value
        } as IState);
    }

    private static _saveCommentsTelemetry(value: string, textarea: TextArea) {
        const $html = $("<p>" + value + "</p>");

        let peopleMentions = 0;
        let workItemMentions = 0;
        let inputScrollHeight = 0;
        PeopleMentionParser.getDefault().parseFromHtml($html, ($a, mention) => {
            peopleMentions++;
        });

        WorkItemsMentionParser.getDefault().parseFromHtml($html, ($a, mention) => {
            workItemMentions++;
        });

        if (textarea && textarea.getElement()) {
            inputScrollHeight = textarea.getElement().scrollHeight;
        }

        DiscussionTelemetryUtils.commentSubmitted({ peopleMentions, workItemMentions, inputScrollHeight });
    }
}
