import * as React from "react";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Icon } from "OfficeFabric/Icon";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind, css, format } from "OfficeFabric/Utilities";

import {announce} from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import { Tree, TreeProps, RenderItemOptions } from "Presentation/Scripts/TFS/Components/Tree/Tree";
import { TreeCell, TreeCellProps } from "Presentation/Scripts/TFS/Components/Tree/TreeCell";
import {
    ActionAdapter,
    IItem,
    TreeStore,
} from "Presentation/Scripts/TFS/Stores/TreeStore";
import { WikiPage } from "TFS/Wiki/Contracts";
import { WikiSearchCommon } from "Search/Scripts/Providers/Wiki/TFS.Search.Registration.WikiSearchAdapter";
import { SearchBox } from "VersionControl/Scenarios/Shared/Trees/SearchBox";

import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { getDepthOfPage, localeCaseInsensitiveContains, getPageNameFromPath } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import { isPageWithoutAssociatedContent } from "Wiki/Scripts/WikiPagesHelper";
import { filteredTreeNodeCompactModeDecider, treeNodeSortOrderDecider } from "Wiki/Scripts/WikiTreeHelper";

import { WikiTreeNode } from "Wiki/Scenarios/Overview/Components/WikiTreeNode";
import { WikiTreeNodeDraggableProps } from "Wiki/Scenarios/Overview/Components/WikiTreeNodeDraggable";
import { WikiPagesStore } from "Wiki/Scenarios/Overview/Stores/WikiPagesStore";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/Tree/FilterableWikiTree";

export interface FilterableWikiTreeProps {
    /* General tree operations props */
    treeStore: TreeStore;
    pagesStore: WikiPagesStore;
    selectedFullPath: string;
    onPageSelected(path: string, depth?: number): void;
    onPageExpand(path: string): void;
    onPageCollapse(path: string): void;
    getPageCommands?(page: WikiPage): IContextualMenuItem[];
    getPageIsDisabled?(page: WikiPage): boolean;
    isEditing?: boolean;
    treeRootDisplayName?: string;

    /* Filtering props */
    getPagesToFilter(): IPromise<WikiPage[]>;
    onFilteredPageSelected(path: string, depth?: number): void;
    onFilterCleared(selectedPath: string): void;
    setFilterFocusOnMount?: boolean;

    /* Telemetry callbacks */
    onSearchWithWikiSearchClick?(): void;

    /* Mouse and Keyboard operations props */
    onPageKeyDown?(page: WikiPage, event: React.KeyboardEvent<HTMLElement>): void;
    onDrag?(source: WikiPage): void;
    onDrop?(target: WikiPage, isReorderOperation?: boolean, isReorderAbove?: boolean): void;
    canDrag?(source: WikiPage): boolean;
    canDrop?(target: WikiPage, isReorderOperation?: boolean): boolean;
    onOpenInNewTab?(path: String): void;
}

export interface FilterableWikiTreeState {
    filterText: string;
    filteringInProgress: boolean;
    filteredPages: WikiPage[];
    filteringError: Error;
}

export class FilterableWikiTree extends React.Component<FilterableWikiTreeProps, FilterableWikiTreeState> {
    private _filteredTreeAdapter: ActionAdapter;
    private _filteredTreeStore: TreeStore;
    private _searchBox: SearchBox;
    // To scroll to the node selected in filter, when filter is cleared we need to set & unset selectedFullPath
    private _isNodeSelectedBeforeFilterClear: boolean;

    constructor(props: FilterableWikiTreeProps) {
        super(props);

        this.state = {
            filterText: null,
            filteringInProgress: false,
            filteredPages: [],
            filteringError: null,
        };

        this._isNodeSelectedBeforeFilterClear = undefined;
        this._filteredTreeStore = this._createFilteredTreeStore();
    }

    public componentDidMount(): void {
        this.props.treeStore.addChangedListener(this._onStoreChanged);
        this.props.pagesStore.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        if (this.props.treeStore) {
            this.props.treeStore.removeChangedListener(this._onStoreChanged);
        }

        if (this.props.pagesStore) {
            this.props.pagesStore.removeChangedListener(this._onStoreChanged);
        }
    }

