/// copyright (c) microsoft corporation. all rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as PathTree from "Presentation/Scripts/TFS/Components/Tree/Tree";
import * as Search_Resources from "Search/Scripts/Resources/TFS.Resources.Search";
import { autobind, BaseComponent, css } from 'OfficeFabric/Utilities';
import { TreeStore, IItem, Node } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";
import { TreeCell, TreeCellProps } from "Presentation/Scripts/TFS/Components/Tree/TreeCell";
import { PathTreeAdapter, PathTreeStore } from "Search/Scripts/React/Components/PathTreeControl/PathTreeStore";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { FocusZone, FocusZoneDirection } from 'OfficeFabric/FocusZone';
import { getboldText } from "Search/Scripts/React/Components/PathControl/PathControlDropdownElementRenderer";
import { TooltipHost, DirectionalHint, TooltipOverflowMode } from "VSSUI/Tooltip";
import { announce } from "VSS/Utils/Accessibility";

import "VSS/LoaderPlugins/Css!Search/React/Components/TreeViewDropdown";

export interface ITreeViewDropdownProps {
    rootPath: string;
    items: IItem[];
    getStore: () => PathTreeStore;
    separator: string;
    onItemSelected(path: string): void;
    onItemExpand(path: string): void;
    onItemCollapse(path: string): void;
    message: (itemsCount: number) => string;
    filterText: string;
    activeDescendantIndex: number;
}

export interface ITreeViewDropdownState {
    width: number,
    height: number,
    lastMouseX: number,
    lastMouseY: number,
    resizing: boolean,
    resizeHappened: boolean
}

/**
 * This is set kept in mind the maximun height of the dropdown(=224px), and each element withing dropdown takes 32px,
 * So ideally list should render 224/32 = 7 items per page. Altering this value may modify the behavior when the next item is brought within the scroll view.
 */
const ITEMS_TO_RENDER_PER_LIST_PAGE = 7,
    MAX_HEIGHT: number = 400,
    PATH_ELEMENT_HEIGHT = 32,
    Path_DROPDOWN_DEFAULT_MAX_HEIGHT = 295;

export class TreeViewDropdown extends React.Component<ITreeViewDropdownProps, ITreeViewDropdownState> {
    private _viewState: ITreeViewDropdownState;
    private _pathControlDropdown: HTMLElement;
    private _mounted: boolean;
    private _tree: PathTree.Tree;

    constructor(props: ITreeViewDropdownProps) {
        super(props);

        this.state = this._viewState = {
            resizing: false,
            resizeHappened: false
        } as ITreeViewDropdownState;
        
        this._mounted = false;
    }

    public render(): JSX.Element {
        let items = this.props.items,
            itemsCount = items.length,
            minHeight: number,
            pathControlStyle = {
                width: this.state.width + "px",
                height: this.state.height + "px"
            },
            elementListStyle = {};

        // In case of only one element 32px is not enought to contain Element and the message
        // So adding +1 if elements are less than 7
        minHeight = itemsCount > ITEMS_TO_RENDER_PER_LIST_PAGE ? Path_DROPDOWN_DEFAULT_MAX_HEIGHT : (itemsCount + 1) * PATH_ELEMENT_HEIGHT;

        if (this.state.resizeHappened) {
            // Calculating height of the path control from the bottom of the window
            pathControlStyle["maxHeight"] = (document.body.clientHeight - this._pathControlDropdown.getBoundingClientRect().top) + "px";
            pathControlStyle["maxWidth"] = (document.body.clientWidth - this._pathControlDropdown.getBoundingClientRect().left) + "px";
            pathControlStyle["minHeight"] = minHeight + "px";
            elementListStyle["maxHeight"] = "none";
        }

        let selectedFullPath = "";

        if (this.props.items != null &&
            this.props.activeDescendantIndex != -1 &&
            this.props.activeDescendantIndex < this.props.items.length) {

            selectedFullPath = this.props.items[this.props.activeDescendantIndex].fullName;
        }

        return (
            // Ease out the dropdown when the control is not mounted yet.
            // On subsequent render "easing-out" the dropdown gives a blurry effect
            // and is quited visible since the dropdown stays
            <div className={css("path-dropdown", {
                "ease-out": !this._mounted
            })}
                ref={(pathControlDropdown) => { this._pathControlDropdown = pathControlDropdown }}
                style={pathControlStyle}>
                <div
                    className={css("element-list")}
                    tabIndex={-1}
                    style={elementListStyle}>
                        <PathTree.Tree
                            ref={(item) => { this._tree = item }}
                            items={this.props.items}
                            selectedFullPath={selectedFullPath}
                            onItemSelected={this.props.onItemSelected}
                            onItemExpand={this.props.onItemExpand}
                            onItemCollapse={this.props.onItemCollapse}
                            onRenderItem={this._onRenderItem}
                            getItemIsCollapsible={this.getItemIsCollapsible}
                            getItemCommands={null}
                        />
                </div>
                <div className={css("message")}
                    onMouseDown={this._onHelperMessageMouseDown}
                    aria-live="assertive">
                    {this.props.message(this._getFilteredItemsCount())}
                </div>
                <div className={css("bowtie-icon", "resizer", "bowtie-corner-resize")}
                    tabIndex={-1}
                    onMouseDown={this._onResizerMouseDown}
                />
            </div>
        );
    }

    public componentWillReceiveProps(nextProps: ITreeViewDropdownProps) {
        if (this.props.activeDescendantIndex !== nextProps.activeDescendantIndex &&
            this.getItemIsCollapsible(nextProps.items[nextProps.activeDescendantIndex])) {
            const message: string = nextProps.items[nextProps.activeDescendantIndex].expanded
                ? Search_Resources.Expanded
                : Search_Resources.Collapsed;
            announce(message);
        }
    }

