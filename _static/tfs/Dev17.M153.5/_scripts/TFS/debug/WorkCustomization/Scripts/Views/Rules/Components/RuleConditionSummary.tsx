/// <reference types="react" />

import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { autobind } from "OfficeFabric/Utilities";
import { ProcessRule, RuleCondition, RuleConditionType } from "TFS/WorkItemTracking/ProcessContracts";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import * as StringUtils from "VSS/Utils/String";
import * as Tooltip from "VSSUI/Tooltip";
import { CoreFieldRefNames } from 'Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants';

export interface IRuleConditionSummaryProps extends Props {
    rule: ProcessRule;
    getFieldFriendlyName: (refName: string) => string;
}

export class RuleConditionSummary extends Component<IRuleConditionSummaryProps, State> {
    public render() {
        const rule: ProcessRule = this.props.rule;
        let text = this._capitalizeFirstLetter(this._getConditionString());
        return <span className={this.props.cssClass}>
                    <Tooltip.TooltipHost content={text} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                        {text}
                    </Tooltip.TooltipHost>
                </span>;
    }
    
    private _getConditionString(): string {
        let conditionFullString: string = "";

        for (var i = 0; i < this.props.rule.conditions.length; i++) {
            let condition: RuleCondition = this.props.rule.conditions[i];

            let conditionPartialString = this._getResourceStringForConditionType(condition);

            if (i == 0) {
                conditionFullString = conditionPartialString;
            }
            else if (i == this.props.rule.conditions.length - 1) {
                conditionFullString += StringUtils.format(Resources.FriendlyRuleLastConditionFormat, conditionPartialString);
            }
            else {
                conditionFullString += StringUtils.format(Resources.FriendlyRuleMiddleConditionFormat, conditionPartialString);
            }
        }

        return conditionFullString;
    }

    private _getResourceStringForConditionType(condition: RuleCondition) {

        if (condition.conditionType === RuleConditionType.WhenValueIsNotDefined) {
            return StringUtils.format(Resources.FriendlyRuleValueNotDefined, condition.field ? this.props.getFieldFriendlyName(condition.field) : "");
        }

        if (condition.conditionType === RuleConditionType.WhenValueIsDefined) {
            return StringUtils.format(Resources.FriendlyRuleValueDefined, condition.field ? this.props.getFieldFriendlyName(condition.field) : "");
        }

        if (condition.conditionType === RuleConditionType.WhenStateChangedFromAndTo) {
            let stateValues: string[] = condition.value.split('.');
            return StringUtils.format(this._conditionMapping[condition.conditionType], stateValues[0], stateValues[1]);
        }

        if (condition.conditionType === RuleConditionType.WhenStateChangedTo) {
            return StringUtils.format(this._conditionMapping[condition.conditionType], condition.value);
        }

        if (condition.conditionType === RuleConditionType.When && condition.field === CoreFieldRefNames.State) {
            return StringUtils.format(Resources.FriendlyRuleWhenStateIs, condition.value);
        }

        if (condition.conditionType === RuleConditionType.WhenNot && condition.field === CoreFieldRefNames.State) {
            return StringUtils.format(Resources.FriendlyRuleWhenStateIsNot, condition.value);
        }

        return StringUtils.format(this._conditionMapping[condition.conditionType], condition.field ? this.props.getFieldFriendlyName(condition.field) : "", condition.value || "");
    }

    private _conditionMapping: IDictionaryStringTo<string> = {
        [RuleConditionType.WhenStateChangedFromAndTo]: Resources.FriendlyRuleWhenStateChangedFromAndToCondition,
        [RuleConditionType.WhenWorkItemIsCreated]: Resources.FriendlyRuleWhenWorkItemIsCreatedCondition,
        [RuleConditionType.WhenStateChangedTo]: Resources.FriendlyRuleWhenStateChangedToCondition,
        [RuleConditionType.When]: Resources.FriendlyRuleWhenCondition,
        [RuleConditionType.WhenNot]: Resources.FriendlyRuleWhenNotCondition,
        [RuleConditionType.WhenNotChanged]: Resources.FriendlyRuleWhenNotChangedCondition,
        [RuleConditionType.WhenChanged]: Resources.FriendlyRuleWhenChangedCondition,
        [RuleConditionType.WhenWas]: Resources.FriendlyRuleWhenWasCondition
    }

    private _capitalizeFirstLetter(input: string) {
        return input.charAt(0).toUpperCase() + input.slice(1);
    }
}