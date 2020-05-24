import * as React from "react";
import * as _TreeStore from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { KeyCodes } from "OfficeFabric/Utilities";
import { Callout, DirectionalHint } from "OfficeFabric/Callout";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { ITreeFilterProps, ContentLoadState, IComboBox } from "Search/Scenarios/Shared/Components/TreeFilter/TreeFilter.Props";
import { TreeDropdown } from "Search/Scenarios/Shared/Components/TreeFilter/TreeDropdown";
import { normalizePath, getActiveDescendantIndex } from "Search/Scenarios/Shared/Components/TreeFilter/TreeUtils";
import { ComboBox } from "Search/Scenarios/Shared/Components/TreeFilter/ComboBox";
import { DelayedFunction, delay } from "VSS/Utils/Core";
import { announce } from "VSS/Utils/Accessibility";
import { SearchType } from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/TreeFilter/TreeFilter";

export enum Mode {
    None,
    Editing,
    Navigating
}

export interface IEditableTreeFilterState {
    mode: Mode;

    activeDescendantIndex: number;

    textBoxInput: string;

    searchInProgress: boolean;
}

export class EditableTreeFilter extends React.Component<ITreeFilterProps, IEditableTreeFilterState> {
    private comboBox: IComboBox;
    private root: HTMLElement;
    private searchInProgressSpinnerDelayFn: DelayedFunction;

    constructor(props: ITreeFilterProps) {
        super(props);
        const { defaultPath, items } = props;
        this.state = this._getState(props, defaultPath, Mode.None);
    }

    public render(): JSX.Element {
        const {
            activeDescendantIndex,
            mode,
            textBoxInput,
            searchInProgress
        } = this.state,
            {
                contentLoadState,
                enabled,
                searchable,
                label,
                searchBoxClearTextAriaLabel,
                applyButtonAriaLabel,
                searchTextPlaceholder,
                items,
                calloutProps,
                isTreeDropdownActive
            } = this.props;

        const isLoading = contentLoadState === ContentLoadState.Loading,
            showBusy = searchInProgress && contentLoadState === ContentLoadState.LoadSuccess;

        const comboBoxText = activeDescendantIndex < 0 ||
            !(mode & Mode.Navigating) ||
            items.length === 0
            ? textBoxInput
            : items[activeDescendantIndex].fullName;

        return (
            <div className="tree-control-root"
                ref={root => this.root = root}>
                <ComboBox
                    componentRef={comboBox => this.comboBox = comboBox}
                    editable={true}
                    enabled={enabled}
                    comboBoxLabel={label}
                    showBusy={showBusy}
                    clearIconAriaLabel={searchBoxClearTextAriaLabel}
                    dropdownActive={isTreeDropdownActive}
                    applyButtonAriaLabel={applyButtonAriaLabel}
                    placeholder={searchTextPlaceholder}
                    comboBoxText={comboBoxText}
                    disabledInfoCalloutProps={calloutProps}
                    onTextChanged={this._onInputTextChange}
                    onComboBoxClick={this._onFocusComponent}
                    onInputFocus={this._onFocusComponent}
                    onApplyText={this._onApplyPath}
                    onClearText={this._onRemoveClick}
                    onInputKeyDown={this._onTextBoxKeyDown}
                    onChevronClick={this._openTreeDropdown} />
                {
                    isTreeDropdownActive &&
                    <Callout
                        directionalHint={DirectionalHint.bottomLeftEdge}
                        isBeakVisible={false}
                        onDismiss={() => this._closeDropdown(true)}
                        target={this.root}>
                        {
                            !isLoading ? (
                                <TreeDropdown
                                    {...this.props}
                                    onGetFooterMessage={this.onGetFooterMessage}
                                    highlightText={this.state.textBoxInput}
                                    activeDescendantIndex={activeDescendantIndex}
                                    onItemSelected={this._onItemSelected} />)
                                : <Spinner className="search-tree-loading-content" label={Resources.LoadingMessage} size={SpinnerSize.small} />
                        }
                    </Callout>
                }
            </div>
        );
    }

    public componentWillUnmount(): void {
        this.resetDelayFunction();
    }

