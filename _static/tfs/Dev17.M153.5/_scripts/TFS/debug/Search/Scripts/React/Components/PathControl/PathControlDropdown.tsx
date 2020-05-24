/// copyright (c) microsoft corporation. all rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { autobind, BaseComponent, css } from 'OfficeFabric/Utilities';
import { List } from "OfficeFabric/List";
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { IPathControlElement } from "Search/Scripts/React/Models";

import "VSS/LoaderPlugins/Css!Search/React/Components/PathControlDropdown";

export interface IPathControlDropdownProps {
    items: IPathControlElement[],
    currentItemIndex: number,
    message: string,
    onItemRender: (item: IPathControlElement) => JSX.Element,
    onItemClick: (item: IPathControlElement) => void
}

export interface IPathControlDropdownState {
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

export class PathControlDropdown extends React.Component<IPathControlDropdownProps, IPathControlDropdownState> {
    private _itemList: List;
    private _viewState: IPathControlDropdownState;
    private _pathControlDropdown: HTMLElement;
    private _mounted: boolean;

    constructor(props: IPathControlDropdownProps) {
        super(props);
        this.state = this._viewState = {
            resizing: false,
            resizeHappened: false
        } as IPathControlDropdownState;

        this._mounted = false;
    };

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
        
        return (
            // Ease out the dropdown when the control is not mounted yet.
            // On subsequent render "easing-out" the dropdown gives a blurry effect
            // and is quited visible since the dropdown stays
            <div className={css("path-dropdown", {
                "ease-out": !this._mounted
            }) }
                ref={(pathControlDropdown) => { this._pathControlDropdown = pathControlDropdown }}
                style={pathControlStyle}>
                <div
                    className={css("element-list")}
                    tabIndex={-1}
                    style={elementListStyle}>
                    <List
                        getItemCountForPage={() => { return ITEMS_TO_RENDER_PER_LIST_PAGE }}
                        items={items}
                        ref={(itemList) => { this._itemList = itemList } }
                        onRenderCell={(item: IPathControlElement, index: number) => {
                            let highlighted: boolean = this.props.currentItemIndex === index;
                            return (
                                <div
                                    className={css("dropdown-element", {
                                        "highlighted": highlighted
                                    })}
                                    role="listitem"
                                    onClick={(
                                        () => {
                                            this.props.onItemClick(item)
                                        }).bind(this) }>
                                    {
                                        this.props.onItemRender(item)
                                    }
                                </div>
                            );
                        } } />
                </div>
                <div className={css("message") }
                    onMouseDown={this._onHelperMessageMouseDown}
                    aria-live="assertive">
                    { this.props.message }
                </div>
                <div className={css("bowtie-icon", "resizer", "bowtie-corner-resize") }
                    tabIndex={-1}
                    onMouseDown={this._onResizerMouseDown}
                />
            </div>
        );
    }

    /**
     * On any update of the dropdown component, we need to re-render the list in order to update the highlighted element
     * Since the highlighted is done in a function callback and does not trigger re-render, we need to force update the list.
     * @param prevProps
     * @param prevState
     */
    public componentWillReceiveProps(nextProps: IPathControlDropdownProps): void {
        if (nextProps.currentItemIndex !== this.props.currentItemIndex) {
            let scrollToIndex = nextProps.currentItemIndex >= 0 ? nextProps.currentItemIndex : 0;
            this._itemList.forceUpdate();
            this._itemList.scrollToIndex(scrollToIndex);
        }
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
        } as IPathControlDropdownState;

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