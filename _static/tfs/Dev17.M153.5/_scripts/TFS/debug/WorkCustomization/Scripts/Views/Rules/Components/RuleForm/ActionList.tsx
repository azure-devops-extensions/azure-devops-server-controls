/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import * as React from "react";
import * as Tooltip from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";
import { Component, State, Props } from "VSS/Flux/Component";
import { InputList } from "WorkCustomization/Scripts/Common/Components/Inputs/InputList";
import { RulesViewActionCreator, RulesViewActions } from "WorkCustomization/Scripts/Views/Rules/Actions/RulesViewActions";
import { ActionEditor } from "WorkCustomization/Scripts/Views/Rules/Components/RuleForm/ActionEditor";
import { RulesViewStore } from "WorkCustomization/Scripts/Views/Rules/Stores/RulesViewStore";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { RuleAction, ProcessRule} from "TFS/WorkItemTracking/ProcessContracts";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export interface IActionsListProps extends Props {
    store: RulesViewStore;
    processId: string;
    workItemTypeRefName: string;
    actionsCreator: RulesViewActionCreator;
    isDisabled?: boolean;
}

export interface IActionsListState {
    conditions: RuleAction[];
}

export class ActionList extends Component<IActionsListProps, State>{

    private _focusIndex: number;

    public render(): JSX.Element {
        const rule = this.props.store.getRule();
        const actionMaxCount = 10;
        let actions = rule.actions;
        let disableAdd = (actions.length === actionMaxCount) || this.props.isDisabled;

        return <div>
            <div className={"rule-form-section-header-container"}>
                <span role="heading" className={"rule-form-section-header"}>{Resources.ActionsHeader}</span>
                <Tooltip.TooltipHost content={Resources.AddActionsTooltip}>
                    <i className={"bowtie-icon bowtie-status-info-outline"} aria-label={Resources.AddActionsTooltip} tabIndex={0}></i>
                </Tooltip.TooltipHost>
            </div>
            <InputList items={actions}
                disableAdd={disableAdd}
                addButtonText={Resources.NewActionButtonText}
                onRenderItem={this._onRenderCell}
                onAddItemClicked={this.addNewAction} />
        </div>;
    }

    @autobind
    private _onRenderCell(item: RuleAction, index: number): JSX.Element {
        let focusRowOnMountOrUpdate = false;
        if (this._focusIndex === index) {
            this._focusIndex = -1;
            focusRowOnMountOrUpdate = true;
        }

        return <ActionEditor index={index}
            store={this.props.store}
            actionsCreator={this.props.actionsCreator}
            processId={this.props.processId}
            placeFocusOnMountOrUpdate={focusRowOnMountOrUpdate}
            removeAction={this._removeAction}
            workItemTypeRefName={this.props.workItemTypeRefName}
            isDisabled={this.props.isDisabled} />
    }

    @autobind
    private addNewAction(): void {
        let rule: ProcessRule = this.props.store.getRule();
        this._focusIndex = rule.actions.length;
        this.props.actionsCreator.addAction(this.props.store.getRule());
    }

    @autobind
    private _removeAction(index: number) {
        let rule: ProcessRule = this.props.store.getRule();
        this._focusIndex = Math.min(index, rule.actions.length - 2);
        this.props.actionsCreator.removeAction(rule, index);
    }
}