    public componentWillReceiveProps(nextProps: ITreeFilterProps): void {
        const { defaultPath, isTreeDropdownActive } = nextProps,
            { mode, textBoxInput } = this.state;
        if (defaultPath !== this.props.defaultPath) {
            // Restore default state.
            this.setState(this._getState(nextProps, defaultPath, Mode.None));
        }
        else if (nextProps.items !== this.props.items && mode === Mode.Editing) {
            this.setState(this._getState(nextProps, textBoxInput, mode, true));
        }
        else if (isTreeDropdownActive !== this.props.isTreeDropdownActive && isTreeDropdownActive) {
                this.setState(this._getState(nextProps, textBoxInput, mode), this._onFocusInput);
        }
    }

    private _openTreeDropdown = (evt: React.SyntheticEvent<HTMLElement>): void => {
        if (this.props.isTreeDropdownActive) {
            this._closeDropdown(true);
        }
        else {
            this._onFocusComponent(evt);
        }

        // Prevent the path menu to react on Mouse Click. 
        evt.stopPropagation();
    }

    private _onFocusComponent = (evt?: React.SyntheticEvent<HTMLElement>): void => {
        // Bring up the dropdown.
        const { onInvokeDropdown } = this.props;
        if (onInvokeDropdown) {
            onInvokeDropdown();
        }
    }

    /**
     * On Clicking the menu item update the selected item, text in menu box and trigger item selection action.
     * @param item
     */
    private _onItemSelected = (item: string): void => {
        this._applyItem(item, true);
    }

    /**
     * Applied the passed item selection for the menu.
     * @param item
     */
    private _applyItem = (item: string, validated: boolean): void => {
        const validatePath = (path: string): boolean => {
            // If display name is empty string return true as we want to show results for empty string
            // It is handeled by back-end by applying root path filter
            if (!path) {
                return true;
            }

            path = normalizePath(path, this.props.pathSeparator);
            const dataLoaded: boolean = this.props.contentLoadState === ContentLoadState.LoadSuccess;
            // Once the data load is complete, the applied item should be a valid item.
            return !dataLoaded || this.props.items.some((o, i) => {
                return ignoreCaseComparer(o.fullName, path) === 0;
            });
        };

        const isValidPath = validated || validatePath(item);

        if (this.props.onItemSelected && isValidPath) {
            this.props.onItemSelected(this.props.name, item);
        }

        this._closeDropdown(false, item);
    }

    /**
     * Call back funtion when there is a click on the arrow button.
     * Applies the item name in the text box if the menu is enabled.
     */
    private _onApplyPath = (evt: React.SyntheticEvent<HTMLElement>): void => {
        const activeItemIndex = this.state.activeDescendantIndex,
            items: _TreeStore.IItem[] = this.props.items;

        // If there is an active item after navigating the list of items apply it,
        // otherwise apply the text in the textbox if it is a valid path.
        if (activeItemIndex >= 0 && activeItemIndex < items.length) {
            this._applyItem(items[activeItemIndex].fullName, true);
        }
        else {
            this._applyItem(this.state.textBoxInput || "", false);
        }

        // Prevent the path menu to react on Mouse Click. 
        evt.stopPropagation();
    }

    /**
     * On change in text in the text box, update the list visible to the user based on the text.
     * If the user enters /tfs/ the last character "/" will be truncated and results will be shown
     * @param evt
     */
    private _onInputTextChange = (evt: React.ChangeEvent<HTMLInputElement>): void => {
        // Only if the view is searchable
        let text: string = evt.target.value;
        const { searchable, onSearchTextChanged } = this.props,
            startSearch = searchable && !!onSearchTextChanged;

        this.setState({
            textBoxInput: text,
            mode: Mode.Editing,
            searchInProgress: startSearch
        }, () => {
            if (startSearch) {
                this.resetDelayFunction();
                this.searchInProgressSpinnerDelayFn =
                    delay(this, 300, () => {
                        onSearchTextChanged(text.trim());
                    });
            }
        });
    }

