/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as ContainerTabBase from "DistributedTaskControls/SharedViews/ContainerTabs/ContainerTabBase";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { RetentionPolicyListStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyListStore";
import { RetentionTabConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_Array from "VSS/Utils/Array";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionTab";

export class RetentionTab extends Base.Component<ContainerTabBase.IContainerTabBaseProps, Base.IStateless> {

    public componentWillMount() {
        this._store = StoreManager.GetStore<RetentionPolicyListStore>(RetentionPolicyListStore);

        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, RetentionTabConstants.RetentionTabInstanceId);
        this._store.addChangedListener(this._onchange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onchange);
    }

    public render(): JSX.Element {

        let items: Item[] = Utils_Array.clone(this._store.getRetentionPolicyItems());
        let defaultSelectedItem = this._store.getDefaultSelectedItem();
        let showTwoPanelSelector: boolean = items && items.length > 0;

        return (
            <div className="cd-retention-tab-content" role="region" aria-label={Resources.RetentionTabARIALabel}>
                {showTwoPanelSelector ?
                    <TwoPanelSelectorComponent
                        items={items}
                        defaultItemKey={defaultSelectedItem ? defaultSelectedItem.getKey() : null}
                        leftPaneARIARegionRoleLabel={Resources.RetentionLeftPaneARIALabel}
                        rightPaneARIARegionRoleLabel={Resources.RetentionRightPaneARIALabel}
                        instanceId={RetentionTabConstants.RetentionTabInstanceId}
                        setFocusOnLastSelectedItem={false} />
                    : <div className="retention-tab-no-env">
                        <MessageBar
                            className="no-retention-infobar"
                            messageBarType={MessageBarType.info}
                            ariaLabel={Resources.NoRetentionText} >
                            {Resources.NoRetentionText}
                        </MessageBar>
                    </div>
                }
            </div>
        );
    }

    public componentDidMount(): void {
        let items: Item[] = Utils_Array.clone(this._store.getRetentionPolicyItems());
        if (items && items.length > 0 && !this._itemSelectionStore ) {
            this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, RetentionTabConstants.RetentionTabInstanceId);
        }
        
        if (this._isSelectionObsolete()) {
            let defaultSelectedItem = this._store.getDefaultSelectedItem();
            this._itemSelectorActions.selectItem.invoke({ data: defaultSelectedItem });
        }
    }

    private _isSelectionObsolete(): boolean {
        let items: Item[] = Utils_Array.clone(this._store.getRetentionPolicyItems());

        if (items && items.length > 0) {
            let selectedRetentionPolicy: Item[] = items.filter((item: Item) => {
                return this._itemSelectionStore.isItemInSelectedGroup(item);
            });
            if (!selectedRetentionPolicy || selectedRetentionPolicy.length <= 0) {
                return true;
            }
        }
        return false;
    }

    private _onchange = () => {
        this.setState(this._store.getState());
    }

    private _store: RetentionPolicyListStore;
    private _itemSelectionStore: ItemSelectionStore;
    private _itemSelectorActions: ItemSelectorActions;
}
