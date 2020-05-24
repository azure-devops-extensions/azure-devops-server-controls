///<amd-dependency path="jQueryUI/autocomplete"/>
import Accessibility = require("VSS/Utils/Accessibility");
import Core = require("VSS/Utils/Core");
import Diag = require("VSS/Diag");
import UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

import MentionAutocomplete = require("Mention/Scripts/TFS.Mention.Autocomplete");
import MentionHelpers = require("Mention/Scripts/TFS.Mention.Helpers");
import MentionResources = require("Mention/Scripts/Resources/TFS.Resources.Mention");
import Telemetry = require("Mention/Scripts/TFS.Social.Telemetry");
import * as Utils_Core from "VSS/Utils/Core";

module Helpers {
    /*
     Searches for a keyboard event anywhere in an event's originalEvent chain.
     */
    export function tryGetKeyboardEvent(event: JQueryEventObject, recursionDepth: number): JQueryEventObject {
        var result = null;
        if (event) {
            var isMatch = /^key(down|up|press)$/i.test(event.type);
            if (isMatch) {
                result = event;
            }
            else if (event.originalEvent && recursionDepth && recursionDepth > 0) {
                result = tryGetKeyboardEvent(<JQueryEventObject>event.originalEvent, recursionDepth - 1);
            }
        }
        return result;
    }

    export function getStringFromInputText(inputText: MentionAutocomplete.IInputText): string {
        return inputText.textBeforeSelection + inputText.textInSelection + inputText.textAfterSelection;
    }
}

export module CssClasses {
    export var AUTOCOMPLETE_CONTAINER = "mention-autocomplete-container";
    export var AUTOCOMPLETE_FOOTER = "mention-autocomplete-footer";
    export var AUTOCOMPLETE_FOOTER_CONTENTS = "mention-autocomplete-footer-contents";
    export var HIGHLIGHT = "mention-autocomplete-highlight";
    export var AUTOCOMPLETE_NO_ITEMS_FOUND = "mention-autocomplete-no-items";
    export var AUTOCOMPLETE_FOOTER_LOADING = "mention-autocomplete-loading";
}

interface SourceRequest {
    term: JQueryDeferred<MentionAutocomplete.IResultWithTelemetry<{}, Telemetry.IAutocompleteOpenEvent>>;
}

interface SourceResponseItem<TArtifact> {
    type: SourceResponseItemType;
    index: number;
    suggestion: MentionAutocomplete.ISearchResult<TArtifact>;
    error: any;
    label?: any;
    value?: any;
}

enum SourceResponseItemType {
    Suggestion = 0,
    Error = 1,
    Empty = 2,
    Loading = 3
}

export class JQueryAutocompletePlugin<TOptions extends MentionAutocomplete.IAutocompletePluginOptions, TArtifact> implements MentionAutocomplete.IAutocompletePlugin<TOptions> {
    private static MENU_FOOTER_HEIGHT = 20;
    private static DEFAULT_MENU_MAX_HEIGHT = 200;
    private static LOADING_DELAY_TIME = 100;
    private static MIN_MENU_ZINDEX = 100;

    protected _options: TOptions;
    private _$inputElement: JQuery; // This input element isn't inserted into the DOM. It's used just for interacting with JQuery Autocomplete.
    private _inputText: MentionAutocomplete.IInputText;
    private _$menuContainer: JQuery;
    private _$footer: JQuery;
    private _isOpen: boolean = false;

    constructor(options: TOptions) {
        this._options = options;
    }

    public initialize() {
        this._$inputElement = $("<input>").autocomplete({
            appendTo: this._getMenuContainer(),
            autoFocus: true,
            source: MentionHelpers.delegate(this, this._autocompleteOnSource),
            select: MentionHelpers.delegate(this, this._autocompleteOnSelect),
            focus: MentionHelpers.delegate(this, this._autocompleteOnFocus),
            open: MentionHelpers.delegate(this, this._autocompleteOnOpen),
            close: MentionHelpers.delegate(this, this._autocompleteOnClose),
            messages: {
                noResults: '',
                results: () => ''
            }
        } as JQueryUI.AutocompleteOptions);
        this._$inputElement.on("keydown keypress", (e) => {
            if (!MentionHelpers.eventHasPrintableCharacter(e)) {
                if (e.keyCode === UI.KeyCode.UP || e.keyCode === UI.KeyCode.DOWN || e.keyCode === UI.KeyCode.PAGE_UP || e.keyCode === UI.KeyCode.PAGE_DOWN) {
                    this._handleAutocompleteReset(e);
                }
            }
        });

        this._$menuContainer.on("mousewheel", (e) => {
            e.stopPropagation();
        })

        var autocomplete = this._getAutocompleteInstance();
        autocomplete._resizeMenu = MentionHelpers.delegate(this, this._autocompleteResizeMenu);
        autocomplete._renderMenu = MentionHelpers.delegate(this, this._autocompleteRenderMenu);
        autocomplete._renderItem = MentionHelpers.delegate(this, this._autocompleteRenderItem);
    }

