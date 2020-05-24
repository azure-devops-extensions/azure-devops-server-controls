/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { ToggleInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/ToggleInputComponent";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/SettingsContainer";

export interface IProps extends ComponentBase.IProps {
    settingKey: string;
    title: string;
    description: string;
    canToggle: boolean;
    isEnabled?: boolean;
    isReadOnly?: boolean;
    onToggle?: (settingKey: string, newValue: boolean) => void;
}

export class SettingsContainer extends ComponentBase.Component<IProps, ComponentBase.IStateless> {

    public componentWillMount(): void {
        this._domId = Utils_String.generateUID();
    }

    public render(): JSX.Element {

        let settingsContent: JSX.Element = null;
        let toggleElement: JSX.Element = null;

        if (this.props.canToggle) {
            toggleElement =
                (<div className="settings-toggle-container">
                    <div className="settings-toggle">
                        <ToggleInputComponent
                            label=""
                            value={this.props.isEnabled}
                            onText={Resources.EnabledLabel}
                            offText={Resources.DisabledLabel}
                            onValueChanged={this._onContainerToggle}
                            ariaLabelledBy={this._getSettingsTitleElementId()}
                            disabled={!!this.props.isReadOnly} />
                    </div>
                </div>);
        }

        if (!(this.props.canToggle && !this.props.isEnabled) && this.props.children) {
            settingsContent =
                (<div className="settings-content">
                    {this.props.children}
                </div>);
        }

        return (
            <div className="settings-container">
                <div className="settings-header">
                    <div className="settings-info">
                        <div id={this._getSettingsTitleElementId()} className="settings-title">
                            {this.props.title}
                        </div>
                        <div className="settings-description">
                            {this.props.description}
                        </div>
                    </div>
                    {toggleElement}
                </div>

                {settingsContent}
            </div>
        );
    }

    private _getSettingsTitleElementId(): string {
        return "settings-title-" + this._domId;
    }

    private _onContainerToggle = (newValue: boolean): void => {
        if (this.props.onToggle) {
            this.props.onToggle(this.props.settingKey, newValue);
        }
    }

    private _domId: string;
}
