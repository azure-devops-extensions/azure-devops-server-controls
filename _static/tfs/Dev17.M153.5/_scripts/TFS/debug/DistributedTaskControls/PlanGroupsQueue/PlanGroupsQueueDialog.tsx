/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TwoPanelSelectorComponent } from "DistributedTaskControls/Components/TwoPanelSelectorComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { PlanGroupsStatusItem } from "DistributedTaskControls/PlanGroupsQueue/PlanGroupsStatusItem";
import { PlanGroupsQueueDialogActionsCreator } from "DistributedTaskControls/PlanGroupsQueue/Actions/PlanGroupsQueueDialogActionsCreator";
import { PlanGroupsQueueDialogStore } from "DistributedTaskControls/PlanGroupsQueue/Stores/PlanGroupsQueueDialogStore";
import * as PlanGroupsTypes from "DistributedTaskControls/PlanGroupsQueue/Types";

import { PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

import { PlanGroupStatus } from "TFS/DistributedTask/Contracts";

import * as StringUtils from "VSS/Utils/String";
import * as DateUtils from "VSS/Utils/Date";
import { globalProgressIndicator } from "VSS/VSS";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/PlanGroupsQueue/Styles";

export interface IPlanGroupsQueueDialogProps extends Base.IProps, PlanGroupsTypes.IPlanGroupsQueueDialogOptions {
    targetElement?: Element;
}

export class PlanGroupsQueueDialog extends Base.Component<IPlanGroupsQueueDialogProps, PlanGroupsTypes.IPlanGroupsQueueDialogState> {
    constructor(props: IPlanGroupsQueueDialogProps) {
        super(props);

        // @TODO: Don't mutate this.props
        const mutableProps: IPlanGroupsQueueDialogProps = this.props;

        if (!this.props.hubs || this.props.hubs.length <= 0) {
            mutableProps.hubs = [];
            mutableProps.errorMessage = Resources.PlanGroupsQueueHubsNotProvidedErrorMessage;
        }
        else {
            mutableProps.selectedHubName = !!this.props.selectedHubName ? this.props.selectedHubName : this.props.hubs[0].name;
        }

        if (this.props.selectedStatus == null) {
            mutableProps.selectedStatus = PlanGroupStatus.Running;
        }

        this._instanceId = !!this.props.instanceId ? this.props.instanceId : `PlanGroupsQueueDialog_${StringUtils.generateUID()}`;
        this._store = StoreManager.CreateStore<PlanGroupsQueueDialogStore, PlanGroupsTypes.IPlanGroupsQueueDialogOptions>(PlanGroupsQueueDialogStore, this._instanceId, mutableProps);

        this._actionsCreator = ActionCreatorManager.CreateActionCreator<PlanGroupsQueueDialogActionsCreator, PlanGroupsTypes.IPlanGroupsQueueDialogOptions>(
            PlanGroupsQueueDialogActionsCreator, 
            this._instanceId, 
            { ...this._store.getState() });
    }

    public componentWillMount() {
        this._store = StoreManager.GetStore<PlanGroupsQueueDialogStore>(PlanGroupsQueueDialogStore, this._instanceId);
        this._actionsCreator = ActionCreatorManager.GetActionCreator<PlanGroupsQueueDialogActionsCreator>(PlanGroupsQueueDialogActionsCreator, this._instanceId);
        this._rightPaneARIARegionRoleLabel = StringUtils.localeFormat(Resources.ARIALabelPlangroupsQueueDialogRightPane, this.props.dialogTitle || StringUtils.empty);
        this._leftPaneARIARegionRoleLabel = StringUtils.localeFormat(Resources.ARIALabelPlangroupsQueueDialogLeftPane, this.props.dialogTitle || StringUtils.empty);

        this.setState(this._store.getState());
        this._store.addChangedListener(this._handleStoreChange);
    }

    public componentDidMount() {
        if (!!this._progressElement) {
            globalProgressIndicator.registerProgressElement($(this._progressElement));
        }
    }

    public componentWillUnmount() {
        if (!!this._progressElement) {
            globalProgressIndicator.unRegisterProgressElement($(this._progressElement));
        }

        this._store.removeChangedListener(this._handleStoreChange);
        ActionCreatorManager.DeleteActionCreator<PlanGroupsQueueDialogActionsCreator>(PlanGroupsQueueDialogActionsCreator, this._instanceId);
        StoreManager.DeleteStore<PlanGroupsQueueDialogStore>(PlanGroupsQueueDialogStore, this._instanceId);
    }

    public render(): JSX.Element {
        return (
            this.state.showDialog &&
            <Dialog
                dialogContentProps={{
                    type: DialogType.close,
                    className: "content"
                }}
                title={this.props.dialogTitle || StringUtils.empty}
                hidden={!this.state.showDialog}
                modalProps={{
                    className: "plan-groups-queue-dialog bowtie-fabric",
                    containerClassName: "container",
                    isBlocking: true
                }}
                onDismiss={this._closeDialog.bind(this)}
                closeButtonAriaLabel={Resources.CloseButtonText} >

                <div className="hub-progress progress-indicator" ref={progressElement => this._progressElement = progressElement}></div>

                {
                    !!this.state.errorMessage &&
                    <MessageBar
                        className="message-bar"
                        onDismiss={this._onErrorBarDismiss}
                        messageBarType={MessageBarType.error}
                        dismissButtonAriaLabel={Resources.CloseButtonText}>
                        {this.state.errorMessage}
                    </MessageBar>
                }

                {
                    !!this.state.hubs && this.state.hubs.length > 0 &&
                    <TwoPanelSelectorComponent
                        leftPaneMinWidth="120"
                        leftPaneMaxWidth="150"
                        leftPaneInitialWidth="120"
                        instanceId={this._instanceId}
                        leftPaneARIARegionRoleLabel={this._leftPaneARIARegionRoleLabel}
                        rightPaneARIARegionRoleLabel={this._rightPaneARIARegionRoleLabel}
                        items={this._getLeftPaneItems()}
                        defaultItemKey={this._getDefaultItemKey()}
                        setFocusOnLastSelectedItem={true} />
                }

                <DialogFooter className="dlg-footer">
                    <PrimaryButton
                        onClick={this._closeDialog.bind(this)}
                        ariaLabel={Resources.CloseButtonText}>
                        {Resources.CloseButtonText}
                    </PrimaryButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _getLeftPaneItems(): PlanGroupsStatusItem[] {
        let items: PlanGroupsStatusItem[] = [];
        let hubs = this.state.hubs;

        if (!!hubs && hubs.length > 0) {
            let hubsLength = hubs.length;

            for (let i = 0; i < hubsLength; i++) {
                let hub = hubs[i];
                // Common fields
                let commonPros = {
                    parentHubName: hub.name,
                    instanceId: this._instanceId,
                    getQueuedPlanGroups: hub.getQueuedPlanGroups
                } as PlanGroupsTypes.IPlanGroupsStatusItemProps;

                // Header
                let itemProps: PlanGroupsTypes.IPlanGroupsStatusItemProps = {
                    ...commonPros,
                    displayText: hub.displayText,
                    isHeader: true,
                };

                items.push(new PlanGroupsStatusItem(itemProps));

                // Running item
                let runningProps: PlanGroupsTypes.IPlanGroupsStatusItemProps = {
                    ...commonPros,
                    displayText: Resources.PlanGroupsInProgressText,
                    status: PlanGroupStatus.Running,
                    rightPanelHeaderDetailsText: hub.statusHeaderText[PlanGroupStatus.Running.toString()]
                };

                items.push(new PlanGroupsStatusItem(runningProps));

                // Queued item
                let queuedProps: PlanGroupsTypes.IPlanGroupsStatusItemProps = {
                    ...commonPros,
                    displayText: Resources.PlanGroupsInQueueText,
                    status: PlanGroupStatus.Queued,
                    rightPanelHeaderDetailsText: hub.statusHeaderText[PlanGroupStatus.Queued.toString()]
                };

                items.push(new PlanGroupsStatusItem(queuedProps));
            }
        }

        return items;
    }

    private _getDefaultItemKey(): string {
        return PlanGroupsStatusItem.computeItemKey(this.props.selectedHubName, this.props.selectedStatus);
    }

    private _handleStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _closeDialog = (): void => {
        this._actionsCreator.hidePlanGroupsQueueDialog();
        if (this.props.targetElement) {
            ReactDOM.unmountComponentAtNode(this.props.targetElement);
        }
    }

    private _onErrorBarDismiss = (): void => {
        this._actionsCreator.dismissErrorMessage();
    }

    private _store: PlanGroupsQueueDialogStore;
    private _actionsCreator: PlanGroupsQueueDialogActionsCreator;
    private _leftPaneARIARegionRoleLabel: string;
    private _rightPaneARIARegionRoleLabel: string;
    private _instanceId: string;
    private _progressElement: HTMLElement;
}