    /**
     * Checks if a node is collapsible on the basis of the number of children it has.
     * No children means it is not expandable/collapsible.
     */
    private getItemIsCollapsible = (treeItem: IItem): boolean => {
        return this.props.getStore().hasChildren(treeItem);
    }

    /**
     * Presentation of each node in the tree.
     */
    private _onRenderItem = (treeItem: IItem): JSX.Element => {
        let isFilteredNode = this._isFilteredNode(treeItem);
        let name = ignoreCaseComparer(treeItem.fullName, this.props.separator) === 0 ? this.props.separator : treeItem.name;

        let text = isFilteredNode ? getboldText(name, isFilteredNode.highlightText) : name;

        return (
            <div className={css("tree-cell-node")}>
                <TooltipHost content={treeItem.name}
                    directionalHint={DirectionalHint.bottomCenter}
                    overflowMode={TooltipOverflowMode.Parent}>
                    <div className="pathtree-node"
                        dangerouslySetInnerHTML={{ __html: text }}
                        onClick={(evt: React.MouseEvent<HTMLDivElement>) =>
                        {
                            // 1. We're using "Select Index" for the tree view so that the node that's under focus has the highlight.
                            // 2. Tree control has the check if the node is selected and the node row is clicked, it just expands/collapses that node.
                            // 3. We have wired this handler when the node name area is clicked and block the default events in the tree control i.e. expand/collapse.
                            this.props.onItemSelected(treeItem.fullName);
                            evt.stopPropagation();
                        }}>
                    </div>
                </TooltipHost>
            </div>
        );
    }

    /**
     * If a node is filtered and needs highlight for the text it has, this method
     * will return it with the substring that needs highlighting (bold).
     */
    private _isFilteredNode(treeItem: IItem): { needsHighlight: boolean, highlightText: string } {
        let isFilteredNode: boolean = false;

        let filter = this._removeLastSlash(this.props.filterText.trim());

        if (filter.indexOf(this.props.separator) !== -1) {
            isFilteredNode = ignoreCaseComparer(treeItem.fullName, filter) === 0;
        }
        else if (filter.length !== 0 &&
            treeItem.name.toLocaleLowerCase().search(filter.toLocaleLowerCase()) !== -1) {
            isFilteredNode = true;
        }

        return {
            needsHighlight: isFilteredNode,
            highlightText: isFilteredNode ? filter : null
        };
    }

    private _getFilteredItemsCount(): number {
        return this.props.items ? this.props.items.filter((item) => this._isFilteredNode(item).needsHighlight).length : 0;
    }

    private _removeLastSlash(path: string): string {
        while (path.length > 0 &&
            (path[path.length - 1] == '\\' ||
                path[path.length - 1] == '/')) {

            path = path.substr(0, path.length - 1);
        }

        return path;
    }

    public componentWillUnmount(): void {
        const {ownerDocument} = ReactDOM.findDOMNode(this);
        ownerDocument.removeEventListener('mousemove', this._onMouseMove);
        ownerDocument.removeEventListener('mouseup', this._onMouseUp);
    }

    public componentDidMount(): void {
        this._mounted = true;
    }
    
    /**
     * Function called when the mouse event happens on the helper message in the dropdown.
     * The mouse operation is made NoOp by supressing the event.
     * @param evt
     */
    @autobind
    private _onHelperMessageMouseDown(evt) {
        evt.stopPropagation();
        evt.preventDefault();
    }

    /**
     * Binds Mouse move and Mouse up events to the resizer div and stores intial set of values required for resizing 
     * @param evt
     */
    @autobind
    private _onResizerMouseDown(evt: any) {
        this._viewState = {
            width: this._pathControlDropdown.getBoundingClientRect().width,
            height: this._pathControlDropdown.getBoundingClientRect().height,
            lastMouseX: evt.clientX,
            lastMouseY: evt.clientY,
            resizing: true
        } as ITreeViewDropdownState;

        const {ownerDocument} = ReactDOM.findDOMNode(this);

        evt.preventDefault();
        evt.stopPropagation();

        ownerDocument.addEventListener('mousemove', this._onMouseMove);
        ownerDocument.addEventListener('mouseup', this._onMouseUp);

        this.setState(this._viewState);
    }

    /**
     * Updates Width and height of the container as the mouse moves, while resizing the container
     * @param evt
     */
    @autobind
    private _onMouseMove(evt: any) {
        if (this.state.resizing) {
            let width = (this.state.width + evt.clientX - this.state.lastMouseX),
                height = (this.state.height + evt.clientY - this.state.lastMouseY);

            this._viewState.width = width;
            this._viewState.height = height;
            this._viewState.lastMouseX = evt.clientX;
            this._viewState.lastMouseY = evt.clientY;

            if (!this.state.resizeHappened) {
                TelemetryHelper.traceLog({
                    "PathControlDropdownResizing": true
                });

                this._viewState.resizeHappened = true;
            }

            this.setState(this._viewState);
        }
    }

    /**
     * Remove resize mouse event listeners on mouse up
     * @param evt
     */
    @autobind
    private _onMouseUp(evt: any) {
        this._viewState.resizing = false;
        const {ownerDocument} = ReactDOM.findDOMNode(this);
        ownerDocument.removeEventListener('mousemove', this._onMouseMove);
        ownerDocument.removeEventListener('mouseup', this._onMouseUp);
        this.setState(this._viewState);
    }
}