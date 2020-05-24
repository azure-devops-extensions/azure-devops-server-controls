import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { List } from "OfficeFabric/List";
import { Spinner } from "OfficeFabric/Spinner";
import { Async, IPoint } from "OfficeFabric/Utilities";
import * as React from "react";
import { ignoreCaseComparer } from "VSS/Utils/String";

import { KeyCode, BrowserCheckUtils } from "VSS/Utils/UI";
import { MoreActionsButton } from "VSSUI/ContextualMenuButton";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";

import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Presentation/Components/Tree/Tree";

const enum ClassNames {
    treeMoreActionsButton = "tree-more-actions-button",
}

const virtualizeItemsThreshold = 100;

/**
 * The props of the Tree component.
 */
export interface TreeProps {
    items: IItem[];
    selectedFullPath: string;
    pathComparer?: (a: string, b: string) => number;
    getItemIsCollapsible?(treeItem: IItem): boolean;
    getItemIsDisabled?(treeItem: IItem): boolean;
    getItemHasCommands?(treeItem: IItem): boolean;
    getItemCommands?(treeItem: IItem): IContextualMenuItem[];
    getMenuItemProviders?(treeItem: IItem): IVssContextualMenuItemProvider[];
    onRenderItem(item: IItem, options?: RenderItemOptions): JSX.Element;
    onItemSelected: (path: string, depth?: number) => void;
    onItemExpand: (path: string) => void;
    onItemCollapse: (path: string) => void;
    onItemKeyDown?(item: IItem, event: React.KeyboardEvent<HTMLElement>): void;
    clickOnSelectedNodeBehavior?: "toggle" | "select";
    onOpenInNewTab?(path: string): void;
}

const lineHeightInPixels = 32;
const defaultItemsPerPage = 10;

/**
 * A generic Tree component based on Fabric List.
 */
export class Tree extends React.PureComponent<TreeProps, {}> {
    private treeDiv: HTMLDivElement;
    private list: List;
    private async: Async;
    private selectedIndex: number | undefined;
    private isPendingScrollToSelected: boolean;
    private treeItemWithContextMenuOpen: IItem;
    private contextualMenuTargetPoint: IPoint;
    private throttledScrollToSelectedIndex: () => void;

    static defaultProps = {
        pathComparer: ignoreCaseComparer,
    } as TreeProps;

    constructor(props: TreeProps) {
        super(props);

        this.setSelectedIndex(props);

        this.async = new Async();

        // Scroll delayed to avoid an anticipated layout that may get stale.
        // Let's wait to scroll once layout has completed. User won't notice.
        // This is also aligned with FabricUI, see MIN_SCROLL_UPDATE_DELAY in List.tsx
        const scrollDelay = 100;
        this.throttledScrollToSelectedIndex = this.async.debounce(this.scrollToSelectedIndex, scrollDelay, { leading: false });
    }

    public componentWillReceiveProps(nextProps: TreeProps) {
        if (nextProps.selectedFullPath !== this.props.selectedFullPath ||
            nextProps.items !== this.props.items) {
            this.setSelectedIndex(nextProps);
        }
    }

    public componentDidUpdate() {
        this.applyPendingScroll();
    }

    public componentWillUnmount() {
        this.async.dispose();
        delete this.async;
    }

    public render(): JSX.Element {
        const { items } = this.props;
        return (
            <div className="tree" ref={this.saveTreeDivRef}>
                <FocusZone direction={FocusZoneDirection.bidirectional}>
                    <List
                        ref={this.saveListRef}
                        items={items}
                        getKey={(treeItem: IItem) => treeItem.fullName}
                        getPageHeight={this.getPageHeight}
                        onShouldVirtualize={ () => items && items.length > virtualizeItemsThreshold }
                        role="tree"
                        onRenderCell={(item: IItem, index: number) =>
                            <TreeNode
                                item={item}
                                isSelected={index === this.selectedIndex}
                                isCollapsible={!this.props.getItemIsCollapsible || this.props.getItemIsCollapsible(item)}
                                isContextualMenuOpen={this.treeItemWithContextMenuOpen === item}
                                isDisabled={this.props.getItemIsDisabled && this.props.getItemIsDisabled(item)}
                                contextualMenuTargetPoint={this.contextualMenuTargetPoint}
                                hasCommands={this.props.getItemCommands && (!this.props.getItemHasCommands || this.props.getItemHasCommands(item))}
                                getCommands={this.props.getItemCommands && (() => this.props.getItemCommands(item))}
                                getItemProviders={this.props.getMenuItemProviders && (() => this.props.getMenuItemProviders(item))}
                                onRenderItem={this.props.onRenderItem}
                                onSelected={() => this.props.onItemSelected(item.fullName, item.depth)}
                                onOpenInNewTab={this.props.onOpenInNewTab}
                                onExpandToggled={() => item.expanded ? this.props.onItemCollapse(item.fullName) : this.props.onItemExpand(item.fullName)}
                                onItemContextMenu={this.onItemContextMenu}
                                onDismissContextualMenu={this.onDismissContextualMenu}
                                onItemKeyDown={this.props.onItemKeyDown}
                                onContextMenuFocused={this.onContextMenuFocused}
                                clickOnSelectedNodeBehavior={this.props.clickOnSelectedNodeBehavior}
                            />
                        }
                    />
                </FocusZone>
            </div>);
    }

