/// <reference types="react" />

import React = require("react");

import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as TFS_React from "Presentation/Scripts/TFS/TFS.React";

import * as Controls from "VSS/Controls";
import * as Utils_Core from "VSS/Utils/Core";
import * as Menus from "VSS/Controls/Menus";
import { KeyboardAccesibleComponent } from "Presentation/Scripts/TFS/Components/KeyboardAccessible";

export interface Props extends TFS_React.IProps {
    iconCssClass: string;
    menuOptions: Menus.PopupMenuOptions;
    titleText?: string;
}

export class Component extends React.Component<Props, TFS_React.IState> {
    private _popupMenu: Menus.PopupMenu;
    private _element: HTMLElement;

    public render(): JSX.Element {
        var iconCssClass = "popup-menu-trigger icon bowtie-icon " + this.props.iconCssClass;
        // the action-icon container makes the element take up space even if the trigger icon is not visible
        return <div title={ this.props.titleText || PresentationResources.MoreActionsText } className="action-icon" ref={ (d) => this._element = d }>
                  <KeyboardAccesibleComponent className={ iconCssClass } onClick={ () => this._showPopupMenu() } />
               </div>;
    }

    private _showPopupMenu() {
        let $element = $(this._element);
        let menuTrigger: JQuery = $element.find("div.popup-menu-trigger");
        let pinElement: JQuery = $element.find("div.icon");

        if (!this._popupMenu) {
            // add .menu-visible style while the menu is active to keep the trigger button visible when the row is no longer hovered
            if (!this.props.menuOptions.onActivate) {
                this.props.menuOptions.onActivate = () => {
                    menuTrigger.addClass("menu-visible");
                }
            }
            if (!this.props.menuOptions.onDeactivate) {
                this.props.menuOptions.onDeactivate = () => {
                    menuTrigger.removeClass("menu-visible");
                }
            }

            this._popupMenu = Controls.Control.create(Menus.PopupMenu, $element, this.props.menuOptions);
        }

        Utils_Core.delay(this, 10, function () {
            this._popupMenu.popup(menuTrigger, pinElement);
        });
    }
}