    public __test() {
        return {
            _$footer: this._$footer
        }
    }
    public prefetch() { }
    public getPluginName(): string { throw new Error("Not implemented"); }
    public canOpen(inputText: MentionAutocomplete.IInputText): MentionAutocomplete.IRange { throw new Error("Not implemented"); }
    public getSuggestions(inputText: MentionAutocomplete.IInputText): JQueryPromise<MentionAutocomplete.IResultWithTelemetry<MentionAutocomplete.ISearchResult<TArtifact>[], Telemetry.IAutocompleteSuggestEvent>> { throw new Error("Not Implemented"); }
    public renderSuggestion(ul: JQuery, suggestion: MentionAutocomplete.ISearchResult<TArtifact>): JQuery { throw new Error("Not Implemented"); }
    public getReplacementText(inputText: MentionAutocomplete.IInputText, suggestion: MentionAutocomplete.ISearchResult<TArtifact>, previewReplacement: boolean): MentionAutocomplete.IInputText { throw new Error("Not Implemented"); }
    public getReplacementHtml(suggestion: MentionAutocomplete.ISearchResult<TArtifact>): string { throw new Error("Not Implemented"); }
    protected afterRender(ul: JQuery) { }
    protected onClose(ul: JQuery) { };

    public dispose() {
        if (this._$inputElement) {
            this._$inputElement.autocomplete("destroy");
            this._$inputElement.remove();
            this._$inputElement = null;
        }

        if (this._$menuContainer) {
            this._$menuContainer.remove();
            this._$menuContainer = null;
        }

        this._options = null;
    }

    public getOptions(): MentionAutocomplete.IAutocompletePluginOptions {
        return this._options;
    }

    public open(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText) {
        this._inputText = inputText;
        this._isOpen = true;
    }

    public suggest(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText): PromiseLike<MentionAutocomplete.IResultWithTelemetry<{}, Telemetry.IAutocompleteSuggestEvent>> {
        var deferred = $.Deferred<MentionAutocomplete.IResultWithTelemetry<{}, Telemetry.IAutocompleteSuggestEvent>>();
        this._inputText = inputText;
        this._$inputElement.val(Helpers.getStringFromInputText(inputText));
        this._$inputElement.autocomplete("search", <any>deferred, event);
        return deferred;
    }
    public close(event: JQueryEventObject, inputText: MentionAutocomplete.IInputText) {
        this._inputText = inputText;
        this._$inputElement.autocomplete("close", event as any);
        this._isOpen = false;
    }
    public handle(event: JQueryEventObject) {
        this._$inputElement.trigger(event);
    }
    public isOpen(): boolean {
        return this._isOpen;
    }

    private _getMenuContainer(): JQuery {
        if (!this._$menuContainer) {
            var $parent = this._options.menuContainer().length
                ? this._options.menuContainer()
                : $(document.body);

            this._$menuContainer = $("<div>")
                .addClass(CssClasses.AUTOCOMPLETE_CONTAINER)
                .appendTo($parent);
        }

        return this._$menuContainer;
    }

    private _getMenuMaxHeight() {
        return this._options.menuMaxHeight || JQueryAutocompletePlugin.DEFAULT_MENU_MAX_HEIGHT;
    }

    protected _getAutocompleteInstance(): any {
        return this._$inputElement.data("ui-autocomplete");
    }

