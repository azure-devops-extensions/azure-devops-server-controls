import * as React from "react";
import * as Controls from "VSS/Controls";
import * as _WorkItemFormBase from "WorkItemTracking/Scripts/Controls/WorkItemFormBase";
import * as _WITTracking from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WorkItemForm } from "WorkItemTracking/Scripts/Controls/WorkItemForm";
import { WorkitemPreviewPaneScenario } from "Search/Scenarios/WorkItem/Flux/Stores/NotificationStore";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/WorkItemPreview";

export interface WorkItemPreviewProps {
    workItemId: string;

    workItemRev: string;

    onShowBanner: (scenario: WorkitemPreviewPaneScenario) => void;

    onSuccess?: () => void;

    onError?: () => void;
}

export class WorkItemPreview extends React.PureComponent<WorkItemPreviewProps, {}> {
    private _workItemForm: WorkItemForm;
    private _containerRef: HTMLElement;

    public render(): JSX.Element {
        return <div className="workItem-preview--Wrapper" ref={(htmlElem: HTMLElement) => { this._containerRef = htmlElem }} />;
    }

    public componentDidMount(): void {
        this.showWorkItem();
    }

    public componentDidUpdate(): void {
        this.showWorkItem();
    }

    public componentWillUnmount(): void {
        this.dispose();
    }

    private errorCallBack = (): void => {
        const { onShowBanner, onError } = this.props;
        this.dispose();

        onShowBanner(WorkitemPreviewPaneScenario.Deleted);

        if (onError) {
            onError();
        }
    }

    private successCallback = (formBase: _WorkItemFormBase.WorkItemFormBase, workItem: _WITTracking.WorkItem): void => {
        const { onSuccess } = this.props;
        this.checkStaleResult(workItem);

        if (onSuccess) {
            onSuccess();
        }
    }

    private checkStaleResult = (workitem: _WITTracking.WorkItem): void => {
        const { workItemRev, workItemId, onShowBanner } = this.props;
        if (workItemRev && (workitem.revision > parseInt(workItemRev))) {
            onShowBanner(WorkitemPreviewPaneScenario.Stale);
        }
    }

    private dispose(): void {
        if (this._workItemForm) {
            this._workItemForm.dispose();
            this._workItemForm = null;
        }
    }

    private showWorkItem(): void {
        if (this._workItemForm && this.props.workItemId) {
            this._workItemForm
                .beginShowWorkItem(
                parseInt(this.props.workItemId),
                this.successCallback,
                this.errorCallBack,
                null,
                parseInt(this.props.workItemRev));
        }
        else if (!this._workItemForm ||
            this._workItemForm.isDisposed()) {
            this._workItemForm = Controls.BaseControl.createIn(
                WorkItemForm,
                this._containerRef,
                {
                    cssClass: "search-workItem--Preview"
                }) as WorkItemForm;

            if (this.props.workItemId) {
                // Workaround for react 16.x where nested ReactDOM.render performs async rendering
                // ResponsiveHeader is rendering async and causing error without this workaround (Tfs\Service\WebAccess\WorkItemTracking\Scripts\Form\Renderer.ts)
                setTimeout(()=>{
                    this._workItemForm
                    .beginShowWorkItem(
                    parseInt(this.props.workItemId),
                    this.successCallback,
                    this.errorCallBack,
                    null,
                    parseInt(this.props.workItemRev));
                },0);
            }
        }
    }
}
