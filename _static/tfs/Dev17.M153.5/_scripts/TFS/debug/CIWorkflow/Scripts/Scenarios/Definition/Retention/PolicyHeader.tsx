/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import { CommandButton } from "OfficeFabric/Button";
import { Label } from "OfficeFabric/Label";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyHeader";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";

export interface IRetentionPolicyHeaderProps extends Base.IProps {
    policyInstanceId: string;
    heading: string;
    disabled?: boolean;
    onRemove?: (id: string) => void;
}

export class RetentionPolicyHeader extends Base.Component<IRetentionPolicyHeaderProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className="ci-retention-policy-header">
                <Label className="ci-retention-policy-heading">
                    {this.props.heading}
                </Label>

                {!this.props.disabled && (
                    <CommandButton
                        className={css("delete-button", "fabric-style-overrides")}
                        iconProps= { {iconName: "Delete"} }
                        ariaLabel={Resources.Delete}
                        ariaDescription={Resources.DeletePolicyAriaDescription}
                        onClick={this._onDeleteButtonClicked} >
                        {Resources.Delete}
                    </CommandButton>
                )}
            </div>
        );
    }

    private _onDeleteButtonClicked = () => {
        if (this.props.onRemove) {
            this.props.onRemove(this.props.policyInstanceId);
        }
    }
}
