/// Copyright (c) Microsoft Corporation. All rights reserved.

import * as React from "react";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import "VSS/LoaderPlugins/Css!VersionControl/VCAdmin";
import { VCAdminActionCreator } from "VersionControl/Scenarios/VCAdmin/VCAdminActionCreator";
import { PolicyStore } from "VersionControl/Scenarios/VCAdmin/Stores/PolicyStore";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCTypes from "VersionControl/Scenarios/VCAdmin/VCAdminTypes";
import { Toggle } from "OfficeFabric/Toggle";
import { Label } from "OfficeFabric/Label";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { NumberTextField } from "Policy/Scenarios/Shared/NumberTextField";
import { ITextFieldProps } from "OfficeFabric/TextField";
import * as String from "VSS/Utils/String";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";

export class PathLengthPolicyContainerProps  {
    public actionCreator: VCAdminActionCreator;
    public store: PolicyStore;
    public repoContext: RepositoryContext;
    public canEditPolicies: boolean;
}

export class PathLengthPolicyContainerState
    extends VCTypes.PolicyContainerState {
        public expanded: boolean;
        public pathLength: number;
        public showCustomTextField: boolean;
        public showWarningDialog: boolean;
        public selectedChoiceGroupOptionKey: string;
}

export class PathLengthPolicyContainer
        extends React.Component<PathLengthPolicyContainerProps, PathLengthPolicyContainerState> {

    private readonly DefaultPathLength: number = 248;
    private readonly MinPathLength: number = 32;
    private readonly MaxSupportedPathLength: number = 10000;
    private readonly DefaultKey: string = "DEFAULT";
    private readonly CustomKey: string = "CUSTOM";

    constructor(props: PathLengthPolicyContainerProps) {
        super(props);

        this.state = {
            ...props.store.getData(),
            expanded: false,
            pathLength: this.DefaultPathLength,
            showCustomTextField: false,
            showWarningDialog: false,
            selectedChoiceGroupOptionKey: this.DefaultKey
        };

        this.props.actionCreator.getPathLengthSetting();
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

        // if we don't have edit policies,
        // or there was an error,
        // or the policy is inherited, disable the control
        const disabled: boolean =
                !this.props.canEditPolicies
                || !!this.state.error
                || this.state.policyInherited;

        if (this.state.error) {
            // render error message
            return (
                <div className={VCTypes.Css.Error}>
                    {VCResources.GitSettingError} {this.state.error.message}
                </div>
            );
        }

        return (
            <div>
                <Label>{VCResources.GitPathLengthPolicyDescription}</Label>
                <div className={`${VCTypes.Css.Inline} ${VCTypes.Css.AlignFlexStart}`}>
                    <Toggle
                        checked={this.state.expanded}
                        onChanged={this._onToggleChanged}
                        onText={VCResources.OnText}
                        offText={VCResources.OffText}
                        disabled={disabled}
                        onAriaLabel={String.format(VCResources.VCToggleLabel, VCResources.OnText)}
                        offAriaLabel={String.format(VCResources.VCToggleLabel, VCResources.OffText)}
                        className={VCTypes.Css.Toggle}
                    />
                    {this.state.expanded &&
                        <ChoiceGroup
                            selectedKey={this.state.selectedChoiceGroupOptionKey}
                            options={[
                                {
                                    key: this.DefaultKey,
                                    text: VCResources.GitPathLengthPolicyDefaultLabel
                                },
                                {
                                    key: this.CustomKey,
                                    text: VCResources.GitPathLengthPolicyCustomLabel,
                                    onRenderField: this._renderTextBox
                                }
                            ]}
                            onChange={this._onChoiceGroupChange}
                            className={VCTypes.Css.NoTopMargin}
                        />
                    }
                </div>
                {this.state.policyInherited &&
                    <div className={VCTypes.Css.OptionInherited}>{VCResources.GitSettingInherited}</div>
                }
                {this.state.showWarningDialog &&
                    <Dialog
                        hidden={false}
                        dialogContentProps={{
                            type: DialogType.normal,
                            title: VCResources.AreYouSure,
                            subText: String.format(
                                VCResources.PathLengthText,
                                this.MinPathLength,
                                this.state.pathLength)
                        }}
                        onDismiss={this._hideWarningDialog}
                        modalProps={{
                            isBlocking: true
                        }}>
                            <DialogFooter>
                                <PrimaryButton onClick={this._onWarningDialogAccept}>{VCResources.Yes}</PrimaryButton>
                                <DefaultButton onClick={this._hideWarningDialog}>{VCResources.Cancel}</DefaultButton>
                            </DialogFooter>
                    </Dialog>
                }
            </div>
        );
    }

    private _onWarningDialogAccept = () => {
        this._savePolicy(true, this.state.pathLength);
        this._hideWarningDialog();
    }

    private _hideWarningDialog = () => {
        this.setState({showWarningDialog: false});
    }

    private _savePolicy(enabled: boolean, pathLength: number) {
        this.props.actionCreator.setPathLengthSetting(this.state.localPolicy, enabled, pathLength);
    }

    private _onChoiceGroupChange = (event: React.SyntheticEvent<HTMLElement>, option: IChoiceGroupOption) => {
        // if the user went back to the default setting, save the policy with default path length
        if (option.key === this.DefaultKey) {
            this._savePolicy(true, this.DefaultPathLength);
        } else {
            this.setState({showCustomTextField: true});
        }

        this.setState({selectedChoiceGroupOptionKey: option.key});
    }

    private _renderTextBox = (props: IChoiceGroupOption, renderer: (props: IChoiceGroupOption) => JSX.Element): JSX.Element => {
        // perform default rendering
        const defaultRenderOutput = renderer(props);
        const usePlaceHolder: boolean = this.state.pathLength === this.DefaultPathLength;

        return (
            <div className={VCTypes.Css.Inline}>
                {defaultRenderOutput}
                <NumberTextField
                    className={VCTypes.Css.TextField}
                    integer={true}
                    disabled={!this.state.showCustomTextField}
                    minValue={1}
                    maxValue={this.MaxSupportedPathLength}
                    value={usePlaceHolder ? "" : this.state.pathLength.toString(10)}
                    placeholder={usePlaceHolder ? this.DefaultPathLength.toString(10) : ""}
                    onNotifyValidationResult={this._customPathLengthOnNotifyValidationResult}
                    onBlur={this._customPathLengthOnBlur}
                />
            </div>
        );
    }

    private _customPathLengthOnBlur = (ev: React.FocusEvent<ITextFieldProps>): void => {
        if (this.state.pathLength !== this._getPathLength(this.state)) {
            if (this.state.pathLength < this.MinPathLength) {
                // show a dialog warning the user about short path length
                this.setState({showWarningDialog: true});
            }
        } else {
                this._savePolicy(true, this.state.pathLength);
        }
    }

    private _customPathLengthOnNotifyValidationResult = (errorMessage: string, stringValue: string, numericValue?: number) : void => {
        if (numericValue !== undefined) {
            this.setState({pathLength: numericValue});
        }
    }

    private _shouldExpand(policyState: VCTypes.PolicyContainerState): boolean {
        let projectEnabled: boolean;
        let repoEnabled: boolean;

        if (policyState.policyInherited) {
            // if we're using the inherited policy, get the checked state from that policy
            projectEnabled = policyState.projectPolicy
                ? policyState.projectPolicy.isEnabled
                : false;
        } else {
            // if we have a policy config record, use the value from there.  If not, default to false
            repoEnabled = policyState.localPolicy
                ? policyState.localPolicy.isEnabled
                : false;
        }

        return projectEnabled || repoEnabled;
    }

    private _getPathLength(policyState: VCTypes.PolicyContainerState): number {
        if (policyState.policyInherited) {
            if (policyState.projectPolicy
                && policyState.projectPolicy.isEnabled
                && !policyState.projectPolicy.isDeleted) {
              return policyState.projectPolicy.settings.maxPathLength;
            }
        } else {
            if (policyState.localPolicy
                && policyState.localPolicy.isEnabled
                && !policyState.localPolicy.isDeleted) {
              return policyState.localPolicy.settings.maxPathLength;
            }
        }

        return this.DefaultPathLength;
    }

    private _onStoreChanged = () => {
        const data: VCTypes.PolicyContainerState = this.props.store.getData();
        const pathLength: number = this._getPathLength(data);
        const optionKey: string = pathLength === this.DefaultPathLength ? this.DefaultKey : this.CustomKey;

        this.setState(
            {
                ...data,
                expanded: this._shouldExpand(data),
                pathLength: pathLength,
                showCustomTextField: pathLength !== this.DefaultPathLength,
                selectedChoiceGroupOptionKey: optionKey
            }
        );
    }

    private _onToggleChanged = (checked: boolean) => {
        const value: boolean = checked ? true : false;
        this.setState({expanded: value});

        this._savePolicy(value, this.state.pathLength);
    }
}
