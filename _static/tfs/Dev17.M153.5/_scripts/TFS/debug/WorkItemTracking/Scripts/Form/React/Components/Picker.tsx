import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/Picker";

import * as Q from "q";
import * as React from "react";

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

import { TextField } from "OfficeFabric/TextField";
import { Icon } from "OfficeFabric/Icon";
import { List, ScrollToMode } from "OfficeFabric/List";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { css, autobind } from "OfficeFabric/Utilities";

import { Cancelable, delay } from "VSS/Utils/Core";
import { handleError } from "VSS/VSS";
import { equals } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { AnimatedEntry } from "TfsCommon/Scripts/Components/Animation/AnimatedEntry";
import { PartialHighlightComponent } from "VSSPreview/Controls/PartialHighlightComponent";

interface IFilterBoxProps {
    /**
     * Label text for the SearchBox.
     * @default "Search"
     */
    labelText?: string;

    /**
     * Callback function for when the typed input for the SearchBox has changed.
     */
    onChange?: (newValue: any) => void;

    /**
     * Callback executed when the user presses enter in the search box.
     */
    onSearch?: (newValue: any) => void;

    /**
     * The value of the text in the SearchBox.
     */
    value?: string;

    /**
     * CSS class to apply to the SearchBox.
     */
    className?: string;

    /**
     * Name of icon to apply to filter box, defaults to search icon
     */
    iconClassName?: string;

    /**
     * Optional aria-label for the input
     */
    inputAriaLabel?: string;

    /**
     *  Optional aria label to apply to the clear button
     */
    ariaClearLabel?: string;
}

interface IFilterBoxState {
    value?: string;
    hasFocus?: boolean;
}

/** Input box very similar to the OfficeFabric 'SearchBox', but working around some issues with that component. */
class FilterBox extends React.Component<IFilterBoxProps, IFilterBoxState> {
    private _inputElement: HTMLInputElement;
    private _resolveInputElement = (element: HTMLInputElement) => this._inputElement = element;

    constructor(props: IFilterBoxProps, context: any) {
        super(props, context);

        this.state = {
            value: props.value || "",
            hasFocus: false
        };
    }

    public focus() {
        if (this._inputElement) {
            this._inputElement.focus();
        }
    }

    public componentWillReceiveProps(newProps: IFilterBoxProps) {
        if (newProps.value !== undefined) {
            this.setState({
                value: newProps.value
            });
        }
    }

    public render() {
        const { labelText, inputAriaLabel, ariaClearLabel, className } = this.props;
        const { value, hasFocus } = this.state;

        let elementClassName = "filter-box";
        if (className) {
            elementClassName += ` ${className}`;
        }

        if (hasFocus) {
            elementClassName += ` is-active`;
        }

        if (value.length > 0) {
            elementClassName += ` can-clear`;
        }

        return (
            <div className={elementClassName}>
                <i className={"filter-box-icon bowtie-icon " + (this.props.iconClassName || "bowtie-search")}></i>
                <input
                    className="filter-box-field"
                    placeholder={labelText}
                    onChange={this._onInputChange}
                    onKeyDown={this._onKeyDown}
                    value={value}
                    ref={this._resolveInputElement}
                    onFocus={this._onFocus}
                    onBlur={this._onBlur}
                    aria-label={inputAriaLabel}
                />
                <button
                    className="filter-box-clearButton bowtie-icon bowtie-edit-remove"
                    onClick={this._onClearClick}>
                </button>
            </div>
        );
    }

    private _onFocus = () => {
        this.setState({
            hasFocus: true
        });
    }

    private _onBlur = () => {
        this.setState({
            hasFocus: false
        });
    }

    private _onInputChange = () => {
        this.setState({
            value: this._inputElement.value
        });
        this._callOnChange(this._inputElement.value);
    }

    private _onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
        switch (ev.which) {
            case KeyCode.ESCAPE:
                this._onClearClick(ev);
                break;

            case KeyCode.ENTER:
                if (this.props.onSearch && this.state.value.length > 0) {
                    this.props.onSearch(this.state.value);
                }
                break;

            default:
                return;
        }

