/// <reference types="react" />

import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { Component, Props, State } from "VSS/Flux/Component";
import Utils_Array = require("VSS/Utils/Array");
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { ProcessRule, CustomizationType } from "TFS/WorkItemTracking/ProcessContracts";
import { IObjectWithKey } from "OfficeFabric/utilities/selection/interfaces";
import { ProcessNavDetailsList } from "WorkCustomization/Scripts/Common/Components/ProcessNavDetailsList";
import { IViewport } from "OfficeFabric/utilities/decorators/withViewport";
import { IColumn } from "OfficeFabric/DetailsList";
import { PopupContextualMenu, IPopupContextualMenuProps } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import { RuleConditionSummary } from "WorkCustomization/Scripts/Views/Rules/Components/RuleConditionSummary";
import * as Tooltip from "VSSUI/Tooltip";
import * as StringUtils from "VSS/Utils/String";
import { WorkItemField } from "TFS/WorkItemTracking/Contracts";

interface IRulesGridRow extends IObjectWithKey {
    rule: ProcessRule;
}

export interface IRulesGridProps extends Props {
    rules: ProcessRule[];
    dirtyRules: IDictionaryStringTo<ProcessRule>;
    currentRule: ProcessRule;
    selectRule: (rule: ProcessRule) => void;
    deleteRule: (rule: ProcessRule, index: number) => void;
    disableRule: (rule: ProcessRule) => void;
    getFieldByNameOrRefName: (nameOrRefname: string) => WorkItemField;
    isDisabled?: boolean;
}

export class RulesGrid extends Component<IRulesGridProps, State> {

    private _contextMenuOpenIndex: number;
    private static NewRuleKey = "new-rule";
    public static readonly RulesGridRowClassName = "rules-grid-row";
    private _deleteRuleDialogId: string = null;
    // Hack used for rule focus on delete fix. Should be revisited and cleaned up with ProcessNavDetails cleanup
    private _deletedIndex = -1;

    constructor() {
        super();

        this._contextMenuOpenIndex = -1;
        this.state = {};

    }

    render(): JSX.Element {

        let rules: ProcessRule[] = this.props.rules;
        let gridItems: IRulesGridRow[] = [];


        let currentRule = this.props.currentRule;

        let selectedIndex = Utils_Array.findIndex(rules, (rule: ProcessRule) => { return currentRule.id === rule.id });

        // this is a semi-hack for zero day experience, on zero day, because the grid is mounting at the same time as the form, and we want focus to go on the form, we will give no selected index to grid so that it does not focus on mount
        // otherwise the selected index is just what is selected;
        if (rules.length === 1 && !rules[0].id) {
            selectedIndex = null;
        }

        for (var i = 0; i < rules.length; i++) {
            gridItems.push({ key: rules[i].id || RulesGrid.NewRuleKey, rule: rules[i] });
        }

        let setFocusOnDelete = false;
        if (selectedIndex < 0 && this._deleteRuleDialogId === currentRule.id) {
            setFocusOnDelete = true;
            selectedIndex = Math.min(Math.max(0, this._deletedIndex - 1), rules.length - 2);
        }
        else {
            this._deletedIndex = -1;
        }
        this._deleteRuleDialogId = null;

        return <ProcessNavDetailsList
            ariaLabelForGrid={Resources.RulesGrid}
            className={"rules-list"}
            items={gridItems}
            selectionPreservedOnEmptyClick={true}
            columns={this._getColumns()}
            initialFocusedIndex={selectedIndex}
            onItemContextMenu={this._onItemContextMenu}
            setKey={setFocusOnDelete ? "rules-grid-delete" : "rules-grid"}
            onActiveItemChanged={this._onActiveItemChanged}
            isHeaderVisible={false}
        />;
    }

