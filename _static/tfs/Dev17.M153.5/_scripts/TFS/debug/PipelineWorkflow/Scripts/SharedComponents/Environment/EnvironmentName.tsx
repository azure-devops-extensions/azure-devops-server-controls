// Copyright (c) Microsoft Corporation.  All rights reserved.

/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

export interface IEnvironmentName extends Base.IProps {
    environmentName: string;
    onEnvironmentNameChanged?: (newValue: string) => void;
    onBlur?: () => void;
    onError?: (newValue: string) => string;
    disabled?: boolean;
}

export class EnvironmentName extends Base.Component<IEnvironmentName, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div>
                <div className="environment-name-label">{Resources.EnvironmentName}</div>
                <StringInputComponent
                    id={"environment-name-textbox"}
                    ariaLabel={Resources.EnvironmentName}
                    value={this.props.environmentName}
                    onValueChanged={this.props.onEnvironmentNameChanged}
                    onBlur={this.props.onBlur}
                    getErrorMessage={this.props.onError}
                    disabled={this.props.disabled} />
            </div>
        );
    }
}