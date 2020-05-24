import * as React from "react";
import * as ReactDOM from "react-dom";
import * as _FocusZone from "OfficeFabric/FocusZone";
import * as PathTree from "Presentation/Scripts/TFS/Components/Tree/Tree";
import { TreeStore, IItem, Node } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { ITreeDropdownProps } from "Search/Scenarios/Shared/Components/TreeFilter/TreeFilter.Props";

import "VSS/LoaderPlugins/Css!Search/Scenarios/Shared/Components/TreeFilter/TreeDropdown";

export interface ITreeDropdownState {
    width: number;

    height: number;

    lastMouseX: number;

    lastMouseY: number;

    resizing: boolean;

    resizeHappened: boolean;
}

/**
 * This is set kept in mind the maximun height of the dropdown(=224px), and each element withing dropdown takes 32px,
 * So ideally list should render 224/32 = 7 items per page. Altering this value may modify the behavior when the next item is brought within the scroll view.
 */
const ITEMS_TO_RENDER_PER_LIST_PAGE = 7,
    MAX_HEIGHT: number = 400,
    PATH_ELEMENT_HEIGHT = 32,
    Path_DROPDOWN_DEFAULT_MAX_HEIGHT = 295;

export class TreeDropdown extends React.Component<ITreeDropdownProps, ITreeDropdownState> {
    private _viewState: ITreeDropdownState;
    private _treeDropdown: HTMLElement;
    private _tree: PathTree.Tree;

    constructor(props: ITreeDropdownProps) {
        super(props);

        this.state = this._viewState = {
            resizing: false,
            resizeHappened: false
        } as ITreeDropdownState;
    }

    public render(): JSX.Element {
        const { items, onGetFooterMessage } = this.props,
            { height, width } = this.state,
            itemsCount = items.length,
            pathControlStyle = {
                width: `${width}px`,
                height: `${height}px`
            },
            elementListContainerStyle = {};

        // In case of only one element 32px is not enought to contain Element and the message
        // So adding +1 if elements are less than 7
        const minHeight = itemsCount > ITEMS_TO_RENDER_PER_LIST_PAGE ? Path_DROPDOWN_DEFAULT_MAX_HEIGHT : (itemsCount + 1) * PATH_ELEMENT_HEIGHT;

        if (this.state.resizeHappened) {
            // Calculating height of the path control from the bottom of the window
            pathControlStyle["maxHeight"] = `${(this.props.onGetPageHeight() - this._treeDropdown.getBoundingClientRect().top)}px`;
            pathControlStyle["maxWidth"] = `${(this.props.onGetPageWidth() - this._treeDropdown.getBoundingClientRect().left)}px`;
            pathControlStyle["minHeight"] = `${minHeight}px`;
            elementListContainerStyle["maxHeight"] = "none";
        }

        return (
            <div className="tree-dropdown"
                ref={(element) => { this._treeDropdown = element }}
                style={pathControlStyle}>
                <div className="element-list"
                    style={elementListContainerStyle}>
                    <PathTree.Tree
                        ref={tree => this._tree = tree}
                        {...this.props}
                        selectedFullPath={this._getSelectedFullPath()}
                        onRenderItem={this._onTreeItemRender}
                        getItemIsCollapsible={this.props.onGetItemIsCollapsible}
                        clickOnSelectedNodeBehavior="select" />
                </div>
                <div className="message">{onGetFooterMessage(this.props.itemsDisplayCount, this.props.searchType)}</div>
                <div className="bowtie-icon resizer bowtie-corner-resize" onMouseDown={this._onResizerMouseDown} />
            </div>
        );
    }

    public componentWillUnmount(): void {
        const { ownerDocument } = ReactDOM.findDOMNode(this);
        ownerDocument.removeEventListener('mousemove', this._onMouseMove);
        ownerDocument.removeEventListener('mouseup', this._onMouseUp);
    }

    public componentDidUpdate(): void {
        if (this._tree) {
            this._tree.forceUpdate();
        }
    }

    private _onTreeItemRender = (item: IItem): JSX.Element => {
        const { items, activeDescendantIndex, highlightText } = this.props;
        const isActive = items[activeDescendantIndex] === item;
        return this.props.onTreeItemRender(item, isActive, highlightText);
    }

    private _getSelectedFullPath(): string {
        const { items, activeDescendantIndex } = this.props;
        if (activeDescendantIndex >= 0 && activeDescendantIndex < items.length) {
            return items[activeDescendantIndex].fullName;
        }

        return "";
    }

    /**
     * Function called when the mouse event happens on the helper message in the dropdown.
     * The mouse operation is made NoOp by supressing the event.
     * @param evt
     */
    private _onHelperMessageMouseDown = (evt): void => {
        if (evt.stopPropagation) {
            evt.stopPropagation();
        }

        if (evt.peventDefault) {
            evt.peventDefault();
        }
    }

    /**
     * Binds Mouse move and Mouse up events to the resizer div and stores intial set of values required for resizing 
     * @param evt
     */
    private _onResizerMouseDown = (evt: React.MouseEvent<HTMLElement>): void => {
        this._viewState = {
            width: this._treeDropdown.getBoundingClientRect().width,
            height: this._treeDropdown.getBoundingClientRect().height,
            lastMouseX: evt.clientX,
            lastMouseY: evt.clientY,
            resizing: true
        } as ITreeDropdownState;

        const { ownerDocument } = ReactDOM.findDOMNode(this);

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
    private _onMouseMove = (evt?): void => {
        if (this.state.resizing) {
            let width = (this.state.width + evt.clientX - this.state.lastMouseX),
                height = (this.state.height + evt.clientY - this.state.lastMouseY);

            this._viewState.width = width;
            this._viewState.height = height;
            this._viewState.lastMouseX = evt.clientX;
            this._viewState.lastMouseY = evt.clientY;

            if (!this.state.resizeHappened) {
                this._viewState.resizeHappened = true;
            }

            this.setState(this._viewState);
        }
    }

    /**
     * Remove resize mouse event listeners on mouse up
     * @param evt
     */
    private _onMouseUp = (evt?) => {
        this._viewState.resizing = false;
        const { ownerDocument } = ReactDOM.findDOMNode(this);
        ownerDocument.removeEventListener('mousemove', this._onMouseMove);
        ownerDocument.removeEventListener('mouseup', this._onMouseUp);
        this.setState(this._viewState);
    }
}
