/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/Rules/Components/WorkItemTypeRulesPivot";
import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { Component, Props, State } from "VSS/Flux/Component";
import Utils_Array = require("VSS/Utils/Array");
import { getWorkItemTypesStore, WorkItemTypesStore, IWorkItemTypeData }
    from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { RulesForm } from "WorkCustomization/Scripts/Views/Rules/Components/RulesForm";
import { RuleUtils } from "WorkCustomization/Scripts/Utils/RuleUtils";
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");

import { IObjectWithKey } from "OfficeFabric/utilities/selection/interfaces";
import { ProcessNavDetailsList } from "WorkCustomization/Scripts/Common/Components/ProcessNavDetailsList";
import { Splitter } from "VSSPreview/Flux/Components/Splitter";

import { RulesDataActionsCreator } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesDataActions";
import { RulesDataStore } from "WorkCustomization/Scripts/Views/Rules/Stores/RulesDataStore";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { WorkItemTypeFieldsActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypeFieldsActions";
import { StatesActionCreator } from "WorkCustomization/Scripts/Actions/StatesActions";
import { RulesViewActionCreator, GetRuleActions, RulesViewActions } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesViewActions";
import { RulesGrid } from "WorkCustomization/Scripts/Views/Rules/Components/RulesGrid";
import { CommandButton } from "OfficeFabric/Button";
import { WorkItemTypesActionCreator } from "WorkCustomization/Scripts/Actions/WorkItemTypesActions";
import { ZeroDay } from "WorkCustomization/Scripts/Views/Rules/Components/ZeroDay";
import { RulesViewStore } from "WorkCustomization/Scripts/Views/Rules/Stores/RulesViewStore";
import { ProcessCustomizationTelemetry } from "WorkCustomization/Scripts/Utils/Telemetry";
import { setDialogAction, DialogType as DialogActionsDialogType } from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import {CustomizationType, ProcessRule} from "TFS/WorkItemTracking/ProcessContracts";

export interface IRulesGridState extends State {
    isReady: boolean;
    currentRule: ProcessRule;
}

export class WorkItemTypeRulesPivot extends Component<Props, IRulesGridState> {

    private _store: RulesViewStore;
    private _actionsCreator: RulesViewActionCreator;
    private _placeFocusOnForm: boolean;
    private _onResizeDelegate;

    constructor() {
        super();

        this.state = { isReady: false, currentRule: null };

    }

    public getStore(): RulesViewStore {
        if (!this._store) {
            let store: WorkItemTypesStore = getWorkItemTypesStore();
            let currentProcess: IProcess = store.getCurrentProcess();
            let witRef = UrlUtils.getCurrentWorkItemTypeIdFromUrl();
            let ruleActions: RulesViewActions = GetRuleActions();

            let witTypeRulesActionCreator = new RulesDataActionsCreator();
            let witTypeRulesStore = new RulesDataStore(witTypeRulesActionCreator.getActions());

            this._store = new RulesViewStore(ruleActions, currentProcess.templateTypeId, witRef, witTypeRulesStore);
            this._actionsCreator = new RulesViewActionCreator(ruleActions, witTypeRulesActionCreator);
            this._actionsCreator.beginFetchWorkItemTypeRules(currentProcess.templateTypeId, witRef);
            WorkItemTypeFieldsActionCreator.beginGetWorkItemTypeAllFieldsData(currentProcess.templateTypeId, witRef);
            StatesActionCreator.beginGetWorkItemTypeStates(currentProcess.templateTypeId, witRef);
        }
        return this._store;
    }

    public getState(): IRulesGridState {
        return {
            isReady: this.getStore().isReady(),
            currentRule: this.getStore().getRule()
        } as IRulesGridState;
    }

    public componentWillUnmount() {
        this._store.dispose();
    }

    render(): JSX.Element {
        let store: WorkItemTypesStore = getWorkItemTypesStore();
        let currentProcess: IProcess = store.getCurrentProcess();
        let witRef = UrlUtils.getCurrentWorkItemTypeIdFromUrl();
        let items: IContextualMenuItem[] = [];
        let farItems: IContextualMenuItem[] = [];

        // this is done in other pivots, must be done in this pivot too to bring the work item type info in order to show the wit type breadcrumb
        if (currentProcess != null && !!witRef && store.getWorkItemType(currentProcess.templateTypeId, witRef, true) == null) {
            WorkItemTypesActionCreator.beginGetWorkItemTypes(currentProcess.templateTypeId);
            WorkItemTypesActionCreator.beginGetWorkItemType(currentProcess.templateTypeId, witRef);
        }

        if (!this.getState().isReady) {
            return <Spinner type={SpinnerType.large} />;
        }

        let rules: ProcessRule[] = this._store.getRulesToDisplay();

        if (rules.length === 0) {
            return <ZeroDay onNewPlanCallback={this._onAddRuleCTAClicked} />
        }

        if (!currentProcess) {
            return null;
        }

        items.push({
            key: "NEW_RULE",
            name: Resources.NewRuleName,
            iconProps: contextualMenuIcon("bowtie-math-plus-light"),
            disabled: (!currentProcess.isInheritedTemplate || !!this._store.getDirtyRuleMap()[RulesViewStore.NewRuleKey] || !this.getState().currentRule.id || !currentProcess.editPermission),
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                this._placeFocusOnForm = true;
                this._setRule(RuleUtils.getNewRule());
            }
        });

        let left = <RulesGrid
            rules={rules}
            currentRule={this.getState().currentRule}
            deleteRule={this._deleteRule}
            selectRule={this._setRule}
            disableRule={this._disableRule}
            dirtyRules={this._store.getDirtyRuleMap()}
            getFieldByNameOrRefName={(nameOrRefname: string) => { return this._store.getFieldByReferenceNameOrName(nameOrRefname); }}
            isDisabled={!currentProcess.editPermission}
        />;

        let placeFocusOnForm = false;
        if (this._placeFocusOnForm) {
            placeFocusOnForm = true;
            this._placeFocusOnForm = false;
        }

        let right = <RulesForm actionsCreator={this._actionsCreator}
            ruleFormStore={this._store}
            workItemTypeRefName={witRef}
            processId={currentProcess.templateTypeId}
            isDisabled={!currentProcess.editPermission}
            placeFocusOnForm={placeFocusOnForm} />;

        return (
            <div className="work-item-type-rules-pivot bowtie-fabric">
                <CommandBar items={items} farItems={farItems} />
                <div className="rules-splitter">
                    <div className="leftPane">
                        {left}
                    </div>
                    <div className="handleBar">
                        <div className="handleBar-hitTarget" />
                    </div>
                    <div className="rightPane">
                        {right}
                    </div>
                </div>
            </div>
        );
    }


    @autobind
    private _onAddRuleCTAClicked() {

        this._placeFocusOnForm = true;
        this._setRule(RuleUtils.getNewRule());
    }
    
    @autobind
    private _setRule(rule: ProcessContracts.ProcessRule): void {

        if (!rule) {
            return;
        }

        this._actionsCreator.editRule(rule);
    }

    @autobind
    private _deleteRule(rule: ProcessContracts.ProcessRule, index: number) {
        let store: WorkItemTypesStore = getWorkItemTypesStore();
        let currentProcess: IProcess = store.getCurrentProcess();
        let witRef = store.getWorkItemType(currentProcess.templateTypeId, UrlUtils.getCurrentWorkItemTypeIdFromUrl(), true).workItemType.referenceName;
        this._actionsCreator.launchDeleteRuleConfirmationDialog(currentProcess.templateTypeId, witRef, rule, index, currentProcess.editPermission);
    }

    @autobind
    private _disableRule(rule: ProcessContracts.ProcessRule) {
        let store: WorkItemTypesStore = getWorkItemTypesStore();
        let currentProcess: IProcess = store.getCurrentProcess();
        let witRef = store.getWorkItemType(currentProcess.templateTypeId, UrlUtils.getCurrentWorkItemTypeIdFromUrl(), true).workItemType.referenceName;

        // feel like all crud operations should run throw witRulesActions instead of ruleActions... this is a good example why. we should think about refactoring
        rule.isDisabled = !rule.isDisabled;
        this._actionsCreator.beginSaveRule(rule, currentProcess.templateTypeId, witRef);
        ProcessCustomizationTelemetry.onRuleDisabled(currentProcess.templateTypeId, witRef);
    }
}
