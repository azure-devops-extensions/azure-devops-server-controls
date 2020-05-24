import * as Utils_String from "VSS/Utils/String";
import * as MentionHelpers from "Mention/Scripts/TFS.Mention.Helpers";
import { Constants, createHtmlMention } from "Mention/Scripts/TFS.Mention";
import { CssClasses as JQueryAutocompleteCssClasses } from "Mention/Scripts/TFS.Mention.Autocomplete.JQueryAutocomplete";
import { IWorkItem } from "Mention/Scripts/WorkItem/WorkItemMentionModels";
import { IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export const DEFAULT_HIGHLIGHT_SUBSTITUTION_PATTERN = `<span class="${JQueryAutocompleteCssClasses.HIGHLIGHT}">$&</span>`;

export const NumberMentionPattern = new RegExp(`(${Constants.PATTERN_WORD_START_SEPARATOR})#([0-9]*)$`, "i");

export const SingleTermMentionPattern = new RegExp(`(${Constants.PATTERN_WORD_START_SEPARATOR})#(([^${Constants.PATTERN_WORD_SEPARATOR}]*)$)`, "i");

export const MultipleTermsLimit = 3;

export const MultipleTermsMentionPattern = new RegExp(`(${Constants.PATTERN_WORD_START_SEPARATOR})#(([^${Constants.PATTERN_WORD_SEPARATOR}]+\\s?){0,${MultipleTermsLimit}}$)`, "i");

export const InfiniteTermsMentionPattern = new RegExp(`(${Constants.PATTERN_WORD_START_SEPARATOR})#(([^${Constants.PATTERN_WORD_SEPARATOR}]+\\s?){0,}$)`, "i");

export const AfterMentionPattern = new RegExp(`^(${Constants.PATTERN_WORD_END_SEPARATOR})`, "i");

export const EDIT_ACTION_NAME = "edit";

export const CONTROLLER_NAME = "workitems";

export const PatternSplitter = /\s+/;

export function getMultiTerms(pattern: string, encodeHtmlChars: boolean): string[] {
    return pattern.split(/\s+/).filter((term) => !!term).map((term) => encodeHtmlChars ? Utils_String.htmlEncode(term) : term);
}

export function searchHighlightedWorkItem(pattern: string, workItem: IWorkItem, highlightSubstitutionPattern: string = DEFAULT_HIGHLIGHT_SUBSTITUTION_PATTERN): IWorkItem {
    const terms = getMultiTerms(pattern, true);
    const idSearchResult = MentionHelpers.searchString(workItem.id.toString(), terms, MentionHelpers.SearchBehavior.Prefix, highlightSubstitutionPattern);
    const titleSearchResult = MentionHelpers.searchString(workItem.title, terms, MentionHelpers.SearchBehavior.Contains, highlightSubstitutionPattern, "htmlEncode");
    const workItemTypeSearchResult = MentionHelpers.searchString(workItem.workItemType, terms, MentionHelpers.SearchBehavior.Contains, highlightSubstitutionPattern);

    let allTermsFound: boolean = true;
    terms.forEach(term => {
        const foundTerm = idSearchResult.found[term]
        || workItemTypeSearchResult.found[term]
        || titleSearchResult.found[term];
        if (!foundTerm) {
            allTermsFound = false;
        }
    });

    return allTermsFound
        ? <any>{
            id: idSearchResult.highlightedSource,
            title: titleSearchResult.highlightedSource,
            workItemType: workItemTypeSearchResult.highlightedSource
        }
        : workItem;
}

export function getWorkItemTypeWithIdString(workItemType: string, workItemId: string | number): string {
    return `${workItemType} ${workItemId}`;
}

export function getWorkItemSummary(workItemTypeWithId: string, workItemTitle: string): string {
    return `${workItemTypeWithId}: ${workItemTitle}`;
}

export function getWorkItemMentionText(workItemId: number): string {
    return `#${workItemId}`;
}

export function mentionPattern(multipleTerms: boolean, ignoreTermsLimit?: boolean): RegExp {
    if (!multipleTerms) {
        return SingleTermMentionPattern;
    }
    else if (ignoreTermsLimit) {
        return InfiniteTermsMentionPattern;
    }
    else {
        return MultipleTermsMentionPattern;
    }
}

export function createWorkItemMentionHtml(workItemType: string, workItemId: number | string, workItemTitle: string): string {
    const href = getWorkItemHref(workItemId);
    const typeWithId = getWorkItemTypeWithIdString(workItemType, workItemId);
    const workItemSummary = getWorkItemSummary(typeWithId, workItemTitle);

    return createHtmlMention(href, workItemSummary);
}

export function getWorkItemHref(workItemId: number | string): string {
    // TODO: Ideally we should generate URL with correct project GUID
    const url = new URI(getWorkItemUrl(workItemId));
    if (!url.host()) {
        const windowLocation = MentionHelpers.getWindowLocation();
        url.host(windowLocation.host);
        url.protocol(windowLocation.protocol);
    }

    return url.href();
}

export function getWorkItemUrl(workItemId: number | string, projectName?: string): string {
    const tfsContext = MentionHelpers.getMainTfsContext();

    return tfsContext.getPublicActionUrl(EDIT_ACTION_NAME, CONTROLLER_NAME, {
        parameters: workItemId,
        project: projectName || tfsContext.navigation.projectId,
        team: ""
    } as IRouteData);
}
