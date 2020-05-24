import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { Label } from "OfficeFabric/Label";
import { ISearchInputProps, ISearchInput } from "Search/Scenarios/Shared/Components/SearchInput/SearchInput.Props";
import { IFocusable, ISearchHelpComponentProps } from "Search/Scenarios/Shared/Components/SearchHelp/SearchHelp.Props";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { FocusZone, FocusZoneDirection } from 'OfficeFabric/FocusZone';
import { delay } from "VSS/Utils/Core";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/SearchInput/SearchInput";

export interface ISearchInputState {
    text: string;
    focused: boolean;
}

const helpCalloutMinWidth = 255;

export class SearchInput extends React.Component<ISearchInputProps, ISearchInputState> implements ISearchInput {
    private _searchBoxContainer: HTMLElement;
    private _textBox: HTMLInputElement;
    private _searchHelp: IFocusable;
    private _isFocused = true;

    constructor(props: ISearchInputProps) {
        super(props);
        this.state = { text: props.defaultSearchText, focused: false };
    }

    /**
     * Render search box.
     */
    public render(): JSX.Element {
        const { contextLabel, inputAriaLabel } = this.props;
        const helpElement: React.ReactElement<ISearchHelpComponentProps> = this.props.children ? React.Children.only(this.props.children) : undefined;
        const showHelp = this.props.showHelp && !!helpElement;
        const helpCalloutWidth = this._searchBoxContainer ? Math.max(helpCalloutMinWidth, this._searchBoxContainer.offsetWidth) : helpCalloutMinWidth;
        const showclearIcon = this.state.text && this.state.focused;
        const { placeholderText } = this.props;

        return (
            <div className="search-inputBoxLarge"
                role="search"
                onFocus={this.onInputContainerFocused}>
                <FocusZone
                    direction={FocusZoneDirection.horizontal}
                    className={"flex"}
                    onBlur={this.onBlur}>
                    {
                        contextLabel &&
                        <Label className="search-context--label">{contextLabel}</Label>
                    }
                    <div
                        className="input--container"
                        ref={(searchBoxContainer) => { this._searchBoxContainer = searchBoxContainer }}
                        aria-label={Resources.SearchInputContainerLabel}>
                        <div className="searchBox">
                            <input ref={(input) => { this._textBox = input }}
                                aria-label={inputAriaLabel}
                                className="input-box"
                                spellCheck={false}
                                value={this.state.text}
                                placeholder={placeholderText}
                                onKeyDown={this._onKeyDown}
                                onClick={this._onShowHelp}
                                onFocus={this._onShowHelp}
                                onChange={this._onChange} />
                            {
                                showclearIcon &&
                                <span className="bowtie-icon bowtie-edit-remove remove-icon"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={this._onRemoveClick}
                                    onClick={this._onRemoveClick}
                                    aria-label={Resources.ClearTextButtonAriaLabel} />
                            }
                        </div>
                        <span className="search-icon bowtie-icon bowtie-search"
                            role="button"
                            aria-label={Resources.SearchAriaLabel}
                            tabIndex={0}
                            onKeyDown={(evt?: React.KeyboardEvent<HTMLElement>) =>
                                evt.keyCode === 13 /* enter */ && this._doSearch(this.openInNewTab(evt))
                            }
                            onClick={(evt: React.MouseEvent<HTMLElement>) => this._doSearch(this.openInNewTab(evt))} />
                    </div>
                </FocusZone>
                {
                    showHelp &&
                    <Callout
                        onDismiss={this._onDismiss}
                        className="search-help-callout"
                        doNotLayer={true}
                        beakWidth={0}
                        calloutWidth={helpCalloutWidth}
                        directionalHint={DirectionalHint.bottomLeftEdge}
                        target={this._textBox}>
                        {
                            React.cloneElement(
                                helpElement as any,
                                {
                                    componentRef: ((elem: IFocusable) => {
                                        if (elem) {
                                            this._searchHelp = elem;
                                        }
                                    }),
                                    searchInput: this
                                }
                            )
                        }
                    </Callout>
                }
            </div>
        );
    }

