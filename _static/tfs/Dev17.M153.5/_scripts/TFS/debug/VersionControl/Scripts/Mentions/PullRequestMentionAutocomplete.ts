/// <reference types="jquery" />

import * as Q from "q";
import { createHtmlMention, CssClasses, Constants } from "Mention/Scripts/TFS.Mention";
import { IAutocompletePluginOptions, IInputText, IResultWithTelemetry, ISearchResult, IRange} from "Mention/Scripts/TFS.Mention.Autocomplete";
import { CssClasses as MentionCssClasses, JQueryAutocompletePlugin } from "Mention/Scripts/TFS.Mention.Autocomplete.JQueryAutocomplete";
import { IAutocompleteSuggestEvent } from "Mention/Scripts/TFS.Social.Telemetry";
import { PullRequestMention } from "VersionControl/Scripts/Mentions/PullRequestMention";
import { PullRequestMentionDataProvider } from "VersionControl/Scripts/Mentions/PullRequestMentionDataProvider";
import * as Utils_String from "VSS/Utils/String";
import * as MentionHelpers from "Mention/Scripts/TFS.Mention.Helpers";
import * as Utils_Array from "VSS/Utils/Array";

const PATTERN_WORD_SEPARATOR_PR = "\\s!\[";

// matches !123 when looking for pr mentions
const NUMBER_MENTION_PATTERN = new RegExp(`(${Constants.PATTERN_WORD_START_SEPARATOR})!([0-9]+)$`, "i");
// matches !something when searching pull requests by title
const SINGLE_TERM_MENTION_PATTERN = new RegExp(`(${Constants.PATTERN_WORD_START_SEPARATOR})!(([^${PATTERN_WORD_SEPARATOR_PR}]*)$)`, "i");
// prevents us from picking up multiple mentions next to each other
const AFTER_MENTION_PATTERN = new RegExp(`^(${Constants.PATTERN_WORD_END_SEPARATOR})`, "i");

/**
 * Provide autocomplete behavior for pull request mentions. This class is responsible for activating when ! is typed in
 * a discussion and providing the list of pull request suggestions in the context meny that pops up as well as
 * allowing for filtering based on search terms matching a pull request title
 */
export class PullRequestAutocomplete extends JQueryAutocompletePlugin<IAutocompletePluginOptions, PullRequestMention> {
    private _cache: IDictionaryStringTo<object>;

    constructor(options?: IAutocompletePluginOptions) {
        super(options);
        PullRequestMentionDataProvider.instance().initializeMyPullRequests();
    }

    /**
     * dispose the plugin
     */
    public dispose(): void {
    }

    /**
     * returns the name of the plugin
     */
    public getPluginName(): string {
        return "PullRequestAutocomplete";
    }