    private _applySuggestionToTextBox(event: JQueryEventObject, item: SourceResponseItem<TArtifact>, previewReplacement: boolean) {
        var telemetryProperties: Telemetry.IAutocompleteSelectEvent = {
            selectionIndex: `${item.index}`
        }
        var replacementText = this.getReplacementText(this._inputText, item.suggestion, previewReplacement);
        this._$inputElement.val(Helpers.getStringFromInputText(replacementText));
        var replacement: MentionAutocomplete.IAutocompleteReplacement = {
            getPlainText: () => replacementText,
            getHtml: () => this.getReplacementHtml(item.suggestion),
        }
        if (previewReplacement) {
            if (this._options.focus) {
                this._options.focus(event, replacement);
            }
        }
        else {
            this._inputText = replacementText;
            if (this._options.select) {
                this._options.select(event, replacement, telemetryProperties);
            }
        }
    }

    private _handleAutocompleteReset(event: JQueryEventObject) {
        var inputTextString = Helpers.getStringFromInputText(this._inputText);
        var inputElementValue = this._$inputElement.val();
        if (inputElementValue === inputTextString) {
            if (this._options.focus) {
                var input = this._inputText;
                var replacement: MentionAutocomplete.IAutocompleteReplacement = {
                    getPlainText: () => input,
                    getHtml: () => "",
                }
                this._options.focus(event, replacement);
            }
        }
    }

    private _getMentionTextArea() {
        return this._options.textElement
            ? this._options.textElement()
            : null;
    }

    private _autocompleteResizeMenu() {
        const that = this;
        const $ul = $(this._getAutocompleteInstance().menu.element);
        const $positioningElement = this._options.positioningElement
            ? typeof this._options.positioningElement === "function"
                ? (<() => JQuery>this._options.positioningElement)() :
                <JQuery>this._options.positioningElement
            : this._getMenuContainer();

        const menuWidth = this._options.isMenuWidthOverridable && this._options.menuWidth ? this._options.menuWidth : $positioningElement.innerWidth();
        $ul.width(menuWidth);
        const $firstChild = $(">:first:visible", $ul);

        const menuZIndex = Math.max(
            (<any>$positioningElement).zIndex() * 1 + 1,
            JQueryAutocompletePlugin.MIN_MENU_ZINDEX
        );
        $ul.css("z-index", menuZIndex);

        const positioningElementOffset = $positioningElement.offset();
        const autocompleteRelativeToWindowTop = positioningElementOffset.top - $(window).scrollTop();
        const autocompleteRelativeToWindowBottom = $(window).height() - autocompleteRelativeToWindowTop - $positioningElement.outerHeight(false) - JQueryAutocompletePlugin.MENU_FOOTER_HEIGHT;
        const isMenuShowingUp = (autocompleteRelativeToWindowTop > this._getMenuMaxHeight())
            && (this._getMenuMaxHeight() > autocompleteRelativeToWindowBottom);

        let xOffset = 0;

        if (this._options.allowHorizontalShift) {

            const autocompleteRelativeToWindowLeft = positioningElementOffset.left - $(window).scrollLeft();
            const autocompleteRelativeToWindowRight = $(window).width() - autocompleteRelativeToWindowLeft;
            const menuOuterWidth = $ul.outerWidth();
            xOffset = menuOuterWidth < autocompleteRelativeToWindowRight ? 0 : menuOuterWidth - autocompleteRelativeToWindowRight;
        }

        var positionFooter = function (props, feedback) {
            // using overrides setting the css result from position, let's set it :)
            $(this).css(props);

            that._$footer.css("z-index", menuZIndex);

            that._$footer.width($ul.width());
            that._$footer.height(JQueryAutocompletePlugin.MENU_FOOTER_HEIGHT);
            that._$footer.show();

            if (($firstChild.length > 0)) {
                (<any>that._$footer).position({
                    my: "left top-1",
                    at: "left bottom",
                    collision: "none",
                    of: $ul
                });
            } else {
                (<any>that._$footer).position({
                    my: `left ${isMenuShowingUp ? "bottom" : "top"}`,
                    at: `left ${isMenuShowingUp ? "top" : "bottom"}`,
                    collision: "none",
                    of: $positioningElement
                });
            }
        }

        if (isMenuShowingUp) {
            this._$inputElement.autocomplete({
                position: {
                    my: "left bottom",
                    at: `left-${xOffset} top-${JQueryAutocompletePlugin.MENU_FOOTER_HEIGHT}`,
                    collision: "none",
                    of: $positioningElement,
                    using: positionFooter
                }
            });
        } else {
            this._$inputElement.autocomplete({
                position: {
                    my: "left top",
                    at: `left-${xOffset} bottom`,
                    collision: "none",
                    of: $positioningElement,
                    using: positionFooter
                }
            });
        }

        if ($firstChild.length > 0) {
            const contentTop = $firstChild.position().top;
            const $lastChild = $(">:last:visible", $ul);
            const contentBottom = $lastChild.position().top + $lastChild.outerHeight();
            const contentHeight = contentBottom - contentTop;
            const menuHeight = contentHeight <= this._getMenuMaxHeight() ? contentHeight : this._getMenuMaxHeight();
            $ul.height(menuHeight);

            this.afterRender($ul);
            $ul.css("max-height", "").css("overflow", "");
        } else {
            $ul.css("max-height", 0).css("overflow", "hidden");
        }
    }

