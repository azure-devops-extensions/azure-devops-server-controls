import * as React from "react";
import * as Utils_Array from "VSS/Utils/Array";
import { localeFormat } from "VSS/Utils/String";
import { Suggestions, SuggestionsController, ISuggestionModel } from "OfficeFabric/Pickers";
import { autobind, BaseComponent } from "OfficeFabric/Utilities";
import {
    IMentionAutocompleteSuggestionsProps,
    IMentionAutocompleteSuggestions
} from "Mention/Scripts/Components/MentionAutocompleteSuggestions.Types";
import { IMentionAutocompleteItem } from "Mention/Scripts/Components/MentionAutocomplete.Types";
import { MentionAutocompleteFooter } from "Mention/Scripts/Components/MentionAutocompleteFooter";
import * as Resources from "Mention/Scripts/Resources/TFS.Resources.Mention";
import { DelayedFunction } from "VSS/Utils/Core";

const DefaultUpdateSuggestionsDelay: number = 300;
const SearchButtonId: string = "sug-search-button";

export interface IMentionAutocompleteSuggestionsState<T> {
    suggestions: ISuggestionModel<IMentionAutocompleteItem<T>>[];
    statusText: string;
    isSearchEnabled: boolean;
    isSearchButtonSelected: boolean;
}

export class MentionAutocompleteSuggestions<T> extends BaseComponent<IMentionAutocompleteSuggestionsProps<T>, IMentionAutocompleteSuggestionsState<T>> implements IMentionAutocompleteSuggestions<T> {
    private _inputComponent: HTMLInputElement;
    private _suggestionStore: SuggestionsController<IMentionAutocompleteItem<T>>;
    private _debouncedUpdateSuggestions: (promise: (isSearchEnabled: boolean) => PromiseLike<IMentionAutocompleteItem<T>[]>) => void;
    private _updateCounter = 0;

    constructor(props?: IMentionAutocompleteSuggestionsProps<T>) {
        super(props);

        this._inputComponent = this.props.getInputElement() as HTMLInputElement;
        this._suggestionStore = new SuggestionsController<IMentionAutocompleteItem<T>>();
        this._debouncedUpdateSuggestions = this._async.debounce(this._updateSuggestionsInternal, DefaultUpdateSuggestionsDelay);

        this.state = {
            suggestions: this._suggestionStore.getSuggestions(),
            statusText: Resources.AutocompleteLoading,
            isSearchEnabled: false,
            isSearchButtonSelected: false
        };
    }

    public render(): JSX.Element {
        return <div>
            {this.state.suggestions && this.state.suggestions.length > 0 ? <Suggestions
                className="mention-autocomplete-component-suggestions"
                suggestions={this.state.suggestions}
                onRenderSuggestion={this._onRenderSuggestion}
                onSuggestionClick={this._onSuggestionClick}
                isResultsFooterVisible={false} /> :
                null
            }
            <MentionAutocompleteFooter
                statusText={this.state.statusText}
                searchButtonId={SearchButtonId}
                showSearchButton={this._shouldShowSearchButton()}
                hightlightSearchButton={this.state.isSearchButtonSelected}
                onSearchButtonClick={this._onSearchEnabled}
                getInputElement={this.props.getInputElement} />
        </div>;
    }

    public componentDidMount() {
        this._inputComponent.setAttribute("aria-owns", "suggestion-list");
        this._inputComponent.setAttribute("aria-autocomplete", "list");
        this._inputComponent.setAttribute("aria-expanded", "true");
        this._updateAriaActiveDescendant();
    }

    public componentWillUnmount() {
        this._inputComponent.setAttribute("aria-owns", null);
        this._inputComponent.setAttribute("aria-autocomplete", null);
        this._inputComponent.setAttribute("aria-activedescendant", null);
        this._inputComponent.setAttribute("aria-expanded", "false");
    }

    @autobind
    private _onRenderSuggestion(item: IMentionAutocompleteItem<T>, suggestionItemProps?: any): JSX.Element {
        const { onRenderSuggestionItem } = this.props;
        return onRenderSuggestionItem && onRenderSuggestionItem(item);
    }

    @autobind
    private _onSuggestionClick(event?: React.MouseEvent<HTMLElement>, item?: IMentionAutocompleteItem<T>, index?: number): void {
        const { onSuggestionClick } = this.props;
        onSuggestionClick && onSuggestionClick(event, item, index, this.state.isSearchEnabled);
    }

    @autobind
    private _onSearchEnabled(): void {
        this.setState({
            isSearchEnabled: true,
            isSearchButtonSelected: false,
            statusText: Resources.AutocompleteLoading,
        });

        const { onSearchEnabled } = this.props;
        if (onSearchEnabled) {
            this._debouncedUpdateSuggestions(onSearchEnabled);
        }
    }
    
    public disableSearch(): void {
      this.setState({ isSearchEnabled: false });
    }

    private _getLastIndex(): number {
        return this._suggestionStore.getSuggestions().length - 1;
    }

    private _isLastSuggestion(): boolean {
        return this._suggestionStore.currentIndex === this._getLastIndex();
    }

