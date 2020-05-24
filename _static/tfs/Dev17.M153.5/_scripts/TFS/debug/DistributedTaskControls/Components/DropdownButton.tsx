/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DirectionalHint } from "OfficeFabric/ContextualMenu";
import { ContextualMenu, IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { KeyCodes } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/DropdownButton";

export interface IProps extends Base.IProps {
    label: string;
    dropdownOptions: IContextualMenuItem[];
    linkClassName?: string;
}

export interface IState extends Base.IState {
    showDropdown: boolean;
}

export class Component extends Base.Component<IProps, IState> {

    public render() {
        let linkClassName = this.props.linkClassName ? "dropdown-button" + " " + this.props.linkClassName : "dropdown-button";
        return (
            <div
                className="dtc-dropdown-button-component"
                ref={(c) => this._anchorElement = c}
                tabIndex={0}
                onClick={this._onClickDropdown}
                onKeyDown={this._onKeyDown} >
                <a className={linkClassName}
                    role="menu">
                    <div className="label">
                        {this.props.label}
                    </div>
                    {
                        (this.props.dropdownOptions.length) ? <i className="bowtie-icon bowtie-chevron-down-light" /> : null
                    }
                </a>
                {this.state.showDropdown ?
                    (<ContextualMenu
                        className="context-menu"
                        items={this.props.dropdownOptions}
                        target={this._anchorElement}
                        onDismiss={this._onContextMenuDismiss}
                        gapSpace={5}
                        directionalHint={DirectionalHint.bottomLeftEdge}
                        ariaLabel={this.props.label} />
                    ) : (null)}
            </div>
        );
    }

    private _onClickDropdown = () => {
        this.setState({
            showDropdown: !this.state.showDropdown
        } as IState);
    }

    private _onContextMenuDismiss = () => {
        this.setState({
            showDropdown: !this.state.showDropdown
        } as IState);
    }

    private _onKeyDown = (evt: React.KeyboardEvent<HTMLElement>) => {
        if (evt.keyCode === KeyCodes.enter || evt.keyCode === KeyCodes.space) {
            this._onClickDropdown();
            evt.preventDefault();
            evt.stopPropagation();
        }
    }

    private _anchorElement: HTMLElement;
}
