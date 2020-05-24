import * as React from "react";

import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { css } from "OfficeFabric/Utilities";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

import "VSS/LoaderPlugins/Css!Policy/Scenarios/Shared/PolicyRequirement";

export interface PolicyRequirementProps {
    className?: string;
    isBlocking: boolean;
    readonlyMode: boolean;
    onChange: (ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption) => void;
    requiredDetails: string;
    optionalDetails: string;
}

export class PolicyRequirement extends React.PureComponent<PolicyRequirementProps, {}> {

    public render(): JSX.Element {
        return (
            <ChoiceGroup
                className={css(this.props.className, "policy-requirement-choice-group")}
                disabled={this.props.readonlyMode}
                label={Resources.PolicyRequirement}
                onChange={this.props.onChange}
                options={[
                    {
                        key: "true",
                        text: ([
                            <div key="1">{Resources.Required}</div>,
                            <div key="2" className="policy-details">{this.props.requiredDetails}</div>
                        ]) as any,
                        checked: this.props.isBlocking,
                    },
                    {
                        key: "false",
                        text: ([
                            <div key="1">{Resources.Optional}</div>,
                            <div key="2" className="policy-details">{this.props.optionalDetails}</div>
                        ]) as any,
                        checked: !this.props.isBlocking,
                    },
                ]} />
        );
    }
}
