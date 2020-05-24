/// <reference types="react" />

import * as React from "react";
import { KeyCode } from "VSS/Utils/UI";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/Shared/Components/IconButton";

export interface IIconButtonProps extends React.Props<void> {
    /**
     * The display text for the button control.
     */
    text: string;
    /**
     * The item to be displayed (this should also include "bowtie-icon" class).
     */
    icon: string;
    /**
     * Action to be invoked on click or keyboard enter.
     */
    action: () => void;

    /**
     * The additional class name to be added to the root element.
     */
    className?: string;
    /**
     * Flag to indicate if the control should be disabled.
     */
    disabled?: boolean;
    /**
     * Flag to indicate if the control should be focus on render.
     */
    focus?: boolean;
    /**
     * Optional, this will be used as aria-describedby for screen reader.
     */
    descriptionId?: string;
}

export interface IIconButtonState {
}

export class IconButton extends React.Component<IIconButtonProps, IIconButtonState> {
    public static ICON_BUTTON_CONTAINER_CLASS = "icon-button-container";
    public static ICON_CONTAINER_CLASS = "icon-container";
    public static LABEL_CONTAINER_CLASS = "label-container";

    private _id: string;
    private _iconDom: HTMLDivElement;

    constructor(props: IIconButtonProps, context?: any) {
        super(props, context);
        this._id = GUIDUtils.newGuid();
    }

    public componentDidMount() {
        if (this.props.focus) {
            this._iconDom.focus();
        }
    }

    public componentDidUpdate() {
        if (this.props.focus) {
            this._iconDom.focus();
        }
    }

    public render(): JSX.Element {
        let className = `${IconButton.ICON_BUTTON_CONTAINER_CLASS} ${this.props.className || ""} propagate-keydown-event`;
        let iconClassName = this.props.icon;
        if (this.props.disabled) {
            iconClassName += " disabled";
        }

        return <div className={className}
            ref={(element) => { this._iconDom = element; } }
            role="button"
            aria-labelledby={this._id}
            aria-disabled={this.props.disabled}
            aria-describedby={this.props.descriptionId}
            tabIndex={0}
            onClick={this._onClick}
            onKeyDown={this._onKeyDown}>
            <span className={IconButton.ICON_CONTAINER_CLASS}>
                <i className={iconClassName} />
            </span>
            <span id={this._id} className={IconButton.LABEL_CONTAINER_CLASS}>{this.props.text}</span>
        </div>;
    }

    private _onClick = (event: React.MouseEvent<HTMLElement>) => {
        if (!this.props.disabled) {
            this.props.action();
        }
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (!this.props.disabled) {
            if (event.keyCode === KeyCode.ENTER) {
                this.props.action();
            }
        }
        return false;
    }
}
