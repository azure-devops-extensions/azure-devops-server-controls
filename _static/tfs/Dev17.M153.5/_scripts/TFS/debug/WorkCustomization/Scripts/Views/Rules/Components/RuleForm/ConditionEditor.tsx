/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import * as React from "react";
import { CommandButton } from "OfficeFabric/Button";
import { IDropdownOption } from "OfficeFabric/Dropdown";
import { autobind } from "OfficeFabric/Utilities";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Component, Props } from "VSS/Flux/Component";
import {CustomizationType, ProcessRule, RuleCondition, WorkItemStateResultModel} from "TFS/WorkItemTracking/ProcessContracts";
import { RulesViewActionCreator, RulesViewActions } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesViewActions";
import { ConditionParametersEditor, IConditionParameterEditorProps } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/ConditionParameterEditor";
import { ConditionTypeDropdown, IConditionTypeDropdownProps } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/ConditionTypeDropdown";
import { RulesViewStore } from "WorkCustomization/Scripts/Views/Rules/Stores/RulesViewStore";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export interface IConditionEditorProps extends Props {
    index: number;
    actionsCreator: RulesViewActionCreator;
    store: RulesViewStore;
    processId: string;
    workItemTypeRefName: string;
    removeCondition: (rule: ProcessRule, index: number) => void;
    placeFocusOnMountOrUpdate?: boolean;
    isDisabled?: boolean;
}

export interface IConditionEditorState {
    rule: ProcessRule;
    condition: RuleCondition;
    conditionTypes: string[];
    currentConditionType: string;
    hideRemove: boolean;
    initialState: WorkItemStateResultModel;
}

export class ConditionEditor extends Component<IConditionEditorProps, IConditionEditorState>{

    public render(): JSX.Element {
        if (!this.state.rule) {
            return null;
        }

        let deleteButton: JSX.Element = null;
        //TODO: this should be in the condition list component
        if (!this.state.hideRemove) {
            deleteButton = <div className={"rule-form-editor-remove-row"}>
                <CommandButton disabled={this.props.isDisabled} iconProps={{ className: "bowtie-icon bowtie-edit-remove" }} onClick={this._removeCondition} className={"remove-condition-button"} ariaLabel={Resources.RemoveConditionLabel} />
            </div>;
        }

        let conditionDropdownProps: IConditionTypeDropdownProps = {
            selectedKey: this.state.currentConditionType,
            isDisabled: this.props.isDisabled,
            currentConditionTypes: this.state.conditionTypes,
            onChanged: this._onConditionTypeChanged,
            index: this.props.index,
            placeFocusOnMountOrUpdate: this.props.placeFocusOnMountOrUpdate
        }

        let conditionEditorProps: IConditionParameterEditorProps = {
            processId: this.props.processId,
            workItemTypeRefName: this.props.workItemTypeRefName,
            condition: this.state.condition,
            isDisabled: this.props.isDisabled,
            currentConditionType: this.state.currentConditionType,
            conditionParametersChanged: this._conditionParametersChanged
        };

        return <div className={"rule-form-editor-row"}>
            <label className="rules-form-input-label">{this.props.index > 0 ? Resources.AndText : Resources.WhenText}</label>
            <ConditionTypeDropdown {...conditionDropdownProps} />
            <ConditionParametersEditor {...conditionEditorProps} />
            {deleteButton}
        </div>;
    }

    protected getStore(): RulesViewStore {
        return this.props.store;
    }

    protected getState(): IConditionEditorState {
        let rule: ProcessRule = this.getStore().getRule();
        if (!rule) {
            return {
                rule: null
            } as IConditionEditorState;
        }

        let conditionTypes: string[] = rule.conditions.map((c: RuleCondition, index: number) => this.getStore().getConditionType(index));
        let states = this.getStore().getWorkItemTypeStates(this.props.processId, this.props.workItemTypeRefName);
        let initialState = null;
        if (!!states && states.length > 0) {
            initialState = states[0];
        }
        return {
            rule: rule,
            condition: rule.conditions[this.props.index],
            conditionTypes: conditionTypes,
            currentConditionType: this.getStore().getConditionType(this.props.index),
            initialState: initialState,
            hideRemove: (rule.customizationType == CustomizationType.System) || rule.conditions.length === 1
        };
    }

    @autobind
    private _onConditionTypeChanged(option: IDropdownOption): void {
        this.props.actionsCreator.changeConditionType(this.state.rule, this.props.index, option.key.toString(), this.state.initialState);
    }

    @autobind
    private _conditionParametersChanged(value1: string, value2: string): void {
        this.props.actionsCreator.changeConditionParameters(this.state.rule, this.props.index, value1, value2);
    }

    @autobind
    private _removeCondition() {
        this.props.removeCondition(this.state.rule, this.props.index);
    }
}