/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ExternalLink } from "DistributedTaskControls/Components/ExternalLink";
import { BooleanInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/BooleanInputComponent";

import { Forks } from "TFS/Build/Contracts";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/ForksComponent";

export interface IForksComponentProps {
    forks: Forks;
    onValueChanged: (isChecked: boolean) => void;
    disabled: boolean;
    onSecretsForForksChanged: (isChecked: boolean) => void;
    enableSecretsForForks: boolean;
}

export class ForksComponent extends React.Component<IForksComponentProps, Base.IStateless> {
    private static readonly FORKS_SECURITY_LINK = "https://go.microsoft.com/fwlink/?linkid=862029";
    
    public render(): JSX.Element {
        return (
            <div className="forks-component">
                <div className="forks-header">
                    {Resources.ForksText}
                </div>
                <div className="forks-enable-checkbox">
                    <BooleanInputComponent
                        value={this.props.forks.enabled}
                        onValueChanged={this.props.onValueChanged}
                        disabled={this.props.disabled}
                        label={Resources.ForksCheckBoxText} />
                </div>
                <div className="forks-security-link">
                    <div className={"bowtie-icon bowtie-security"}></div>
                    <span>
                        <ExternalLink
                            href={ForksComponent.FORKS_SECURITY_LINK}
                            newTab={true}
                            text={Resources.ForksSecurityLinkText} />
                    </span>
                </div>
                <div className="forks-secrets-enable-checkbox">
                    <BooleanInputComponent
                        value={this.props.forks.allowSecrets}
                        onValueChanged={this.props.onSecretsForForksChanged}
                        disabled={!this.props.enableSecretsForForks}
                        label={Resources.ForksAllowSecretsText} />
                </div>
            </div>
        );
    }
}
