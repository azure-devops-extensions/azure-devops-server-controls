/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ToggleInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ToggleInputComponent";

import { Label } from "OfficeFabric/Label";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/AdvancedSettingsHeader";

export interface IProps extends Base.IProps {
    headerLabel: string;
    isEnabled: boolean;
    onAdvancedSettingsOptionChanged: (option: boolean) => void;
}

export class Component extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className="dtc-advancedsettings-header">
                <div className="left-section">
                    <Label className="header-title">{this.props.headerLabel}</Label>
                </div>
                <div className="right-section">
                    <ToggleInputComponent
                        label={Resources.AdvancedSettingsText}
                        onValueChanged={this.props.onAdvancedSettingsOptionChanged}
                        value={this.props.isEnabled}
                        onText={Resources.Shown}
                        offText={Resources.Hidden} />
                </div>
            </div>);
    }
}