    private _renderFooter(message: string, additionalCssClass?: string): JQuery {
        if (!this._$footer) {
            this._$footer = $("<div>")
                .addClass(CssClasses.AUTOCOMPLETE_FOOTER);
            if (additionalCssClass) {
                this._$footer.addClass(additionalCssClass);
            }
            this._$footer.appendTo(this._$menuContainer)
                .hide();
        }

        this._$footer.attr("class", CssClasses.AUTOCOMPLETE_FOOTER);
        if (additionalCssClass) {
            this._$footer.addClass(additionalCssClass);
        }

        Accessibility.announce(message, true);

        return this._$footer.text(message);
    }

    private _autocompleteRenderMenu(ul: JQuery, items: SourceResponseItem<TArtifact>[]) {
        const autocomplete = this._getAutocompleteInstance();
        ul.addClass("mention-autocomplete-menu")
            .attr("role", "listbox");

        if (items[0].type === SourceResponseItemType.Suggestion) {
            items.forEach((item) => {
                autocomplete._renderItemData(ul, item);
            });
            this._renderFooter(this._getFooterItemsCountString(items.length), CssClasses.AUTOCOMPLETE_FOOTER_CONTENTS);
        } else {
            this._addFakeAnchor(ul, items[0]);

            if (items[0].type === SourceResponseItemType.Loading) {
                this._renderFooter(MentionResources.AutocompleteLoading, CssClasses.AUTOCOMPLETE_FOOTER_LOADING);
            } else if (items[0].type === SourceResponseItemType.Empty) {
                this._renderFooter(MentionResources.AutocompleteNoSuggestions, CssClasses.AUTOCOMPLETE_NO_ITEMS_FOUND);
            } else if (items[0].type === SourceResponseItemType.Error) {
                this._renderFooter(MentionResources.AutocompleteServerError);
            } else {
                Diag.Debug.fail("Invalid SourceResponseItemType: " + items[0].type);
            }
        }
    }

    private _getFooterItemsCountString(count: number): string {
        if (count === 0) {
            return MentionResources.AutocompleteNoSuggestions;
        }

        const countFormat = count === 1 ? MentionResources.AutocompleteSuggestionsSingular : MentionResources.AutocompleteSuggestionsPlural;
        return Utils_String.format(countFormat, count);
    }

    private _addFakeAnchor(ul: JQuery, item: SourceResponseItem<TArtifact>) {
        var $fakeLi = $("<li>")
            .hide()
            .appendTo(ul)
            .data("ui-autocomplete-item", item);
        $("<a>").appendTo($fakeLi);
    }

    private _autocompleteRenderItem(ul: JQuery, item: SourceResponseItem<TArtifact>) {
        return this.renderSuggestion(ul, item.suggestion)
            .addClass("mention-autocomplete-item")
            .attr("role", "option")
            .attr("aria-selected", "false");
    }

