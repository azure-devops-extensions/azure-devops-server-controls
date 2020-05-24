/// <reference types="react" />

import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

import { IconButton } from "OfficeFabric/Button";
import { Dropdown, IDropdownProps } from "OfficeFabric/Dropdown";
import { TooltipHost } from "VSSUI/Tooltip";
import { css } from "OfficeFabric/Utilities";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Utils_String from "VSS/Utils/String";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/OnDemandTestRun/Components/ArtifactInputCombo";

export interface IArtifactInputIconsProps {
    disabled?: boolean;
    iconName: string;
    label: string;
    onClick: (e?) => void;
}

export interface IArtifactInputComboProps extends IDropdownProps{
    labelText: string;
    iconButtonPropsList?: IArtifactInputIconsProps[];
}

export class ArtifactInputCombo extends ComponentBase.Component<IArtifactInputComboProps, ComponentBase.State> {

    public render(): JSX.Element {

        const labelText = this.props.labelText ? this.props.labelText : Utils_String.empty;
        return (
            <div className= "artifact-container">
                <label className= "artifact-combo-label" >
                    { labelText }
                </label >

                <div className="artifact-combo-container">
                    <div className="artifact-combo-dropdown">
                        <Dropdown { ...this.props } ariaLabel={labelText} />
                    </div>
                    {
                        this.props.iconButtonPropsList && this._getRightIconButtons(this.props.iconButtonPropsList)
                    }
                </div>
             </div>
        );
    }

    private _getRightIconButtons(iconPropsList: IArtifactInputIconsProps[]) {
        return iconPropsList.map((iconProps, i) => {
            return (
                <TooltipHost content={iconProps.label} key={i}>
                    <IconButton
                        iconProps={{ iconName: iconProps.iconName }}
                        className={css("artifact-input-icon-button")}
                        disabled={iconProps.disabled}
                        aria-disabled={iconProps.disabled}
                        onClick={iconProps.onClick}
                        ariaLabel={iconProps.label} />
                </TooltipHost>
            );
        });
    }

}
