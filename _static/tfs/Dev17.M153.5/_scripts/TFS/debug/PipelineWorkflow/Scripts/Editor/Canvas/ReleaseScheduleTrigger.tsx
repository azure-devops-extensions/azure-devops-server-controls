/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { OverlayPanelSelectable } from "DistributedTaskControls/Components/OverlayPanelSelectable";
import { Hexagon } from "DistributedTaskControls/Components/Canvas/Hexagon";

import { ReleaseScheduleTriggerViewStore, IReleaseScheduleTriggerViewState } from "PipelineWorkflow/Scripts/Editor/Canvas/ReleaseScheduleTriggerViewStore";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ReleaseScheduleTriggerItem } from "PipelineWorkflow/Scripts/Editor/Canvas/ReleaseScheduleTriggerItem";
import { LayoutConstants } from "PipelineWorkflow/Scripts/Common/Canvas/LayoutConstants";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Canvas/ReleaseScheduleTrigger";

export class ReleaseScheduleTrigger extends Base.Component<Base.IProps, IReleaseScheduleTriggerViewState> {

    public componentWillMount(): void {
        this._store = StoreManager.GetStore<ReleaseScheduleTriggerViewStore>(ReleaseScheduleTriggerViewStore);
        this._store.addChangedListener(this._handleStoreChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount(): void {
        this._store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {

        const iconClass = css(
            "release-schedule-trigger-icon",
            "bowtie-icon",
            { "bowtie-status-waiting": !this.state.isEnabled },
            { "bowtie-navigate-history": this.state.isEnabled }
        );

        const releaseScheduleStatusClass = (this.state.isValid ? (this.state.isEnabled ? "release-scheduled" : "no-release-schedule") : "release-schedule-error");

        const ariaLabelId = "dtc-id-overlay-panel-description-label-" + DtcUtils.getUniqueInstanceId();

        return (
            <div className="cd-release-schedule-trigger-container">
                <OverlayPanelSelectable
                    instanceId={CanvasSelectorConstants.CanvasSelectorInstance}
                    getItem={this._getItem}
                    isValid={this.state.isValid}
                    cssClass="cd-release-schedule-trigger-selectable"
                    tooltipProps={{
                        content: Resources.DefinitionScheduleTriggerHeading
                    }}>
                    <Hexagon aria-labelledby={ariaLabelId} cssClass="cd-release-schedule-trigger" sideLength={LayoutConstants.releaseScheduleTriggerSideLength} >
                        {
                            this.state.isValid ?
                                <span className={iconClass}></span>
                                : <span className=" release-schedule-trigger-icon schedule-trigger-error bowtie-icon bowtie-status-error-outline"></span>
                        }
                    </Hexagon>
                </OverlayPanelSelectable>
                <div id={ariaLabelId} className={css("cd-release-schedule-status", releaseScheduleStatusClass)} style={{ maxHeight: (LayoutConstants.releaseScheduleTriggerSideLength * 2) }}>
                    {this.state.isValid ? (this.state.isEnabled ? Resources.ReleaseTriggerScheduled : Resources.ReleaseTriggerNotScheduled) : ""}
                </div>
            </div>
        );
    }

    private _getItem = (): ReleaseScheduleTriggerItem => {
        let state: IReleaseScheduleTriggerViewState = this._store.getState();
        return new ReleaseScheduleTriggerItem(state.definitionId);
    }

    private _handleStoreChange = () => {
        this.setState(this._store.getState());
    }

    private _store: ReleaseScheduleTriggerViewStore;
}