    private _autocompleteOnSource(request: SourceRequest, response: (r: SourceResponseItem<TArtifact>[]) => void) {
        let deferred: JQueryDeferred<MentionAutocomplete.IResultWithTelemetry<{}, Telemetry.IAutocompleteSuggestEvent>> = request.term;
        if (!deferred || !deferred.resolve) {
            deferred = null;
        }
        if (!this._isOpen) {
            //JQuery UI may call us back on the timeout thread even when the mentionable text
            //has been removed and close has been called in autocomplete. If the plugin is closed then force close autocomplete.
            //NOTE: Calling close will force set autocompletes searchCancel property to true.
            this._getAutocompleteInstance().close();
            response(null);
            return;
        }

        var getSuggestionsDone = false;
        this.getSuggestions(this._inputText).done((suggestions) => {
            getSuggestionsDone = true;
            if (suggestions) {
                var responseItems: SourceResponseItem<TArtifact>[];
                if (suggestions.result && suggestions.result.length) {
                    responseItems = suggestions.result.map((item, index): SourceResponseItem<TArtifact> => {
                        return {
                            type: SourceResponseItemType.Suggestion,
                            index: index,
                            suggestion: item,
                            error: null
                        };
                    });
                }
                else {
                    responseItems = [{
                        type: SourceResponseItemType.Empty,
                        index: null,
                        suggestion: null,
                        error: null
                    }];
                }
                if (deferred) {
                    deferred.resolve(suggestions);
                }
                response(responseItems);
            } else {
                var error = new Error("Suggestions is Null");
                if (deferred) {
                    deferred.reject(error);
                }
                response([{
                    type: SourceResponseItemType.Error,
                    index: null,
                    suggestion: null,
                    error: error
                }]);
            }
        }).fail((error) => {
            getSuggestionsDone = true;
            if (deferred) {
                deferred.reject(error);
            }
            response([{
                type: SourceResponseItemType.Error,
                index: null,
                suggestion: null,
                error: error
            }]);
        });

        setTimeout(() => {
            if (!getSuggestionsDone) {
                response([{
                    type: SourceResponseItemType.Loading,
                    index: null,
                    suggestion: null,
                    error: null
                }]);
            }
        }, JQueryAutocompletePlugin.LOADING_DELAY_TIME);
    }

    private _autocompleteOnFocus(event: JQueryEventObject, ui: { item: SourceResponseItem<TArtifact> }) {
        if (ui.item.type === SourceResponseItemType.Suggestion) {
            this._applySuggestionToTextBox(event, ui.item, true);
            ui.item.value = this._$inputElement.val();
            // Necessary to explicitly hide this element because monaco editor doesn't have the jquery ui styles
            // Also, the default jquery ui styles don't work in the monaco editor.
            $(".ui-helper-hidden-accessible").hide()
                .attr("aria-live", "off"); // turn off autocomplete's announce (using ours for consistency, compatibility, up-to-date, and not as buggy)       
        }

        const $ul = this._$menuContainer.find("ul");
        if ($ul && $ul.length) {
            const $textInput = this._getMentionTextArea();
            const $li = $ul.find(".mention-autocomplete-item");

            $li.each((i, elem) => {
                const $option = $(elem);
                if ($option.hasClass("ui-state-focus")) {
                    $option.attr("aria-selected", "true");
                    if ($textInput) {
                        // delay is needed for screen reader to work properly.
                        Utils_Core.delay(this, 0, () => {
                            $textInput.attr("aria-activedescendant", $option.attr("id"));
                        });
                    }
                } else {
                    $option.attr("aria-selected", "false");
                }
            });
        }

        return false;
    }

    private _autocompleteOnSelect(event: JQueryEventObject, ui: { item: SourceResponseItem<TArtifact> }) {
        if (ui.item.type === SourceResponseItemType.Suggestion) {
            this._applySuggestionToTextBox(event, ui.item, false);
        }
        return false;
    }

    private _autocompleteOnOpen(event, ui) {
        const $textInput = this._getMentionTextArea();
        const $ul = $(this._getAutocompleteInstance().menu.element);
        if ($textInput && $ul && $ul.length) {
            const isContentEditable = $textInput.length && $textInput[0].tagName === "DIV"; // content editable should not have aria-expanded
            $textInput.attr({
                "aria-owns": $ul[0].id,
                "aria-expanded": isContentEditable ? null : "true",
                "aria-autocomplete": "list"
            });
        }
    }

    private _autocompleteOnClose(event, ui) {
        const $ul = $(this._getAutocompleteInstance().menu.element);
        if ($ul) {
            this.onClose($ul);
        }
        this._$footer.hide();

        const keyboardEvent = Helpers.tryGetKeyboardEvent(event, 5);
        if (keyboardEvent && keyboardEvent.keyCode === UI.KeyCode.ESCAPE) {
            this._handleAutocompleteReset(event);
        }

        if (this._options.close) {
            this._options.close(event, this._inputText);
        }

        const $textInput = this._getMentionTextArea();
        if ($textInput) {
            const isContentEditable = $textInput.length && $textInput[0].tagName === "DIV"; // content editable should not have aria-expanded
            $textInput.attr({
                "aria-owns": null,
                "aria-autocomplete": null,
                "aria-activedescendant": null,
                "aria-expanded": isContentEditable ? null: "false"
            });
        }
    }
}