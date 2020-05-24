/// <reference types="react" />

import React = require("react");

//left 0x1, center 0x2, right 0x3
//top 0x10, middle 0x20, bottom 0x30
export enum Anchor {
    TopLeft = 0x11,
    TopCenter = 0x12,
    TopRight = 0x13,

    MiddleLeft = 0x21,
    MiddleCenter = 0x22,
    MiddleRight = 0x23,

    BottomLeft = 0x31,
    BottomMiddle = 0x32,
    BottomRight = 0x33
};

//The popup is aligned so that the specified anchor of the menu is aligned with the
//specified anchor of the button
export interface Props extends React.Props<any> {
    label?: JSX.Element;
    cssClass?: string;
    alignButtonAnchor?: Anchor;  //default value is BottomLeft
    alignMenuAnchor?: Anchor;  //default value is TopLeft
}

export interface State {
    expanded: boolean;
    popupLeft: number;
    popupTop: number;
}

export class Component extends React.Component<Props, State> {
    private _button: HTMLElement = null;
    private _popup: HTMLElement = null;
    private _popupHasMouse: boolean = false;

    constructor(props: Props) {
        super(props);
        this.state = $.extend({}, this.state, {expanded: false, popupLeft: 0, popupTop: 0});
    }

    public render(): JSX.Element {
        let popupClass: string = this.state.expanded ? "popup-container" : "popup-hidden";
        return (
            <div>
                <button
                    className={this.props.cssClass}
                    ref={this._buttonRef.bind(this)}
                    onBlur={this._onBlur.bind(this)}
                    onClick={this._onClick.bind(this)}>{this.props.label}</button>
                <div
                    className={popupClass}
                    ref={this._popupRef.bind(this)}
                    onMouseDown={this._onMouseDown.bind(this)}
                    onMouseUp={this._onMouseUp.bind(this)}
                    style={ {left: this.state.popupLeft, top: this.state.popupTop} }>
                    {this.props.children}
                </div>
            </div>);
    }

    private _onClick(event: React.MouseEvent<HTMLElement>): void {
        this._togglePopup();
    }

    private _onBlur(event: React.FocusEvent<HTMLElement>): void {
        if (!this._popupHasMouse) {
            this.hidePopup();
        }
    }

    private _onMouseDown(event: React.FocusEvent<HTMLElement>): void {
        this._popupHasMouse = true;
    }

    private _onMouseUp(event: React.FocusEvent<HTMLElement>): void {
        this._popupHasMouse = false;
        this._button.focus();
    }

    private _togglePopup(): void {
        this.setState($.extend({}, this.state, {expanded: !this.state.expanded}));
    }

    public showPopup(): void {
        this.setState($.extend({}, this.state, {expanded: true}));
    }

    public hidePopup(): void {
        this.setState($.extend({}, this.state, {expanded: false}));
    }

    private _buttonRef(button: HTMLElement): void {
        this._button = button;
    }

    private _popupRef(popup: HTMLElement): void {
        this._popup = popup;
    }

    public shouldComponentUpdate(nextProps: Props, nextState: State, nextContext: any): boolean {
        return this.props.children != nextProps.children
            || this.props.label != nextProps.label
            || this.props.cssClass != nextProps.cssClass
            || this.props.alignButtonAnchor != nextProps.alignButtonAnchor
            || this.props.alignMenuAnchor != nextProps.alignMenuAnchor
            || this.state.expanded != nextState.expanded
            || (this.state.expanded && !this._isClose(this.state.popupLeft, nextState.popupLeft))  //account for rounding of positions
            || (this.state.expanded && !this._isClose(this.state.popupTop, nextState.popupTop));
    }

    private _isClose(value1: number, value2: number): boolean {
        let diff: number = value1 - value2;
        return (-1.0 < diff) && (diff < 1.0);
    }

    public componentDidMount(): void {
        this._updatePopupPosition();
    }

    public componentDidUpdate(prevProps: Props, prevState: State, prevContext: any): void {
        this._updatePopupPosition();
    }

    private _updatePopupPosition(): void {
        if (this._button) {
            let buttonAnchor: Anchor = this.props.alignButtonAnchor ? this.props.alignButtonAnchor : Anchor.BottomLeft;

            let anchorX: number = 0;
            switch (buttonAnchor & 0x0F) {
                default: case 0x01: anchorX = this._button.offsetLeft; break;
                case 0x02: anchorX = this._button.offsetLeft + (this._button.offsetWidth / 2); break;
                case 0x03: anchorX = this._button.offsetLeft + this._button.offsetWidth; break;
            }

            let anchorY: number = 0;
            switch (buttonAnchor & 0xF0) {
                case 0x10: anchorY = this._button.offsetTop; break;
                case 0x20: anchorY = this._button.offsetTop + (this._button.offsetHeight / 2); break;
                default: case 0x30: anchorY = this._button.offsetTop + this._button.offsetHeight; break;
            }

            let popupAnchor: Anchor = this.props.alignMenuAnchor ? this.props.alignMenuAnchor : Anchor.TopLeft;

            let popupLeft: number = 0;
            switch (popupAnchor & 0x0F) {
                default: case 0x01: popupLeft = anchorX; break;
                case 0x02: popupLeft = anchorX - (this._popup.offsetWidth / 2); break;
                case 0x03: popupLeft = anchorX - this._popup.offsetWidth; break;
            }

            let popupTop: number = 0;
            switch (popupAnchor & 0x0F0) {
                default: case 0x10: popupTop = anchorY; break;
                case 0x20: popupTop = anchorY - (this._popup.offsetHeight / 2); break;
                case 0x30: popupTop = anchorY - this._popup.offsetHeight; break;
            }

            this.setState($.extend({}, this.state, {
                popupLeft: popupLeft,
                popupTop: popupTop
            }));
        }
        else {
            this.setState($.extend({}, this.state, {popupLeft: 0, popupTop: 0}));
        }
    }
}
