import * as Q from "q";

import { domElem } from "VSS/Utils/UI";

import * as MentionAutocomplete from "Mention/Scripts/TFS.Mention.Autocomplete";
import * as MentionAutocompleteJQueryAutocomplete from "Mention/Scripts/TFS.Mention.Autocomplete.JQueryAutocomplete";
import * as Telemetry from "Mention/Scripts/TFS.Social.Telemetry";

import { WikiPage } from "TFS/Wiki/Contracts";

import { getWikiPagePathFromGitPath, removeExtensionfromPagePath } from "SearchUI/Helpers/WikiHelper";
import { getPageNameFromPath, getLinkFromPath } from "Wiki/Scripts/Helpers";

export class WikiLinkAutocompleteProvider extends MentionAutocompleteJQueryAutocomplete.JQueryAutocompletePlugin<{}, {}> {
    public static wikiStricktlyOpenLinkPattern(): RegExp {
        //Pattern matches for [*](/* 
        return /\[[^\]]{0,}]\(([^)\n]*)$/g;
    }

    public static wikiOpenLinkPattern(): RegExp {
        //Pattern matches for [*]( and used to separate URL part from rest of link
        return /\[[^\]]{0,}]\(/g;
    }

    public static wikiLinkTitleSeperatorPattern(): RegExp {
        return /]\(/g;
    }

    private _wikiLinkProvider: WikiLinkProvider;
    private _getPagesToFilter: () => IPromise<WikiPage[]> = null;

    constructor(
        options: MentionAutocomplete.IAutocompletePluginOptions,
        getPagesToFilter: () => IPromise<WikiPage[]>,
    ) {
        super(options);

        this._getPagesToFilter = getPagesToFilter;
    }

    public getPluginName(): string {
        return "WikiLinkAutocompleteProvider";
    }

    public canOpen(inputText: MentionAutocomplete.IInputText): MentionAutocomplete.IRange {
        const matches = WikiLinkAutocompleteProvider.wikiStricktlyOpenLinkPattern().exec(inputText.textBeforeSelection);
        if (!!matches) {
            let start = matches.index;
            if (matches[1]) {
                start += matches[1].length;
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

    public getWikiLinkProvider(): WikiLinkProvider {
        if (!this._wikiLinkProvider) {
            this._wikiLinkProvider = new WikiLinkProvider(this._getPagesToFilter);
        }

        return this._wikiLinkProvider;
    }

    // Provides suggestions on pattern match
    public getSuggestions(autocompleteText: MentionAutocomplete.IInputText): JQueryPromise<MentionAutocomplete.IResultWithTelemetry<MentionAutocomplete.ISearchResult<string>[], Telemetry.IAutocompleteSuggestEvent>> {
        const deferred = $.Deferred<MentionAutocomplete.IResultWithTelemetry<MentionAutocomplete.ISearchResult<string>[], Telemetry.IAutocompleteSuggestEvent>>();
        const telemetryProperties: Telemetry.IAutocompleteSuggestEvent = {};
        let providerPromise: JQueryPromise<MentionAutocomplete.ISearchResult<string>[]>;

        const termMatches = WikiLinkAutocompleteProvider.wikiStricktlyOpenLinkPattern().exec(autocompleteText.textBeforeSelection);
        providerPromise = this.getWikiLinkProvider().search(termMatches[0]);

        providerPromise.done((result: MentionAutocomplete.ISearchResult<string>[]) => {
            deferred.resolve({
                result: result,
                telemetry: telemetryProperties,
            });
        }).fail((error: any) => {
            deferred.reject(error);
        });
        return deferred;
    }

    // Used to render the selected suggestion
    public renderSuggestion(ul: JQuery, suggestion: MentionAutocomplete.ISearchResult<string>): JQuery {
        const $li = $(domElem("li")).appendTo(ul);
        $(domElem("span", "mention-autocomp-title"))
            .text(suggestion.highlighted)
            .appendTo(
                $(domElem("a")).appendTo($li));

        return $li;
    }

    public getLinkMatch(text: string): RegExpExecArray {
        const linkMentionRegex: RegExp = WikiLinkAutocompleteProvider.wikiOpenLinkPattern();
        let matches = null, lastMatch = null;
        let populatePageTitle: boolean = false;

        do {
            matches = linkMentionRegex.exec(text);
            if (matches != null) {
                lastMatch = matches;
            }

        } while (matches !== null);

        return lastMatch;
    }

    public shouldPopulateTitle(markdownLinkStr: string): boolean {
        // At this point link is of the form [abc](/
        const linkTextResult: RegExpExecArray = WikiLinkAutocompleteProvider.wikiLinkTitleSeperatorPattern().exec(markdownLinkStr);
        const markdownLinkText: string = markdownLinkStr.substring(1, linkTextResult.index);
        if (markdownLinkText.length == 0) {
            return true;
        }

        return false;
    }

    public getTitlePopulatedLink(text: string, match: RegExpExecArray, suggestion: MentionAutocomplete.ISearchResult<string>): string {
        // For the links with empty text (text inside []), we populate page title
        let linkText: string = text.substring(match.index);
        const populatePageTitle: boolean = this.shouldPopulateTitle(linkText);


        if (!populatePageTitle) {
            // Remove additional chars typed by user before populating link
            const linkTextResult: RegExpExecArray = WikiLinkAutocompleteProvider.wikiLinkTitleSeperatorPattern().exec(linkText);
            linkText = linkText.substr(0, linkTextResult.index + 2);
            return linkText.substr(0, linkText.length) + getLinkFromPath(suggestion.original);
        }

        return "[" + getPageNameFromPath(getWikiPagePathFromGitPath(suggestion.original)) + "](" + getLinkFromPath(suggestion.original);
    }

    public closedParathesisLink(link: string, textAfter: string): string {
        const closeBraceMatch: RegExpExecArray = /^\s*\)/g.exec(textAfter);
        if (!closeBraceMatch) {
            link = link + ")";
        }

        return link;
    }

    // Provides text to be replaced when an option is selected
    public getReplacementText(autocompleteText: MentionAutocomplete.IInputText, suggestion: MentionAutocomplete.ISearchResult<string>, previewReplacement: boolean): MentionAutocomplete.IInputText {
        const lastMatch: RegExpExecArray = this.getLinkMatch(autocompleteText.textBeforeSelection);
        const populatedLink: string = this.getTitlePopulatedLink(autocompleteText.textBeforeSelection, lastMatch, suggestion);
        const closedLink: string = this.closedParathesisLink(populatedLink, autocompleteText.textAfterSelection);

        const matchedMentionIndex = lastMatch.index + (populatedLink.length > 0 ? 0 : lastMatch[0].length);
        const beforeSelection = autocompleteText.textBeforeSelection.substr(0, matchedMentionIndex);

        if (previewReplacement) {
            return {
                textBeforeSelection: autocompleteText.textBeforeSelection,
                textInSelection: "",
                textAfterSelection: autocompleteText.textAfterSelection,
            }
        } else {
            return {
                textBeforeSelection: beforeSelection + closedLink,
                textInSelection: "",
                textAfterSelection: autocompleteText.textAfterSelection,
            };
        }
    }

    public getProviderName(): string {
        return "WikiLinkAutocompleteProvider";
    }
}

export class WikiLinkProvider {
    private _wikiPages: IPromise<string[]>;
    private _getPagesToFilter: () => IPromise<WikiPage[]> = null;
    private readonly MAX_FILTERED_PAGES = 50;

    constructor(getPagesToFilter: () => IPromise<WikiPage[]>) {
        const deferred = Q.defer<string[]>();
        this._getPagesToFilter = getPagesToFilter;
        this._wikiPages = this._getWikiPages();
    }

    public getArtifactType(): string {
        return "WikiPage";
    }

    public search(term: string): JQueryPromise<MentionAutocomplete.ISearchResult<string>[]> {
        const deferred = $.Deferred<MentionAutocomplete.ISearchResult<string>[]>();
        const foundWikiPages: MentionAutocomplete.ISearchResult<string>[] = [];

        // This variable we are using to filter pages as user continues to type
        const linkText = term.substr(term.indexOf("(") + 1);

        this._wikiPages.then(wikiPageItems => {
            for (let index = 0; index < wikiPageItems.length; index++) {
                const wikiPage = wikiPageItems[index];
                // Show all pages when path is empty, start to filter once we have more chars
                if (linkText.length == 0 || wikiPage.toLocaleLowerCase().indexOf(linkText.toLocaleLowerCase()) >= 0) {
                    foundWikiPages.push({ original: wikiPage, highlighted: wikiPage });
                    // limit the total results to MAX_FILTERED_PAGES, as rendering of complete results is too slow
                    if (foundWikiPages.length >= this.MAX_FILTERED_PAGES) {
                        break;
                    }
                }
            }
            deferred.resolve(foundWikiPages);
        }, reject => {
            deferred.reject.apply(deferred, reject);
        });

        return deferred.promise();
    }

    private _getWikiPages(): IPromise<string[]> {
        let deferred = Q.defer<string[]>();
        const wikiPages: string[] = [];
        this._getPagesToFilter().then(pages => {
            pages.forEach(page => {
                page.gitItemPath && wikiPages.push(getWikiPagePathFromGitPath(removeExtensionfromPagePath(page.gitItemPath)));
            });

            // Remove "/" from the list of pages
            wikiPages.splice(wikiPages.indexOf("/"), 1);
            deferred.resolve(wikiPages);
        });

        return deferred.promise;
    }
}
