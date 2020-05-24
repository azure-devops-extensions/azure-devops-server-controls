/// <reference types="react" />

import * as React from "react";

import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IOptions, IState, Store } from "DistributedTaskControls/Stores/ItemSelectionStore";

import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { List, IList } from "OfficeFabric/List";
import { css } from "OfficeFabric/Utilities";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

import { Splitter } from "VSSPreview/Flux/Components/Splitter";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/TwoPanelSelectorComponent";

export interface IProps extends ComponentBase.IProps {

    /** 
     * Array of items for the two panel selector
     */
    items: Item[];

    /**
     * Default item key
     */
    defaultItemKey: string;

    /**
     * Left header ARIA region label
     */
    leftPaneARIARegionRoleLabel: string;

    /**
     * Right header ARIA region label
     */
    rightPaneARIARegionRoleLabel: string;

    /**
     * Initial width of left section in Percentages
     */
    leftPaneInitialWidth?: string;

    /**
     * Minimum width of left section
     */
    leftPaneMinWidth?: string;

    /**
     * Maximum width of left section
     */
    leftPaneMaxWidth?: string;

    /**
     * Optional left header. This will be displayed above the left section
     */
    leftHeader?: JSX.Element;

    /**
     * Optional right header. This will be displayed above the right section.
     */
    rightHeader?: JSX.Element;

    /**
     * Optional left footer. This will be displayed below the left section
     */
    leftFooter?: JSX.Element;

    /**
     * Optional class name for the left pane
     */
    leftClassName?: string;

    /**
     * Optional class name for right pane
     */
    rightClassName?: string;

    /**
     * Set focus on last selected Item
     */
    setFocusOnLastSelectedItem: boolean;

    /**
     * Role for the list in the left section
     */
    leftRole?: string;

    /**
     * Enables the toggle button which displays a button for expand/collapse.
     */
    enableToggleButton?: boolean;

    /**
     * Text to show on collapsed left pane bar
     */
    collapsedLabel?: string;

    /**
     * Optional: Tooltip show on the toggle button when the splitter is collapsed
     */
    toggleButtonCollapsedTooltip?: string;

    /**
     * Optional: Tooltip show on the toggle button when the splitter is expanded
     */
    toggleButtonExpandedTooltip?: string;

    /**
     * Whether the left pane list is scrollable or not
     */
    isLeftPaneScrollable?: boolean;

    /**
     * Whether the right pane list is scrollable or not
     */
    isRightPaneScrollable?: boolean;

    /**
    * ComponentRef for TwoPanelSelectorComponent
    */
    componentRef?: (component: ITwoPanelSelectorComponent) => void;
}

export interface ITwoPanelSelectorComponent {
    getLeftPanelListReferenceComponent(): IList;
}

/**
 * @breif Encapsulates the control which offers an abstraction of a Two panel selector
 * with overview of items on the left and the details of the selected item on the right.
 * The control is hierarchical by behavior i.e. an overview item on the left can be 
 * a list of overview items. 
 *
 * The control takes an array of items. Each item provides an overview component which 
 * will be rendered on the left and a details component which will be rendered on the 
 * right when the overview item is selected. 
 */
