/// <reference types="jquery" />
/// <reference types="q" />

import * as Q from "q";
import * as VSS from "VSS/VSS";
import * as Diag from "VSS/Diag";
import * as VSSError from "VSS/Error";
import { equals } from "VSS/Utils/String";
import {
    ArtifactMentionParser,
    ArtifactMentionParserTextResult,
    Constants,
    createHtmlMention,
    CssClasses as MentionCssClasses,
    IMentionsRenderingProvider,
    IMentionTextPart,
    TextPartType,
    MentionRendererHTMLComponent
} from "Mention/Scripts/TFS.Mention";
import { IAutocompletePluginOptions, IInputText, IRange, ISearchResult, IResultWithTelemetry, ITruncatedInputText } from "Mention/Scripts/TFS.Mention.Autocomplete";
import { JQueryAutocompletePlugin, CssClasses as JQueryAutocompleteCssClasses } from "Mention/Scripts/TFS.Mention.Autocomplete.JQueryAutocomplete";
import * as MentionHelpers from "Mention/Scripts/TFS.Mention.Helpers";
import * as Telemetry from "Mention/Scripts/TFS.Social.Telemetry";
import { IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import URI = require("Presentation/Scripts/URI");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as WorkItemTypeIconControl from "Mention/Scripts/WorkItemTypeIcon.JQuery";
import { IWorkItem, IWorkItemMention, IWorkItemMentionRenderOptions } from "Mention/Scripts/WorkItem/WorkItemMentionModels";
import { WorkItemProvider, IWorkItemProviderOptions } from "Mention/Scripts/WorkItem/WorkItemProvider";
import * as Utilities from "Mention/Scripts/WorkItem/WorkItemMentionUtilities";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { HubsService } from "VSS/Navigation/HubsService";
import { getLocalService } from "VSS/Service";

export module CssClasses {
    export var MENTION_WIDGET_WORKITEM = "mention-widget-workitem";
}

export interface IWorkItemAutocompletePluginOptions extends IAutocompletePluginOptions {
    wiql?: string;
}

export class WorkItemAutocompleteProvider extends JQueryAutocompletePlugin<IWorkItemAutocompletePluginOptions, IWorkItem> {
    public static MENU_WIDTH = 450;
    private _workItemProvider: WorkItemProvider;

    constructor(options: IWorkItemAutocompletePluginOptions) {
        var options = options || {};
        if (options.isMenuWidthOverridable) {
            $.extend(options, {
                menuWidth: WorkItemAutocompleteProvider.MENU_WIDTH
            });
        }
        super(options);
    }

    public getWorkItemProvider(): WorkItemProvider {
        if (!this._workItemProvider) {
            this._workItemProvider = new WorkItemProvider(<IWorkItemProviderOptions>{ wiql: this._options.wiql });
        }

        return this._workItemProvider;
    }

    public prefetch() {
        // Trigger initialization of work item provider, and prefetch cache work items MRU. 
        // Otherwise, initialization will not start until the user first triggers the autocomplete menu.
        this.getWorkItemProvider().prefetch();
    }

    public getPluginName(): string {
        return "WorkItemAutocompleteProvider";
    }

    public canOpen(inputText: IInputText): IRange {
        const truncatedText = this.getTruncatedText(inputText);
        const matches = this.mentionPattern().exec(truncatedText.textBeforeSelection);

        if (!!matches) {
            var start = matches.index;
            if (matches[1]) {
                start += matches[1].length + truncatedText.truncatedTextLength;
            }
            return {
                start: start,
                end: inputText.textBeforeSelection.length,
            }
        }
        else {
            return null;
        }
    }

    public getSuggestions(autocompleteText: IInputText): JQueryPromise<IResultWithTelemetry<ISearchResult<IWorkItem>[], Telemetry.IAutocompleteSuggestEvent>> {
        const deferred = $.Deferred<IResultWithTelemetry<ISearchResult<IWorkItem>[], Telemetry.IAutocompleteSuggestEvent>>();
        const telemetryProperties: Telemetry.IAutocompleteSuggestEvent = {};
        const numberMatches = Utilities.NumberMentionPattern.exec(autocompleteText.textBeforeSelection);
        let providerPromise: JQueryPromise<ISearchResult<IWorkItem>[]>;

        if (!!numberMatches) {
            providerPromise = this.getWorkItemProvider().searchById(numberMatches[2]);
        }
        else {
            const truncatedText = this.getTruncatedText(autocompleteText);
            const termMatches = this.mentionPattern().exec(truncatedText.textBeforeSelection);

            // note: 0 is the full match, 1st is the whitespace before #, 2nd is the match after # up to the MultipleTermsLimit words
            if (!!termMatches) {
                providerPromise = this.getWorkItemProvider().search(termMatches[2]);
            }
            else {
                providerPromise = this.getWorkItemProvider().search("");
            }
        }
        providerPromise.done((result) => {
            telemetryProperties.suggestionsCount = `${result.length}`;
            deferred.resolve({
                result: result,
                telemetry: telemetryProperties
            });
        }).fail((error) => {
            deferred.reject(error);
        });
        return deferred;
    }

    public renderSuggestion(ul: JQuery, suggestion: ISearchResult<IWorkItem>): JQuery {
        const li = $("<li>").appendTo(ul);
        const $a = $("<a>").appendTo(li);

        RichContentTooltip.add(suggestion.original.title, $a);

        const $container = $("<div>");

        const iconContainer = $container[0];

        // Explicitly passing empty accessibility options below ( the '{ }') because otherwise the icon will have it's own 
        // work item type aria label, in which case the work item type is read twice by narrator.
        WorkItemTypeIconControl.renderWorkItemTypeIcon(
            iconContainer,
            suggestion.highlighted.workItemType,
            suggestion.original.colorAndIcon,
            {
                ariaAttributes: {},
            } as WorkItemTypeIconControl.IIconAccessibilityOptions);

        $a.append($container[0].innerHTML);

        const workItemTypeWithId = Utilities.getWorkItemTypeWithIdString(suggestion.highlighted.workItemType, suggestion.highlighted.id);
        const workItemTypeWithIdHtml = $("<span>")
            .addClass(MentionCssClasses.AUTOCOMPLETE_ID)
            .html(workItemTypeWithId)[0].outerHTML;

        const workItemTitleHtml = $("<span>")
            .addClass(MentionCssClasses.AUTOCOMPLETE_TITLE)
            .html(suggestion.highlighted.title)[0].outerHTML;

        const $workItemEntryElem = $(Utilities.getWorkItemSummary(workItemTypeWithIdHtml, workItemTitleHtml));
        $workItemEntryElem.appendTo($a);
        li.attr("aria-label", $workItemEntryElem.text());
        return li;
    }

    protected afterRender(ul: JQuery) {
        // hide(delete) tooltips from those autocomplete workitems that are already fully displayed
        $("a", ul).each((i, a) => {
            if (a.clientWidth >= a.scrollWidth) {
                $(a).removeAttr("title");
            }
        });
    }

    public getReplacementText(autocompleteText: IInputText, suggestion: ISearchResult<IWorkItem>, previewReplacement: boolean): IInputText {
        if (previewReplacement) {
            return {
                textBeforeSelection: autocompleteText.textBeforeSelection,
                textInSelection: "",
                textAfterSelection: autocompleteText.textAfterSelection
            }
        } else {
            const truncatedText = this.getTruncatedText(autocompleteText);
            const matches = this.mentionPattern().exec(truncatedText.textBeforeSelection);
            const matchedMentionIndex = matches.index + matches[1].length + 1 + truncatedText.truncatedTextLength;
            const beforeSelection = autocompleteText.textBeforeSelection.substr(0, matchedMentionIndex);
            let selection = suggestion.original.id.toString();

            if (!Utilities.AfterMentionPattern.exec(autocompleteText.textAfterSelection)) {
                selection += " ";
            }

            return {
                textBeforeSelection: beforeSelection + selection,
                textInSelection: "",
                textAfterSelection: autocompleteText.textAfterSelection
            };
        }
    }

    public getReplacementHtml(suggestion: ISearchResult<IWorkItem>): string {
        return createWorkItemHtmlMentionWithTitle(suggestion.original);
    }

    public getProviderName(): string {
        return "WorkItemAutocompleteProvider";
    }

    private mentionPattern(): RegExp {
        return Utilities.mentionPattern(this.isOpen());
    }

    private getTruncatedText(inputText: IInputText): ITruncatedInputText {
        // Running the regex on large content like wiki content causes the page to hang since this 
        // regex is run on every key stroke.
        // So while running the regex to find the mention we only choose the last 1000 characters 
        // from the point of selection(cursor position). This is ample space to find the right mention 
        // including a long title and markup if the user has typed #title. 

        let truncatedTextBeforeSelection = inputText.textBeforeSelection;
        const originalTextLength = truncatedTextBeforeSelection.length
        const maxTextLength = 1000;
        let truncatedTextLength = 0;

        if (originalTextLength > maxTextLength) {
            truncatedTextBeforeSelection = truncatedTextBeforeSelection.substr(-maxTextLength);
            truncatedTextLength = originalTextLength - maxTextLength;
        }

        return {
            textBeforeSelection: truncatedTextBeforeSelection,
            textInSelection: inputText.textInSelection,
            textAfterSelection: inputText.textAfterSelection,
            truncatedTextLength
        } as ITruncatedInputText;
    }
}

export class WorkItemMentionsRenderingProvider implements IMentionsRenderingProvider {
    private static _instance: WorkItemMentionsRenderingProvider;

    public static getDefault(): WorkItemMentionsRenderingProvider {
        if (!WorkItemMentionsRenderingProvider._instance) {
            WorkItemMentionsRenderingProvider._instance = new WorkItemMentionsRenderingProvider();
        }
        return WorkItemMentionsRenderingProvider._instance;
    }

    private static _createWorkItemElement(workItem: IWorkItem, url: string, createOnlyId: boolean = false): JQuery {
        const $container = $("<a>");
        let workItemText = null;

        if (createOnlyId) {
            workItemText = Utilities.getWorkItemMentionText(workItem.id);
        }
        else {
            // Renderer already includes the work item type name, so we don't need tooltip
            WorkItemTypeIconControl.renderWorkItemTypeIcon(
                $container[0],
                workItem.workItemType,
                workItem.colorAndIcon,
                { suppressTooltip: true });

            const workItemTypeWithId = $("<span>")
                .addClass("mention-widget-workitem-typeid")
                .text(Utilities.getWorkItemTypeWithIdString(workItem.workItemType, workItem.id))[0].outerHTML;

            const workItemTitle = $("<span>")
                .addClass("mention-widget-workitem-title")
                .text(workItem.title)[0].outerHTML;

            workItemText = Utilities.getWorkItemSummary(workItemTypeWithId, workItemTitle);
        }

        return $container
            .addClass(CssClasses.MENTION_WIDGET_WORKITEM)
            .addClass("mention-link")
            .attr("href", url)
            .append(workItemText);
    }

    public getArtifactType() { return "WorkItem"; }

    public static createWorkItemIdElement(id: number, url: string): JQuery {
        return WorkItemMentionsRenderingProvider._createWorkItemElement(
            { id, colorAndIcon: null, projectName: null, title: null, workItemType: null }, url, true);
    }

    public renderMention(
        mention: IMentionTextPart,
        insertHtml: (html: string | JQuery) => JQuery,
        options?: IWorkItemMentionRenderOptions): IPromise<MentionRendererHTMLComponent> {

        Diag.Debug.assertParamIsNotNull(mention, "mention");

        return WorkItemProvider.getInstance().getById(mention.ArtifactId).then(workItem => {
            if (workItem === null) {
                const mentionHtml = $("<span>").text(mention.Text)[0].outerHTML;
                insertHtml(mentionHtml);
                return Q.reject(mentionHtml);
            }

            const url = TfsMentionWorkItemHelpers.getWorkItemUrl(+mention.ArtifactId, workItem.projectName);
            const html = WorkItemMentionsRenderingProvider._createWorkItemElement(workItem, url);
            const $mention = insertHtml(html);
            const displayText = createWorkItemMentionSummaryWithTitle(workItem);
            $mention.click((e) => {
                Telemetry.EventLogging.publishWorkItemsClickEvent({
                    workItem: workItem.id.toString()
                });
                const defaultCallback = () => { TfsMentionWorkItemHelpers.showWorkItem(workItem.id, workItem, url, e); };
                if (options && options.onWorkItemClick) {
                    options.onWorkItemClick(workItem, url, defaultCallback);
                } else {
                    defaultCallback();
                }
            });

            const workItemMention: MentionRendererHTMLComponent = {
                htmlComponent: $mention,
                displayText: displayText
            }
            return workItemMention;
        });
    }

    public getTelemetryMentionSummary(mention: IMentionTextPart): string {
        return `${this.getArtifactType()}:${mention.ArtifactId}`;
    }
}

/**
 * Used in cases when we need to render html-like mentions.
 * E.g: Mobile Discussion form, where we transform plaintext mentions into html
 * before saving, for backward compatibility with desktop rich editor.
 */
export class WorkItemHtmlMentionsRenderingProvider extends WorkItemMentionsRenderingProvider {
    public renderMention(
        mention: IMentionTextPart,
        insertHtml: (html: string) => JQuery,
        options?: IWorkItemMentionRenderOptions): IPromise<MentionRendererHTMLComponent> {

        Diag.Debug.assertParamIsNotNull(mention, "mention");

        return WorkItemProvider.getInstance().getById(mention.ArtifactId)
            .then(workItem => {
                if (workItem === null) {
                    const mentionHtml = $("<span>").text(mention.Text)[0].outerHTML;
                    const $mention = insertHtml(mentionHtml);
                    return Q.reject($mention);
                }

                const excludeTypeAndTitle = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.HideTypeAndTitleInWorkItemMentions, false);
                const html = excludeTypeAndTitle ? createWorkItemHtmlMentionWithId(workItem) : createWorkItemHtmlMentionWithTitle(workItem);
                const displayText = excludeTypeAndTitle ? Utilities.getWorkItemMentionText(workItem.id) : createWorkItemMentionSummaryWithTitle(workItem);
                const $mention = insertHtml(html);
                const workItemMention: MentionRendererHTMLComponent = {
                    htmlComponent: $mention,
                    displayText: displayText
                }
                return workItemMention;
            });
    }
}

