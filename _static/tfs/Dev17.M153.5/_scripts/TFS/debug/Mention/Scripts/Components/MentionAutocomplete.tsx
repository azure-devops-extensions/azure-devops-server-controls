import "VSS/LoaderPlugins/Css!Mention/Components/MentionAutocomplete";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Callout } from "OfficeFabric/Callout";
import { autobind, BaseComponent, KeyCodes } from "OfficeFabric/Utilities";
import {
    IMentionAutocompleteProps,
    IMentionAutocomplete,
    IMentionAutocompleteItem
} from "Mention/Scripts/Components/MentionAutocomplete.Types";
import { MentionAutocompleteSuggestions } from "Mention/Scripts/Components/MentionAutocompleteSuggestions";
import { IMentionAutocompleteSuggestions } from "Mention/Scripts/Components/MentionAutocompleteSuggestions.Types";

const DefaultMinimalWidth: number = 300;
const DefaultKeyboardEvent: string = "keydown";

export interface IMentionAutocompleteState {
    isVisible: boolean;
}

/**
 * Mention autocomplete component used by mention autocomplete plugins to display the suggestions in the callout menu
 */
export class MentionAutocomplete<T> extends BaseComponent<IMentionAutocompleteProps<T>, IMentionAutocompleteState> implements IMentionAutocomplete<T> {
    private _inputComponent: HTMLInputElement;
    private _suggestionsComponent: IMentionAutocompleteSuggestions<T>;

    constructor(props?: IMentionAutocompleteProps<T>) {
        super(props);

        this._inputComponent = this.props.getInputElement() as HTMLInputElement;

        this.state = {
            isVisible: false
        };
    }

    public render(): JSX.Element {
        return (this.isOpen() && <Callout
            className="mention-autocomplete-component-callout"
            target={this._inputComponent}
            isBeakVisible={false}
            calloutWidth={this._getWidth()}
            onDismiss={this._onCalloutDismiss}
        >
            <MentionAutocompleteSuggestions
                ref={(suggestions) => this._suggestionsComponent = suggestions}
                onRenderSuggestionItem={this._onRenderItem}
                onSuggestionClick={this._onSuggestionClick}
                getInputElement={this.props.getInputElement}
                showSearchButton={true}
                onSearchEnabled={this.props.onSearchEnabled} />
        </Callout>);
    }

    private _select(event?: KeyboardEvent | MouseEvent, item?: IMentionAutocompleteItem<T>, index?: number, isSearchEnabled?: boolean): void {
        const { onItemSelected } = this.props;
        onItemSelected && onItemSelected(event, item, index, isSearchEnabled);
    }

    private _onKeydown(event: KeyboardEvent): void {
        if (event.altKey || event.charCode) {
            // Ignores specific keys combos
            return;
        }

        switch (event.keyCode) {
            case KeyCodes.escape:
                this.close(event);
                break;

            case KeyCodes.tab:
            case KeyCodes.enter:
                const currentSuggestion = this._suggestionsComponent.getCurrentSuggestion();
                const currentIndex = this._suggestionsComponent.getCurrentIndex();
                const isSearchEnabled = this._suggestionsComponent.isSearchEnabled();
                if (currentSuggestion) {
                    this._select(event, currentSuggestion, currentIndex, isSearchEnabled);
                }
                else {
                    this._suggestionsComponent.tryEnableSearch();
                }
                break;

            case KeyCodes.up:
                this._suggestionsComponent.previousSuggestion();
                break;

            case KeyCodes.down:
                this._suggestionsComponent.nextSuggestion();
                break;
        }
    }

    @autobind
    private _onCalloutDismiss(event?: Event | React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void {
        this.close(event instanceof Event ? event : event && event.nativeEvent);
    }

    @autobind
    private _onRenderItem(item: IMentionAutocompleteItem<T>): JSX.Element {
        const { onRenderItem } = this.props;
        return onRenderItem && onRenderItem(item);
    }

    @autobind
    private _onSuggestionClick(event?: React.MouseEvent<HTMLElement>, item?: IMentionAutocompleteItem<T>, index?: number, isSearchEnabled?: boolean): void {
        this._select(event && event.nativeEvent, item, index, isSearchEnabled);
    }

    private _getWidth(): number {
        const minimalWidth = this.props.minimalWidth || DefaultMinimalWidth;
        const pinnedElementWidth = this._inputComponent.offsetWidth;
        const fixedWidth = this.props.width;

        return fixedWidth || Math.max(pinnedElementWidth, minimalWidth);
    }

    public open(event?: Event): void {
        this.setState({ isVisible: true });

        if (this.props.onOpen) {
            this.props.onOpen(event);
        }
    }

    public close(event?: Event): void {
        this.setState({
            isVisible: false
        });

        if (this.props.onClose) {
            this.props.onClose(event);
        }
    }

    public toggle(event?: Event): void {
        if (this.isOpen()) {
            this.close(event);
        }
        else {
            this.open(event);
        }
    }

    public isOpen(): boolean {
        return this.state.isVisible;
    }

    public updateSuggestions(suggestionsPromise: (isSearchEnabled: boolean) => PromiseLike<IMentionAutocompleteItem<T>[]>): void {
        if (this.state.isVisible) {
            this._suggestionsComponent.updateSuggestions(suggestionsPromise);
        }
    }

    public handleKeyboardEvent(event: KeyboardEvent): void {
        if (this.state.isVisible && event && event.type === DefaultKeyboardEvent) {
            this._onKeydown(event);
        }
    }

    public disableSearch(): void {
      this._suggestionsComponent.disableSearch();
    }
}

export function createMentionAutocomplete<T>(container: Element, props: IMentionAutocompleteProps<T>): IMentionAutocomplete<T> {
    let dropdownRef: IMentionAutocomplete<T>;
    ReactDOM.render(<MentionAutocomplete {...props} ref={(dropdown: MentionAutocomplete<T>) => dropdownRef = dropdown} />, container);
    return dropdownRef;
}

export function disposeMentionAutocomplete(container: Element): void {
    ReactDOM.unmountComponentAtNode(container);
}