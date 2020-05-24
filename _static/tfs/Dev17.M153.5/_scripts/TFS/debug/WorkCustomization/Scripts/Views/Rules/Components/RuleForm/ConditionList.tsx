/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import * as React from "react";
import * as Tooltip from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";
import { Component, Props } from "VSS/Flux/Component";
import { InputList } from "WorkCustomization/Scripts/Common/Components/Inputs/InputList";
import { RulesViewActionCreator, RulesViewActions } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesViewActions";
import { ConditionEditor } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/ConditionEditor";
import { RulesViewStore } from "WorkCustomization/Scripts/Views/Rules/Stores/RulesViewStore";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { ProcessRule, RuleCondition, RuleConditionType,CustomizationType } from "TFS/WorkItemTracking/ProcessContracts";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export interface IConditionsListProps extends Props {
    store: RulesViewStore;
    processId: string;
    workItemTypeRefName: string;
    actionsCreator: RulesViewActionCreator;
    isDisabled?: boolean;
}

export interface IConditionsListState {
    conditions: RuleCondition[];
    disableAdd: boolean;
}

export class ConditionsList extends Component<IConditionsListProps, IConditionsListState> {

    private _focusIndex: number;

    public render(): JSX.Element {
        if (!this.state.conditions) {
            return null;
        }

        return <div>
            <div className={"rule-form-section-header-container"}>
                <span role="heading" className={"rule-form-section-header"}>{Resources.ConditionsSectionHeader}</span>
                <Tooltip.TooltipHost content={Resources.AddConditionsTooltip}>
                    <i className={"bowtie-icon bowtie-status-info-outline"} aria-label={Resources.AddConditionsTooltip} tabIndex={0}></i>
                </Tooltip.TooltipHost>
            </div>
            <InputList items={this.state.conditions}
                disableAdd={this.state.disableAdd || this.props.isDisabled}
                addButtonText={Resources.NewConditionButtonText}
                onRenderItem={this._onRenderCell}
                onAddItemClicked={this._addNewCondition}
                buttonCssClass={"add-condition-button"} />
        </div>;
    }

    protected getStore(): RulesViewStore {
        return this.props.store;
    }

    protected getState(): IConditionsListState {
        const rule = this.props.store.getRule();
        if (!rule) {
            return {
                conditions: null
            } as IConditionsListState;
        }

        let conditions = rule.conditions;

        return {
            disableAdd: disableAddConditions(rule),
            conditions: conditions
        };
    }

    @autobind
    private _onRenderCell(item: RuleCondition, index: number): JSX.Element {

        let focusRowOnMountOrUpdate = false;
        if (this._focusIndex === index) {
            this._focusIndex = -1;
            focusRowOnMountOrUpdate = true;
        }

        return <ConditionEditor
            index={index}
            store={this.props.store}
            actionsCreator={this.props.actionsCreator}
            processId={this.props.processId}
            placeFocusOnMountOrUpdate={focusRowOnMountOrUpdate}
            removeCondition={this._removeCondition}
            workItemTypeRefName={this.props.workItemTypeRefName}
            isDisabled={this.props.isDisabled} />
    }

    @autobind
    private _addNewCondition(): void {
        const rule = this.props.store.getRule();
        this._focusIndex = rule.conditions.length;
        this.props.actionsCreator.addCondition(rule);
    }

    @autobind
    private _removeCondition(rule: ProcessRule, index: number) {
        this._focusIndex = Math.min(index, this.state.conditions.length - 2);
        this.props.actionsCreator.removeCondition(rule, index);
    }
}

export const disableAddConditions = (rule: ProcessRule): boolean => {
    let conditions = rule.conditions;

    let disableAddForWhenStateChangedToCondition = false;
    if (conditions.length === 1 &&
        (conditions[0].conditionType === RuleConditionType.WhenStateChangedTo ||
            (conditions[0].conditionType === RuleConditionType.WhenNot && conditions[0].field === CoreFieldRefNames.State))) {
        disableAddForWhenStateChangedToCondition = true;
    }

    return (conditions.length === maxConditionCount) || (rule.customizationType == CustomizationType.System) || disableAddForWhenStateChangedToCondition;

}
export const maxConditionCount = 2;