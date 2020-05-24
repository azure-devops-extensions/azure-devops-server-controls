import { createMentionAutocomplete, disposeMentionAutocomplete } from "Mention/Scripts/Components/MentionAutocomplete";
import { IMentionAutocomplete, IMentionAutocompleteItem, IMentionAutocompleteProps } from "Mention/Scripts/Components/MentionAutocomplete.Types";
import { IAutocompletePlugin, IAutocompletePluginOptions, IAutocompleteReplacement, IInputText, IRange, IResultWithTelemetry, ISearchResult } from "Mention/Scripts/TFS.Mention.Autocomplete";
import { CustomerIntelligenceConstants, IAutocompleteSuggestEvent } from "Mention/Scripts/TFS.Social.Telemetry";
import { IWorkItem } from "Mention/Scripts/WorkItem/WorkItemMentionModels";
import * as Utilities from "Mention/Scripts/WorkItem/WorkItemMentionUtilities";
import { WorkItemProvider } from "Mention/Scripts/WorkItem/WorkItemProvider";
import { autobind } from "OfficeFabric/Utilities";
import { WorkItemTypeIcon } from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import * as React from "react";
import { publishErrorToTelemetry } from "VSS/Error";
import "VSS/LoaderPlugins/Css!Mention/WorkItem/WorkItemAutocompletePlugin";
import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { equals } from "VSS/Utils/Core";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

export interface IWorkItemAutocompletePluginOptions extends IAutocompletePluginOptions {
    wiql?: string;
    workItemIdsToIgnore?: number[];
}

export class WorkItemAutocompletePlugin implements IAutocompletePlugin<IWorkItemAutocompletePluginOptions> {
    private _workItemProvider: WorkItemProvider;
    private _mentionAutocomplete: IMentionAutocomplete<ISearchResult<IWorkItem>>;
    private _options: IWorkItemAutocompletePluginOptions;
    private _inputText: IInputText;
    private _isOpen: boolean;
    private _autocompleteContainer: Element;

    constructor(options?: IWorkItemAutocompletePluginOptions) {
        this._options = options || {};
    }

    public initialize() {
        const autocompleteProps: IMentionAutocompleteProps<ISearchResult<IWorkItem>> = {
            getInputElement: this._getPositioningElement,
            width: this._options.isMenuWidthOverridable && this._options.menuWidth ? this._options.menuWidth : undefined,
            onClose: (event?: Event) => {
                this._isOpen = false;
                if (this._options.close) {
                    this._options.close(this._convertToJQueryEvent(event), this._inputText);
                }
            },
            onRenderItem: this._onRenderSuggestion,
            onItemSelected: this._select,
            showSearchButton: true,
            onSearchEnabled: () => {
                const startTime = new Date().getTime();
                return this._getSuggestions(this._inputText, true).then((suggestions) => {
                    publishEvent(new TelemetryEventData(
                        CustomerIntelligenceConstants.MENTION_AREA,
                        CustomerIntelligenceConstants.AUTOCOMPLETE_SUGGEST_EVENT,
                        {
                            pluginName: this.getPluginName(),
                            suggestionsCount: `${suggestions.length}`,
                            durationInMSec: `${new Date().getTime() - startTime}`,
                            isSearchEnabled: true
                        }));
                    return suggestions;
                });
            }
        };

        this._mentionAutocomplete = createMentionAutocomplete(this._getMenuContainer(), autocompleteProps);
    }

    @autobind
    private _getPositioningElement(): HTMLElement {
        const positioningElement: JQuery = $.isFunction(this._options.positioningElement)
            ? (this._options.positioningElement as () => JQuery)()
            : this._options.positioningElement as JQuery;

        return positioningElement && positioningElement.length && positioningElement[0];
    }

