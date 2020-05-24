import * as React from "react";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { TreeFilter, ContentLoadState } from "Search/Scenarios/Shared/Components/TreeFilter";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { FilterBarItem, IFilterBarItemState, IFilterBarItemProps } from "SearchUI/FilterBar";
import { ActionCreator } from "Search/Scenarios/Code/Flux/ActionCreator";
import { StoresHub, AggregatedState, getPathSourceParams } from "Search/Scenarios/Code/Flux/StoresHub";
import { PathSeparator } from "Search/Scenarios/Code/Constants";
import { TreeCell, TreeCellProps } from "Presentation/Scripts/TFS/Components/Tree/TreeCell";
import { SearchType } from "Search/Scenarios/Shared/Base/Stores/SparseTreeStore";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Code/Components/TreeFilterBarItem";
import { announce } from "VSS/Utils/Accessibility";

export interface ITreeFilterBarItemProps extends IFilterBarItemProps {
    actionCreator: ActionCreator;

    storesHub: StoresHub;

    enabled: boolean;

    onSelectionChanged: (name: string, path: string) => void;
}

export interface ITreeFilterBarItemState extends IFilterBarItemState<string> {
    items: IItem[];

    defaultPath: string;

    searchable: boolean;

    contentLoadingState: ContentLoadState;

    treeItemsDisplayCount: number;

    searchType: SearchType;

    isTreeDropdownActive: boolean;
}

export class TreeFilterBarItem extends FilterBarItem<string, ITreeFilterBarItemProps, ITreeFilterBarItemState> {
    constructor(props: ITreeFilterBarItemProps) {
        super(props);
        this.state = this.getState(props);
    }

    public focus(): void {
    }

    public forceUpdate(): void {
    }

    public render(): JSX.Element {
        const { filterItemKey, enabled, actionCreator } = this.props;
        const { items,
            contentLoadingState,
            searchable,
            defaultPath,
            treeItemsDisplayCount,
            searchType,
            isTreeDropdownActive } = this.state;

        return <TreeFilter
            name={filterItemKey}
            enabled={enabled}
            searchable={searchable}
            items={items}
            defaultPath={defaultPath}
            pathSeparator={PathSeparator}
            label={Resources.PathDisplayLabel}
            searchTextPlaceholder={Resources.PathTreePlaceholderText}
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
            onDismissDropdown={actionCreator.dismissTreeDropdown}
            onSearchTextChanged={actionCreator.refineTreeItems}
            calloutProps={
                {
                    title: Resources.RefineFiltersText,
                    content: Resources.PathFilterCalloutContent
                }
            }
            itemsDisplayCount={treeItemsDisplayCount}
            searchType={searchType}
            isTreeDropdownActive={isTreeDropdownActive}
            onInvokeDropdown={actionCreator.invokeTreeDropdown} />;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.props.storesHub.treeStore.addChangedListener(this.onStoreChanged);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this.props.storesHub.treeStore.removeChangedListener(this.onStoreChanged);
    }

    private onStoreChanged = (): void => {
        this.setState(this.getState(this.props));
    }

    private onItemSelected = (name: string, path: string): void => {
        this.setFilterValue({ value: [path] });
        const { onSelectionChanged } = this.props;
        if (onSelectionChanged)
            onSelectionChanged(name, path);
    }

    private onGetFooterMessage = (
        itemCount: number,
        searchText: string,
        searchType: SearchType,
        isEditable?: boolean,
        isEditing?: boolean): string => {
        const { contentLoadingState } = this.state;
        let footerMessage;
        if (isEditable) {
            if (contentLoadingState === ContentLoadState.LoadFailed) {
                footerMessage = Resources.FoldersLoadFailedMessage;
            }
            else if (searchType !== SearchType.Keyword || !isEditing) {
                footerMessage = itemCount <= 1
                    ? Resources.ShowingSinglePath
                    : Resources.ShowingNPaths.replace("{0}", itemCount.toString());
            }
            else {
                footerMessage = itemCount <= 1
                    ? (itemCount === 0
                        ? Resources.NoResultsForSearchText.replace("{0}", searchText)
                        : Resources.FoundSinglePath)
                    : Resources.FoundNPaths.replace("{0}", itemCount.toString());
            }
        }
        else {
            footerMessage = Resources.SelectFolder;
        }

        announce(footerMessage);
        return footerMessage;
    }

    private onGetItemIsCollapsible = (item: IItem): boolean => {
        if (item) {
            const { treeState } = this.props.storesHub.getAggregatedState();
            return !treeState.items[item.fullName].isLeafNode;
        }
    }

    private onTreeItemRender = (treeItem: IItem, isActive: boolean, highlightText?: string): JSX.Element => {
        const text = treeItem.depth > 0 ? treeItem.name : treeItem.fullName;
        return <TreeCell
            iconClass="bowtie-folder"
            className="path-treeCell--container"
            name={text}
            highlightText={highlightText}
            title={treeItem.fullName} />;
    }

    private onGetPageHeight(): number {
        const searchPageElements: HTMLCollectionOf<Element> = document.getElementsByClassName("search-Page");
        return searchPageElements[0].clientHeight;
    }

    private onGetPageWidth(): number {
        const searchPageElements: HTMLCollectionOf<Element> = document.getElementsByClassName("search-Page");
        return searchPageElements[0].clientWidth;
    }

    private getState(props: ITreeFilterBarItemProps): ITreeFilterBarItemState {
        const { treeState, visibleTreeItems, treeItemsDisplayCount } = props.storesHub.getAggregatedState();
        return {
            items: visibleTreeItems,
            contentLoadingState: treeState.initialLoadingState,
            searchable: treeState.searchable,
            defaultPath: treeState.defaultPath,
            treeItemsDisplayCount,
            searchType: treeState.searchType,
            isTreeDropdownActive: treeState.isTreeDropdownActive
        };
    }
}
