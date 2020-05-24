/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { HighContrastSelectionClass } from "DistributedTaskControls/Common/FlatViewTableTypes";

import { IconButton, IButtonProps } from "OfficeFabric/Button";
import { TooltipHost } from "VSSUI/Tooltip";
import { IIconProps } from "OfficeFabric/Icon";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FlatViewButton";

export interface IFlatViewButtonProps extends IButtonProps {

    /** 
     * Tooltip for the Icon button
     * It is used both as the aria-label and tooltip content
     */
    tooltip: string;
    rowSelected: boolean;
    iconProps: IIconProps;
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled: boolean;
}

export class FlatViewButton extends Base.Component<IFlatViewButtonProps, Base.IStateless> {
    public render(): JSX.Element {
        let className: string = css("flat-view-button", HighContrastSelectionClass);
        className += !this.props.rowSelected ? " " + "hide" : "";

        return (
            <div className="flat-view-button-container">
                <TooltipHost content={this.props.tooltip} >
                    <IconButton
                        ariaLabel={this.props.tooltip}
                        className={className}
                        iconProps={this.props.iconProps}
                        onClick={this.props.onClick}
                        disabled={this.props.disabled} />
                </TooltipHost>
            </div>
        );
    }
}