    public render(): JSX.Element {
        const showReorderOverlay: boolean = this.props.pagesStore.state.isPageReorderInProgress;
        const showUnderlinedFilterBoxExperience = WikiFeatures.isProductDocumentationEnabled();

        return (
            <div className="wiki-tree">
                <div className={css("wiki-tree-reorder-overlay", showReorderOverlay && "visible")} />
                <div onDrop={this._defaultDropHandler}>
                    <SearchBox
                        onChangeValue={this._onFilterUpdate}
                        placeholder={WikiResources.FilterTreeWatermarkText}
                        className={"wiki-tree-searchbox"}
                        setFocusOnMount={this.props.setFilterFocusOnMount}
                        underlined={showUnderlinedFilterBoxExperience}
                        ref={this._refSearchBox}
                    />
                </div>
                <div className="scrollable-tree-container">
                    {this.state.filterText
                        ? this._getFilteredTree()
                        : this._getWikiTree()
                    }
                    {this.state.filterText &&
                        this._getSearchWithWikiSearchSuggestion()
                    }
                </div>
            </div>
        );
    }

    private _getSearchWithWikiSearchSuggestion(): JSX.Element {
        return <div className="search-with-wikisearch">
            <Icon iconName='search' className={"search-icon"} />
            <div className="find-in-wiki-search">
                <span>
                    {WikiResources.TreeFilterTryWikiSearch}
                </span>
            </div>
            <div className="find-in-wiki-search">
                <span>
                    {WikiResources.WordTry}
                </span>
                <Link
                    className={"wiki-search-link"}
                    onClick={this.onSearchLinkClick}>
                    {WikiResources.WikiSearch}
                </Link>
            </div>
        </div>;
    }

    @autobind
    public onSearchLinkClick(): void {
        this.props.onSearchWithWikiSearchClick && this.props.onSearchWithWikiSearchClick();
        WikiSearchCommon.performSearch(this.state.filterText, true);
    }

    @autobind
    public focusFilter(): void {
        if (this._searchBox) {
            this._searchBox.focus();
        }
    }

    @autobind
    private _refSearchBox(searchBox: SearchBox): void {
        this._searchBox = searchBox;
    }

    private _getWikiTree(): JSX.Element {
        const treeItems: IItem[] = this.props.treeStore.getVisible();

        treeItems.forEach((treeItem: IItem) => {
            if(!treeItem.name) {
                treeItem.name = (this.props.treeRootDisplayName || WikiResources.Pages);
                return;
            }
        });

        const wikiTreeProps = {
            items: treeItems,
            onRenderItem: this._onRenderItem,
            onItemKeyDown: this.props.onPageKeyDown && this._onItemKeyDown,
            selectedFullPath: this._isNodeSelectedBeforeFilterClear? undefined : this.props.selectedFullPath,
            onItemSelected: this.props.onPageSelected,
            onItemExpand: this.props.onPageExpand,
            onItemCollapse: this.props.onPageCollapse,
            getItemCommands: this.props.getPageCommands && this._getItemCommands,
            getItemHasCommands: this._getItemHasCommands,
            getItemIsCollapsible: isNotRootPath,
            getItemIsDisabled: this.props.getPageIsDisabled && this._getItemIsDisabled,
            onOpenInNewTab: this._onOpenInNewTab,
        } as TreeProps;

        // Once full tree rendered reset the state variable
        this._isNodeSelectedBeforeFilterClear = undefined;
        return <Tree {...wikiTreeProps} />;
    }

    @autobind
    private _onOpenInNewTab(path: string): void {
        const page: WikiPage = this.props.pagesStore.state.wikiPages[path];
        if (!page.isNonConformant) {
            this.props.onOpenInNewTab(path);
        }
    }

    @autobind
    private _onItemKeyDown(item: IItem, event: React.KeyboardEvent<HTMLElement>): void {
        const page: WikiPage = this.props.pagesStore.state.wikiPages[item.fullName];

        this.props.onPageKeyDown(page, event);
    }

    @autobind
    private _getItemCommands(item: IItem): IContextualMenuItem[] {
        const page: WikiPage = this.props.pagesStore.state.wikiPages[item.fullName];

        return this.props.getPageCommands(page);
    }

    @autobind _getItemIsDisabled(item: IItem): boolean {
        const page: WikiPage = this.props.pagesStore.state.wikiPages[item.fullName];

        return this.props.getPageIsDisabled(page);
    }

