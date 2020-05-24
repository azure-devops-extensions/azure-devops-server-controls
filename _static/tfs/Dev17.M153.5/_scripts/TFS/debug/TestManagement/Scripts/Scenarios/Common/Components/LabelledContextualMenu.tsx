/// <reference types="react" />

import * as React from "react";

import { CommandBarButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { Label } from "OfficeFabric/Label";
import { IIconProps } from "OfficeFabric/Icon";
import { css } from "OfficeFabric/Utilities";

import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";

import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/Components/LabelledContextualMenu";

export interface ILabelledContextualMenuProps extends ComponentBase.Props {
    options: IContextualMenuItem[];
    selectedOptionsText: string;
    contextualMenuAriaLabel?: string;
    onChange?: (ev?: React.MouseEvent<HTMLElement>, item?: IContextualMenuItem) => void;
    label?: string;
    iconProps?: IIconProps;         /* The props for the icon shown in the button. */
    contextualMenuClassName?: string;
    optionsCssClassName?: string;
	labelCssClassName?: string;
	directionHint?: DirectionalHint;
}

export class LabelledContextualMenu extends ComponentBase.Component<ILabelledContextualMenuProps, ComponentBase.State> {

    public render(): JSX.Element {
        return (
            <div className={css("labelledContextualMenu", this.props.contextualMenuClassName || Utils_String.empty)}>
                {this.props.label && 
                    <Label className={css("labelledContextualMenu-label", this.props.labelCssClassName || Utils_String.empty)}>
                        {this.props.label}
                    </Label>
                }
                <CommandBarButton className={css("labelledContextualMenu-options", this.props.optionsCssClassName || Utils_String.empty)}
                    text={this.props.selectedOptionsText || Utils_String.empty}
                    iconProps={this.props.iconProps}
                    ariaLabel={this.props.contextualMenuAriaLabel}
                    menuProps={{
						items: this.props.options,
						directionalHint: this.props.directionHint, 
                        onItemClick: this.props.onChange
					}}
                />
            </div>
        );
    }    
}