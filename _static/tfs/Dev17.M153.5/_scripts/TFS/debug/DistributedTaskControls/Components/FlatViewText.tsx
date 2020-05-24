import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { HighContrastSelectionClass } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { TooltipIfOverflow } from "DistributedTaskControls/Components/TooltipIfOverflow";

import { css } from "OfficeFabric/Utilities";
import { Label } from "OfficeFabric/Label";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FlatViewText";

export interface IFlatViewTextProps extends Base.IProps {
    text: string;
    disabled?: boolean;
    className?: string;
}

export class FlatViewText extends Base.Component<IFlatViewTextProps, Base.IStateless> {

    public render(): JSX.Element {
        const disabledCssStyle = this.props.disabled ? "flat-view-text-disabled" : Utils_String.empty;

        return (
            <Label
                disabled={this.props.disabled}
                className={css("flat-view-text", HighContrastSelectionClass, this.props.className, disabledCssStyle)}>
                <TooltipIfOverflow tooltip={this.props.text} targetElementClassName="flat-view-text-preserve" containerClassName={"flat-view-text-preserve-container"} >
                    <div className={"flat-view-text-preserve-container"}>
                        <pre className={"flat-view-text-preserve"}>
                            {this.props.text}
                        </pre>
                    </div>
                </TooltipIfOverflow>
            </Label>
        );
    }

}