    private _getFilteredTree(): JSX.Element {
        if (this.state.filteringError) {
            return <MessageBar
                className={"error-message-bar"}
                messageBarType={MessageBarType.error}>
                {WikiResources.GetPagesToFilterFailedError}
            </MessageBar>;
        }

        if (this.state.filteringInProgress) {
            return <Spinner
                ariaLabel={WikiResources.FilteringInProgressAriaLabel}
                key={"FilterSpinner"}
                className={"wiki-spinner"}
            />;
        }

        const filteredPages: WikiPage[] = this.state.filteredPages;
        const filteredTreeItems: IItem[] = this._filteredTreeStore.getVisible();

        filteredTreeItems.forEach((filteredTreeItem: IItem) => {
            if(!filteredTreeItem.name) {
                filteredTreeItem.name = WikiResources.FilteredPages;
                return;
            }
        });

        const filterTreeProps = {
            items: filteredTreeItems,
            onRenderItem: this._onRenderFilteredItem,
            selectedFullPath: this.props.selectedFullPath,
            onItemSelected: this._onFilteredItemSelected,
            onItemExpand: this._onFilteredTreeItemExpanded,
            onItemCollapse: this._onFilteredTreeItemCollapsed,
            getItemIsCollapsible: isNotRootPath,
            getItemCommands: this.props.getPageCommands && this._getItemCommands,
            getItemHasCommands: this._getItemHasCommands,
            getItemIsDisabled: this.props.getPageIsDisabled && this._getItemIsDisabled,
            onOpenInNewTab: this._onOpenInNewTab,
        } as TreeProps;

        return filteredPages && filteredPages.length
            ? <Tree {...filterTreeProps} />
            : <div className="no-search-results-message">
                {WikiResources.NoResultsFoundMessage}
            </div>;
    }

    @autobind
    private _onFilteredItemSelected(path: string, depth?: number): void {
        // clicking on the `Filtered pages` heading, shouldn't do anything.
        if (depth !== 0) {
            this.props.onFilteredPageSelected(path, depth);
        }
    }

    @autobind
    private _onRenderItem(item: IItem, options: RenderItemOptions): JSX.Element {
        return this._onRenderTreeItem(item, options);
    }

    @autobind
    private _onRenderFilteredItem(item: IItem, options: RenderItemOptions): JSX.Element {
        return this._onRenderTreeItem(item, options, true);
    }

    private _onRenderTreeItem(item: IItem, options: RenderItemOptions, isFilteringTree?: boolean): JSX.Element {
        const name = item.name;
        const fullName = item.fullName || RepoConstants.RootPath;
        const tempPage = this.props.pagesStore.state.tempPage;
        const isCurrentItem = this.props.selectedFullPath && (this.props.selectedFullPath === fullName);
        const isDirty = isCurrentItem && this.props.isEditing;
        const wikiItem = this.props.pagesStore.state.wikiPages[fullName];

        const canDrag = Boolean(!isFilteringTree && this.props.canDrag && this.props.canDrag(wikiItem));
        const iconClass = (wikiItem && getDepthOfPage(wikiItem.path) === 1 && !wikiItem.order && !wikiItem.isNonConformant)
            ? "bowtie-home"
            : "bowtie-file-content";

        const treeCellProps = {
            name: name,
            iconClass: iconClass,
            isDirty: isDirty,
            highlightText: this.state.filterText,
        } as TreeCellProps;
        const wikiTreeNodeDraggableProps = {
            item: wikiItem,
            canDrag: canDrag,
            onDrag: this.props.onDrag,
            onDrop: this.props.onDrop,
            canDrop: this.props.canDrop,
        } as WikiTreeNodeDraggableProps;

        if (item.depth) {
            return (
                <WikiTreeNode
                    {...options}
                    {...treeCellProps}
                    {...wikiTreeNodeDraggableProps}
                />
            );
        } else {
            return (
                <div className={"wiki-tree-root"}>
                    <TreeCell
                        name={item.name}
                        title={item.name}
                        iconClass={""}
                    />
                </div>
            );
        }
    }

    @autobind
    private _onFilterUpdate(filterText: string): void {
        if (this.state.filterText && !filterText) {
            this._onFilterClear();

            return;
        }

        if (Utils_String.localeIgnoreCaseComparer(this.state.filterText, filterText) === 0) {
            return;
        }

        this.setState({
            filterText: filterText,
            filteringInProgress: true,
            filteringError: null,
        });

        this._updateFilteredStore(filterText);
    }

    @autobind
    private _onFilteredStoreChange(): void {
        this.setState({
            filteringInProgress: true,
            filteringError: null,
        });

        this._updateFilteredStore(this.state.filterText);
    }

