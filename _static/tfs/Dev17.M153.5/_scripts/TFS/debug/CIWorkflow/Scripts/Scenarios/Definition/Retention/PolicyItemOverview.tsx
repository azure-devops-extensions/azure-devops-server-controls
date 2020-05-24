/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { RetentionInstanceId, ItemKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { IRetentionPolicyItemOverviewState, RetentionPolicyStore } from "CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyStore";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DragDropManager } from "DistributedTaskControls/Common/DragDropManager";
import { ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IDragDropData } from "DistributedTaskControls/Common/Types";
import { StateIndicator, StateIndicatorType } from "DistributedTaskControls/Components/StateIndicator";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { Store as ItemSelectionStore } from "DistributedTaskControls/Stores/ItemSelectionStore";

import { css } from "OfficeFabric/Utilities";

import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Retention/PolicyItemOverview";

export interface IRetentionPolicyItemOverviewProps extends ItemOverviewProps {
    policyInstanceId: string;
    subText?: string;
    iconClassName?: string;
    onRemove?: (id: string) => void;
    isDraggable?: boolean;
    isReadOnly?: boolean;
}

export class RetentionPolicyItemOverview extends Base.Component<IRetentionPolicyItemOverviewProps, IRetentionPolicyItemOverviewState> {
    private _store: RetentionPolicyStore;
    private _itemSelectionStore: ItemSelectionStore;
    private _elementInstance: HTMLElement;

    public componentWillMount() {
        this._store = StoreManager.GetStore<RetentionPolicyStore>(RetentionPolicyStore, this.props.policyInstanceId);
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, this.props.instanceId);

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
            "ci-retention-policy-item-overview",
            { "is-selected": this.state.isSelected }
        );

        let overviewProps = {
            title: this._getTitle(),
            view: this._getView(),
            item: this.props.item,
            instanceId: this.props.instanceId,
            iconClassName: this.props.iconClassName,
            isDraggable: !!this.props.isDraggable,
        } as ITwoPanelOverviewProps;

        return (
            <div
                className={cssClass}
                draggable={true}
                ref={(elem) => { this._elementInstance = elem; }}
                onKeyDown={this._handleKeyDown}
                onDragStart={this._onDragStart}
                onDragEnter={this._onDragOver}
                onDragOver={this._onDragOver}
                onDragLeave={this._onDragLeave}
                onDrop={this._onDrop}
                onDragEnd={this._onDragEnd}>
                <TwoPanelOverviewComponent {...overviewProps} />
            </div>
        );
    }

    private _getTitle(): string {
        let daysResource: string;
        let buildsResource: string;

        if (Utils_Number.defaultComparer(this.state.daysToKeep, 1) === 0) {
            daysResource = Utils_String.format(Resources.RetentionItemOverviewDescriptionDayFormat, this.state.daysToKeep);
        }
        else {
            daysResource = Utils_String.format(Resources.RetentionItemOverviewDescriptionDaysFormat, this.state.daysToKeep);
        }

        if (Utils_Number.defaultComparer(this.state.minimumToKeep, 1) === 0) {
            buildsResource = Utils_String.format(Resources.RetentionItemOverviewDescriptionBuildFormat, this.state.minimumToKeep);
        }
        else {
            buildsResource = Utils_String.format(Resources.RetentionItemOverviewDescriptionBuildsFormat, this.state.minimumToKeep);
        }

        return Utils_String.format("{0} {1}", daysResource, buildsResource);
    }

    private _getView(): JSX.Element {
        let subText = this.props.subText || this.state.subText;

        if (this.state.isValid) {
            return (
                <div title={subText} className="policy-overview-subtext">
                    {subText}
                </div>
            );
        }
        else {
            return <StateIndicator type={StateIndicatorType.Error} text={Resources.RetentionItemOverviewInValidText} />;
        }
    }

    private _onChange = () => {
        this.setState(this._store.getItemOverviewState());
    }

    private _onItemStoreChange = () => {
        this.setState({ isSelected: this.props.item && this._itemSelectionStore.isItemInSelectedGroup(this.props.item) });
    }

    private _handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.keyCode === KeyCode.DELETE && this.props.onRemove) {
            this.props.onRemove(this.props.policyInstanceId);
        }
    }

    private _onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDragStart(e, { listId: RetentionInstanceId, key: this.props.item.getKey(), data: this.props.item }, false, "move");
    }

    private _onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDragOver(e, this._itemAcceptsDropData);
    }

    private _onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDragLeave(e, this._itemAcceptsDropData);
    }

    private _onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDrop(
            e,
            { listId: RetentionInstanceId, key: this.props.item.getKey(), data: this.props.item },
            this._itemAcceptsDropData
        );
    }

    private _onDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        DragDropManager.instance().onDragEnd(e);
    }

    private _itemAcceptsDropData = (source: IDragDropData, isCopyAction: boolean): boolean => {
        // retention policy will accept data of type retention policy
        // max retention policy will not accept anything
        // clone is not supported
        let canAcceptData =
            !isCopyAction
            && !Utils_String.caseInsensitiveContains(this.props.item.getKey(), ItemKeys.MaxRetentionPolicyItemPrefix)
            && !!source && !!source.data.getKey
            && Utils_String.caseInsensitiveContains(source.data.getKey(), ItemKeys.RetentionPolicyItemPrefix);
        return canAcceptData;
    }
}
