/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { OverlayPanelHeading } from "DistributedTaskControls/Components/OverlayPanelHeading";

import {
    IReleaseApprovalItemDetailsViewState,
    ReleaseApprovalDetailsViewStore
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseApprovalDetailsViewStore";

import * as Utils_String from "VSS/Utils/String";

import { VssIconType } from "VSSUI/VssIcon";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/LogsTab/ReleaseApprovalDeployDetailsViewForLogs";


export interface IReleaseApprovalDeployDetailsViewForLogsProps extends ComponentBase.IProps {
    label: string;
    environmentName: string;
    onApprovalActionCallback?(): void;
}

export abstract class ReleaseApprovalDeployDetailsViewForLogs extends ComponentBase.Component<IReleaseApprovalDeployDetailsViewForLogsProps, IReleaseApprovalItemDetailsViewState> {

    public componentWillMount() {
        this._viewStore = this.getViewStore();
        this._viewStore.addChangedListener(this._onChange);

        this._onChange();
    }

    public componentWillUnmount() {
        this._viewStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        return (
            <div>
                <div className="approval-panel-header">
                    <OverlayPanelHeading
                        cssClass="release-approvalPanel-header"
                        label={this.props.label}
                        subHeader={this.props.environmentName}
                        descriptionIconType={VssIconType.bowtie}
                        infoButtonRequired={false}>
                    </OverlayPanelHeading>
                </div>
                {
                    this.getApprovalDetailsView()
                }
            </div>
        );
    }

    private _onChange = () => {
        this.setState(this._viewStore.getState());
    }

    protected abstract getViewStore(): ReleaseApprovalDetailsViewStore;
    protected abstract getApprovalDetailsView(): JSX.Element;
    private _viewStore: ReleaseApprovalDetailsViewStore;
}
