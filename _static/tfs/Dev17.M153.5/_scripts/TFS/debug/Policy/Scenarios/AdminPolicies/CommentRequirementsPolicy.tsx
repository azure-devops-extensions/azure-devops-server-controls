// libs
import * as React from "react";
import { css } from "OfficeFabric/Utilities";
// controls
import { Checkbox } from "OfficeFabric/Checkbox";
import { ChoiceGroup } from "OfficeFabric/ChoiceGroup";
// contracts
import { CommentRequirements } from "Policy/Scripts/PolicyTypes";
// scenario
import * as Base from "Policy/Scenarios/AdminPolicies/SingletonPolicyBase";
import { PolicyRequirement } from "Policy/Scenarios/Shared/PolicyRequirement";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export class CommentRequirementsPolicy
    extends Base.SingletonPolicyBase<CommentRequirements.Settings, Base.SingletonPolicyBaseProps> {

    public render(): JSX.Element {

        const { readonlyMode, configs, createLocalPolicyConfig, updateLocalPolicyConfig, ...htmlProps} = this.props;

        const { isActive, isBlocking } = this._parseLocalConfig();

        return (
            <section aria-label={Resources.CommentRequirementsSectionLabel} {...htmlProps}>
                <Checkbox
                    label={Resources.CommentRequirementsPolicyEnableText}
                    className="policy-type-heading policy-checkBox-heading"
                    checked={!!isActive}
                    onChange={this._isActiveOnChanged}
                    disabled={readonlyMode} />

                <div className="policy-indent">
                    <div
                        className={css(
                            "policy-details",
                            (readonlyMode && "is-disabled")
                        )}
                    >
                        {Resources.CommentRequirementsPolicyEnableDetail}
                    </div>

                    {isActive &&

                        /*
                        Required / optional policy
                        */
                        <div className="ms-slideDownIn10">
                            <PolicyRequirement readonlyMode={readonlyMode}
                                onChange={this._isBlockingOnChange}
                                requiredDetails={Resources.CommentRequirementsRequiredDetail}
                                optionalDetails={Resources.CommentRequirementsgOptionalDetail}
                                isBlocking={isBlocking} />
                        </div>
                    }
                </div>
            </section>
        );
    }

    protected get policyTypeId(): string {
        return CommentRequirements.Id;
    }

    protected _createDefaultSettings(): CommentRequirements.Settings {
        return {};
    }

    constructor(props: Base.SingletonPolicyBaseProps) {
        super(props);
    }
}