    private _updateFilteredStore(filterText: string): void {
        const wikiPagesPromise = this.props.getPagesToFilter();
        const filteredPages: WikiPage[] = [];

        wikiPagesPromise.then(
            (pages) => {
                if (!pages) {
                    return null;
                }

                for (const page of pages) {
                    const pageName: string = getPageNameFromPath(page.path);
                    if (localeCaseInsensitiveContains(pageName, filterText)) {
                        filteredPages.push(page);
                    }
                }

                const message = filteredPages.length === 1
                    ? WikiResources.ResultsFoundSingular
                    : format(WikiResources.ResultsFoundPlural, filteredPages.length);
                announce(message, true);

                if (filteredPages) {
                    this._updateFilteredTree(filteredPages);
                }
            },
            (error: Error) => {
                this.setState({ filteringError: error });
            });
    }

    private _updateFilteredTree(filteredPages: WikiPage[]): void {
        if (filteredPages) {
            const nonLeafPagePaths: string[] = [];
            const leafPagePaths = filteredPages.filter(page => {
                if (page.isParentPage) {
                    nonLeafPagePaths.push(page.path);
                }
                return !page.isParentPage;
            })
                .map(page => page.path);

            this._filteredTreeAdapter.refreshItemsAndExpand.invoke(leafPagePaths);
            this._filteredTreeAdapter.foldersAdded.invoke(nonLeafPagePaths);
            this._filteredTreeAdapter.expandAll.invoke(null);
            this._filteredTreeAdapter.emitIfPending.invoke(null);
        }

        this.setState({
            filteringInProgress: false,
            filteredPages: filteredPages
        });
    }

    @autobind
    private _onFilteredTreeItemExpanded(path: string): void {
        this._filteredTreeAdapter.folderExpanded.invoke(path);
        this._filteredTreeAdapter.emitIfPending.invoke(null);

        this.forceUpdate();
    }

    @autobind
    private _onFilteredTreeItemCollapsed(path: string): void {
        this._filteredTreeAdapter.folderCollapsed.invoke(path);
        this._filteredTreeAdapter.emitIfPending.invoke(null);

        this.forceUpdate();
    }

    private _createFilteredTreeStore(): TreeStore {
        this._filteredTreeAdapter = new ActionAdapter();

        return new TreeStore({
            adapter: this._filteredTreeAdapter,
            isDeferEmitChangedMode: true,
            keepEmptyFolders: true,
            canCompactNodeIntoChild: (node, depth) => {
                return filteredTreeNodeCompactModeDecider(node, depth, this.state.filterText);
            },
            compareChildren: (parentPath, page1, page2) => {
                return treeNodeSortOrderDecider(parentPath, page1, page2, this.props.pagesStore.state.wikiPages);
            },
        });
    }

    @autobind
    private _defaultDropHandler(event: React.DragEvent<HTMLDivElement>): void {
        event.preventDefault();
        event.stopPropagation();
    }

    private _onFilterClear(): void {
        this._isNodeSelectedBeforeFilterClear = this.props.selectedFullPath ? true : false;
        this.setState({
            filterText: null,
            filteringInProgress: false,
            filteredPages: [],
            filteringError: null
        });

        this.props.onFilterCleared(this.props.selectedFullPath);
    }

    @autobind
    private _onStoreChanged(payload: WikiPagesStore): void {
        if (this.state.filterText) {
            // Reload Filtered pages only if pages are added or removed or renamed
            if ((payload.deletePage && payload.deletePage.arguments && payload.deletePage.arguments.length > 0)
                || (payload.renamePage && payload.renamePage.arguments && payload.renamePage.arguments.length > 0)
                || (payload.addPage && payload.addPage.arguments && payload.addPage.arguments.length > 0)
                || (payload.reorderPage && payload.reorderPage.arguments && payload.reorderPage.arguments.length > 0)
            ) {
                this._onFilteredStoreChange();
            }
        }

        this.forceUpdate();
    }

    @autobind
    private _getItemHasCommands(treeItem: IItem): boolean {
        const page: WikiPage = this.props.pagesStore.state.wikiPages[treeItem.fullName];

        return !isPageWithoutAssociatedContent(page);
    }
}

function isNotRootPath(treeItem: IItem): boolean {
    return treeItem.fullName !== RepoConstants.RootPath;
}
