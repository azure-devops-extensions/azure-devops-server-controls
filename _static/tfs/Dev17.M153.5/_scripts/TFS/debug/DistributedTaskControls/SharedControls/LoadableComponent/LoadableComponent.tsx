import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ILoadingProps, LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { ILoadableComponentState, LoadableComponentStore } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentStore";

export interface ILoadableComponentProps extends ILoadingProps {
    instanceId?: string;
}

/*
    LoadableComponent creates store during componentWillMount. To use it, raise an action of showLoadingExperience to start loading and
    hideLoadingExperience to stop loading.

    Cases requiring special handling:
    If action is being raised before the component is being rendered (in that case store for the component is not created), then there will not be any listeners
    and loading experience will not work. In that case, store has to be created before raising the action in the code.
*/

export class LoadableComponent extends Base.Component<ILoadableComponentProps, ILoadableComponentState> {

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<LoadableComponentStore>(LoadableComponentStore, this.props.instanceId);

        this._store.addChangedListener(this._handleStoreChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {

        return (
            <div className={"cd-release-progress-loading-container-class"}>
                {
                    this.state.isLoading ?
                        this._getLoadingComponent() :
                        this.props.children
                }
            </div>
        );
    }

    private _handleStoreChange = () => {
        this.setState(this._store.getState());
    }

    private _getLoadingComponent(): JSX.Element {
        return (
            <LoadingComponent
                label={this.props.label}
                className={this.props.className}
                wait={this.props.wait}
                ariaLabel={this.props.ariaLabel} />
        );
    }

    private _store: LoadableComponentStore;
}
