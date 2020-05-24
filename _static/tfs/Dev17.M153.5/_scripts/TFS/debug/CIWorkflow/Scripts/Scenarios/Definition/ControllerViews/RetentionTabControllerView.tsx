
import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { RetentionPolicyListActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/RetentionPolicyListActionsCreator";
import { RetentionInstanceId } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { RetentionPolicyItem } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyItem";
import { IRetentionPolicyListState, RetentionPolicyListStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/RetentionPolicyListStore";
import { MaximumRetentionPolicyItem } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/MaximumPolicyItem";

import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DragDropManager } from "DistributedTaskControls/Common/DragDropManager";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreBase, DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IInsertListItemData, ITabItemProps } from "DistributedTaskControls/Common/Types";
import { TwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";

import { CommandButton } from "OfficeFabric/Button";

import * as Utils_Array from "VSS/Utils/Array";
import { empty } from "VSS/Utils/String";
import { delay } from "VSS/Utils/Core";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/RetentionTabControllerView";

export interface Props extends ITabItemProps {
    instanceId?: string;
    isReadOnly?: boolean;
}

export class RetentionTabControllerView extends Base.Component<Props, IRetentionPolicyListState> {
    private _actionCreator: RetentionPolicyListActionsCreator;
    private _store: RetentionPolicyListStore;
    private _itemSelectorActions: ItemSelectorActions;

    public componentWillMount() {
        const instanceId = this._getInstanceId();
        this._actionCreator = ActionCreatorManager.GetActionCreator<RetentionPolicyListActionsCreator>(RetentionPolicyListActionsCreator, instanceId);
        this._store = StoreManager.GetStore<RetentionPolicyListStore>(RetentionPolicyListStore, instanceId);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, instanceId);

        this._store.addChangedListener(this._onchange);
        DragDropManager.instance().registerInsertCallback(instanceId, this._insertPolicy);
        DragDropManager.instance().registerRemoveCallback(instanceId, this._deletePolicy);

        this.setState(this._getState());
    }

    public componentWillUnmount() {
        const instanceId = this._getInstanceId();
        DragDropManager.instance().unregisterInsertCallback(instanceId);
        DragDropManager.instance().unregisterRemoveCallback(instanceId);
        this._store.removeChangedListener(this._onchange);
    }

    public render(): JSX.Element {
        let items: Item[] = Utils_Array.clone(this._store.getDataStoreList().map(store => this._getPolicyItem(store)));
        items.push(this._getMaximumPolicyItem(this._store.getMaximumRetentionPolicyStore()));

        return (
            <div className="ci-retention-tab-content" role="region" aria-label={Resources.ARIALabelRetention}>
                <TwoPanelSelectorComponent
                    items={items}
                    defaultItemKey={ this._getDefaultSelectedItem(items).getKey() }
                    leftPaneARIARegionRoleLabel={Resources.ARIALabelRetentionLeftPane}
                    rightPaneARIARegionRoleLabel={Resources.ARIALabelRetentionRightPane}
                    leftHeader={this._getLeftPaneHeader()}
                    instanceId={this._getInstanceId()}
                    setFocusOnLastSelectedItem={true} />
            </div>
        );
    }

    private _getLeftPaneHeader(): JSX.Element {
        return (
            <div className="ci-retention-leftpane-header">
                <div className="ci-retention-leftpane-header-group">
                    <div className="ci-retention-leftpane-header-heading">
                        {Resources.RetentionTabLeftPaneHeading}
                    </div>
                    {
                        this.state.canAddPolicy && <CommandButton
                            className="fabric-style-overrides add-new-item-button ci-retention-leftpane-header-button"
                            iconProps={{ iconName: "Add" }}
                            ariaLabel={Resources.AddLabel}
                            ariaDescription={Resources.AddPolicyButtonAriaDescription}
                            onClick={this._onAddPolicyClick}
                            disabled={!this.state.canAddPolicy}
                            aria-disabled={!this.state.canAddPolicy}>
                            {Resources.AddLabel}
                        </CommandButton>
                    }
                    <div className="ci-retention-leftpane-header-subtext">
                        {Resources.RetentionTabLeftPaneSubText}
                    </div>
                </div>
            </div>
        );
    }

    private _getInstanceId(): string {
        return this.props.instanceId || RetentionInstanceId;
    }

    private _getPolicyItem(store: DataStoreBase): RetentionPolicyItem {
        return new RetentionPolicyItem(store, this._onPolicyRemove, this.props.isReadOnly);
    }

    private _getMaximumPolicyItem(store: DataStoreBase): MaximumRetentionPolicyItem {
        return new MaximumRetentionPolicyItem(store);
    }

    private _insertPolicy = (insertData: IInsertListItemData) => {
        const sourceItemData = insertData.sourceItem.data as RetentionPolicyItem | MaximumRetentionPolicyItem;
        const targetItemData = insertData.targetItem.data as RetentionPolicyItem | MaximumRetentionPolicyItem;

        this._actionCreator.insertPolicy({
            policyToInsert: sourceItemData ? sourceItemData.getStore() : null,
            targetPolicyInstanceId: targetItemData ? targetItemData.getStore().getInstanceId() : empty,
            shouldInsertBefore: insertData.shouldInsertBefore    
        });

        this._selectItem();
    }

    private _deletePolicy = (item: RetentionPolicyItem) => {
        this._actionCreator.removeRetentionPolicy(item.getStore().getInstanceId(), false);
    }

    private _onAddPolicyClick = () => {
        this._actionCreator.addRetentionPolicy();
        this._selectItem();
    }

    private _onPolicyRemove = (policyId: string) => {
        this._actionCreator.removeRetentionPolicy(policyId);
        this._selectItem();
    }

    private _selectItem(): void {
        let activeStore = this._store.getActivePolicyStore();
        if (activeStore) {
            const item = this._store.isActiveStoreAMaximumPolicyStore() ? this._getMaximumPolicyItem(activeStore) : this._getPolicyItem(activeStore);
            this._itemSelectorActions.selectItem.invoke({ data: item });
        }
    }

    private _getDefaultSelectedItem(items: Item[]): Item {
        return items[0];
    }

    private _onchange = () => {
        this.setState(this._getState());
    }

    private _getState(): IRetentionPolicyListState {
        const state = this._store.getState();
        state.canAddPolicy = state.canAddPolicy && !this.props.isReadOnly;

        return state;
    }
}