    /**
     * Handle Keyboard navigation when focus is on Text Box
     * @param evt
     */
    private _onTextBoxKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>): void => {
        const { items } = this.props,
            itemCount: number = items.length;
        if (itemCount > 0 &&
            (evt.keyCode === KeyCodes.up ||
                evt.keyCode === KeyCodes.down)) {
            const currentActiveIndex = evt.keyCode === KeyCodes.up
                ? this.getNextActiveIndex(idx => idx - 1)
                : this.getNextActiveIndex(idx => idx + 1);

            this.setState({ activeDescendantIndex: currentActiveIndex, mode: Mode.Navigating }, () => {
                // For the first time when the focus is on the element the user dont know whether the item can be expanded or not.
                // So we are announcing if element is in collapsed or in expanded state when focus comes to the item.
                const { activeDescendantIndex } = this.state;
                if (this.props.onGetItemIsCollapsible(this.props.items[activeDescendantIndex])) {
                    const message: string = this.props.items[activeDescendantIndex].expanded
                        ? Resources.Expanded
                        : Resources.Collapsed;
                    announce(message);
                }
            });

            evt.preventDefault();
        }
        else if (evt.keyCode === KeyCodes.escape) {
            this._closeDropdown(true);
        }
        else if (evt.keyCode === KeyCodes.left ||
            evt.keyCode === KeyCodes.right) {
            const startExpanding = evt.keyCode === KeyCodes.right,
                { onItemExpand, onItemCollapse } = this.props,
                { activeDescendantIndex } = this.state;

            if (activeDescendantIndex >= 0 && activeDescendantIndex < itemCount) {
                const fullName = items[activeDescendantIndex].fullName;

                if (startExpanding && onItemExpand) {
                    onItemExpand(fullName);
                }
                else if (onItemCollapse) {
                    onItemCollapse(fullName);
                }

                evt.preventDefault();
            }
        }
        else if (evt.keyCode === KeyCodes.enter) {
            this._onApplyPath(evt);
        }
    }

    /**
     * On Clicking the cross button next to text box erase the text in the text box.
     * @param evt
     */
    private _onRemoveClick = (evt: React.SyntheticEvent<HTMLElement>): void => {
        const { onSearchTextChanged } = this.props;
        this.setState({ textBoxInput: "", activeDescendantIndex: -1, mode: Mode.None, searchInProgress: false }, () => {
            if (onSearchTextChanged) {
                onSearchTextChanged("");
            }
        });

        this._onFocusComponent(evt);
    }

    /**
     * Close the dropdown and display the selected item in the menu box.
     */
    private _closeDropdown(reset: boolean, item?: string): void {
        const { onDismissDropdown, defaultPath } = this.props;
        // If an item is selected set the text of the selected item
        // Else, if reset option is set restore the default path.
        // Else let the search text as is, whatever the user has keyed in.
        const textBoxInput = item || (reset && defaultPath) || this.state.textBoxInput;

        this.setState({
            mode: Mode.None,
            textBoxInput: textBoxInput,
            searchInProgress: false
        }, () => {
            if (onDismissDropdown) {
                onDismissDropdown();
            }
        });
        
    }

    /**
    * Bring focus to input text box
    */
    private _onFocusInput = (): void => {
        if (this.comboBox && this.comboBox.getInputRef()) {
            const inputElement = this.comboBox.getInputRef() as HTMLInputElement;
            inputElement.select();
            inputElement.focus();
        }
    }

    /**
     * Provides state of the component on basis of props provided.
     * @param props
     */
    private _getState(
        props: ITreeFilterProps,
        textBoxInput: string,
        mode: Mode,
        matchPartial: boolean = false): IEditableTreeFilterState {
        const { items, pathSeparator } = props;
        const activeDescendantIndex = getActiveDescendantIndex(items, textBoxInput, pathSeparator, matchPartial);
        return {
            activeDescendantIndex,
            textBoxInput: textBoxInput || "",
            mode,
            searchInProgress: false
        };
    }

    private getNextActiveIndex = (next: (idx) => number): number => {
        const { items } = this.props;
        const { activeDescendantIndex } = this.state,
            maxIdx = items.length - 1;
        let nextIdx = next(activeDescendantIndex);

        if (nextIdx < -1) {
            nextIdx = maxIdx;
        }
        else if (nextIdx > maxIdx) {
            nextIdx = -1;
        }

        return nextIdx;
    }

    private onGetFooterMessage = (itemCount: number, searchType: SearchType): string => {
        const { onGetFooterMessage } = this.props,
            { textBoxInput, mode } = this.state;
        if (onGetFooterMessage) {
            return onGetFooterMessage(itemCount, textBoxInput, searchType, true, mode === Mode.Editing);
        }
    }

    private resetDelayFunction = (): void => {
        if (this.searchInProgressSpinnerDelayFn) {
            this.searchInProgressSpinnerDelayFn.cancel();
            this.searchInProgressSpinnerDelayFn = undefined;
        }
    }
}