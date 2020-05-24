/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Store as ItemSelectionStore, IOptions } from "DistributedTaskControls/Stores/ItemSelectionStore";

import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { EnvironmentsCanvas, IEnvironmentsCanvasState, IEnvironmentsCanvasProps } from "PipelineWorkflow/Scripts/SharedComponents/EnvironmentsCanvas/EnvironmentsCanvas";
import { ReleaseEnvironmentsCanvasViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentsCanvasViewStore";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IReleaseEnvironmentsCanvasProps extends IEnvironmentsCanvasProps {
    getNodeElement?: (instanceId: string, isEditMode: boolean, data: any) => JSX.Element;
    getNodeHeightHint?: (environmentInstanceId: string) => number;
}

export class ReleaseEnvironmentsCanvas extends EnvironmentsCanvas<ReleaseContracts.ReleaseEnvironment, IReleaseEnvironmentsCanvasProps, IEnvironmentsCanvasState<ReleaseContracts.ReleaseEnvironment>> {

    constructor(props) {
        super(props);
        this._itemSelectionStore = StoreManager.GetStore<ItemSelectionStore>(ItemSelectionStore, CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
        this._itemSelectionStore.addChangedListener(this._handleItemSelectionChange);
    }

    public componentWillUnmount(): void {
        this._itemSelectionStore.removeChangedListener(this._handleItemSelectionChange);
        super.componentWillUnmount();
    }

    protected getNodeElement = (key: string, data: any): JSX.Element => {
        return this.props.getNodeElement(key, this.props.isEditMode, data);
    }

    protected getViewStore(): ReleaseEnvironmentsCanvasViewStore {
        return StoreManager.GetStore<ReleaseEnvironmentsCanvasViewStore>(ReleaseEnvironmentsCanvasViewStore, this.props.instanceId);
    }

    protected getNodeHeightHint = (environmentInstanceId: string): number => {
        return this.props.getNodeHeightHint(environmentInstanceId);
    }

    private _handleItemSelectionChange = (): void => {
        if (this._getSelectedEnvironmentId()) {
            const selectedItem = this._itemSelectionStore.getSelectedItem();
            this.setState({
                selectedEnvironmentKey: selectedItem.getInstanceId()
            } as IEnvironmentsCanvasState<ReleaseContracts.ReleaseEnvironment>);
        }
        else {
            this.setState({
                selectedEnvironmentKey: Utils_String.empty
            } as IEnvironmentsCanvasState<ReleaseContracts.ReleaseEnvironment>);
        }
    }

    private _getSelectedEnvironmentId(): number {
        const selectedItem = this._itemSelectionStore.getSelectedItem();
        if (selectedItem && selectedItem.getInstanceId) {
            const instanceId = selectedItem.getInstanceId();
            return parseInt(instanceId);
        }

        return null;
    }

    private _itemSelectionStore: ItemSelectionStore;
}