    @autobind
    private _onRenderSuggestion(item: IMentionAutocompleteItem<ISearchResult<IWorkItem>>): JSX.Element {
        const { highlighted, original } = item.data;

        const workItemTypeAndIdHTML = {
            __html: Utilities.getWorkItemTypeWithIdString(highlighted.workItemType, highlighted.id)
        };

        const workItemTitleHTML = {
            __html: highlighted.title
        }

        return (
            <div className="work-item-mention-autocomplete-item-container">
                <WorkItemTypeIcon
                    className="work-item-type-icon"
                    workItemTypeName={original.workItemType}
                    projectName={null}
                    customInput={original.colorAndIcon}
                    iconAccessibilityOptions={{ ariaAttributes: {} }}
                />
                <span className="work-item-type-name-and-id" dangerouslySetInnerHTML={workItemTypeAndIdHTML} />
                <span className="content-splitter">:</span>
                <TooltipHost hostClassName="work-item-title-wrapper" content={original.title} overflowMode={TooltipOverflowMode.Self}>
                    <span className="work-item-title" dangerouslySetInnerHTML={workItemTitleHTML} />
                </TooltipHost>
            </div>
        );
    }

    @autobind
    private _select(event?: KeyboardEvent | MouseEvent, item?: IMentionAutocompleteItem<ISearchResult<IWorkItem>>, index?: number, isSearchEnabled?: boolean) {
        if (item) {
            const replacement: IAutocompleteReplacement = {
                getPlainText: () => this._getReplacementText(this._inputText, item),
                getHtml: () => this._getReplacementHtml(item),
            }

            const jQueryEvent = this._convertToJQueryEvent(event);

            if (this._options.select) {
                this._options.select(jQueryEvent, replacement, {
                    selectionIndex: index && index.toString(),
                    isSearchEnabled: isSearchEnabled
                });
            }

            this.close(jQueryEvent, this._inputText);
        }
    }

    public getPluginName(): string {
        return "WorkItemAutocompletePlugin";
    }

    public prefetch() {
        this._getWorkItemProvider().prefetch();
    }