        // We only get here if the keypress has been handled.
        ev.preventDefault();
        ev.stopPropagation();
    }

    private _onClearClick = (ev?: any) => {
        this.setState({
            value: ""
        });
        this._callOnChange("");
        ev.stopPropagation();
        ev.preventDefault();

        this._inputElement.focus();
    }

    private _callOnChange(newValue: string): void {
        let { onChange } = this.props;

        if (onChange) {
            onChange(newValue);
        }
    }
}

export interface IItem {
    value: string;

    /** Optional label to display instead of the value */
    label?: string;

    /** Optional classname to apply to rendered item */
    className?: string;
}

export interface IDataSource<TItem extends IItem> {
    getItems(): IPromise<TItem[]> | TItem[];

    setFilter(text: string): void;

    getFilter(): string;

    clearFilter(): void;
}

interface IPickerItemProps<TItem extends IItem> {
    /** Item to render */
    item: TItem;

    /** Optional custom item render logic */
    onRenderItem?: (item: TItem, filter?: string) => JSX.Element;

    className?: string;

    /** Value indicating whether item is selected */
    selected?: boolean;

    onSelect?: (item: TItem) => void;
}

export enum PickerMode {
    /** */
    Filter,

    /** Custom values can be entered */
    Input
}

export type PickerValidationResult = true | string;

export interface IPickerProps<TItem extends IItem, TDataSource extends IDataSource<TItem>> {
    /** Mode to show the picker in */
    pickerMode: PickerMode;

    /** Optional, if set allows empty input for the 'Filter' input mode */
    allowEmptyInput?: boolean;

    /** Optional class name to apply to picker element */
    className?: string;

    /** Optional class name to apply to filter/input element */
    inputClassName?: string;

    /** Optional title to display between input and values */
    separatorText?: string;

    /** Optional class name to apply to separator element between input and search results */
    separatorClassName?: string;

    /** Data source to populate */
    dataSource: TDataSource;

    /** Optional class name to apply to rendered item */
    itemClassName?: string;

    /**
     * Optional render callback for items
     * @param item Item to rencer
     * @param filter Current filter, if set
     */
    onRenderItem?: (item: TItem, filter?: string) => JSX.Element;

    /** Height in pixels of a single, rendered item */
    itemHeight?: number;

    /** Callback if an item from the list is selected */
    onSelect?: (item: TItem) => void;

    /** Initial input value */
    value?: string;

    /** Optional input type, defaults to "text" */
    inputType?: string;

    /** Optional aria-label for the input */
    inputAriaLabel?: string;

    /** Value matching one provided by the data source to display as selected */
    selectedValue?: string;

    /** Callback on change. Returns validation result. */
    onChange?: (newValue: string) => PickerValidationResult;

    /** Callback on filter change */
    onFilterChange?: (newFilter: string) => void;

    /** Optional render callback for list */
    onRenderList?: (items: TItem[], defaultRenderList: () => JSX.Element, renderActions: (item: TItem) => JSX.Element, filter?: string) => JSX.Element;

    /** Optional callback to scroll to a specific item. Use this when you provide custom list rendering */
    onScrollToIndex?: (index: number) => void;

    /** Optional class name to apply to list wrapper */
    listWrapperClassName?: string;

    /** Optional class name to apply to default list */
    listClassName?: string;

    /** Optional placeholder for filter input, defaults to "Search" */
    filterPlaceholder?: string;

    /** Optional icon for filter input, defaults to search */
    filterIcon?: string;
}

export interface IPickerState<TItem extends IItem> {
    items: TItem[];

    isLoading: boolean;
    hasInitialSelection?: boolean;
}

export class Picker<TItem extends IItem, TDataSource extends IDataSource<TItem>> extends React.Component<IPickerProps<TItem, TDataSource>, IPickerState<TItem>> {
    private _resolveInput = (textField: any) => this._inputTextField = textField;
    private _inputTextField: TextField;

    private _resolveFilterBox = (filterBox: FilterBox) => this._filterBox = filterBox;
    private _filterBox: FilterBox;

    private _resolveScrollElement = (element: HTMLDivElement) => this._scrollElement = element;
    private _scrollElement: HTMLDivElement;

    private _resolveList = (list: List) => this._list = list;
    private _list: List;

    private _resolveItems: Cancelable;