export class TwoPanelSelectorComponent extends ComponentBase.Component<IProps, IState> implements ITwoPanelSelectorComponent {
    constructor(props: IProps) {
        super(props);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, props.instanceId);
    }

    public componentWillMount() {

        this._initialWidth = this._getDefaultInitialWidth();

        let defaultItem = this._getItem(this.props.defaultItemKey, this.props.items);

        if (!defaultItem) {
            defaultItem = this.props.items[0];
        }

        let itemSelectionStoreOptions: IOptions = {
            defaultSelection: [{ data: defaultItem }],
            setFocusOnLastSelectedItem: this.props.setFocusOnLastSelectedItem
        };

        this._store = StoreManager.CreateStore<Store, IOptions>(Store, this.props.instanceId, itemSelectionStoreOptions);
        this.setState(this._store.getState());
    }

    public componentDidMount() {
        this._store.addChangedListener(this._onChange);

        if (this.props.componentRef) {
            this.props.componentRef(this);
        }
    }

    public componentWillUpdate(nextProps: IProps, nextState: IState) {
        if (this.props.defaultItemKey !== nextProps.defaultItemKey) {
            // we check for keys, if they don't match we consider that item has changed, make sure default Item key's change based on it's mutable properties as needed
            // store is initialized with default item already, at this point it's storing old copy of the item, so we would have to update that
            // since we are triggering an action inside react life cycle, it could be that there's existing action that triggered this state in react
            // which means there would be existing action already executing, so move this trigger to be picked up event loop instead
            // component should be owner of items here, because component gets the items, component gets the updated items, having a store to store default item and thus making store the owner...
            // ...demands these kinds of hacks, we could probably do what officefabric does, component should be able to create a Selection instance which handles all selections
            // also, getting items are props and those items that are basically classes that returns components on some get methods (like getOverview()) - is also something to re-consider 
            // may be we should do something like <TwoPanelSelector><Item1 /><Item2 /></TwoPanelSelector>
            // TODO see #1028700
            if (nextProps.items.length > 0) {
                setTimeout(() => {
                    // This will be treated as a new item since key is different, trigger selection of this new item
                    this._itemSelectorActions.selectItem.invoke({
                        data: this._getItem(nextProps.defaultItemKey, nextProps.items)
                    });
                }, 0);
            }
        }
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onChange);
        // we need this action beside the value in contructor of store since whenever the tab loads, 
        // we need to reset the value but CreateStore will only happen once
        // it is fine to trigger an action in this life cycle of react since this state wouldn't be triggered by any other action
        setTimeout(() => {
            this._itemSelectorActions.setFocusOnLastSelectedItem.invoke(this.props.setFocusOnLastSelectedItem);
        }, 0);
    }

    public render(): JSX.Element {

        let left = (
            <div className="left-section"
                data-is-scrollable={!!this.props.isLeftPaneScrollable}
                role="region"
                aria-label={this.props.leftPaneARIARegionRoleLabel}>
                {this.props.leftHeader}

                <FocusZone direction={FocusZoneDirection.vertical}>
                    <List
                        componentRef={this._resolveRef("_twoPanelList")}
                        role={this.props.leftRole || "tablist"}
                        className="index-group"
                        items={this.props.items}
                        onRenderCell={this._renderCell}
                    />
                </FocusZone>
                {this.props.leftFooter}
            </div>
        );

        let rightSectionClassName = css("right-section", !!this.props.isRightPaneScrollable ? "right-section-scrollable" : Utils_String.empty);

        let right = (
            <div className={rightSectionClassName}
                data-is-scrollable={!!this.props.isRightPaneScrollable}
                role="region"
                aria-label={this.props.rightPaneARIARegionRoleLabel}>
                {this.props.rightHeader}
                {this._getSelectedItemContent()}
            </div>
        );

        return (
            <Splitter
                left={left}
                right={right}
                enableToggleButton={this.props.enableToggleButton}
                collapsedLabel={this.props.collapsedLabel}
                toggleButtonCollapsedTooltip={this.props.toggleButtonCollapsedTooltip}
                toggleButtonExpandedTooltip={this.props.toggleButtonExpandedTooltip}
                leftClassName={this.props.leftClassName}
                rightClassName={this.props.rightClassName}
                cssClass="horizontal hub-splitter two-panel-selector"
                initialSize={this._initialWidth}
                maxWidth={parseInt(this.props.leftPaneMaxWidth, 10) || this._initialWidth}
                minWidth={parseInt(this.props.leftPaneMinWidth, 10) || (this._initialWidth < 350) ? this._initialWidth : 350}>
            </Splitter>
        );
    }

    public getLeftPanelListReferenceComponent(): IList {
        return this._twoPanelList;
    }

    private _getDefaultInitialWidth(): number {
        let widthInPx: number;
        let widthInPercent: number;

        if (this.props.leftPaneInitialWidth) {
            if (Utils_String.endsWith(this.props.leftPaneInitialWidth, "%")) {
                widthInPercent = parseInt(this.props.leftPaneInitialWidth, 10);
            } else {
                widthInPx = parseInt(this.props.leftPaneInitialWidth, 10);
            }
        }

        let outerWidth = 0;
        try {
            outerWidth = window.outerWidth;
        }
        catch (e) {
            Diag.logError(Utils_String.format("window.outerWidth threw exception {0}", e));
        }

        let desiredWidth = widthInPx || (outerWidth * (widthInPercent || 40)) / 100 || 300;
        return (this.props.leftPaneInitialWidth) ? desiredWidth : Math.min(640, desiredWidth);
    }

    private _onChange = () => {
        this.setState(this._store.getState());
    }

    private _getSelectedItemContent(): JSX.Element {
        let content: JSX.Element = null;
        let selectedItem = this.state.selectedItems[0];
        if (selectedItem && selectedItem.data) {
            content = selectedItem.data.getDetails ? selectedItem.data.getDetails(this.props.instanceId) : null;
        }

        return content;
    }

    private _getItem(key: string, items: Item[]): Item {
        return items.filter((item: Item) => {
            return item.getKey() === key;
        })[0];
    }

    private _renderCell: (item: Item, index: number) => JSX.Element = (item: Item, index: number) => {
        return item.getOverview(this.props.instanceId);
    }

    private _store: Store;
    private _initialWidth: number;
    private _itemSelectorActions: ItemSelectorActions = null;
    private _twoPanelList: IList;
}
