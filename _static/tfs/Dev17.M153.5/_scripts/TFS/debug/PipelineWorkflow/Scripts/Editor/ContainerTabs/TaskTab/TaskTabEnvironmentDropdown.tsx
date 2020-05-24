/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { ContextualMenu, DirectionalHint, IContextualMenuItem, IContextualMenu } from "OfficeFabric/ContextualMenu";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_UI from "VSS/Utils/UI";

export interface ITaskTabEnvironmentDropdownProps extends Base.IProps {
    menuElementId: string;
    taskTabRef: HTMLDivElement;
    environmentList: IContextualMenuItem[];
    onDismiss: () => void;
    showDropDown: boolean;
}

export class TaskTabEnvironmentDropdown extends Base.Component<ITaskTabEnvironmentDropdownProps, Base.IStateless> {

    public render(): JSX.Element {
        let showEnvironmentDropdown: boolean = this._showDropDown();
        return (showEnvironmentDropdown ?
            <ContextualMenu
                id={this.props.menuElementId}
                className="task-tab-environment-dropdown"
                target={this.props.taskTabRef}
                items={this.props.environmentList}
                directionalHint={DirectionalHint.bottomLeftEdge}
                onDismiss={this._onDismiss}
                ariaLabel={Resources.EnvironmentListMenuText} /> : null);
    }

    public componentDidUpdate(): void {
        this._addEventListeners();
    }

    public componentWillUnmount(): void {
        this._removeEventListeners();
        this._environmentDropdownListElement = null;
    }

    private _addEventListeners(): void {
        let contextualMenu = document.getElementsByClassName("task-tab-environment-dropdown");
        this._environmentDropdownListElement = (contextualMenu && contextualMenu.length > 0) ? contextualMenu[0].parentElement : null;

        if (this._environmentDropdownListElement) {
            this._removeEventListeners();
            this._environmentDropdownListElement.addEventListener("keydown", this._handleEscapeKey);
            this._environmentDropdownListElement.addEventListener("mouseenter", this._onDropdownMouseEnter);
            this._environmentDropdownListElement.addEventListener("mouseleave", this._onDropdownMouseLeave);
            this._environmentDropdownListElement.addEventListener("click", this._onEnvironmentClick);
        }
    }

    private _removeEventListeners(): void {

        if (this._environmentDropdownListElement) {
            this._environmentDropdownListElement.removeEventListener("keydown", this._handleEscapeKey);
            this._environmentDropdownListElement.removeEventListener("mouseenter", this._onDropdownMouseEnter);
            this._environmentDropdownListElement.removeEventListener("mouseleave", this._onDropdownMouseLeave);
            this._environmentDropdownListElement.removeEventListener("click", this._onEnvironmentClick);
        }
    }

    private _showDropDown(): boolean {
        return !!this.props.showDropDown || this._isMouseOnDropDown;
    }

    private _onDropdownMouseEnter = () => {
        this._isMouseOnDropDown = true;
        //reset the mouse leave timeout so that context menu does not disappear
        clearTimeout(this._mouseLeaveTimeout);
    }

    private _onDropdownMouseLeave = () => {
        // hide the drop down after 1000 ms
        this._mouseLeaveTimeout = setTimeout(() => {
            this._isMouseOnDropDown = false;
            this.props.onDismiss();
        }, this._mouseLeaveDelay);
    }

    private _onEnvironmentClick = () => {
        this._isMouseOnDropDown = false;
    }

    private _handleEscapeKey = (event) => {
        if (this._environmentDropdownListElement && (Utils_UI.KeyCode.ESCAPE === (event.keyCode || event.which))) {
            this._onDismiss();
        }
    }

    private _onDismiss = () => {
        this._removeEventListeners();
        this.props.onDismiss();
    }

    private _environmentDropdownListElement: Element;
    private _isMouseOnDropDown: boolean;
    private _mouseLeaveTimeout: any;
    private readonly _mouseLeaveDelay: number = 500;
}