export class WorkItemsMentionParser extends ArtifactMentionParser {
    private static _instance: WorkItemsMentionParser;

    public static getDefault(): WorkItemsMentionParser {
        if (!WorkItemsMentionParser._instance) {
            WorkItemsMentionParser._instance = new WorkItemsMentionParser();
        }
        return WorkItemsMentionParser._instance;
    }

    public parseFromText(text: string):ArtifactMentionParserTextResult [] {
        var artifacts:ArtifactMentionParserTextResult[] = [];
        var pattern = new RegExp(`(${Constants.PATTERN_WORD_START_SEPARATOR})#([0-9]{1,10})(?=(${Constants.PATTERN_WORD_END_SEPARATOR}))`, "ig");
        var match;
        while (match = pattern.exec(text)) {
            var start = match.index;
            var end = pattern.lastIndex;
            var startBoundary = match[1];
            if (startBoundary && startBoundary.length) {
                // move the start back if a boundary character was captured
                start += startBoundary.length;
            }
            artifacts.push({
                index: {
                    start: start,
                    end: end,
                },
                id: match[2]
            });
        }
        return artifacts;
    }

    public parseFromUrl(url: string): IWorkItemMention {
        var u = new URI(url);
        var segments = u.segment();
        while (segments.shift() !== TfsMentionWorkItemHelpers.getControllerNameWithPrefix()) {
            if (!segments.length) {
                return;
            }
        }
        var workItemId = +segments.pop();
        if (workItemId > 0) {
            return {
                workItemId: workItemId
            };
        }
    }

