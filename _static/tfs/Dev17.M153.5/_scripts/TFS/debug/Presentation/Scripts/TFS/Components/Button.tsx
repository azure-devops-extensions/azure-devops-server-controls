/// <reference types="react" />

import React = require("react");

export interface Props extends React.Props<any> {
    text?: string;
    cssClass?: string;
    iconCssClass?: string;
    disabled?: boolean;
    onClick?: React.EventHandler<React.MouseEvent<HTMLButtonElement>>;
}

export interface State {
}

export class Component extends React.Component<Props, State> {
    public render(): JSX.Element {
        let className: string = this.props.cssClass || "";
        let icon: JSX.Element = null;
        if (this.props.iconCssClass) {
            icon = <span className={ this.props.iconCssClass }></span>;
        }

        return <button type="button" className={ this.props.cssClass } disabled={ !!this.props.disabled } onClick={ this.props.onClick }>{ icon }{ this.props.text }</button>;
    }
}
