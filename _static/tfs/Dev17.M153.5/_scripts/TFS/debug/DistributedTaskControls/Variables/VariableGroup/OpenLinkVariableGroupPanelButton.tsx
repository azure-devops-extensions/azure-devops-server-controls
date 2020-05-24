/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { DefaultButton, IButton } from "OfficeFabric/Button";

export interface IOpenLinkVariableGroupPanelButtonProps extends Base.IProps {
    onClick: () => void;
}

export class OpenLinkVariableGroupPanelButton extends Base.Component<IOpenLinkVariableGroupPanelButtonProps, Base.IStateless> {
    public render(): JSX.Element {
        return (
            <DefaultButton
                componentRef={(button) => { this._button = button; }}
                ariaLabel={Resources.OpenLinkVariableGroupPanelButton}
                iconProps={{ iconName: "Link" }}
                className="dtc-add-variable-group-button"
                onClick={this.props.onClick}>
                {Resources.OpenLinkVariableGroupPanelButton}
            </DefaultButton>
        );
    }

    public focus(): void {
        this._button.focus();
    }

    private _button: IButton;
}