    private _previousSelectedItem: string;

    private _scrolledToItemIndex: number = null;

    constructor(props: IPickerProps<TItem, TDataSource>, context?: any) {
        super(props, context);

        this.state = {
            items: null,
            isLoading: false,
            hasInitialSelection: !!props.selectedValue
        };
    }

    /**
     * Focus the input/filter control
     */
    public focusInput() {
        if (this._inputTextField) {
            this._inputTextField.focus();
        } else if (this._filterBox) {
            this._filterBox.focus();
        }
    }

    public componentDidMount() {
        this._update(this.props);
    }

    public componentWillUnmount() {
        this._resolveItems.cancel();
    }

    public componentWillReceiveProps(newProps: IPickerProps<TItem, TDataSource>) {
        this._update(newProps);
    }

    public componentDidUpdate() {
        // Try to scroll to the appropriate location.  Must wait for the UI to populate for this to work
        // though.
        delay(this, 0, () => this._tryScroll());
    }

    public render(): JSX.Element {
        // Render Filter or Input box, depending on mode
        let input: JSX.Element;
        if (this.props.pickerMode === PickerMode.Filter) {
            input = <FilterBox
                ref={this._resolveFilterBox}
                inputAriaLabel={this.props.inputAriaLabel}
                className={this.props.inputClassName}
                onChange={this._onFilterChange}
                value={this.props.dataSource.getFilter() || ""}
                labelText={this.props.filterPlaceholder || WorkItemTrackingResources.Picker_FilterWatermark}
                iconClassName={this.props.filterIcon}
                ariaClearLabel={PresentationResources.Clear}
            />;
        } else {
            input = <TextField
                ref={this._resolveInput}
                ariaLabel={this.props.inputAriaLabel}
                type={this.props.inputType || "text"}
                value={this.props.value && this.props.value || ""}
                className={this.props.inputClassName}
                onGetErrorMessage={this._onInputChange}
            />;
        }

        // Render optional separator
        let separator: JSX.Element;
        if (this.props.separatorText) {
            separator = <div className={css("picker-separator", this.props.separatorClassName)}>
                {this.props.separatorText}
            </div>;
        }

        let content: JSX.Element;
        if (this.state.isLoading) {
            content = <div className="picker-loading">
                <Spinner label={PresentationResources.Loading} type={SpinnerType.normal} />
            </div>;
        } else {
            content = <div className={css("picker-list", this.props.listWrapperClassName)} data-is-scrollable={true} ref={this._resolveScrollElement}>
                {this._renderList()}
            </div>;
        }

        return <div className={"picker " + (this.props.className || "")}>
            <div className="picker-input">
                {input}
            </div>
            {separator}
            {content}
        </div>;
    }

    private _renderList() {
        // Delegate to custom list rendering, if provided
        if (this.props.onRenderList) {
            return this.props.onRenderList(
                this.state.items, this._renderDefaultList, this._renderItemActions, this.props.dataSource.getFilter());
        }

        return this._renderDefaultList();
    }

    @autobind
    private _renderDefaultList() {
        // Provide explicit measures for the list, see mseng work item: #862570
        const itemsPerPage = 10;
        let getPageHeight = undefined;
        if (this.props.itemHeight) {
            getPageHeight = () => {
                return itemsPerPage * this.props.itemHeight;
            };
        }

        return <List
            className={this.props.listClassName}
            items={this.state.items}
            getItemCountForPage={() => itemsPerPage}
            getPageHeight={getPageHeight}
            onRenderCell={this._renderItem}
            ref={this._resolveList}
        />;
    }

    @autobind
    private _onInputChange(value: string): string | PromiseLike<string> {
        if (this.props.onChange) {
            const validationResult = this.props.onChange(value);
            if (validationResult !== true) {
                return validationResult;
            }
        }

        // Accept value by default
        return "";
    }

    @autobind
    private _onFilterChange(filterText: string) {
        if (!filterText) {
            this.props.dataSource.clearFilter();
        } else {
            this.props.dataSource.setFilter(filterText);
        }

        if (this.props.onFilterChange) {
            this.props.onFilterChange(filterText);
        }

        // Re-render list
        this._update(this.props);
    }

