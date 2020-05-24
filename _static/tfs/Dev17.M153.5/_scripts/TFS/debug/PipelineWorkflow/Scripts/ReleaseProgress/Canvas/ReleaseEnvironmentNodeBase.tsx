import * as React from "react";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { InnerFocusZone } from "DistributedTaskControls/Components/InnerFocusZone";

import { ReleaseEnvironmentNodeViewStore, IReleaseEnvironmentNodeViewState } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentNodeViewStore";
import { ReleaseEnvironmentActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionCreator";

import { Async } from "OfficeFabric/Utilities";

import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

export interface IReleaseEnvironmentNodeBaseProps extends IProps {
    isEditMode?: boolean;
    releaseEnvironment?: ReleaseEnvironment;
}

export abstract class ReleaseEnvironmentNodeBase<P extends IReleaseEnvironmentNodeBaseProps, S extends IReleaseEnvironmentNodeViewState> extends Component<P, S> {

    constructor(props) {
        super(props);
        this._store = StoreManager.GetStore(ReleaseEnvironmentNodeViewStore, this.props.instanceId);
        this._actionCreator = ActionCreatorManager.GetActionCreator(ReleaseEnvironmentActionCreator, this.props.instanceId);
        this.state = this._store.getState() as Readonly<S>;
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._handleStoreChange);
    }

    public componentDidMount(): void {
        this._async.setInterval(() => {
            this._actionCreator.refreshEnvironmentLocal();
        }, this._refreshIntervalInSeconds * 1000);
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._handleStoreChange);
        this._async.dispose();
    }

    private _handleStoreChange = () => {
        this._setState();
    }

    private _setState = (): void => {
        const storeState: IReleaseEnvironmentNodeViewState = this._store.getState();
        this.setState(storeState);
    }

    protected _setFocus = () => {
        if (this._releaseEnvironmentNode) {
            this._releaseEnvironmentNode.focus();
        }
    }

    private _actionCreator: ReleaseEnvironmentActionCreator;
    private _async: Async = new Async();
    private _refreshIntervalInSeconds = 60;
    private _store: ReleaseEnvironmentNodeViewStore;
    protected _releaseEnvironmentNode: InnerFocusZone;
}