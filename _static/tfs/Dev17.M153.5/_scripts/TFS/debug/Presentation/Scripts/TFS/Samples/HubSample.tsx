import * as React from "react";
import * as ReactDOM from "react-dom";

import { BaseComponent } from "OfficeFabric/Utilities";
import { autobind, IBaseProps } from "OfficeFabric/Utilities";
import { DefaultButton } from 'OfficeFabric/Button';
import { IContextualMenuItem } from 'OfficeFabric/ContextualMenu';
import { IColumn } from 'OfficeFabric/DetailsList';
import { MessageBar } from "OfficeFabric/MessageBar";
import { SelectionMode } from "OfficeFabric/Selection";
import { Toggle } from "OfficeFabric/Toggle";
import { ChoiceGroup } from "OfficeFabric/ChoiceGroup";

import { IFavoriteItemPicker } from "Favorites/Controls/FavoriteItemPicker";

import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";

import { getDefaultWebContext } from "VSS/Context";
import { registerContent } from "VSS/SDK/Shim";

import { FilterBar } from "VSSUI/FilterBar";
import { KeywordFilterBarItem } from "VSSUI/TextFilterBarItem";
import { IFilterState, FILTER_CHANGE_EVENT } from "VSSUI/Utilities/Filter";
import { IObservableValue, ObservableValue, IObservableArray, ObservableArray } from "VSS/Core/Observable";
import { IObservableViewStateUrl } from "VSSPreview/Utilities/ViewStateNavigation";
import { IVssHubViewStateOptions, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import { Hub,ScrollableRegion } from "VSSUI/Hub";
import { IHubBreadcrumbItem } from "VSSUI/Components/HubHeader/HubBreadcrumb.Props";
import { HubHeader, HubTileRegion, HubTextTile } from "VSSUI/HubHeader";
import { PickListFilterBarItem, PickList, IItemPickerProvider, IPickListSelection } from "VSSUI/PickList";
import {
    PivotBarItem,
    IChoiceGroupViewActionProps,
    IOnOffViewActionProps,
    ITextViewActionProps,
    ISliderViewActionProps,
    PivotBarViewActionType,
    IPivotBarAction,
    PivotBarViewActionArea,
    PivotRenderingMode,
    IVerticalPivotRenderingModeProps
} from 'VSSUI/PivotBar';
import { HubViewStateEventNames } from 'VSSUI/Utilities/HubViewState';
import { IViewOptionsValues, VIEW_OPTIONS_CHANGE_EVENT } from 'VSSUI/Utilities/ViewOptions';
import { VssIconType } from "VSSUI/VssIcon";
import { VssDetailsList, VssDetailsListTitleCell } from 'VSSUI/VssDetailsList';

import { createListItems } from "Presentation/Scripts/TFS/Samples/Data";
import { FavoriteItemComponent, getQueryFavoritesPicker, getQueryArtifactsPicker, QueryFavoritesContext } from "Presentation/Scripts/TFS/Samples/FavoriteItemPicker";
import { getAllQueryFavoriteItems, mapQueryToQueryFavoriteItem, mapQueryFavoriteToQuery, IQueryFavoriteItem } from "Presentation/Scripts/TFS/Samples/QueryData";

import "VSS/LoaderPlugins/Css!Presentation/Samples/HubSample";
import { IArtifactPickerProvider } from "Favorites/Controls/ArtifactPickerProvider";

let _totalDiffCount = 3;
let _filteringItems = createListItems(50);

function getListColumns(): IColumn[] {
    return [
        {
            key: "color",
            fieldName: "color",
            name: "color",
            onRender: (item: any) => {
                return <span style={{ color: (item.color === 'yellow' ? 'goldenrod' : item.color) }}>{item.color}</span>;
            },
            minWidth: 100,
            maxWidth: 120,
            isResizable: false
        },
        {
            key: "name",
            fieldName: "name",
            name: "name",
            onRender: (item: any) => {
                return <VssDetailsListTitleCell
                    primaryAction='https://bing.com'
                    primaryText={item.name}
                    primaryTarget='_blank'
                    iconProps={{
                        iconType: VssIconType.bowtie,
                        iconName: "file"
                    }}
                />
            },
            minWidth: 200,
            maxWidth: 350,
            isResizable: true
        },
        {
            key: "description",
            fieldName: "description",
            name: "description",
            onRender: (item: any) => {
                return <span>{item.description}</span>;
            },
            minWidth: 300,
            isResizable: true
        }
    ];
}

function getBreadcrumbItems(): IHubBreadcrumbItem[] {
    return [{
        key: "queries",
        text: "Queries",
        leftIconProps: {
            iconName: "query-list",
            iconType: VssIconType.bowtie
        },
        onClick: () => {
            alert("Queries clicked.");
        },
        ariaLabel: "Navigate to queries"
    },
    {
        key: "team-queires",
        text: "Team Queries",
        leftIconProps: {
            iconName: "folder-query",
            iconType: VssIconType.bowtie
        },
        onClick: () => {
            alert("Team queries clicked.");
        }
    }] as IHubBreadcrumbItem[];
}

interface IHubSampleProps extends IBaseProps {
    items?: QueryHierarchyItem[];
}

interface IHubSampleState {
    items?: IQueryFavoriteItem[];
    filteredItems?: any[];
    diffIndex?: number;
    viewActionsImportant?: boolean;
    editingMode?: boolean;
    inlineFilterBar?: boolean;
    hidePivotItemLink?: boolean;
    pivotRenderingModeKey?: string
}

const queryIdChangingEventName = "queryIdChanging";

namespace PivotKeys {
    export const contents = 'content';
    export const favoritePicker = 'favorite-picker';
    export const filtering = 'filtering';
    export const compare = 'compare';
    export const commandsViewActions = 'commands-view-actions';
    export const hideable = 'hideable';
}

/**
 * Shows how to extend view state. This is not necessary -- queryId could be pulled from viewOptions, but
 * this gives strong typing.
 */
class HubSampleViewState extends VssHubViewState {

    public queryId: IObservableValue<string>;
    public nonNavParamExample: IObservableValue<boolean>;

    constructor(options?: IVssHubViewStateOptions) {
        super(options, false);

        this.queryId = this.createNavParmObservableValue<string>(queryIdChangingEventName, "queryId", true, HistoryBehavior.newEntry);
        this.nonNavParamExample = this.createObservableValue<boolean>("nonNavParamExaple-changed");

        this.setupNavigation();
    }
}

class HubSample extends BaseComponent<IHubSampleProps, IHubSampleState> {

    private _hubViewState: HubSampleViewState;
    private _favoritesContext: QueryFavoritesContext;
    private _favoritePicker: IArtifactPickerProvider<QueryHierarchyItem> | IFavoriteItemPicker;
    private _favoritePickerObservable: IObservableValue<IArtifactPickerProvider<QueryHierarchyItem> | IFavoriteItemPicker>;

    private _pivotUrls: { [pivotKey: string]: IObservableViewStateUrl };

    private _viewActionText: ObservableValue<string>;
    private _hubTilePrimaryText: ObservableValue<string>;
    private _hubTileSecondaryText: ObservableValue<string>;

    private _commands: IObservableArray<IPivotBarAction>;
    private _commandSet: string;
    private _initialViewOptionState = {
        onOff1: true,
        choiceGroup1: 'cgOption13',
        slider1: 200
    };

    constructor(props: any) {
        super(props);

        this._hubViewState = new HubSampleViewState({
            defaultPivot: PivotKeys.contents,
            viewOptions: {
                initialState: this._initialViewOptionState
            },
            viewOptionNavigationParameters: [
                { key: "id", rawString: true, behavior: HistoryBehavior.newEntry }
            ],
            filterNavigationParameters: [
                { key: "keyword", rawString: true },
                { key: "colorFilter" }
            ]
        });

        this._hubViewState.subscribe(this._onPivotChanging, HubViewStateEventNames.pivotChanging);
        this._hubViewState.filter.subscribe(this._onFilterChanged, FILTER_CHANGE_EVENT);
        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);
        this._hubViewState.viewOptions.subscribe(this._onViewOptionsChanged, VIEW_OPTIONS_CHANGE_EVENT);
        this._hubViewState.queryId.subscribe(this._onQueryChanged);

        this._pivotUrls = {};
        [PivotKeys.contents, PivotKeys.favoritePicker, PivotKeys.filtering, PivotKeys.compare, PivotKeys.hideable].forEach((pivotKey) => {
            this._pivotUrls[pivotKey] = this._hubViewState.createObservableUrl({ view: pivotKey });
        });

        let favoriteItems: IQueryFavoriteItem[] = null;
        if (this.props.items) {
            favoriteItems = this.props.items.map(mapQueryToQueryFavoriteItem);
        }

        this._favoritesContext = new QueryFavoritesContext(getDefaultWebContext());

        this._viewActionText = new ObservableValue("Click sync button below to see current time");

        const currentDate = new Date();

        this._hubTilePrimaryText = new ObservableValue(currentDate.toDateString());
        this._hubTileSecondaryText = new ObservableValue(currentDate.toTimeString().substring(0, 8));

        const viewActionsImportant = true;
        this._commandSet = "set-1";
        this._commands = new ObservableArray(this._getCommands(this._commandSet, viewActionsImportant))

        this.state = {
            items: favoriteItems,
            filteredItems: _filteringItems,
            diffIndex: 1,
            viewActionsImportant,
            pivotRenderingModeKey: "horizontal"
        };
    }

    public render(): JSX.Element {
        const {
            items,
            filteredItems,
            diffIndex,
            viewActionsImportant,
            editingMode,
            inlineFilterBar,
            hidePivotItemLink,
            pivotRenderingModeKey
        } = this.state;

        if (!items) {
            // Queries not loaded yet, displaying loading message
            return <div>Loading queries...</div>;
        }

        const queryId = this._hubViewState.queryId.value;
        if (!queryId) {
            // No query selected set yet
            return <div>No query selected</div>;
        }

        const selectedQuery = items.filter(item => item.id === queryId)[0];
        if (!selectedQuery) {
            // Query not found, displaying error message
            return <div>Query with id '{queryId}' not found.</div>;
        }

        const id = this._hubViewState.viewOptions.getViewOption("id");
        const diffInline = this._hubViewState.viewOptions.getViewOption("diffInline") === true;

        let renderingMode = PivotRenderingMode.HorizontalTabs;
        switch (pivotRenderingModeKey) {
            case 'vertical': {
                renderingMode = PivotRenderingMode.VerticalTabs;
                break;
            }
            case 'dropdown': {
                renderingMode = PivotRenderingMode.DropDown;
                break;
            }
            default: {
                renderingMode = PivotRenderingMode.HorizontalTabs;
            }
        }

        return (
            <Hub
                scrollableRegion={ScrollableRegion.Hub}
                className="hub-sample"
                hubViewState={this._hubViewState}
                hideHeader={editingMode}
                commands={[
                    { key: "add-file", name: "New file", important: true, iconProps: { iconName: "math-plus", iconType: VssIconType.bowtie }, onClick: this._onCommandClick, title: "New File Title!", disabled: true }
                ]}
                pivotRenderingModeOptions={
                    {
                        mode: renderingMode,
                        props: {
                            groups: [{ key: 'group1', name: 'Group 1', rank: 200 }, { key: 'group2', name: 'Group 2' }, { key: 'group3', name: 'Group 3' }]
                        } as IVerticalPivotRenderingModeProps
                    }
                }
            >
                <HubHeader
                    headerItemPicker={this._getFavoriteItemPicker(selectedQuery)}
                    breadcrumbItems={getBreadcrumbItems()}
                    hubBreadcrumbAriaLabel={"Queries breadcrumb"}
                    pickListClassName={"sample-header-pick-list"}
                    title={selectedQuery.name}
                    iconProps={{
                        iconType: VssIconType.bowtie,
                        iconName: "file"
                    }}
                />

                <HubTileRegion>
                    <HubTextTile
                        text={this._hubTilePrimaryText}
                        secondaryText={this._hubTileSecondaryText}
                    />
                    <div style={{ backgroundColor: 'blue' }} />
                </HubTileRegion>

                <FilterBar>
                    {
                        this._hubViewState.selectedPivot.value === 'filtering' ?
                            <KeywordFilterBarItem
                                filterItemKey="keyword"
                            /> : null
                    }
                    {
                        this._hubViewState.selectedPivot.value === 'filtering' && !inlineFilterBar ?
                            <PickListFilterBarItem
                                filterItemKey="colorFilter"
                                selectionMode={SelectionMode.multiple}
                                getPickListItems={() => { return ['green', 'red', 'yellow', 'blue'] }}
                                placeholder='Colors'
                            /> : null
                    }
                </FilterBar>

                <PivotBarItem name='Contents' itemKey={PivotKeys.contents} url={this._pivotUrls[PivotKeys.contents]} iconProps={{ iconName: "Up", iconType: VssIconType.fabric }} groupKey="group1">
                    {
                        editingMode ?
                            <div className="edit-mode-banner">
                                <span>You are now in edit mode</span>
                                <DefaultButton onClick={this._toggleEditMode}>Done editing</DefaultButton>
                            </div> : null
                    }
                    <div>
                        <p>{selectedQuery.id}</p>
                        <p>{selectedQuery.name}</p>
                        <p>{selectedQuery.path}</p>
                        <p>{selectedQuery.url}</p>
                        <p>{selectedQuery.modifiedBy}</p>
                        <p>{selectedQuery.modifiedDate}</p>
                    </div>

                    <PickList
                        items={["Item1", "Item2", "Item3", "Folder1/Item4", "Folder1/SubFolder/Item5"]}
                        selectedItems={id ? [id] : null}
                        onSelectionChanged={this._onSelectedIdChanged}
                        selectionMode={SelectionMode.single}
                        selectOnFocus={true} />

                    {
                        editingMode ? null : <DefaultButton onClick={this._toggleEditMode}>Enter edit mode</DefaultButton>
                    }

                </PivotBarItem>

                <PivotBarItem name='Favorite Picker' itemKey={PivotKeys.favoritePicker} url={this._pivotUrls[PivotKeys.favoritePicker]} groupKey="group2">
                    <MessageBar isMultiline={true}>
                        Below toggle is synchronized with the favorite state of the selected item. Change toggle below to see how indicator changes accordingly.
                        <FavoriteItemComponent id={selectedQuery.id} name={selectedQuery.name} favoritesContext={this._favoritesContext} />
                    </MessageBar>
                    <MessageBar isMultiline={true}>
                        Using below toggle, you can turn the query picker on/off. You need to specify an observable value as <code>headerItemPicker</code> to the header and set it to null when picker is not needed.
                        <Toggle defaultChecked={true} onText='Query picker is enabled' offText='Query picker is disabled' onChanged={this._onPickerEnabledChanged} />
                    </MessageBar>
                    <MessageBar isMultiline={true}>
                        Using below toggle, you can switch between the Queries artifact picker, and the Queries favorites-only picker.
                        <Toggle defaultChecked={true} onText='Query artifact picker' offText='Query favorite picker' onChanged={this._onPickerModeChanged} />
                    </MessageBar>
                </PivotBarItem>

                <PivotBarItem name='Filtering' className='detailsListPadding' itemKey={PivotKeys.filtering} url={this._pivotUrls[PivotKeys.filtering]} badgeCount={2312} groupKey="group1">
                    <MessageBar isMultiline={true}>
                        Adding a <code>FilterBar</code> component under <code>Hub</code> automatically displays filter icon in the view actions.
                    </MessageBar>
                    <MessageBar isMultiline={true}>
                        If there is only <code>KeywordFilterBarItem</code> exists for filtering, inline mode is used by default. Inline mode also can be controlled using <code>Hub</code>'s <code>showFilterBarInline</code> property.
                        <Toggle defaultChecked={false} onText='Inline filter enabled' offText='Inline filter disabled' onChanged={this._onInlineFilterEnableChanged} />
                    </MessageBar>
                    <VssDetailsList
                        items={filteredItems}
                        columns={getListColumns()}
                    />
                </PivotBarItem>

                <PivotBarItem name='Commands & View actions' itemKey={PivotKeys.commandsViewActions} url={this._pivotUrls[PivotKeys.commandsViewActions]} groupKey="nonExistantGroup"
                    commands={this._commands}
                    viewActions={[
                        {
                            key: "slider1",
                            name: "Slider sample 1",
                            important: viewActionsImportant,
                            actionType: PivotBarViewActionType.Slider,
                            actionProps: {
                                minValue: 100,
                                maxValue: 500,
                                step: 25
                            } as ISliderViewActionProps
                        },
                        {
                            key: "onOff1",
                            name: "On off sample 1",
                            important: viewActionsImportant,
                            actionType: PivotBarViewActionType.OnOff,
                            iconProps: { iconName: "Play" },
                            actionProps: {
                                onAriaLabel: "On aria label",
                                offAriaLabel: "Off aria label"
                            } as IOnOffViewActionProps
                        },
                        {
                            key: "choiceGroup1",
                            name: "Choice group sample 1",
                            important: viewActionsImportant,
                            actionType: PivotBarViewActionType.ChoiceGroup,
                            actionProps: {
                                options: [
                                    { key: "cgOption11", text: "Option 1" },
                                    { key: "cgOption12", text: "Option 2" },
                                    { key: "cgOption13", text: "Option 3" },
                                    { key: "cgOption14", text: "Option 4" }
                                ]
                            } as IChoiceGroupViewActionProps
                        },
                        {
                            key: "commandAction1",
                            actionType: PivotBarViewActionType.Command,
                            name: "First action",
                            iconProps: { iconName: "bowtie-icon bowtie-users", iconType: VssIconType.bowtie },
                            important: true,
                            viewActionRenderArea: PivotBarViewActionArea.beforeViewOptions
                        }

                    ]}>
                    <MessageBar isMultiline={true}>
                        By specifying ObservableArray to <code>commands</code> or <code>viewActions</code>, it is possible to get commands and view actions updated by setting <code>items</code> property of ObsevableArray with a new set of items.
                        <ChoiceGroup defaultSelectedKey={this._commandSet} label={"Change commands"} onChange={this._onCommandsChange} required={true} options={
                            [
                                { key: "set-1", text: "Set 1 (Edit, Rename)" },
                                { key: "set-1-disabled", text: "Set 1 - disabled (Edit, Rename)" },
                                { key: "set-2", text: "Set 2 (View, Delete, Print)" }
                            ]
                        } />
                    </MessageBar>
                    <MessageBar isMultiline={true}>
                        <code>important</code> property of commands and view actions specify where commands and view actions appear on the command bar. True means always visible, where setting false sends them to overflow area (... for commands and 'View options' for view actions).
                        <Toggle defaultChecked={viewActionsImportant} onText={'All pivot commands & view actions important'} offText={'All pivot commands & view actions important set to false'} onChanged={this._onViewImportanceChanged} />
                    </MessageBar>
                    <MessageBar isMultiline={true}>
                        Viev options:
                        <ul>
                            <li style={{ color: this._hubViewState.viewOptions.getViewOption("slider1") === this._initialViewOptionState.slider1 ? 'green' : 'red' }}>slider1: {this._hubViewState.viewOptions.getViewOption("slider1")}</li>
                            <li style={{ color: this._hubViewState.viewOptions.getViewOption("onOff1") === this._initialViewOptionState.onOff1 ? 'green' : 'red' }}>onOff1: {this._hubViewState.viewOptions.getViewOption("onOff1") ? "on" : "off"}</li>
                            <li style={{ color: this._hubViewState.viewOptions.getViewOption("choiceGroup1") === this._initialViewOptionState.choiceGroup1 ? 'green' : 'red' }}>choiceGroup1: {this._hubViewState.viewOptions.getViewOption("choiceGroup1")}</li>
                        </ul>
                    </MessageBar>
                    <MessageBar isMultiline={true}>
                        <code>hidden</code> property of PivotItems specify whether or not a PivotItem should appear in the PivotBar.
                        <Toggle defaultChecked={hidePivotItemLink} onText={'Hideable Pivot is hidden'} offText={'Hideable Pivot is visible'} onChanged={this._onHideLinkChanged} />
                    </MessageBar>
                    <MessageBar isMultiline={true}>
                        <code>pivotRenderingMode</code> property of PivotBar specifies how the pivot tabs should be rendered.
                        <ChoiceGroup selectedKey={pivotRenderingModeKey} label={"Change Pivot Rendering Mode"} onChange={this._onPivotRenderingModeChanged} required={true} options={
                            [
                                { key: "horizontal", text: "Horizontal" },
                                { key: "vertical", text: "Vertical" },
                                { key: "dropdown", text: "Dropdown" },
                            ]
                        } />
                    </MessageBar>
                </PivotBarItem>

                <PivotBarItem name='Compare' itemKey={PivotKeys.compare} url={this._pivotUrls[PivotKeys.compare]} commands={[
                    { key: "prev-change", disabled: diffIndex === 1, important: true, iconProps: { iconName: "arrow-up", iconType: VssIconType.bowtie }, onClick: this._onPrevDiff },
                    { key: "next-change", disabled: diffIndex === _totalDiffCount, important: true, iconProps: { iconName: "arrow-down", iconType: VssIconType.bowtie }, onClick: this._onNextDiff }
                ]}
                    viewActions={[
                        {
                            key: "staticTextValue",
                            important: true,
                            actionType: PivotBarViewActionType.Text,
                            actionProps: { text: "This cannot change" } as ITextViewActionProps
                        },
                        {
                            key: "diffInline",
                            important: true,
                            actionType: PivotBarViewActionType.OnOff,
                            actionProps: {
                                showText: false,
                                on: diffInline,
                                onIconProps: { iconName: "diff-side-by-side", iconType: VssIconType.bowtie },
                                offIconProps: { iconName: "diff-inline", iconType: VssIconType.bowtie },
                                offAriaLabel: "Show diff inline",
                                onAriaLabel: "Show side-by-side diff"
                            } as IOnOffViewActionProps
                        },
                        {
                            key: "observableTextValue",
                            important: true,
                            actionType: PivotBarViewActionType.Text,
                            actionProps: { text: this._viewActionText } as ITextViewActionProps
                        }
                    ]}>
                    <p>{`Compare mode: ${diffInline ? 'inline' : 'side by side'}, change index: ${diffIndex}`}</p>
                    <DefaultButton onClick={this._onSyncDateClick}>Sync date/time </DefaultButton>
                </PivotBarItem>

                <PivotBarItem name='Hideable Pivot' itemKey='hideable' url={this._pivotUrls[PivotKeys.hideable]} hidden={hidePivotItemLink}>
                    <p>This pivot can be hidden via the toggle on the commands pivot</p>
                </PivotBarItem>
            </Hub>
        );
    }

    public componentDidMount(): void {
        let webContext = getDefaultWebContext();
        getAllQueryFavoriteItems(webContext.project.id).then(items => {
            // When queries are available reset the state
            this.setState({ items: items });

            if (!this._hubViewState.queryId.value) {
                // Set random query if nothing specified in the url
                this._hubViewState.updateNavigationState(HistoryBehavior.replace, () => {
                    this._hubViewState.queryId.value = items[Math.floor(items.length * Math.random())].id;
                });
            }
        });
    }

    public componentWillUnmount(): void {
        if (this._favoritePicker) {
            this._favoritePicker.dispose();
        }

        this._hubViewState.dispose();
    }

    @autobind
    private _onCommandClick(ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {
        console.log(`${item.key} clicked`);
    }

    @autobind
    private _onViewOptionsChanged(changedState: IViewOptionsValues): void {
        this.forceUpdate();
    }

    @autobind
    private _onNextDiff(ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {
        this.setState({ diffIndex: this.state.diffIndex + 1 });
    }

    @autobind
    private _onPrevDiff(ev: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {
        this.setState({ diffIndex: this.state.diffIndex - 1 });
    }

    @autobind
    private _onSelectedIdChanged(selection: IPickListSelection) {
        this._hubViewState.viewOptions.setViewOption("id", selection.selectedItems[0]);
    }

    @autobind
    private _onFilterChanged(changedState: IFilterState) {

        let items = _filteringItems;
        let filterKeywords = this._hubViewState.filter.getFilterItemState('keyword');
        if (filterKeywords && filterKeywords.value) {
            items = items.filter(item => (item.name || "").indexOf(filterKeywords.value) >= 0);
        }

        let selectedColors = this._hubViewState.filter.getFilterItemState('colorFilter');
        if (selectedColors && selectedColors.value && selectedColors.value.length > 0) {
            items = items.filter(item => selectedColors.value.indexOf(item.color) >= 0);
        }

        this.setState({
            filteredItems: items
        });
    }

    @autobind
    private _onPivotChanging(newPivotKey: string) {
        // The FilterBar items for this hub change based on the selected pivot, so re-render on pivot changed.
        if (newPivotKey !== "contents" && this._hubViewState.viewOptions.getViewOption("id")) {
            this._hubViewState.viewOptions.setViewOption("id", null);
        }
        if (newPivotKey === "compare") {
            // Clear view options and filters when switching to the compare tab
            this._hubViewState.viewOptions.clear();
            this._hubViewState.filter.reset();
        }
    }

    @autobind
    private _onPivotChanged(newPivotKey: string) {
        this.forceUpdate();
    }

    @autobind
    private _onQueryChanged(newQueryId: string) {
        this.forceUpdate();
    }

    @autobind
    private _onViewImportanceChanged(on: boolean): void {
        this.setState({ viewActionsImportant: !this.state.viewActionsImportant });
    }

    @autobind
    private _onHideLinkChanged(on: boolean): void {
        this.setState({ hidePivotItemLink: !this.state.hidePivotItemLink });
    }

    @autobind
    private _onPivotRenderingModeChanged(ev: React.FormEvent<HTMLInputElement>, option: any): void {

        this.setState({ pivotRenderingModeKey: option.key });
    }

    @autobind
    private _toggleEditMode() {
        this.setState({
            editingMode: !this.state.editingMode
        });
    }

    @autobind
    private _onSyncDateClick(): void {
        const currentDate = new Date();
        this._viewActionText.value = `Current time: ${currentDate.toGMTString()}`;
        this._hubTilePrimaryText.value = currentDate.toDateString();
        this._hubTileSecondaryText.value = currentDate.toTimeString().substring(0, 8);
    }

    @autobind
    private _onPickerEnabledChanged(on: boolean): void {
        this._favoritePickerObservable.value = on ? this._favoritePicker : null;
    }

    @autobind
    private _onPickerModeChanged(on: boolean): void {
        if (this._favoritePicker) {
            this._favoritePicker.dispose();

            const selectedQuery = this.state.items.filter(item => item.id === this._hubViewState.queryId.value)[0];
            if (on) {
                this._favoritePicker = getQueryArtifactsPicker(
                    this._favoritesContext,
                    mapQueryFavoriteToQuery(selectedQuery),
                    clickedQuery => this._hubViewState.queryId.value = clickedQuery.id);
            }
            else {
                this._favoritePicker = getQueryFavoritesPicker(
                    this._favoritesContext,
                    selectedQuery,
                    clickedQuery => this._hubViewState.queryId.value = clickedQuery.id);
            }

            this._favoritePickerObservable.value = this._favoritePicker;
        }
    }

    @autobind
    private _onInlineFilterEnableChanged(on: boolean): void {
        this.setState({
            inlineFilterBar: on
        })
    }

    private _getFavoriteItemPicker(selectedQuery: IQueryFavoriteItem): IObservableValue<IItemPickerProvider> {
        if (!this._favoritePickerObservable) {
            this._favoritePicker = getQueryArtifactsPicker(
                this._favoritesContext,
                mapQueryFavoriteToQuery(selectedQuery),
                clickedQuery => this._hubViewState.queryId.value = clickedQuery.id);
            this._favoritePicker.ariaLabel = "Select a favorite item";
            this._favoritePickerObservable = new ObservableValue(this._favoritePicker);
        }
        else {
            const favoritePicker = this._favoritePickerObservable.value;
            if (favoritePicker) {
                (favoritePicker as IFavoriteItemPicker).setSelectedItem(selectedQuery);
            }
        }

        return this._favoritePickerObservable;
    }

    @autobind
    private _onCommandsChange(ev: React.FormEvent<HTMLInputElement>, option: any): void {
        this._commandSet = option.key;
        this._commands.value = this._getCommands(option.key, this.state.viewActionsImportant);
    }

    private _getCommands(commandSet: string, viewActionsImportant: boolean): IPivotBarAction[] {
        switch (commandSet) {
            case "set-1":
                return [
                    { key: "edit", name: "Edit", title: "Edit me!!!", important: viewActionsImportant, iconProps: { iconName: "edit", iconType: VssIconType.bowtie }, onClick: this._onCommandClick },
                    { key: "rename", name: "Rename", important: viewActionsImportant, iconProps: { iconName: "edit-rename", iconType: VssIconType.bowtie }, onClick: this._onCommandClick }
                ]
            case "set-1-disabled":
                return [
                    { disabled: true, key: "edit", title: "Edit me!!!", name: "Edit", important: viewActionsImportant, iconProps: { iconName: "edit", iconType: VssIconType.bowtie }, onClick: this._onCommandClick },
                    { disabled: true, key: "rename", name: "Rename", important: viewActionsImportant, iconProps: { iconName: "edit-rename", iconType: VssIconType.bowtie }, onClick: this._onCommandClick }
                ];
            case "set-2":
                return [
                    { key: "view", name: "View", important: viewActionsImportant, iconProps: { iconName: "ViewAll", iconType: VssIconType.fabric }, onClick: this._onCommandClick },
                    { key: "compare", name: "Delete", important: viewActionsImportant, iconProps: { iconName: "Remove", iconType: VssIconType.fabric }, onClick: this._onCommandClick },
                    { key: "print", name: "Print", important: viewActionsImportant, iconProps: { iconName: "Print", iconType: VssIconType.fabric }, onClick: this._onCommandClick }
                ]
            default:
                return [];
        }
    }
}

registerContent("hub.sample1", context => {
    ReactDOM.render(<HubSample />, context.$container[0]);
});