    @autobind
    private _renderItem(item: TItem): JSX.Element {
        const selected = equals(item.value, this.props.selectedValue);
        const filter = this.props.dataSource.getFilter();

        let content: JSX.Element | string;
        if (this.props.onRenderItem) {
            content = this.props.onRenderItem(item, filter);
        } else {
            // Default rendering logic
            content = <PartialHighlightComponent text={item.label || item.value} highlight={filter} />;
        }

        return <button className="picker-item-wrapper" aria-selected={selected} onClick={() => this.props.onSelect(item)}>
            <div className={css("picker-item", this.props.itemClassName, item.className, {
                "selected": selected
            })}>
                <span className="picker-content">
                    {content}
                </span>
                {this._renderItemActions(item)}
            </div>
        </button>;
    }

    @autobind
    private _renderItemActions(item: TItem): JSX.Element {
        const selected = equals(item.value, this.props.selectedValue);

        let selection: JSX.Element;
        if (selected) {
            const checkMark = <span className="container selection">
                <Icon iconName="CheckMark" />
            </span>;

            // Show selection animation only if
            // - there was no inital selection, so new now selected item was chosen by a usre
            // or
            // - we are not rendering the selected item for the first time (initial render)
            // - the selection is different than the previous one
            if (!this.state.hasInitialSelection
                || (this._previousSelectedItem && this._previousSelectedItem !== item.value)) {
                selection = <AnimatedEntry className="selected" enterTimeout={400} enterClassName={"selected-fade"}>
                    {checkMark}
                </AnimatedEntry>;
            } else {
                selection = checkMark;
            }

            this._previousSelectedItem = item.value;
        }

        return <span className="picker-actions" aria-hidden={true}>
            {selection}
        </span>;
    }

    private _update(props: IPickerProps<TItem, TDataSource>) {
        if (this._resolveItems) {
            this._resolveItems.cancel();
        }

        this._resolveItems = new Cancelable(this);

        if (props.dataSource) {
            const items = props.dataSource.getItems();

            if (Array.isArray(items)) {
                this.setState({
                    items: this._transformItems(items)
                } as IPickerState<TItem>);
            } else {
                this.setState({
                    isLoading: true
                } as IPickerState<TItem>);

                items.then(this._resolveItems.wrap(resolvedItems => {
                    this.setState(
                        {
                            items: this._transformItems(resolvedItems),
                            isLoading: false
                        },
                        () => {
                            this._tryScroll();
                        });
                }) as (items: TItem[]) => void)
                    .then(null, handleError);
            }
        }
    }

    private _transformItems(items: TItem[]): TItem[] {
        const isFiltered = !!this.props.dataSource.getFilter();

        if (!isFiltered && this.props.allowEmptyInput) {
            // When the picker allows empty input and is not filtered, add a virtual element as the very first item that can be used
            // to clear the input.
            items = items.slice(0);

            items.unshift({
                value: null,
                label: WorkItemTrackingResources.Picker_EmptyInput,
                className: "picker-empty-item"
            } as TItem);
        }

        return items;
    }

    private _tryScroll() {
        if (this.props.itemHeight && this._scrollElement && this.state.items && !this.state.isLoading) {
            // Determine index of selected item
            const items: TItem[] = this.state.items;
            const selectedItems = items.filter(i => i.value === this.props.selectedValue);
            if (!selectedItems.length) {
                return;
            }

            const selectedItemIdx = items.indexOf(selectedItems[0]);
            const isValidIdx = selectedItemIdx !== -1;

            // Don't scroll if the selection has changed since last scrolling (or if it's the inital selection)
            const firstScrolling = !this._scrolledToItemIndex;
            const selectedItemHasNotChanged = firstScrolling || selectedItemIdx === this._scrolledToItemIndex || !this.state.hasInitialSelection;
            if (isValidIdx && selectedItemHasNotChanged) {
                this._scrolledToItemIndex = selectedItemIdx;

                if (this._list) {
                    this._list.scrollToIndex(selectedItemIdx, () => this.props.itemHeight, ScrollToMode.center);
                } else if (this.props.onScrollToIndex) {
                    this.props.onScrollToIndex(selectedItemIdx);
                }
            }
        }
    }
}