    /**
     * Fetch the dropdown control for the current search entity and append it to the dropdown container,
     * whenever MainSearchBox is rendered because of changes in SearchProvidersStore.
     * @param newProps
     */
    public componentWillReceiveProps(newProps: ISearchInputProps): void {
        if (newProps.defaultSearchText !== this.props.defaultSearchText) {
            this.setState({ text: newProps.defaultSearchText || "" });
        }
    }

    public updateText(textToUpdate: string, replace?: boolean): void {
        const { text } = this.state;
        if (replace) {
            this._replaceText(textToUpdate);
        }
        else {
            this._replaceText(`${text} ${textToUpdate}`);
        }
    }

    public getText(): string {
        return this.state.text;
    }

    private onInputContainerFocused = (): void => {
        this._isFocused = true;
    }

    private onBlur = (): void => {
        this._isFocused = false;
        // It is possible that focus shift is happening between the elements of this control only. 
        // Thus we verify it with isFocussed before calling onEditingCancelled
        // Following snippet is taken from PathExplorerCombobox.tsx
        delay(this, 0, () => {
            if (!this._isFocused) {
                this.setState({ focused: false });
            }
        });
    }

    private _replaceText = (textToReplace: string): void => {
        this._inputChanged(textToReplace, textToReplace.length);
    }

    private _onChange = (evt?: React.ChangeEvent<HTMLInputElement>): void => {
        const text = evt.target.value;
        this._inputChanged(text, this.getCaretPosition(evt.target));
    }

    private _onRemoveClick = (evt): void => {
        if (evt.type === "click" || evt.keyCode === 13 /* enter */ || evt.keyCode === 32 /* space */) {
            this._inputChanged("", 0);

            const { onRemoveText } = this.props;
            if (onRemoveText) {
                onRemoveText();
            }
        }
    }

    private _onKeyDown = (evt?: React.KeyboardEvent<HTMLInputElement>): void => {
        if (evt.keyCode === 13 /* enter */) {
            this._doSearch(this.openInNewTab(evt));
        }
        else if (evt.keyCode === 27 /* escape */) {
            this._onDismiss();
        }
        else if (evt.keyCode === 40 /* down */ && this._searchHelp) {
            this._searchHelp.focus();
        }
    }

    private _doSearch = (openInNewTab: boolean): void => {
        let { onExecuteSearch } = this.props;
        const { text } = this.state;
        if (text && text.trim() !== "" && onExecuteSearch) {
            onExecuteSearch(text, openInNewTab);
        }
    }

    private _inputChanged(text: string, caretPos: number): void {
        const { onInputChange } = this.props;

        this.setState({ text });

        if (onInputChange) {
            onInputChange(text, caretPos);
        }

        if (this._textBox) {
            this._textBox.focus();
        }
    }

    private _onDismiss = (): void => {
        const { onDismissHelp } = this.props;
        if (onDismissHelp) {
            onDismissHelp();
        }
    }

    private _onShowHelp = (): void => {
        const { onShowHelp } = this.props;
        if (onShowHelp) {
            onShowHelp();
        }

        this._isFocused = true;
        this.setState({ focused: true });
    }

    private getCaretPosition(inputElement: HTMLInputElement): number {
        let position = 0;
        const selection = (document as any).selection;
        const ieInputElement = inputElement;
        // Firefox support
        if ('selectionStart' in inputElement) {
            position = inputElement.selectionStart;
        }
        else if (selection && selection.createRange) {
            // IE Support
            ieInputElement.focus();

            const sel = selection.createRange(),
                selLength = sel.text.length;

            sel.moveStart('character', -ieInputElement.value.length);
            position = sel.text.length - selLength;
        }

        return position;
    }

    private openInNewTab = (evt: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>): boolean => {
        return evt.ctrlKey && !evt.altKey;
    }
}