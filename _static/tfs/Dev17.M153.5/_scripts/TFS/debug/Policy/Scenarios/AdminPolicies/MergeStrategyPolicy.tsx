// libs
import * as React from "react";
import { autobind, css } from "OfficeFabric/Utilities";
// controls
import { Checkbox } from "OfficeFabric/Checkbox";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Link } from "OfficeFabric/Link";
// contracts
import { MergeStrategy } from "Policy/Scripts/PolicyTypes";
// scenario
import * as Base from "Policy/Scenarios/AdminPolicies/SingletonPolicyBase";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export class MergeStrategyPolicy
    extends Base.SingletonPolicyBase<MergeStrategy.Settings, Base.SingletonPolicyBaseProps> {

    public render(): JSX.Element {

        const { readonlyMode, configs, createLocalPolicyConfig, updateLocalPolicyConfig, ...htmlProps} = this.props;

        const { isActive, settings } = this._parseLocalConfig();

        const { useSquashMerge } = settings;

        return (
            <section aria-label={Resources.MergeStrategySectionLabel} {...htmlProps}>
                <Checkbox
                    label={Resources.MergeStrategyEnableText}
                    className="policy-type-heading policy-checkBox-heading"
                    checked={!!isActive}
                    onChange={this._isActiveOnChanged}
                    disabled={readonlyMode} />

                <div className="policy-indent">
                    <div className={css(
                        "policy-details",
                        readonlyMode && "is-disabled"
                    )}>
                        {Resources.MergeStrategyEnableDetail}
                    </div>

                    {isActive &&
                        <div className="policy-config-settings ms-slideDownIn10">
                            <ChoiceGroup
                                disabled={readonlyMode}
                                className="ms-font-l"
                                onChange={this._useSquashMergeOnChange}
                                options={[
                                    {
                                        key: "false",
                                        text: ([
                                            <div key="1">{Resources.MergeStrategyNeverSquashText}</div>,
                                            <div key="2" className="policy-details">{Resources.MergeStrategyNeverSquashDetail}</div>
                                        ]) as any,
                                        checked: !useSquashMerge,
                                    },
                                    {
                                        key: "true",
                                        text: ([
                                            <div key="1">{Resources.MergeStrategyAlwaysSquashText}</div>,
                                            <div key="2" className="policy-details squash-merge">{Resources.MergeStrategyAlwaysSquashDetail}</div>,
                                            <Link
                                                key="3"
                                                className="info-link policy-details-link squash-merge"
                                                href="https://go.microsoft.com/fwlink/?LinkId=708720"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title={Resources.SquashMergeLearnMoreTitle}>
                                                {Resources.LearnMore}
                                            </Link>
                                        ]) as any,
                                        checked: useSquashMerge,
                                    },
                                ]} />
                        </div>
                    }
                </div>
            </section>
        );
    }

    @autobind
    private _useSquashMergeOnChange(ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption): void {
        this._updateSettings((settings) => {
            settings.useSquashMerge = (option.key === "true");
        });
    }

    protected get policyTypeId(): string {
        return MergeStrategy.Id;
    }

    protected _createDefaultSettings(): MergeStrategy.Settings {
        return {
            useSquashMerge: false,
        };
    }

    constructor(props: Base.SingletonPolicyBaseProps) {
        super(props);
    }
}