    public parseFromHtml($html: JQuery, foundMention: ($a, mention: IWorkItemMention) => void) {
        const $workItemMentions = $html.find(`a[href*="/${TfsMentionWorkItemHelpers.getControllerNameWithPrefix()}/${TfsMentionWorkItemHelpers.EDIT_ACTION_NAME}/"][${Constants.HTML_MENTION_ATTR_NAME}^="${Constants.HTML_MENTION_VERSION_10}"]`);

        $workItemMentions.each((i, elem) => {
            var $a = $(elem);
            var mention = this.parseFromUrl($a.attr("href"));
            if (mention) {
                foundMention($a, mention);
            }
        });
    }

    public getArtifactType() {
        return "WorkItem";
    }
}

export class WorkItemMentionProcessor {
    public static processHtml($html: JQuery, renderOptions?: IWorkItemMentionRenderOptions) {
        WorkItemsMentionParser.getDefault().parseFromHtml($html, ($a, mention) => {
            var mentionToRender = {
                ArtifactId: mention.workItemId.toString(),
                ArtifactType: "",
                Text: "",
                Type: TextPartType.Mention,
                StartIndex: 0
            };
            WorkItemMentionsRenderingProvider.getDefault()
                .renderMention(mentionToRender, (html) => $("<span>").append(html), renderOptions)
                .then((result) => {
                    $a.replaceWith(result.htmlComponent);
                });
        });
    }

