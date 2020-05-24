/// <reference types="react" />

import React = require("react");

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";

import * as Controls from "VSS/Controls";
import * as Utils_Core from "VSS/Utils/Core";
import * as Menus from "VSS/Controls/Menus";

export interface Props extends TFS_React.IProps {
    className?: string;
    buttonCssClass?: string;
    iconCssClass: string;
    menuOptions: Menus.PopupMenuOptions;
    titleText?: string;
}

export class Component extends React.Component<Props, TFS_React.IState> {
    private _popupMenu: Menus.PopupMenu;
    private _element: HTMLElement;
    private _focusElement: HTMLElement;
    private _pinElement: HTMLElement;

    public shouldComponentUpdate(nextProps: Props) {
        return this.props.className !== nextProps.className
            || this.props.iconCssClass !== nextProps.iconCssClass
            || this.props.buttonCssClass !== nextProps.buttonCssClass
            || this.props.titleText !== nextProps.titleText
            || this.props.menuOptions !== nextProps.menuOptions;
    }

    public render(): JSX.Element {
        let iconCssClass = "bowtie-icon " + this.props.iconCssClass || "";
        let buttonCssClass = "popup-menu-trigger " + this.props.buttonCssClass || "";

        return (
            <div className={this.props.className} ref={(d) => this._element = d}>
                <button
                    className={buttonCssClass}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => this.onContextMenuClicked(event)}
                    title={this.props.titleText || PresentationResources.MoreActionsText}
                    ref={(d) => this._focusElement = d}>
                    <i className={iconCssClass}
                        ref={(d) => this._pinElement = d}></i>
                </button>
            </div>);
    }

    protected onContextMenuClicked(event: React.MouseEvent<HTMLButtonElement>) {
        let $element = $(this._element);
        let $menuTrigger: JQuery = $element.find("div.popup-menu-trigger");

        let $focusElement = $(this._focusElement);
        let $pinElement = $(this._pinElement);

        if (this._popupMenu) {
            this._popupMenu.dispose();
            this._popupMenu = null;
        }

        this._popupMenu = Controls.Control.create(Menus.PopupMenu, $element, this.props.menuOptions);

        Utils_Core.delay(this, 10, function () {
            this._popupMenu.popup($focusElement, $pinElement);
        });
    }
}
