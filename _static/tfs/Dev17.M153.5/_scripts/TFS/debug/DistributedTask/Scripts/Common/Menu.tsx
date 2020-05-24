/// <reference types="react" />

import React = require("react");

import ContextualMenu = require("OfficeFabric/ContextualMenu");
import {DirectionalHint} from "OfficeFabric/common/DirectionalHint";

import { KeyboardAccesibleComponent } from "DistributedTask/Scripts/Common/KeyboardAccessible";

export interface Props {
    directionalHint?: DirectionalHint,
    template?: () => JSX.Element;
    toolTip?: string;
}

export interface State extends ContextualMenu.IContextualMenuState {
    isContextMenuVisible: boolean,
    targetElement: HTMLElement
}

export class Menu<TProps extends Props> extends React.Component<TProps, State> {

    constructor(props: TProps) {
        super(props);
        this.state = {
            isContextMenuVisible: false,
            targetElement: null
        };

        this._onClick = this._onClick.bind(this);
        this._onDismiss = this._onDismiss.bind(this);
    }

    public render() {
        let menuHolder;
        if(this.props.template){
            menuHolder = <KeyboardAccesibleComponent onClick={ this._onClick } toolTip={ this.props.toolTip } ariaLabel={ this.props.toolTip } > {this.props.template()} </KeyboardAccesibleComponent>
        } else {
            let iconCssClass = "popup-menu-trigger icon bowtie-icon bowtie-ellipsis";
            menuHolder = <KeyboardAccesibleComponent onClick={ this._onClick } className={iconCssClass} toolTip={ this.props.toolTip } ariaLabel={ this.props.toolTip } />
        }

        return (
            <div className={"item-list-action-icon item-list-menu"} onClick={ this._onClick }>
                { menuHolder }
                { this.state.isContextMenuVisible ? (
                    <ContextualMenu.ContextualMenu
                        target={ this.state.targetElement }
                        onDismiss={ this._onDismiss }
                        directionalHint= { this.props.directionalHint || DirectionalHint.rightBottomEdge }
                        items={ this.getMenuItems() }
                        />) : (null) }
            </div>
        );
    }

    protected getMenuItems(): ContextualMenu.IContextualMenuItem[] {
        return [];
    }

    private _onClick(event: React.MouseEvent<HTMLDivElement>) {
        this.setState({ targetElement: (event.target as HTMLElement).parentElement, isContextMenuVisible: true });
    }

    private _onDismiss(event: React.SyntheticEvent<HTMLElement>) {
        this.setState({
            isContextMenuVisible: false,
            targetElement: null
        });
    }
}