    /**
     * Updates the component forcefully.
     * Fabric List does't update even when the contributing item(s) in the "items" property of list have updated without affecting "items" array prop.
     * That's because list implementation of "componentWillReceiveProps" rejects any updates on list "items" owing to shallow comparison.
     * Therefore, have to make an explicit call to list's "forceUpdate" method for updates to happen.
     */
    public forceUpdate(): void {
        super.forceUpdate();
        if (this.list) {
            this.list.forceUpdate();
        }
    }

    private saveTreeDivRef = (ref: HTMLDivElement) => {
        this.treeDiv = ref;
    }

    private onContextMenuFocused = () => {
        if (this.treeDiv) {
            // FocusZone may leave more than one element with tabindex=0.
            // We need that value to happen only in the focused element of the FocusZone.
            // Why? We have to keep it visible so the user can return to the FocusZone using the keyboard.
            // This is only necessary for the MoreActionsButton, that's only visible on selected and hover.

            const buttons = this.treeDiv.querySelectorAll(`.${ClassNames.treeMoreActionsButton}[tabindex="0"]`);
            for (let index = 0; index < buttons.length; index++) {
                const button = buttons[index] as HTMLButtonElement;
                button.tabIndex = -1;
            }
        }
    }

    private saveListRef = (ref: List) => {
        this.list = ref;
        this.applyPendingScroll();
    }

    private setSelectedIndex(props: TreeProps): void {
        const newIndex = getSelectedIndex(props);

        // If we're switching between undefined and 0, don't scroll, both mean the first item.
        const hasToScroll = newIndex > 0 || this.selectedIndex > 0;

        this.selectedIndex = newIndex;
        this.isPendingScrollToSelected = this.isPendingScrollToSelected || hasToScroll;
    }

    private applyPendingScroll(): void {
        if (this.isPendingScrollToSelected && this.list && this.selectedIndex !== undefined) {
            this.throttledScrollToSelectedIndex();
            this.isPendingScrollToSelected = false;
        }
    }

    private scrollToSelectedIndex = () => {
        this.list.scrollToIndex(this.selectedIndex, () => lineHeightInPixels);
    }

    // This method is necessary for List.scrollToIndex to behave correctly while loading.
    private getPageHeight = (): number => {
        return defaultItemsPerPage * lineHeightInPixels;
    }

    private onItemContextMenu = (treeItem: IItem, event: React.MouseEvent<HTMLElement>): void => {
        this.treeItemWithContextMenuOpen = treeItem;
        this.contextualMenuTargetPoint = isMouseInteraction(event) && { x: event.clientX, y: event.clientY };
        this.list.forceUpdate();

        event.preventDefault();
    }

    private onDismissContextualMenu = (): void => {
        this.treeItemWithContextMenuOpen = undefined;
        this.contextualMenuTargetPoint = undefined;
        this.list.forceUpdate();
    }
}

function isMouseInteraction(event: React.MouseEvent<HTMLElement>): boolean {
    return event.button !== 0 && event.clientX > 0 && event.clientY > 0;
}

function getSelectedIndex({ items, selectedFullPath, pathComparer }: TreeProps): number | undefined {
    return items &&
        selectedFullPath &&
        findIndex(items, item => pathComparer(item.fullName, selectedFullPath) === 0);
}

function findIndex<T>(items: T[], predicate: (item: T) => boolean): number | undefined {
    for (let i = 0; i < items.length; i++) {
        if (predicate(items[i])) {
            return i;
        }
    }
}

interface TreeNodeProps {
    item: IItem;
    isSelected: boolean;
    isCollapsible: boolean;
    isContextualMenuOpen: boolean;
    isDisabled: boolean;
    contextualMenuTargetPoint: IPoint;
    hasCommands: boolean;
    getCommands(): IContextualMenuItem[];
    getItemProviders(): IVssContextualMenuItemProvider[];
    onRenderItem: (item: IItem, options?: RenderItemOptions) => JSX.Element;
    onItemContextMenu(item: IItem, event: React.MouseEvent<HTMLElement>): void;
    onSelected: () => void;
    onExpandToggled: () => void;
    onDismissContextualMenu(): void;
    onItemKeyDown?(item: IItem, event: React.KeyboardEvent<HTMLElement>): void;
    onContextMenuFocused?(): void;
    clickOnSelectedNodeBehavior?: "toggle" | "select";
    onOpenInNewTab?(path: string): void;
}

