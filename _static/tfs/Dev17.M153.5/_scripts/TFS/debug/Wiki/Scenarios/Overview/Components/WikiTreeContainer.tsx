import * as React from "react";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { autobind } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import { WikiPage, WikiType } from "TFS/Wiki/Contracts";
import { RepoConstants, WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { getParentPagePath } from "Wiki/Scripts/Helpers";
import { FilterableWikiTreeProps, FilterableWikiTree } from "Wiki/Scenarios/Integration/Tree/FilterableWikiTree";
import { ContainerProps } from "Wiki/Scenarios/Overview/Components/OverviewContainer";
import { getTreeItemCommands } from "Wiki/Scenarios/Overview/WikiCommands";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/WikiTreeContainer";

export class WikiTreeContainer extends React.Component<ContainerProps, {}> {
    private _filteredPagesClickCount: number;
    private _selectedPagePath: string;
    private _isEditing: boolean;
    private _filterableWikiTree: FilterableWikiTree;

    constructor(props: ContainerProps) {
        super(props);

        this._filteredPagesClickCount = 0;
        this._selectedPagePath = this._getSelectedPath(props);
        this._isEditing = this._isEditingState(props);
    }

    public shouldComponentUpdate(nextProps: ContainerProps): boolean {
        const newSelectedPagePath: string = this._getSelectedPath(nextProps);
        const newIsEditingState: boolean = this._isEditingState(nextProps);
       
        /*
            1. WikiPagesStore and TreeStore are listened by FilterableWikiTree hence not required to re-render container based on that.
            2. All the other props passed to FilterableWikiTree are callbacks which are not expected to change.
            3. So, checking just for the below two props is sufficient to reduce unnecessary re-rendering of this container.
        */
        return this._selectedPagePath !== newSelectedPagePath
            || this._isEditing !== newIsEditingState;
    }

    public render(): JSX.Element {
        this._selectedPagePath = this._getSelectedPath(this.props);
        this._isEditing = this._isEditingState(this.props);

        const filterableWikiTreeProps: FilterableWikiTreeProps = {
            pagesStore: this.props.storesHub.wikiPagesStore,
            treeStore: this.props.storesHub.treeStore,
            selectedFullPath: this._selectedPagePath,
            isEditing: this._isEditing,
            onPageSelected: this._onPageSelected,
            onPageExpand: this.props.actionCreator.expandTreeItem,
            onPageCollapse: this.props.actionCreator.collapseTreeItem,
            getPageCommands: this._getPageCommands,
            onPageKeyDown: this.props.actionCreator.onPageKeyDown,
            getPagesToFilter: this._getPagesToFilter,
            onFilterCleared: this._onFilterCleared,
            onFilteredPageSelected: this._onFilteredPageSelected,
            onDrag: this.props.actionCreator.onPageDrag,
            onDrop: this.props.actionCreator.onPageDrop,
            canDrag: this.props.actionCreator.isValidDragSource,
            canDrop: this.props.actionCreator.isValidDropTarget,
            onOpenInNewTab: this.props.actionCreator.openInNewTab,
            onSearchWithWikiSearchClick: this.props.actionCreator.onSearchWithWikiSearchClick,
        };

        return <div className={"wiki-tree-container"}>
            <FilterableWikiTree {...filterableWikiTreeProps}
                ref={this._refTree} />
        </div>;
    }

    @autobind
    public setFilterFocus(): void {
        this._filterableWikiTree.focusFilter();
    }

    @autobind
    private _refTree(filterableWikiTree: FilterableWikiTree): void {
        this._filterableWikiTree = filterableWikiTree;
    }

    @autobind
    private _getPageCommands(page: WikiPage): IContextualMenuItem[] {
        const state = this.props.storesHub.state;
        const pagePath = (page && page.path) || RepoConstants.RootPath;
        const isCurrentItem = this._selectedPagePath === pagePath;
        const wikiItem = this.props.storesHub.wikiPagesStore.state.wikiPages[pagePath];
        // In case of undefined permissions, show Edit actions and server will throw error on save in case of no permissions.
        const canEditWiki: boolean = state.sharedState.permissionState.hasContributePermission !== false;
        const isCodeWiki: boolean = state.sharedState.commonState.wiki.type === WikiType.CodeWiki;

        const commandOptions = {
            actionCreator: this.props.actionCreator,
            item: wikiItem,
            isEditing: this._isEditing,
            canEditWiki: canEditWiki,
            isCurrentItem: isCurrentItem,
            isCodeWiki: isCodeWiki,
        };

        return getTreeItemCommands(commandOptions);
    }

    @autobind
    private _onPageSelected(path: string, depth?: number): void {
        this.props.actionCreator.changePath(path);   
    }

    @autobind
    private _getPagesToFilter(): IPromise<WikiPage[]> {
        this._filteredPagesClickCount = 0;
        this.props.actionCreator.telemetrySpy.publishPageFilterPerformed();

        return this.props.actionCreator.getPagesToFilter();
    }

    @autobind
    private _onFilteredPageSelected(path: string, depth?: number): void {
        this._filteredPagesClickCount++;
        this.props.actionCreator.telemetrySpy.publishFilteredPagesClickedCount(this._filteredPagesClickCount);
        this.props.actionCreator.changePath(path);
    }

    @autobind
    private _onFilterCleared(path: string): void {
        this._filteredPagesClickCount = 0;
        this.props.actionCreator.onFilterCleared(path);
    }

    private _getSelectedPath(props: ContainerProps): string {
        const state = props.storesHub.state;
        const tempPage: WikiPage = props.storesHub.wikiPagesStore.state.tempPage;

        return tempPage ? tempPage.path : state.sharedState.urlState.pagePath;
    }

    private _isEditingState(props: ContainerProps): boolean {
        const state = props.storesHub.state;

        return state.sharedState.urlState.action === WikiActionIds.Edit;
    }
}
