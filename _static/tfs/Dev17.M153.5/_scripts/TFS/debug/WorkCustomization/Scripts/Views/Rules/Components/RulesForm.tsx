/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/Rules/Components/RulesForm";
import * as React from "react";
import * as Tooltip from "VSSUI/Tooltip";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Link } from "OfficeFabric/Link";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Action } from "VSS/Flux/Action";
import { Component, Props, State } from "VSS/Flux/Component";
import { IGetWorkItemTypePayload } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { CommonUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import { RulesViewActionCreator, RulesViewActions } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesViewActions";
import { ConditionsList } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/ConditionList";
import { ActionList } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/ActionList";
import { IRuleNameTextFieldProps, RuleNameTextField } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/RuleNameTextField";
import { RulesViewStore } from "WorkCustomization/Scripts/Views/Rules/Stores/RulesViewStore";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import {CustomizationType, ProcessRule} from "TFS/WorkItemTracking/ProcessContracts";
import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");

export interface IRulesFormProps extends Props {
    actionsCreator: RulesViewActionCreator;
    ruleFormStore: RulesViewStore;
    processId: string;
    workItemTypeRefName: string;
    placeFocusOnForm?: boolean;
    isDisabled?: boolean;
}

export interface IRuleFormState extends State {
    isDisabled: boolean;
}

export class RulesForm extends Component<IRulesFormProps, IRuleFormState> {
    public static readonly saveRuleButtonClassName: string = "primary-button";

    private _shortcutGroup: RulesFormShortCutGroup;
    private _store: RulesViewStore;
    private _isDisabled: boolean;

    constructor(props: IRulesFormProps) {
        super(props);
    }

    public render(): JSX.Element {

        let store = this.props.ruleFormStore;
        let rule = store.getRule();
        let isSystem = rule.customizationType == CustomizationType.System;
        let enableSave = this._canSaveRule();
        let enableCancel = store.isDirty() && !isSystem && !this.state.isDisabled && !this.props.isDisabled;

        let newRuleHeader = (!rule.id && !(rule.customizationType == CustomizationType.System)) ? this._getNewRuleHeader() : null;

        return <div className="rules-form" key={rule.id}>
            {newRuleHeader}
            <RuleNameTextField {...this._getRuleNameTextFieldProps() }></RuleNameTextField>
            <ConditionsList
                actionsCreator={this.props.actionsCreator}
                store={store}
                processId={this.props.processId}
                workItemTypeRefName={this.props.workItemTypeRefName}
                isDisabled={this.props.isDisabled} />
            <ActionList
                actionsCreator={this.props.actionsCreator}
                store={store}
                processId={this.props.processId}
                workItemTypeRefName={this.props.workItemTypeRefName}
                isDisabled={this.props.isDisabled}/>
            <div className={"button-container"}>
                <PrimaryButton className={RulesForm.saveRuleButtonClassName} disabled={!enableSave} onClick={this._onSave}>{Resources.SaveButtonText}</PrimaryButton>
                <DefaultButton onClick={this._onCancel} disabled={!enableCancel}>{Resources.CancelButtonText}</DefaultButton>
            </div>
        </div >;
    }

    protected getState(): IRuleFormState {
        let isDisabled = this.state ? this.state.isDisabled : false;
        return { isDisabled: isDisabled };
    }

    public componentWillMount() {
        this._shortcutGroup = new RulesFormShortCutGroup(this._onSave);
    }

    public componentWillUnmount() {
        this._shortcutGroup.dispose();
    }

    private _getRuleNameTextFieldProps(): IRuleNameTextFieldProps {
        let isDirty = this.props.ruleFormStore.isDirty();
        let rule: ProcessRule = this.props.ruleFormStore.getRule();
        return {
            focusOnUpdate: this.props.placeFocusOnForm,
            isDirty: isDirty,
            name: rule.name,
            onChange: this._onNameChange,
            isNewRule: !rule.id,
            isDisabled: this.props.isDisabled
        };
    }

    @autobind
    private _onNameChange(newName: string): void {
        let updatedRule = this._getRuleClone();
        updatedRule.name = newName;
        this.props.actionsCreator.updateRule(updatedRule);
    }

    private _getRuleClone(): ProcessRule {
        return CommonUtils.getClone<ProcessRule>(this.props.ruleFormStore.getRule());
    }


    @autobind
    private _onSave(): void {

        if (this._canSaveRule()) {
            this.setState({ isDisabled: true });

            this.props.actionsCreator
                .beginSaveRule(this.props.ruleFormStore.getRule(), this.props.processId, this.props.workItemTypeRefName)
                .finally(() => {
                    this.setState({ isDisabled: false });
                });
        }
    }

    private _canSaveRule(): boolean {
        let store = this.props.ruleFormStore;
        let rule = store.getRule();
        return store.isDirty() && store.isValid() && !(rule.customizationType == CustomizationType.System) && !this.state.isDisabled && !this.props.isDisabled;
    }

    @autobind
    private _onCancel(): void {
        this.props.actionsCreator.cancelFormEdits();
    }

    private _getNewRuleHeader(): JSX.Element {
        return <div className="new-rule-header-container">
            <div className="new-rule-title">
                <i className="bowtie-icon bowtie-set-actions"></i>
                <span role="heading">{Resources.NewWorkItemRule}</span>
            </div>
            <span className="new-rule-subtext">{Resources.NewWorkItemRuleSubText}</span>
            <Link className="new-rule-subtext-link" href={Resources.CreateRuleFwLink} target="_blank" rel="external">{Resources.RuleLearnMoreLinkText}</Link>
        </div>
    }
}

class RulesFormShortCutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {
    private _onSaveCallback;
    constructor(onSaveCallback: Function) {
        super(Resources.RulesPageKeyboardShortcutGroup);
        this._onSaveCallback = onSaveCallback;
        this.registerShortcuts();
    }

    public dispose() {
        this.removeShortcutGroup();
    }

    /**
     *  Register default keyboard shortcuts to framework provided Shortcuts manager
     */
    public registerShortcuts() {
        this.registerShortcut(
            "ctrl+s",
            {
                description: Resources.QuickSaveRule,
                action: () => {
                    this._onSaveCallback();
                },
                globalCombos: ["ctrl+s"]
            });
    }

}