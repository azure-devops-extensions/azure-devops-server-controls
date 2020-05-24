// libs
import * as React from "react";
import { autobind, css } from "OfficeFabric/Utilities";
// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
// controls
import { Checkbox } from "OfficeFabric/Checkbox";
import { Label } from "OfficeFabric/Label";
import { NumberTextField } from "Policy/Scenarios/Shared/NumberTextField";
import { ITextFieldProps } from "OfficeFabric/TextField";
// contracts
import { ApproverCount } from "Policy/Scripts/PolicyTypes";
// scenario
import * as Base from "Policy/Scenarios/AdminPolicies/SingletonPolicyBase";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export class ApproverCountPolicy
    extends Base.SingletonPolicyBase<ApproverCount.Settings, Base.SingletonPolicyBaseProps> {

    public render(): JSX.Element {

        const { readonlyMode, configs, createLocalPolicyConfig, updateLocalPolicyConfig, ...htmlProps} = this.props;

        const { config, isActive, isBlocking, settings } = this._parseLocalConfig();

        const { creatorVoteCounts, allowDownvotes, resetOnSourcePush, } = settings;
        const approverCountValue = this._approverCountValue(settings);

        return (
            <section aria-label={Resources.ApproverCountSectionLabel} {...htmlProps}>
                <Checkbox
                    label={Resources.ApproverCountEnableText}
                    className="policy-type-heading policy-checkBox-heading"
                    checked={!!isActive}
                    onChange={this._isActiveOnChanged}
                    disabled={readonlyMode} />

                <div className="policy-indent">
                    <div className={css(
                        "policy-details",
                        readonlyMode && "is-disabled"
                    )}>
                        {Resources.ApproverCountEnableDetail}
                    </div>

                    {isActive &&
                        <div className="policy-config-settings ms-slideDownIn10">
                            <NumberTextField
                                disabled={readonlyMode}
                                value={approverCountValue}
                                integer={true}
                                minValue={1}
                                label={Resources.ApproverCountMinimumApproverCount}
                                maxValue={10}
                                maxLength={5}
                                onBlur={this._approverCountOnBlur}
                                className="policy-approver-count-numeric"
                                inputClassName="policy-approver-count-input"
                                onNotifyValidationResult={this._approverCountOnNotifyValidationResult}
                            />

                            <Checkbox
                                className="config-option-checkbox"
                                disabled={readonlyMode}
                                label={Resources.ApproverCountCreatorVoteCounts}
                                checked={!!creatorVoteCounts}
                                onChange={this._creatorVoteCountsOnChange}
                            />

                            <Checkbox
                                className="config-option-checkbox"
                                disabled={readonlyMode}
                                label={Resources.ApproverCountAllowDownvotes}
                                checked={!!allowDownvotes}
                                onChange={this._allowDownvotesOnChange}
                            />

                            <Checkbox
                                className="config-option-checkbox"
                                disabled={readonlyMode}
                                label={Resources.ApproverCountResetVotesOnSourceChanged}
                                checked={!!resetOnSourcePush}
                                onChange={this._resetVotesOnChange}
                            />
                        </div>
                    }
                </div>
            </section>
        );
    }

    @autobind
    private _approverCountOnBlur(ev: React.FocusEvent<ITextFieldProps>): void {
        const { settings } = this._parseLocalConfig();

        if (ev.currentTarget.value !== this._approverCountValue(settings)) {
            // User left this field while it's in an invalid state. Overwrite textbox contents with value from store
            this.forceUpdate();
        }
    }

    @autobind
    private _approverCountOnNotifyValidationResult(errorMessage: string, stringValue: string, numericValue?: number): void {
        if (numericValue !== undefined) {
            let settings = this._parseLocalConfig().settings;

            if (!settings || (settings.minimumApproverCount !== numericValue)) {
                this._updateSettings((settings) => { settings.minimumApproverCount = numericValue; })
            }
        }
    }

    @autobind
    private _creatorVoteCountsOnChange(ev: React.FormEvent<ITextFieldProps>, checked?: boolean) {
        this._updateSettings((settings) => { settings.creatorVoteCounts = !!checked; });
    }

    @autobind
    private _allowDownvotesOnChange(ev: React.FormEvent<ITextFieldProps>, checked?: boolean) {
        this._updateSettings((settings) => { settings.allowDownvotes = !!checked; });
    }

    @autobind
    private _resetVotesOnChange(ev: React.FormEvent<ITextFieldProps>, checked?: boolean) {
        this._updateSettings((settings) => { settings.resetOnSourcePush = !!checked; });
    }

    private _approverCountValue(settings: ApproverCount.Settings): string {
        const count: number = (settings && settings.minimumApproverCount) | 0;
        return count ? String(count) : "";
    }

    protected get policyTypeId(): string {
        return ApproverCount.Id;
    }

    protected _createDefaultSettings(): ApproverCount.Settings {
        return {
            minimumApproverCount: 2,
            creatorVoteCounts: false,
            allowDownvotes: false,
            resetOnSourcePush: false,
        };
    }

    constructor(props: Base.SingletonPolicyBaseProps) {
        super(props);
    }
}
