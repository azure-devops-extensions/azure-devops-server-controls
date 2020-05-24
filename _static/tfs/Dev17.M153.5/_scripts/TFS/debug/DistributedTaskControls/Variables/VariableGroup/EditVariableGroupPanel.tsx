/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IEditVariableGroupPanelState, EditVariableGroupPanelStore } from "DistributedTaskControls/Variables/VariableGroup/Store/EditVariableGroupPanelStore";
import { VariableGroupActionsCreator } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";
import { ScopePicker } from "DistributedTaskControls/Variables/VariableGroup/ScopePicker";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { InstanceIds  } from "DistributedTaskControls/Variables/Common/Constants";
import { IDefinitionVariableGroup } from "DistributedTaskControls/Variables/Common/Types";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { PrimaryButton } from "OfficeFabric/Button";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { autobind } from "OfficeFabric/Utilities";
import { TextField } from "OfficeFabric/TextField";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/VariableGroup/EditVariableGroupPanel";

export class EditVariableGroupPanel extends Base.Component<Base.IProps, IEditVariableGroupPanelState> {

    public componentWillMount(): void {
        this._actionsCreator = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);

        this._store = StoreManager.GetStore<EditVariableGroupPanelStore>(EditVariableGroupPanelStore);
        this._store.addChangedListener(this._onChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (
            <Panel
                closeButtonAriaLabel={Resources.LinkVGPanelCloseButtonAriaLabel}
                className="dtc-edit-vg-panel"
                isOpen={this.state.isPanelOpen}
                type={PanelType.medium}
                onDismiss={this._onClosePanel}
                onRenderHeader={this._onRenderHeader}
                onRenderFooterContent={this._onRenderFooterContent} >
                {this._getPanelContent()}
            </Panel>
        );
    }

    @autobind
    private _onRenderHeader(): JSX.Element {
        return (
            <div className="dtc-edit-vg-header">
                {Resources.EditVariableGroupText}
            </div>
        );
    }

    @autobind
    private _onRenderFooterContent() {
        return (
            <PrimaryButton
                ariaLabel={Resources.SaveButtonText}
                onClick={this._onSaveVariableGroupEdit}
                disabled={this._store.isSaveDisabled()}
                className="dtc-edit-vg-save-button" >
                {Resources.SaveButtonText}
            </PrimaryButton>
        );
    }

    private _getPanelContent(): JSX.Element {
        if (!this.state.variableGroup) {
            // this wont happen normally, adding to handle null references
            return;
        }

        return (
            <div className={"dtc-edit-vg-panel-content"}>
                <TextField
                    label={Resources.VariableGroupNameText}
                    disabled={true} 
                    value={this.state.variableGroup.name}
                    className={"dtc-edit-vg-name"} />
                <TextField
                    label={Resources.VariableGroupDescriptionText}
                    disabled={true}
                    multiline={true}
                    value={this.state.variableGroup.description}
                    className={"dtc-edit-vg-description"} />
                <ScopePicker instanceId={InstanceIds.VariableGroupLinkPanelScopePickerInstanceId} />
            </div>
        );

    }

    @autobind
    private _onChange() {
        this.setState(this._store.getState());
    }

    @autobind
    private _onClosePanel() {
        this._actionsCreator.showEditVariableGroupPanel({ show: false });
    }

    @autobind
    private _onSaveVariableGroupEdit() {
        this._actionsCreator.updateVariableGroup(this.state.variableGroup);
    }

    private _store: EditVariableGroupPanelStore;
    private _actionsCreator: VariableGroupActionsCreator;
}