    /**
     * Filters out work item title from old work item mention data (new format only has ID).
     * @param $html Query object containing the HTML to process
     */
    public static filterHtml($html: JQuery) {
        WorkItemsMentionParser.getDefault().parseFromHtml($html, ($a, mention) => {
            const url = $a.attr("href");
            const $result = WorkItemMentionsRenderingProvider.createWorkItemIdElement(mention.workItemId, url);
            // add mention attribute back in so processHtml can pick it up when it calls parseFromHtml
            $result.attr(Constants.HTML_MENTION_ATTR_NAME, $a.attr(Constants.HTML_MENTION_ATTR_NAME));
            $a.replaceWith($result);
        });
    }
}

function getWorkItemsHubId(): string {
    if (FeatureAvailabilityService.isFeatureEnabled("WebAccess.WorkItemTracking.WorkItemsHub.NewPlatform", false)) {
        return "ms.vss-work-web.new-work-items-hub";
    }

    return "ms.vss-work-web.work-items-hub";
}

export module TfsMentionWorkItemHelpers {
    export const EDIT_ACTION_NAME = "edit";
    export const CONTROLLER_NAME = "workitems";

    /**
     * Opens the workitem form for the specified work item ID
     * @param id ID of the corresponding workItem.
     * @param workItem WorkItem 
     * @param url the url that we are trying to click
     * @param event the Jquery event
     */
    export function showWorkItem(id: number, workItem?: IWorkItem, url?: string, event?: JQueryEventObject) {
        try {
            if (MentionHelpers.hasParentWindow() && (<any>window.parent).TfsMentionWorkItemHelpers) {
                var helper: typeof TfsMentionWorkItemHelpers = (<any>window.parent).TfsMentionWorkItemHelpers;
                helper.showWorkItem(id);
                return;
            }
        }
        catch (e) {
            // Accessing a cross origin frame can cause an exception.  This happens when we are hosted 
            // in an iframe from a different host (microsoft teams integration for example)
        }
        const project = MentionHelpers.getMainTfsContext().contextData.project;
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && project && workItem.projectName && equals(workItem.projectName, project.name, true)) {
            getLocalService(HubsService).getHubNavigateHandler(getWorkItemsHubId(), url)(event);
            event.preventDefault();
        }
    }

    /**
     * Gets the project specific URL of the given workitem.
     * @param id ID of the workItem.
     * @param projectName If given, use that to build the URL. Otherwise current project's GUID will be used.
     */
    export function getWorkItemUrl(id: number, projectName?: string): string {
        const tfsContext = MentionHelpers.getMainTfsContext();

        return tfsContext.getPublicActionUrl(TfsMentionWorkItemHelpers.EDIT_ACTION_NAME, TfsMentionWorkItemHelpers.CONTROLLER_NAME, {
            parameters: id,
            project: projectName || tfsContext.navigation.projectId,
            team: ""
        } as IRouteData);
    }

    /**
     * Gets the name of the workitems controller (similar to _workitems) to be used in the workitem URL.
     */
    export function getControllerNameWithPrefix(): string {
        const tfsContext = MentionHelpers.getMainTfsContext();
        return `${tfsContext.navigation.controllerPrefix}${TfsMentionWorkItemHelpers.CONTROLLER_NAME}`;
    }
}

