/// <reference types="react" />

import React = require("react");

import ContextualMenu = require("OfficeFabric/ContextualMenu");
import {DirectionalHint} from "OfficeFabric/common/DirectionalHint";

import Resources = require("ReleasePipeline/Scripts/Resources/TFS.Resources.ReleasePipeline");
import { KeyboardAccesibleComponent } from "ReleasePipeline/Scripts/Common/Components/KeyboardAccessible";

export interface Props {
    directionalHint?: DirectionalHint
}

export interface State extends ContextualMenu.IContextualMenuState {
    isContextMenuVisible: boolean,
    target?: any
    useTargetPoint?: boolean;
}


export class Menu<TProps extends Props> extends React.Component<TProps, State> {
    private _component: HTMLElement;
    protected _ellipsisButton: KeyboardAccesibleComponent;

    constructor(props: TProps) {
        super(props);
        this.state = {
            isContextMenuVisible: false,
            target: null
        };
        this._onClick = this._onClick.bind(this);
        this._onDismiss = this._onDismiss.bind(this);
    }

    public render() {
        return (
            <div ref={(component) => { this._component = component; }}  className={"action-icon"} >
                <KeyboardAccesibleComponent ref={(c) => this._ellipsisButton = c} className={"icon bowtie-icon bowtie-ellipsis"} toolTip = {Resources.MoreActions} ariaLabel = {Resources.MoreActions} onClick={this._onClick} />
                { this.state.isContextMenuVisible ? (
                    <ContextualMenu.ContextualMenu
                        shouldFocusOnMount={ true }
                        targetPoint={ this.state.target }
                        target={this._component.firstChild as HTMLElement}
                        useTargetPoint={ this.state.useTargetPoint }
                        onDismiss={ this._onDismiss }
                        directionalHint= { this.props.directionalHint || DirectionalHint.rightBottomEdge}
                        items={ this.getMenuItems() }
                        />) : (null) }
            </div>
        );
    }

    protected getMenuItems(): ContextualMenu.IContextualMenuItem[] {
        return [];
    }

    private _onClick(event: React.MouseEvent<HTMLDivElement>) {
        this.setState({ target: { x: event.clientX, y: event.clientY }, isContextMenuVisible: true });
        if (event.clientX) {
            this.setState({ isContextMenuVisible: true, useTargetPoint: true, target: { x: event.clientX, y: event.clientY } });
        }
        else {
            // if this is a keydown event, we don't want to use target point we want to use target element
            this.setState({ isContextMenuVisible: true, useTargetPoint: false });
        }
    }

    private _onDismiss(event: React.SyntheticEvent<HTMLElement>) {
        this.setState({
            isContextMenuVisible: false,
            target: null,
            useTargetPoint: false
        });
    }
}
