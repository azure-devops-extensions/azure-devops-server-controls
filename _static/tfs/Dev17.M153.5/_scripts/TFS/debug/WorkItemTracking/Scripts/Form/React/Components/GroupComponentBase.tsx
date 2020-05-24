import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/GroupComponent";

import * as React from "react";

import { ILayoutGroup } from "WorkItemTracking/Scripts/Form/Layout";
import { WIFormCIDataHelper } from "WorkItemTracking/Scripts/Utils/WIFormCIDataHelper";
import { IWorkItemFormComponentContext, WorkItemContextProviderPropTypes } from "WorkItemTracking/Scripts/Form/React/FormContext";
import { IWorkItemTypeSettings } from "WorkItemTracking/Scripts/Form/Models";
import { LayoutUserSettingsUtility } from "WorkItemTracking/Scripts/Utils/LayoutUserSettingsUtility";
import { FormLayoutType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { WorkItemBindableComponent } from "./WorkItemBindableComponent";
import { ActionAdapter } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { getService } from "VSS/Service";
import { WorkItemFormUserLayoutSettingsService } from "WorkItemTracking/Scripts/Form/UserLayoutSettings";
import { autobind } from "OfficeFabric/Utilities";

export interface IGroupComponentBaseProps {
    pageId: string;

    /** Layout group to render */
    group: ILayoutGroup;
}

export interface IGroupComponentBaseState {
    isExpanded: boolean;
}

/**
 * Abstract base class for group components.  Encapsulates common code for handling expansion state.
 */
export abstract class GroupComponentBase<TProps extends IGroupComponentBaseProps, TState extends IGroupComponentBaseState = IGroupComponentBaseState> extends WorkItemBindableComponent<TProps, TState> {

    static contextTypes = WorkItemContextProviderPropTypes;
    public context: IWorkItemFormComponentContext;

    constructor(props: TProps, context: any) {
        super(props, context);

        this.state = this._getInitialState();
    }

    protected _getInitialState(): TState {
        return {
            isExpanded: this._getExpansionState()
        } as TState;
    }

    @autobind
    protected _onToggle(isExpanded: boolean) {
        this.setState({
            isExpanded: isExpanded
        });

        // Record that it happened
        WIFormCIDataHelper.groupPanelCollapsed(isExpanded, { groupName: this.props.group.label });

        const formContext = this.context.provider.getFormContext();

        // Toggle the persisted state
        const workItemType = formContext.workItemType;
        if (!workItemType) {
            return;
        }

        const store = workItemType.store;
        const groupId = this.props.group.id;

        getService(WorkItemFormUserLayoutSettingsService)
            .setGroupExpansionState(workItemType, groupId, !isExpanded, formContext.layoutType)
            .then(null, () => { /* Ignore errors */ });
    }

    private _getExpansionState(): boolean {
        const formContext = this.context.provider.getFormContext();

        let workItemTypeSettings: IWorkItemTypeSettings;
        const workItemType = formContext.workItemType;
        if (workItemType) {
            workItemTypeSettings = getService(WorkItemFormUserLayoutSettingsService).getLayoutSettingsForWorkItemType(workItemType);
        }

        if (workItemTypeSettings) {
            return !LayoutUserSettingsUtility.isGroupCollapsedForWorkItemType(workItemTypeSettings, this.props.group.id, formContext.layoutType);
        }

        return this.props.group.isExpanded;
    }
}