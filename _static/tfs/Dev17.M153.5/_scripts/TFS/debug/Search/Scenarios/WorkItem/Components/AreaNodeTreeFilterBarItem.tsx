import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { TreeFilter, ContentLoadState } from "Search/Scenarios/Shared/Components/TreeFilter";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { FilterBarItem, IFilterBarItemState, IFilterBarItemProps } from "SearchUI/FilterBar";
import { ActionCreator } from "Search/Scenarios/WorkItem/Flux/ActionCreator";
import { StoresHub, AggregatedState } from "Search/Scenarios/WorkItem/Flux/StoresHub";
import { AreaNodePathSeparator } from "Search/Scenarios/WorkItem/Constants";
import { TreeCell, TreeCellProps } from "Presentation/Scripts/TFS/Components/Tree/TreeCell";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/AreaNodeTreeFilterBarItem";
import { SearchType } from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore";
import { announce } from "VSS/Utils/Accessibility";

export interface IAreaNodeTreeFilterBarItemProps extends IFilterBarItemProps {
    actionCreator: ActionCreator;

    storesHub: StoresHub;

    enabled: boolean;

    onItemSelected: (name: string, path: string) => void;
}

export interface IAreaNodeTreeFilterBarItemState extends IFilterBarItemState<string> {
    items: IItem[];

    defaultPath: string;

    contentLoadingState: ContentLoadState;

    areaNodeTreeItemsCount: number;

    searchType: SearchType;

    isTreeDropdownActive: boolean;
}

export class AreaNodeTreeFilterBarItem extends FilterBarItem<string, IAreaNodeTreeFilterBarItemProps, IAreaNodeTreeFilterBarItemState> {
    constructor(props: IAreaNodeTreeFilterBarItemProps) {
        super(props);
        this.state = this.getState(props);
    }

    public focus(): void {
    }

    public forceUpdate(): void {
    }

    public render(): JSX.Element {
        const { filterItemKey, enabled } = this.props;
        const {
            items,
            contentLoadingState,
            defaultPath,
            areaNodeTreeItemsCount,
            searchType,
            isTreeDropdownActive } = this.state;
        const { actionCreator } = this.props;

        return <TreeFilter
            name={filterItemKey}
            enabled={enabled}
            searchable={true}
            items={items}
            defaultPath={defaultPath}
            searchTextPlaceholder={Resources.AreaNodeTreePlaceholderText}
            pathSeparator={AreaNodePathSeparator}
            label={Resources.AreaPathDisplayLabel}
            searchBoxClearTextAriaLabel=""
            applyButtonAriaLabel=""
            contentLoadState={contentLoadingState}
            onItemSelected={this.onItemSelected}
            onItemExpand={actionCreator.expandTreeItem}
            onItemCollapse={actionCreator.collapseTreeItem}
            onTreeItemRender={this.onTreeItemRender}
            onGetItemIsCollapsible={this.onGetItemIsCollapsible}
            onGetPageHeight={this.onGetPageHeight}
            onGetPageWidth={this.onGetPageWidth}
            onGetFooterMessage={this.onGetFooterMessage}
            onSearchTextChanged={actionCreator.refineTreeItems}
            onDismissDropdown={actionCreator.dismissTreeDropdown}
            calloutProps={
                {
                    title: Resources.RefineFiltersText,
                    content: Resources.AreaPathFilterCalloutContent
                }
            }
            itemsDisplayCount={areaNodeTreeItemsCount}
            searchType={searchType}
            isTreeDropdownActive={isTreeDropdownActive}
            onInvokeDropdown={actionCreator.invokeTreeDropdown} />;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.props.storesHub.areaNodeTreeStore.addChangedListener(this.onStoreChanged);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this.props.storesHub.areaNodeTreeStore.removeChangedListener(this.onStoreChanged);
    }

    private onStoreChanged = (): void => {
        this.setState(this.getState(this.props));
    }

    private onItemSelected = (name: string, path: string): void => {
        this.setFilterValue({ value: [path] });
        const { onItemSelected } = this.props;
        if (onItemSelected) {
            onItemSelected(name, path);
        }
    }

    private onGetFooterMessage = (
        itemCount: number,
        searchText: string,
        searchType: SearchType,
        isEditable?: boolean,
        isEditing?: boolean): string => {
        const { contentLoadingState } = this.state;
        let footerMessage;
        if (contentLoadingState === ContentLoadState.LoadFailed) {
            footerMessage = Resources.AreaNodesLoadFailed;
        }
        else if (searchType !== SearchType.Keyword || !isEditing) {
            footerMessage = itemCount <= 1
                ? Resources.ShowingSingleAreaPath
                : Resources.ShowingNAreaPaths.replace("{0}", itemCount.toString());
        }
        else {
            footerMessage = itemCount <= 1
                ? (itemCount === 0
                    ? Resources.NoResultsForSearchText.replace("{0}", searchText)
                    : Resources.FoundSingleAreaPath)
                : Resources.FoundNAreaPaths.replace("{0}", itemCount.toString());
        }

        announce(footerMessage);
        return footerMessage;
    }

    private onGetItemIsCollapsible = (item: IItem): boolean => {
        if (item) {
            const { areaNodeTreeState } = this.props.storesHub.getAggregatedState();
            return !areaNodeTreeState.items[item.fullName].isLeafNode;
        }
    }

    private onTreeItemRender = (treeItem: IItem, isActive: boolean, highlightText?: string): JSX.Element => {
        const text = treeItem.depth > 0 ? treeItem.name : treeItem.fullName;

        return <TreeCell
            iconClass=""
            className="areNode-treeCell--container"
            name={text}
            highlightText={highlightText}
            title={treeItem.fullName} />;
    }

    private getState(props: IAreaNodeTreeFilterBarItemProps): IAreaNodeTreeFilterBarItemState {
        const { areaNodeTreeState, areaNodeTreeItemsCount } = props.storesHub.getAggregatedState();
        return {
            items: areaNodeTreeState.visibleItems(),
            contentLoadingState: areaNodeTreeState.initialLoadingState,
            defaultPath: areaNodeTreeState.defaultPath,
            areaNodeTreeItemsCount,
            searchType: areaNodeTreeState.searchType,
            isTreeDropdownActive: areaNodeTreeState.isTreeDropdownActive
        };
    }

    private onGetPageHeight(): number {
        const searchPageElements: HTMLCollectionOf<Element> = document.getElementsByClassName("search-Page");
        return searchPageElements[0].clientHeight;
    }

    private onGetPageWidth(): number {
        const searchPageElements: HTMLCollectionOf<Element> = document.getElementsByClassName("search-Page");
        return searchPageElements[0].clientWidth;
    }
}