    private _getColumns(): IColumn[] {
        let columns: IColumn[] = [];

        columns.push({
            key: "name",
            name: "name",
            fieldName: null,
            isResizable: false,
            minWidth: 250,
            className: "field-name-column",
            headerClassName: "grid-header ms-font-m",
            onRender: (itemRow: IRulesGridRow, index: number) => {
                let rule = itemRow.rule;
                let isContextMenuOpen = false;
                if (this._contextMenuOpenIndex === index) {
                    isContextMenuOpen = true;
                    this._contextMenuOpenIndex = -1;
                }

                let ruleName = null;
                if (itemRow.key === RulesGrid.NewRuleKey) {
                    ruleName = Resources.NewRuleName;
                }
                else {
                    ruleName = rule.name;
                }

                if (rule.isDisabled) {
                    ruleName = StringUtils.format(Resources.DisabledRuleName, ruleName);
                }
                let unsavedDiv = null;

                let ruleId = rule.id ? rule.id : RulesGrid.NewRuleKey;
                if (this.props.dirtyRules[ruleId]) {
                    unsavedDiv = <span className="unsaved-text">{Resources.UnsavedRuleText}</span>;
                }

                let iconClassName = (rule.customizationType == CustomizationType.System) ? "bowtie-security-lock" : rule.isDisabled ? "bowtie-status-no" : "";
                return <div className={RulesGrid.RulesGridRowClassName}>
                    <i className={"bowtie leading-icon bowtie-icon " + iconClassName} />
                    <div className="rule-name-and-summary-container">
                        <span className="ms-font-m rule-name-text">
                            <Tooltip.TooltipHost content={ruleName} overflowMode={Tooltip.TooltipOverflowMode.Parent}>
                                {unsavedDiv}{ruleName}
                            </Tooltip.TooltipHost>
                        </span>
                        {itemRow.key !== RulesGrid.NewRuleKey ?
                            <RuleConditionSummary cssClass={"rule-condition-summary"} rule={rule} getFieldFriendlyName={(witRefName) => { let field: WorkItemField = this.props.getFieldByNameOrRefName(witRefName); return field ? field.name : witRefName; }} />
                            : null}
                    </div>
                    {(itemRow.key !== RulesGrid.NewRuleKey) && !this.props.isDisabled ?
                        <PopupContextualMenu className={"popup-menu"}
                            iconClassName={"bowtie-ellipsis"}
                            items={this._getContextMenuItems(rule, index)}
                            menuClassName={"processes-popup-menu"}
                            showContextMenu={isContextMenuOpen}
                            onClick={(event) => { this._onContextButtonClicked(itemRow, index, event) }} />
                        : null}
                </div>;
            }
        });

        return columns;
    }

    @autobind
    private _setRule(rule: ProcessRule): void {

        this.props.selectRule(rule);
    }

    // this is code specifically for throttling requests when a user holds the keydown area. we need to not rerender for every
    // list item they pass over but just for where they land
    private _lastSelectedRule: ProcessRule;
    private _timerId: number;

    @autobind
    private _onActiveItemChanged(item?: any, index?: number, ev?: React.FocusEvent<HTMLElement>) {

        if (!ev.target.classList.contains("ms-DetailsRow") && !ev.target.classList.contains("popup-menu-trigger")) {
            return;
        }

        if (item.rule.id === this.props.currentRule.id) {
            return;
        }

        this._startTimer();
        this._lastSelectedRule = item.rule;

    }

    private _startTimer(): void {
        if (this._timerId) {
            window.clearTimeout(this._timerId);
            this._timerId = null;
        }

        this._timerId = window.setInterval(() => {
            this._execute();
        }, 50);
    }

    private _cleanTimer(): void {
        window.clearInterval(this._timerId);
        this._timerId = null;
    }

    private _execute(): void {
        this._cleanTimer();
        this._setRule(this._lastSelectedRule);
    }

    //end code segment

    @autobind
    private _onContextButtonClicked(item: IRulesGridRow, index: number, event: React.MouseEvent<HTMLElement>) {
        event.preventDefault();
        event.stopPropagation();
        this._contextMenuOpenIndex = index;
        this.forceUpdate();
    }

    @autobind
    private _onItemContextMenu(item: IRulesGridRow, index: number, event: Event) {
        this._contextMenuOpenIndex = index;
        this.forceUpdate();
    }

    private _getContextMenuItems(rule: ProcessRule, index: number): IContextualMenuItem[] {
        let items: IContextualMenuItem[] = [];
        items.push({
            key: "DELETE_RULE",
            name: Resources.DeleteRule,
            data: rule,
            iconProps: contextualMenuIcon("bowtie-edit-delete"),
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                this._deletedIndex = index;
                this.props.deleteRule(rule, index);
                this._deleteRuleDialogId = rule.id;
            }
        });

        items.push({
            key: rule.isDisabled ? "ENABLE_RULE" : "DISABLE_RULE",
            name: rule.isDisabled ? Resources.EnableRule : Resources.DisableRule,
            iconProps: contextualMenuIcon(rule.isDisabled ? "bowtie-check" : "bowtie-status-no-fill rules-default-icon-color"),
            data: rule,
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                this.props.disableRule(rule);
            }
        });

        return items;
    }
}
