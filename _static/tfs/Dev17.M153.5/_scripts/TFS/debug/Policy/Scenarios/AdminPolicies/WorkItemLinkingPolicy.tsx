// libs
import * as React from "react";
import { css } from "OfficeFabric/Utilities";
// controls
import { Checkbox } from "OfficeFabric/Checkbox";
import { ChoiceGroup } from "OfficeFabric/ChoiceGroup";
// contracts
import { WorkItemLinking } from "Policy/Scripts/PolicyTypes";
// scenario
import * as Base from "Policy/Scenarios/AdminPolicies/SingletonPolicyBase";
import { PolicyRequirement } from "Policy/Scenarios/Shared/PolicyRequirement";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export class WorkItemLinkingPolicy
    extends Base.SingletonPolicyBase<WorkItemLinking.Settings, Base.SingletonPolicyBaseProps> {

    public render(): JSX.Element {

        const { readonlyMode, configs, createLocalPolicyConfig, updateLocalPolicyConfig, ...htmlProps} = this.props;

        const { isActive, isBlocking } = this._parseLocalConfig();

        return (
            <section aria-label={Resources.WorkItemLinkingSectionLabel} {...htmlProps}>
                <Checkbox
                    label={Resources.WorkItemLinkingEnableText}
                    className="policy-type-heading policy-checkBox-heading"
                    checked={!!isActive}
                    onChange={this._isActiveOnChanged}
                    disabled={readonlyMode} />

                <div className="policy-indent">
                    <div className={css(
                        "policy-details",
                        readonlyMode && "is-disabled"
                    )}>
                        {Resources.WorkItemLinkingEnableDetail}
                    </div>

                    {isActive &&

                        /*
                        Required / optional policy
                        */
                        <div className="ms-slideDownIn10">
                            <PolicyRequirement readonlyMode={readonlyMode}
                                onChange={this._isBlockingOnChange}
                                requiredDetails={Resources.WorkItemLinkingRequiredDetail}
                                optionalDetails={Resources.WorkItemLinkingOptionalDetail}
                                isBlocking={isBlocking} />
                        </div>
                    }
                </div>
            </section>
        );
    }

    public get policyTypeId(): string {
        return WorkItemLinking.Id;
    }

    protected _createDefaultSettings(): WorkItemLinking.Settings {
        return {};
    }

    constructor(props: Base.SingletonPolicyBaseProps) {
        super(props);
    }
}
