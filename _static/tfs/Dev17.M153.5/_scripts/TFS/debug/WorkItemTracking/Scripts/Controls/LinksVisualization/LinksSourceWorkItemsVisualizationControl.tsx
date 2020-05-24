/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import * as Diag from "VSS/Diag";

import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemsAsArtifacts = require("WorkItemTracking/Scripts/Controls/WorkItemsAsArtifactsControl");

import {
    TfsContext
} from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import OverflowText = require("Presentation/Scripts/TFS/Components/Text/OverflowText");

export interface ILinksSourceWorkItemsVisualizationControlProps {
    workItem: WITOM.WorkItem,
    tfsContext: TfsContext,
    workItemIds: number[]
}

export class LinksSourceWorkItemsVisualizationControl extends React.Component<ILinksSourceWorkItemsVisualizationControlProps, {}>{

    private static UNSAVED_WORK_ITEM_ID: number = 0;
    private static CSS_MAIN_CONTAINER_SUMMARY: string = "lswiv-main-container-summary";
    private static CSS_WI_ARTIFACTS_CONTAINER_CLASS: string = "lswiv-wi-container";
    private static CSS_NONEXISTING_WI_CONTAINER_CLASS: string = "lswiv-nonexisting-wi-container";
    private static CSS_CLASS_ICON_YOU_ARE_HERE: string = "bowtie-icon bowtie-map-pin-fill lswiv-you-are-here-icon";
    private static CSS_CLASS_ICON_YOU_ARE_HERE_NO_TOP_PADDING: string = "bowtie-icon bowtie-map-pin-fill lswiv-you-are-here-icon-no-top-padding";
    private static CSS_CLASS_ICON_YOU_ARE_HERE_SUMMARY: string = "bowtie-icon bowtie-map-pin-fill lswiv-you-are-here-icon-summary";

    constructor(props: ILinksSourceWorkItemsVisualizationControlProps) {
        super(props);

        this._validate();
    }

    public render(): JSX.Element {
        let result: JSX.Element = (this.useNonExistingWorkItemBehavior()) ?
            this._getNonExistingWorkItemElement() :
            this._getWorkItemsAsListElement();

        return result;
    }

    private _getWorkItemsAsListElement() : JSX.Element {
        let iconClass: string = this._getYouAreHereIconClass();
        let mainContainerClass: string = this._getMainContainerClass();

        return (
            <div
                className={ mainContainerClass }
                >
                <div
                    className={ iconClass }
                    />
                <WorkItemsAsArtifacts.WorkItemsAsArtifactsControl
                    workItem = { this.props.workItem }
                    tfsContext = { this.props.tfsContext }
                    workItemIds = { this.props.workItemIds }
                    viewMode = { WorkItemsAsArtifacts.WorkItemsAsArtifactsControlViewMode.SummarizedWithDetailsOnDemand }
                    itemsResourceText = { Resources.ItemsPlural }
                    cssContainerClassName = { LinksSourceWorkItemsVisualizationControl.CSS_WI_ARTIFACTS_CONTAINER_CLASS }
                    />
            </div>
        );
    }

    private _getNonExistingWorkItemElement() : JSX.Element {
        let workItemTitle: string = this._getNonExistingWorkItem_Title();

        return (
            <div
                className={ LinksSourceWorkItemsVisualizationControl.CSS_NONEXISTING_WI_CONTAINER_CLASS }
                >
                <div
                    className={ LinksSourceWorkItemsVisualizationControl.CSS_CLASS_ICON_YOU_ARE_HERE_NO_TOP_PADDING }
                    />
                <div
                    >
                    <OverflowText.OverflowText
                        text={ workItemTitle }
                    />
                </div>
            </div>
        );
    }

    private _validate(): void {
        Diag.Debug.assertIsNotNull(this.props.workItem, "Work Item is required.");
        Diag.Debug.assertIsNotNull(this.props.tfsContext, "Tfs context is required");
        Diag.Debug.assertIsNotNull(this.props.workItemIds, "Work Item Ids is required");
        Diag.Debug.assert(this.props.workItemIds.length > 0, "At least one source work item id is required");

    }

    private useNonExistingWorkItemBehavior() : boolean {
        let result: boolean = (
            this.props.workItemIds.length === 1 &&
            this.props.workItemIds[0] === LinksSourceWorkItemsVisualizationControl.UNSAVED_WORK_ITEM_ID);

        return result;
    }

    private _getNonExistingWorkItem_Title() : string {
        return this.props.workItem.getTitle();
    }

    private _getYouAreHereIconClass() : string {
        return (this._isSummaryView()) ?
            LinksSourceWorkItemsVisualizationControl.CSS_CLASS_ICON_YOU_ARE_HERE_SUMMARY :
            LinksSourceWorkItemsVisualizationControl.CSS_CLASS_ICON_YOU_ARE_HERE;
    }

    private _getMainContainerClass() : string {
        return (this._isSummaryView()) ?
            LinksSourceWorkItemsVisualizationControl.CSS_MAIN_CONTAINER_SUMMARY :
            null;
    }

    private _isSummaryView() : boolean {
        return this.props.workItemIds.length > 1;
    }
}
