/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { Toggle } from "OfficeFabric/Toggle";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import "VSS/LoaderPlugins/Css!VersionControl/VCAdmin";
import { VCAdminActionCreator } from "VersionControl/Scenarios/VCAdmin/VCAdminActionCreator";
import { PolicyStore } from "VersionControl/Scenarios/VCAdmin/Stores/PolicyStore";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes"
import * as String from "VSS/Utils/String";

export class CaseEnforcementContainerProps {
    public actionCreator: VCAdminActionCreator;
    public store: PolicyStore;
    public repoContext: RepositoryContext;
    public canEditPolicies: boolean;
    public showTitle: boolean;
}

export class CaseEnforcementContainer extends React.Component<CaseEnforcementContainerProps, VCTypes.PolicyContainerState> {

    constructor(props: CaseEnforcementContainerProps) {
        super(props);
        this.state = props.store.getData();

        this.props.actionCreator.getCaseEnforcementSetting();
    }

    public componentWillMount() {
        this.props.store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount() {
        this.props.store.removeChangedListener(this._onStoreChanged);
    }

    public render(): JSX.Element {
        if (!this.state.initialized) {
            return null;
        }

        // if we don't have edit policies, or there was an error, or the policy is inherited, disable the control
        const disabled: boolean = !this.props.canEditPolicies || !!this.state.error || this.state.policyInherited;

        const onAriaLabel: string = this.state.error
                    ? VCResources.GitSettingError + this.state.error.message
                    : String.format(VCResources.VCToggleLabel, VCResources.GitCaseEnforcementTitle, VCResources.OnText);
        const offAriaLabel: string = this.state.error
                    ? VCResources.GitSettingError + this.state.error.message
                    : String.format(VCResources.VCToggleLabel, VCResources.GitCaseEnforcementTitle, VCResources.OffText);

        let checked: boolean = false;
        if (this.state.policyInherited) {
            // if we're using the inherited policy, get the checked state from that policy
            checked = this.state.projectPolicy
                ? this.state.projectPolicy.isEnabled
                  && this.state.projectPolicy.settings.enforceConsistentCase
                : false;
        } else {
            // if we have a policy config record, use the value from there.  If not, default to false
            checked = this.state.localPolicy
                ? this.state.localPolicy.isEnabled
                  && this.state.localPolicy.settings.enforceConsistentCase
                : false;
        }

        return (
            <div>
                {
                    this.props.showTitle &&
                    <h3 className={VCTypes.Css.OptionHeader}>{VCResources.GitCaseEnforcementTitle}</h3>
                }

                <Label>{VCResources.GitCaseEnforcementDescription}&nbsp;
                {
                    this.props.showTitle &&
                    <Link className={VCTypes.Css.Link} href="https://aka.ms/gitcase" target="_blank">{VCResources.LearnMore}.</Link>
                }
                </Label>
                <Toggle
                    checked={checked}
                    onChanged={this._onToggleChanged}
                    onText={VCResources.OnText}
                    offText={VCResources.OffText}
                    disabled={disabled}
                    onAriaLabel={onAriaLabel}
                    offAriaLabel={offAriaLabel}
                />
                {
                    this.state.error &&
                        <div aria-live="assertive" className={VCTypes.Css.Error}>{VCResources.GitSettingError} {this.state.error.message}</div>
                }

                {
                    this.state.policyInherited &&
                        <div className={VCTypes.Css.OptionInherited}>{VCResources.GitSettingInherited}</div>
                }
            </div>
        );
    }

    private _onStoreChanged = () => {
        this.setState(this.props.store.getData());
    }

    private _onToggleChanged = (checked: boolean) => {
        // if the user un-checked the policy, update with null, which means 'not set' rather than
        // an explicit false
        const value: boolean = checked ? true : null;

        this.props.actionCreator.setCaseEnforcementSetting(this.state.localPolicy, value);
    }
}