    private _isFirstSuggestion(): boolean {
        return this._suggestionStore.currentIndex === 0;
    }

    private _updateAriaActiveDescendant(): void {
        const currentIndex = this.getCurrentIndex();
        const activeDescendant = currentIndex > -1 ?
            'sug-' + currentIndex :
            this.state.isSearchButtonSelected ? SearchButtonId : undefined;
        this._inputComponent.setAttribute("aria-activedescendant", activeDescendant);
    }

    private _shouldShowSearchButton(): boolean {
        return this.props.showSearchButton
            && !this.state.isSearchEnabled
            && !!this._inputComponent.value;
    }

    private _selectSearchButton(): void {
        this._suggestionStore.deselectAllSuggestions();
        this.setState({
            suggestions: this._suggestionStore.getSuggestions(),
            isSearchButtonSelected: true
        });
    }

    private _getSuggestionsListStatusText(suggestionsCount: number): string {
        if (isNaN(suggestionsCount) || suggestionsCount <= 0) {
            return Resources.AutocompleteNoSuggestions;
        }
        else if (suggestionsCount === 1) {
            return Resources.AutocompleteSuggestionsSingular;
        }
        else {
            return localeFormat(Resources.AutocompleteSuggestionsPlural, suggestionsCount);
        }
    }

    private _delayLoadingMessage = new DelayedFunction(null, 1000, "", () => {
        this.setState({
            statusText: Resources.AutocompleteLoading
        });
    });

    private _updateSuggestionsInternal = (suggestionsPromise: (isSearchEnabled: boolean) => PromiseLike<IMentionAutocompleteItem<T>[]>): void => {
        const counterSnapshot = ++this._updateCounter;
        this._delayLoadingMessage.start();
        const finishLoading = (suggestions: IMentionAutocompleteItem<T>[], error?: Error) => {
            if (this._updateCounter !== counterSnapshot) {
                // Promises finished out of order
                return;
            }
            this._delayLoadingMessage.cancel();
            this._suggestionStore.updateSuggestions(suggestions, 0);

            const selectSearchButton = this._shouldShowSearchButton() && (suggestions.length <= 0 || this.state.isSearchButtonSelected)
            if (selectSearchButton) {
                this._suggestionStore.deselectAllSuggestions();
            }

            this.setState({
                suggestions: this._suggestionStore.getSuggestions(),
                statusText: error && error.message || this._getSuggestionsListStatusText(suggestions && suggestions.length),
                isSearchButtonSelected: selectSearchButton
            });

            this._updateAriaActiveDescendant();
        };

        suggestionsPromise(this.state.isSearchEnabled).then((suggestions) => {
            finishLoading(suggestions);
        }, (error) => {
            finishLoading([], error);
        });
    }

    public getCurrentSuggestion(): IMentionAutocompleteItem<T> {
        const currentSuggestion = this._suggestionStore.getCurrentItem();
        return !this.state.isSearchButtonSelected && currentSuggestion && currentSuggestion.item;
    }

    public getCurrentIndex(): number {
        const currentIndex = this._suggestionStore.currentIndex;
        return !this.state.isSearchButtonSelected && currentIndex;
    }

    public nextSuggestion(): void {
        if (this._isLastSuggestion() && this._shouldShowSearchButton()) {
            this._selectSearchButton();
        }
        else if (this.state.isSearchButtonSelected) {
            this._suggestionStore.setSelectedSuggestion(0);
            this.setState({
                suggestions: this._suggestionStore.getSuggestions(),
                isSearchButtonSelected: false
            });
        }
        else if (this._suggestionStore.nextSuggestion()) {
            this.setState({
                suggestions: this._suggestionStore.getSuggestions()
            });
        }

        this._updateAriaActiveDescendant();
    }

    public previousSuggestion(): void {
        if (this._isFirstSuggestion() && this._shouldShowSearchButton()) {
            this._selectSearchButton();
        }
        else if (this.state.isSearchButtonSelected) {
            const lastIndex = this._getLastIndex();
            this._suggestionStore.setSelectedSuggestion(lastIndex);
            this.setState({
                suggestions: this._suggestionStore.getSuggestions(),
                isSearchButtonSelected: false
            });
        }
        else if (this._suggestionStore.previousSuggestion()) {
            this.setState({
                suggestions: this._suggestionStore.getSuggestions()
            });
        }

        this._updateAriaActiveDescendant();
    }

    public updateSuggestions(suggestionsPromise: (isSearchEnabled: boolean) => PromiseLike<IMentionAutocompleteItem<T>[]>): void {
        if (!suggestionsPromise) {
            return;
        }
        this._debouncedUpdateSuggestions(suggestionsPromise);
    }

    public tryEnableSearch(): boolean {
        const canEnableSearch = this._shouldShowSearchButton() && this.state.isSearchButtonSelected;

        if (canEnableSearch && !this.state.isSearchEnabled) {
            this._onSearchEnabled();
        }

        return this.state.isSearchEnabled;
    }

    public isSearchEnabled(): boolean {
        return this.state.isSearchEnabled;
    }
}