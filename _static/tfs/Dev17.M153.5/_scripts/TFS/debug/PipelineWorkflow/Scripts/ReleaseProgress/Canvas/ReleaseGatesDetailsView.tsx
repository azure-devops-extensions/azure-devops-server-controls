/// <reference types="react" />
import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";

import {
    IReleaseGatesItemDetailsViewState,
    ReleaseGatesDetailsViewStore
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetailsViewStore";
import { IReleaseGatesDetailsComponentProps, ReleaseGatesDetailsComponent } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetailsComponent";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesDetailsView";

export abstract class ReleaseGatesDetailsView extends Base.Component<Base.IProps, IReleaseGatesItemDetailsViewState> {

    public componentWillMount() {
        this._viewStore = this.getViewStore();
        this._viewStore.addChangedListener(this._onChange);
        this.setState(this._viewStore.getState());
    }

    public componentWillUnmount(): void {
        this._viewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        const componentProps = {
            gatesData: this.state.gatesData,
            environmentId: this.getViewStore().getEnvironmentId(),
            isPreDeploymentGates: this.isPreDeploymentGates(),
            hasManageApproverPermission: this._viewStore.hasManageReleaseApproverPermissions()
        } as IReleaseGatesDetailsComponentProps;

        return <ReleaseGatesDetailsComponent {...componentProps} />;
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    protected abstract getViewStore(): ReleaseGatesDetailsViewStore;
    protected abstract isPreDeploymentGates(): boolean;

    private _viewStore: ReleaseGatesDetailsViewStore;
}