export interface RenderItemOptions {
    isFocused: boolean;
}

interface TreeNodeState {
    isFocused: boolean;
}

class TreeNode extends React.PureComponent<TreeNodeProps, TreeNodeState> {
    public state: TreeNodeState = {
        isFocused: false,
    };

    static defaultProps = {
        clickOnSelectedNodeBehavior: "toggle"
    } as TreeNodeProps;

    public render(): JSX.Element {
        return (
            <div
                className="tree-row"
                data-is-focusable={true}
                role="treeitem"
                aria-disabled={this.props.isDisabled}
                aria-level={this.props.item.depth + 1}
                aria-expanded={this._getAriaExpanded()}
                aria-selected={this.props.isSelected}
                aria-label={this.props.item.name || this.props.item.fullName}
                aria-setsize={this.props.item.setSize}
                aria-posinset={this.props.item.indexInParent + 1 /* PosInSet is 1-indexed */}
                onKeyDown={this.handleNodeKeyDown}
                onClick={!this.props.isDisabled && this.onNodeSelected}
                onFocusCapture={() => this.setState({ isFocused: true })}
                onBlurCapture={() => this.setState({ isFocused: false })}
                onContextMenu={this.onContextMenu}>
                { getLeftSpacers(this.props.item.depth) }
                { this.props.item.isFolder && this.props.isCollapsible
                    ? renderExpandIcon(this.props.item.expanding, this.props.onExpandToggled)
                    : <span className="expand-icon-no" />
                }
                { this.props.onRenderItem(this.props.item, { isFocused: this.state.isFocused }) }
                {
                    this.props.hasCommands &&
                    this.props.getCommands &&
                    <MoreActionsButton
                        className={ClassNames.treeMoreActionsButton}
                        getItems={this.props.getCommands}
                        getItemProviders={this.props.getItemProviders}
                        isOpen={this.props.isContextualMenuOpen}
                        onDismiss={this.props.onDismissContextualMenu}
                        target={this.props.contextualMenuTargetPoint}
                        tabIndex={-1}
                        onFocus={this.props.onContextMenuFocused}
                        showTooltip={false}
                    />
                }
            </div>);
    }

    private _getAriaExpanded(): boolean {
        if (this.props.isCollapsible && this.props.item.isFolder) {
            return this.props.item.expanded || this.props.item.expanding;
        }

        return null;
    }

    private handleNodeKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (this.props.onItemKeyDown) {
            this.props.onItemKeyDown(this.props.item, event);
        }

        if (event.isPropagationStopped()) {
            return;
        }

        const { item: { isFolder, expanded }, isCollapsible, onExpandToggled } = this.props;
        if (event.keyCode === KeyCode.LEFT) {
            if (isFolder && expanded && isCollapsible) {
                onExpandToggled();
                event.stopPropagation();
                event.preventDefault();
            } else {
                // TODO v-panu Go to parent (locally, don't create action)
            }
        } else if (event.keyCode === KeyCode.RIGHT) {
            if (isFolder && !expanded) {
                onExpandToggled();
                event.stopPropagation();
                event.preventDefault();
            }
        }
    }

    private onNodeSelected = (event: React.MouseEvent<HTMLElement>): void => {
        if (this.props.onOpenInNewTab && this.shouldOpenInNewTab(event)) {
            this.props.onOpenInNewTab(this.props.item.fullName);
        } else {
            this.props.clickOnSelectedNodeBehavior === "toggle" && this.props.isSelected && this.props.isCollapsible
            ? this.props.onExpandToggled()
            : this.props.onSelected();
        }
    }

    private shouldOpenInNewTab = (event: React.MouseEvent<HTMLElement>): boolean => {
        return event.ctrlKey
            || (event.metaKey && BrowserCheckUtils.isSafari())
            || (event.button === 1 && BrowserCheckUtils.isFirefox());  // Middle click in firefox
    }

    private onContextMenu = (event: React.MouseEvent<HTMLElement>): void => {
      this.props.onItemContextMenu(this.props.item, event);
    }
}

function renderExpandIcon(isExpanding: boolean, onClick: () => void): JSX.Element {
    if (isExpanding) {
        return <Spinner className="expanding-icon" />;
    } else {
        return <span
            className="expand-icon bowtie-icon bowtie-chevron-right"
            onClick={withStopPropagation(onClick)}
        />;
    }
}

function withStopPropagation(handler: () => void): (e: React.MouseEvent<HTMLElement>) => void {
    return function(e: React.MouseEvent<HTMLElement>) {
        handler();
        e.stopPropagation();
    };
}

function getLeftSpacers(count: number): JSX.Element[] {
    return createFillArray(count).map(
        (_, index) => <span key={index} className="tree-left-spacer" />);
}

function createFillArray(count: number): any[] {
    return Array.apply(null, new Array(count));
}