export function createWorkItemMentionSummaryWithTitle(workItem: IWorkItem): string {
    const typeWithId = Utilities.getWorkItemTypeWithIdString(workItem.workItemType, workItem.id);
    return Utilities.getWorkItemSummary(typeWithId, workItem.title);
}

/**
 * Creates work item html mention excluding the type and title and has only the work item id.
 * e.g. <a href="URL" data-vss-mention="version:1.0">#5231</a>
 * This is used to generate the mention to be saved in the DB by WorkItemHtmlMentionsRenderingProvider.
 */
export function createWorkItemHtmlMentionWithId(workItem: IWorkItem): string {
    const href = getWorkItemHref(workItem.id);
    const workItemSummary = Utilities.getWorkItemMentionText(workItem.id);

    return createHtmlMention(href, workItemSummary);
}

/**
 * Creates work item html mention including the type and title.
 * e.g. <a href="URL" data-vss-mention="version:1.0">Bug 5231: Title</a>
 * This is used to get the replacement text with the type and title to be displayed in the rich text box,
 * after selecting a work item from the mention suggestion list.
 */
export function createWorkItemHtmlMentionWithTitle(workItem: IWorkItem): string {
    const href = getWorkItemHref(workItem.id);
    const workItemSummary = createWorkItemMentionSummaryWithTitle(workItem);

    return createHtmlMention(href, workItemSummary);
}

function getWorkItemHref(workItemId: number): string {
    // TODO: Ideally we should generate URL with correct project GUID
    const url = TfsMentionWorkItemHelpers.getWorkItemUrl(workItemId);
    const u = new URI(url);
    if (!u.host()) {
        const windowLocation = MentionHelpers.getWindowLocation();
        u.host(windowLocation.host);
        u.protocol(windowLocation.protocol);
    }

    return u.href();
}

(<any>window).TfsMentionWorkItemHelpers = TfsMentionWorkItemHelpers;