    /**
     * Determine the given input text contains the start of a pr mention and whether
     * the plugin should activate and provide suggestions
     */
    public canOpen(inputText: IInputText): IRange {
        let matches = this.mentionPattern().exec(inputText.textBeforeSelection);
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

    /**
     * Search for pull requests provided the given search term which might be a pull request id or might be a search term
     * When returning results, we provide both an 'original' and a 'highlighted'
     * The highlighted version of the title will bold to match the search term. Let's say I have a pull request called 'A shiny apple'
     * When searching for apple, the highlighted result will be 'A shiny <span class='mention-autocomplete-highlight'>apple</span>' to provider better rendering
     */
    public getSuggestions(autocompleteText: IInputText): JQueryPromise<IResultWithTelemetry<ISearchResult<PullRequestMention>[], IAutocompleteSuggestEvent>> {
        let deferred = $.Deferred<IResultWithTelemetry<ISearchResult<PullRequestMention>[], IAutocompleteSuggestEvent>>();
        let telemetryProperties: IAutocompleteSuggestEvent = {};
        let numberMatches = NUMBER_MENTION_PATTERN.exec(autocompleteText.textBeforeSelection);
        let providerPromise: IPromise<ISearchResult<PullRequestMention>[]>;
        // if we matched the number pattern such as !123, then look for pull request 123
        if (!!numberMatches) {
            let specificPromise = this._findPullRequestById(numberMatches[2]);
            let searchPromise = this._searchPullRequests(numberMatches[2]);
            providerPromise = Q.all([specificPromise, searchPromise]).spread((result1: ISearchResult<PullRequestMention>[], result2: ISearchResult<PullRequestMention>[]) => {
                return Utils_Array.union(result1, result2, (a, b) => (a.original && a.original.id) - (b.original && b.original.id));
            });
        }
        else {
            // else if a search term was provided such as !apple, search all cached pull requests whose title contains 'apple'
            let termMatches = this.mentionPattern().exec(autocompleteText.textBeforeSelection);
            if (!!termMatches) {
                providerPromise = this._searchPullRequests(termMatches[2]).then(searchResults => {
                    searchResults.forEach(searchResult => {
                        searchResult.highlighted = this._searchHighlightedMention(termMatches[2], searchResult.original);
                    });
                    return searchResults;
                });
            }
            else {
                // else just bring up the list of cached pull requests
                providerPromise = this._searchPullRequests("");
            }
        }
        providerPromise.then((results) => {
            results = results.filter(result => result.original !== null).sort((a, b) => b.original.id - a.original.id);
            telemetryProperties.suggestionsCount = `${results.length}`;
            deferred.resolve({
                result: results,
                telemetry: telemetryProperties
            });
        }, error => {
            deferred.reject(error);
        });
        return deferred;
    }

    private _findPullRequestById(id: string): IPromise<ISearchResult<PullRequestMention>[]> {
        let prId = parseInt(id);
        return PullRequestMentionDataProvider.instance().getPullRequests([prId])[prId].then(prMention => {
            if (prMention) {
                return [{
                    original: prMention,
                    highlighted: this._searchHighlightedMention(id.toString(), prMention)
                }];
            }
            else {
                return [];
            }
        });
    }

    private _searchPullRequests(searchTerm: string): IPromise<ISearchResult<PullRequestMention>[]> {
        return PullRequestMentionDataProvider.instance().searchPullRequests(searchTerm);
    }

    /**
     * Provide the rendering for the pull requests that appear inside the context menu when typing a pr mention
     */
    public renderSuggestion(ul: JQuery, suggestion: ISearchResult<PullRequestMention>): JQuery {
        let item = $(`<li>
                <a>
                    <span class='bowtie-icon bowtie-tfvc-pull-request pr-icon'/>
                    <span class='${CssClasses.AUTOCOMPLETE_ID}'>PR ${suggestion.original.id}: </span>
                    <span class='${CssClasses.AUTOCOMPLETE_TITLE}'>${suggestion.highlighted.title}</span>
                </a>
            </li>`).appendTo(ul);
        return item;
    }

    public afterRender(ul: JQuery) {
    }

    /**
     * Provide the replacement text once a pull request has been chosen. For example, if you search for !apple and match one of the suggested pull
     * requests, then this needs to turn that into !123 so that what gets saved to the text is the pull request id and not the search term
     */
    public getReplacementText(autocompleteText: IInputText, suggestion: ISearchResult<PullRequestMention>, previewReplacement: boolean): IInputText {
        let matches = this.mentionPattern().exec(autocompleteText.textBeforeSelection);
        let matchedMentionIndex = matches.index + matches[1].length + 1;
        let beforeSelection = autocompleteText.textBeforeSelection.substr(0, matchedMentionIndex);
        let selection = suggestion.original.id.toString();

        if (!AFTER_MENTION_PATTERN.exec(autocompleteText.textAfterSelection)) {
            selection += " ";
        }

        return {
            textBeforeSelection: previewReplacement ? autocompleteText.textBeforeSelection : beforeSelection + selection,
            textInSelection: "",
            textAfterSelection: autocompleteText.textAfterSelection
        };
    }

    /**
     * In the wit form, we use an editable div instead of a text area and so the plugin has to provide an html version to support that workflow
     */
    public getReplacementHtml(suggestion: ISearchResult<PullRequestMention>): string {
        let pr = suggestion.original;
        return createHtmlMention(pr.url, `PR ${pr.id}: ${pr.title}`);
    }

    public getProviderName(): string {
        return "PullRequestAutocompleteProvider";
    }

    private mentionPattern(): RegExp {
        return SINGLE_TERM_MENTION_PATTERN;
    }

    private _searchHighlightedMention(query: string, pr: PullRequestMention): PullRequestMention {
        let highlightedPullRequest = pr;
        let highlightSubstitutionPattern = `<span class="${MentionCssClasses.HIGHLIGHT}">$&</span>`
        let terms = query.split(/\s+/).filter((term) => !!term).map((term) => Utils_String.htmlEncode(term));
        let idSearchResult = MentionHelpers.searchString(pr.id.toString(), terms, MentionHelpers.SearchBehavior.Prefix, highlightSubstitutionPattern);
        let titleSearchResult = MentionHelpers.searchString(Utils_String.htmlEncode(pr.title), terms, MentionHelpers.SearchBehavior.Contains, highlightSubstitutionPattern);
        let allTermsFound: boolean = true;
        terms.forEach(term => {
            let foundTerm = idSearchResult.found[term]
                || titleSearchResult.found[term];
            if (!foundTerm) {
                allTermsFound = false;
            }
        });
        if (allTermsFound) {
            highlightedPullRequest = {
                id: pr.id,
                title: titleSearchResult.highlightedSource,
                url: pr.url
            };
        }
        return highlightedPullRequest;
    }
}

export function createPlugin(options: IAutocompletePluginOptions): PullRequestAutocomplete {
    return new PullRequestAutocomplete(options);
}