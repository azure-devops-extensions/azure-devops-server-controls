/// <reference types="react" />

import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";
import { RetentionTabConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import * as Base from "DistributedTaskControls/Common/Components/Base";

import { IRetentionPolicyState, RetentionPolicyStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyStore";
import { EnvironmentNameStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Number from "VSS/Utils/Number";

export interface IRetentionPolicyItemOverviewProps extends ItemOverviewProps {
    iconClassName?: string;
}

export class RetentionPolicyItemOverview extends Base.Component<IRetentionPolicyItemOverviewProps, IRetentionPolicyState> {

    public componentWillMount() {

        this._store = StoreManager.GetStore<RetentionPolicyStore>(RetentionPolicyStore, this.props.instanceId);
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, RetentionTabConstants.RetentionTabInstanceId);

        this._store.addChangedListener(this._onChange);
        this._itemSelectionStore.addChangedListener(this._onItemStoreChange);

        this.setState(this._store.getItemOverviewState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
        this._itemSelectionStore.removeChangedListener(this._onItemStoreChange);
    }

    public render(): JSX.Element {
        let cssClass: string = css(
            "cd-retention-policy-item-overview",
            { "is-selected": this.state.isSelected });

        let overviewProps = {
            title: this._getTitle(),
            view: this._getView(),
            item: this.props.item,
            instanceId: RetentionTabConstants.RetentionTabInstanceId,
            iconClassName: this.props.iconClassName,
            cssClass: cssClass,
            isDraggable: false,
        } as ITwoPanelOverviewProps;

        return (
            <div className="retention-two-panel-component-container">
                <TwoPanelOverviewComponent {...overviewProps} />
            </div>
        );
    }

    private _getView(): JSX.Element {
        let subText = this._getSubText();

        if (this.state.isValid) {
            return (
                <div title={subText} className="policy-overview-subtext">
                    {subText}
                </div>
            );
        } else {
            return (
                <div className="ms-font-s overview-error-indicator" title={Resources.InvalidRetentionSettings}>
                    <i className="bowtie-icon bowtie-status-error-outline left" />
                    {Resources.InvalidRetentionSettings}
                </div>
            );
        }
    }

    private _getSubText(): string {
        let daysResource: string;
        let buildsResource: string;
        let artifactResource: string;

        if (Utils_Number.defaultComparer(this.state.daysToKeep, 1) === 0) {
            daysResource = Utils_String.format(Resources.RetentionOneDayCountText, this.state.daysToKeep);
        } else {
            daysResource = Utils_String.format(Resources.RetentionDaysCountText, this.state.daysToKeep);
        }

        if (Utils_Number.defaultComparer(this.state.releasesToKeep, 1) === 0) {
            buildsResource = Utils_String.format(Resources.RetentionSingleReleaseCountText, this.state.releasesToKeep);
        } else {
            buildsResource = Utils_String.format(Resources.RetentionReleaseCountText, this.state.releasesToKeep);
        }

        if (this.state.retainBuild) {
            artifactResource = Resources.RetentionKeepArtifactsText;
        } else {
            artifactResource = Resources.RetentionDoNotKeepArtifactsText;
        }

        return Utils_String.format("{0} {1} {2}", daysResource, buildsResource, artifactResource);

    }

    private _getTitle(): string {
        let environmentName: string = Utils_String.empty;
        let environmentNameStore: EnvironmentNameStore = StoreManager.GetStore<EnvironmentNameStore>(EnvironmentNameStore, this.props.instanceId);
        if (environmentNameStore) {
            let environmentNameStoreState = environmentNameStore.getState();
            environmentName = environmentNameStoreState.environmentName;
        }
        return environmentName;
    }

    private _onChange = () => {
        this.setState(this._store.getItemOverviewState());
    }

    private _onItemStoreChange = () => {
        let isSelected = this.props.item && this._itemSelectionStore.isItemInSelectedGroup(this.props.item);
        this.setState({ isSelected: isSelected });
    }

    private _store: RetentionPolicyStore;
    private _itemSelectionStore: ItemSelectionStore;
}