    public canOpen(inputText: IInputText): IRange {
        const matches = Utilities.mentionPattern(this._isOpen, true).exec(inputText.textBeforeSelection);
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

    public open(event: JQueryEventObject, inputText: IInputText): void {
        this._inputText = inputText;
        this._isOpen = true;
    }

    public suggest(event: JQueryEventObject, inputText: IInputText): PromiseLike<IResultWithTelemetry<{}, IAutocompleteSuggestEvent>> {
        const promise = new Promise<IResultWithTelemetry<{}, IAutocompleteSuggestEvent>>((resolve, reject) => {
            if (!this._mentionAutocomplete.isOpen() || !equals(this._inputText, inputText)) {
                this._inputText = inputText;

                this._toggleAutocomplete(event && event.originalEvent);

                if (inputText.textBeforeSelection && inputText.textBeforeSelection === '#') {
                  this._mentionAutocomplete.disableSearch();
                }

                this._mentionAutocomplete.updateSuggestions((isSearchEnabled: boolean) => this._getSuggestions(inputText, isSearchEnabled)
                    .then((suggestions: IMentionAutocompleteItem<ISearchResult<IWorkItem>>[]) => {
                        resolve({
                            result: void 0,
                            telemetry: {
                                suggestionsCount: `${suggestions.length}`,
                                isSearchEnabled
                            }
                        });
                        return suggestions;
                    }, (error) => {
                        reject(error);
                        throw error;
                    }));
            } else {
                // No op if the input text not changed
                resolve({
                    result: void 0,
                    telemetry: {}
                });
            }
        });

        return promise;
    }

    private _getReplacementText(autocompleteText: IInputText, selectedItem: IMentionAutocompleteItem<ISearchResult<IWorkItem>>): IInputText {
        if (!selectedItem) {
            return;
        }

        const matches = Utilities.mentionPattern(this._isOpen, true).exec(autocompleteText.textBeforeSelection);
        const matchedMentionIndex = matches.index + matches[1].length + 1;
        const beforeSelection = autocompleteText.textBeforeSelection.substr(0, matchedMentionIndex);

        let selection = selectedItem.key;
        if (!Utilities.AfterMentionPattern.exec(autocompleteText.textAfterSelection)) {
            selection += " ";
        }

        return {
            textBeforeSelection: beforeSelection + selection,
            textInSelection: "",
            textAfterSelection: autocompleteText.textAfterSelection
        };
    }

    private _getReplacementHtml(selectedItem: IMentionAutocompleteItem<ISearchResult<IWorkItem>>): string {
        const selectedWorkItem = selectedItem.data.original;
        return Utilities.createWorkItemMentionHtml(selectedWorkItem.workItemType, selectedWorkItem.id, selectedWorkItem.title);
    }

    public close(event: JQueryEventObject, inputText: IInputText) {
        if (!this._isOpen) {
            return;
        }

        this._inputText = inputText;
        this._mentionAutocomplete.close(event && event.originalEvent);
    }

    public handle(event: JQueryEventObject): boolean | void {
        // This is where we want to override any event triggers within the mention
        if (event && event.originalEvent instanceof KeyboardEvent) {
            this._mentionAutocomplete.handleKeyboardEvent(event.originalEvent);
        }
    }

    public dispose() {
        disposeMentionAutocomplete(this._getMenuContainer());

        this._mentionAutocomplete = null;
        this._autocompleteContainer = null;
        this._options = null;
    }

    private _getMenuContainer(): Element {
        if (!this._autocompleteContainer) {
            const parent = this._options.menuContainer
                ? this._options.menuContainer()
                : $(document.body);

            const containerClassName = "work-item-autocomplete-plugin-picker-container";
            const containerLookup = parent.find(`.${containerClassName}`);
            if (containerLookup.length <= 0) {
                this._autocompleteContainer = $("<div />").addClass(containerClassName).appendTo(parent)[0];
            } else {
                this._autocompleteContainer = containerLookup[0];
            }
        }

        return this._autocompleteContainer;
    }

    private _toggleAutocomplete(event?: Event): void {
        if (this._isOpen !== this._mentionAutocomplete.isOpen()) {
            this._mentionAutocomplete.toggle(event);
        }
    }

    private _getWorkItemProvider(): WorkItemProvider {
        if (!this._workItemProvider) {
            this._workItemProvider = new WorkItemProvider({ wiql: this._options.wiql, workItemIdsToIgnore: this._options.workItemIdsToIgnore });
        }
        return this._workItemProvider;
    }

    private _getSuggestions(inputText: IInputText, isSearchOnServer?: boolean): Promise<IMentionAutocompleteItem<ISearchResult<IWorkItem>>[]> {
        const promise = new Promise<IMentionAutocompleteItem<ISearchResult<IWorkItem>>[]>((resolve, reject) => {
            let searchResultPromise: PromiseLike<ISearchResult<IWorkItem>[]>;
            const numberMatches = Utilities.NumberMentionPattern.exec(inputText.textBeforeSelection);
            const termMatches = Utilities.mentionPattern(this._isOpen, true).exec(inputText.textBeforeSelection);

            if (isSearchOnServer) {
                searchResultPromise = this._getWorkItemProvider().searchOnServer(termMatches ? termMatches[2] : "");
            }
            else if (numberMatches) {
                searchResultPromise = this._getWorkItemProvider().searchById(numberMatches[2]);
            }
            else {
                searchResultPromise = this._getWorkItemProvider().search(termMatches ? termMatches[2] : "");
            }

            searchResultPromise.then((result: ISearchResult<IWorkItem>[]) => {
                if (result) {
                    const suggestions = result.map((value: ISearchResult<IWorkItem>) => {
                        return {
                            key: value.original.id.toString(),
                            data: value
                        };
                    }) as IMentionAutocompleteItem<ISearchResult<IWorkItem>>[];
                    resolve(suggestions);
                }
                else {
                    publishErrorToTelemetry(new Error("WorkItemAutocompletePlugin: search suggestions result is null."));
                    resolve([]);
                }
            }, (error) => reject(error));
        });

        return promise;
    }

    private _convertToJQueryEvent(event?: Event): JQueryEventObject {
        return event && $.Event(event.type, { originalEvent: event });
    }
}