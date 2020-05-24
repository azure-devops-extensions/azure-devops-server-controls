/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/VCAdmin";
import { VCAdminActionCreator } from "VersionControl/Scenarios/VCAdmin/VCAdminActionCreator"
import { PolicyStore } from "VersionControl/Scenarios/VCAdmin/Stores/PolicyStore";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes"
import { Toggle } from "OfficeFabric/Toggle";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { Dropdown, IDropdown, IDropdownOption } from "OfficeFabric/Dropdown"
import * as String from "VSS/Utils/String";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

export class SecretsScanningContainerProps  {
    public actionCreator: VCAdminActionCreator;
    public store: PolicyStore;
    public repoContext: RepositoryContext;
    public canEditPolicies: boolean;
}

export class SecretsScanningContainer
        extends React.Component<SecretsScanningContainerProps, VCTypes.PolicyContainerState> {

    constructor(props: SecretsScanningContainerProps) {
        super(props);
        this.state = props.store.getData();

        this.props.actionCreator.getSecretsScanningSetting();
    }

    public componentWillMount() {
        this.props.store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount() {
        this.props.store.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        if (!FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlGitSecretsScanning, false)) {
            return null;
        }

        if (!this.state.initialized) {
            return null;
        }

        // if we don't have edit policies, or there was an error, or the policy is inherited, disable the control
        const disabled: boolean = !this.props.canEditPolicies || !!this.state.error || this.state.policyInherited;

        if (this.state.error) {
            // render error message
            return (
                <div className={VCTypes.Css.OptionGroup}>
                    <div className={VCTypes.Css.OptionHeader}>{VCResources.GitSecretsScanningTitle}</div>
                    <div className={VCTypes.Css.Error}>{VCResources.GitSettingError} {this.state.error.message}</div>
                </div>
            );
        }

        let checked: boolean = false;
        if (this.state.policyInherited) {
            // if we're using the inherited policy, get the checked state from that policy
            checked = this.state.projectPolicy
                ? this.state.projectPolicy.isEnabled
                : false;
        } else {
            // if we have a policy config record, use the value from there.  If not, default to false
            checked = this.state.localPolicy
                ? this.state.localPolicy.isEnabled
                : false;
        }

        return (
            <div className={VCTypes.Css.OptionGroup}>
                <h3 className={VCTypes.Css.OptionHeader}>{VCResources.GitSecretsScanningTitle}</h3>
                <Label>{VCResources.GitSecretsScanningDescription}&nbsp;
                    <Link className={VCTypes.Css.Link} href={VCResources.GitSecretsScanningLearnMoreLink} target="_blank">{VCResources.LearnMore}.</Link>
                </Label>
                <Toggle
                    checked={checked}
                    onChanged={this._onToggleChanged}
                    onText={VCResources.OnText}
                    offText={VCResources.OffText}
                    disabled={disabled}
                    onAriaLabel={String.format(VCResources.VCToggleLabel, VCResources.OnText)}
                    offAriaLabel={String.format(VCResources.VCToggleLabel, VCResources.OffText)}
                />
                {this.state.policyInherited &&
                    <div className={VCTypes.Css.OptionInherited}>{VCResources.GitSettingInherited}</div>
                }
            </div>
        );
    }

    private _onStoreChanged = () => {
        this.setState(this.props.store.getData());
    }

    private _onToggleChanged = (checked: boolean) => {
        const value: boolean = checked ? true : false;

        this.props.actionCreator.setSecretsScanningSetting(this.state.localPolicy, value);
    }
}
