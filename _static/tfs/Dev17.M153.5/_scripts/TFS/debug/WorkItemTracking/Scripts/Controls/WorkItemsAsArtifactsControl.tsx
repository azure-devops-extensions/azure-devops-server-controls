/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import * as Diag from "VSS/Diag";

import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Artifacts_Constants = require("VSS/Artifacts/Constants");

import { IconButton } from "OfficeFabric/Button";
import FabricCallout = require("OfficeFabric/Callout");
import { autobind } from "OfficeFabric/Utilities";

import {
    TfsContext
} from "Presentation/Scripts/TFS/TFS.Host.TfsContext";


import {
    ILinkedArtifactControlOptions,
    LinkedArtifactsControl
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Control";

import {
    ViewMode,
    InternalKnownColumns,
    SortDirection,
    ZeroDataExperienceViewMode
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { ILinkedArtifact } from "TFS/WorkItemTracking/ExtensionContracts";

import {
    SimpleWorkItemArtifactCache
} from "WorkItemTracking/Scripts/Controls/Links/ArtifactCache";

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { RemoteLinkContext } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

export interface IWorkItemsAsArtifactsControlProps {
    workItem: WITOM.WorkItem;
    tfsContext: TfsContext;
    workItemIds: number[];
    viewMode: WorkItemsAsArtifactsControlViewMode;
    itemsResourceText?: string;
    workItemDisplayWidthPx?: number;
    cssContainerClassName: string;
    readOnly?: boolean;
    onRemove?: (removedId: number) => void;
    remoteContext?: RemoteLinkContext;
}

export enum WorkItemsAsArtifactsControlViewMode {
    SummarizedWithDetailsOnDemand,
    List,
}

export interface IWorkItemsAsArtifactsControlState {
    isCalloutVisible?: boolean;
    artifacts: ILinkedArtifact[];
}

/**
 *  Given a list of work item ids, displays them as artifacts.
 */
export class WorkItemsAsArtifactsControl extends React.Component<IWorkItemsAsArtifactsControlProps, IWorkItemsAsArtifactsControlState>{

    private static LINK_TYPE_REF_NAME: string = "WorkItemsAsArtifactsControl";
    private static CSS_CLASS_INFO_ICON: string = "info-icon";
    private static CSS_CLASS_WORK_ITEMS_CALLOUT: string = "work-items-callout";
    private static CSS_CLASS_WORK_ITEMS_COUNT_SUMMARY: string = "work-items-count-summary";
    private static MAX_WORKITEMS_TO_DISPLAY_IN_SUMMARIZED_VIEW_MODE: number = 1;
    private static MAX_WORKITEMS_TO_SHOW_IN_SUMMARY: number = 10;

    private _linkedArtifactControlOptions: ILinkedArtifactControlOptions;
    private _iconButtonElement: HTMLElement;

    constructor(props: IWorkItemsAsArtifactsControlProps) {
        super(props);

        this._validate();
        this._initialize();
    }

    public render(): JSX.Element {
        let result = null;

        switch (this.props.viewMode) {
            case WorkItemsAsArtifactsControlViewMode.SummarizedWithDetailsOnDemand:
                result = this._getViewMode_SummarizedWithDetailsOnDemand();
                break;
            case WorkItemsAsArtifactsControlViewMode.List:
                result = this._getViewMode_List();
                break;
            default:
                let value: number = this.props.viewMode;

                throw new Error(
                    Utils_String.format(
                        "View mode not supported: {0}",
                        WorkItemsAsArtifactsControlViewMode[value]));
        }

        return result;
    }

    public componentWillReceiveProps(nextProps: IWorkItemsAsArtifactsControlProps): void {
        if (!Utils_Array.arrayEquals(
            this.props.workItemIds,
            nextProps.workItemIds,
            (a, b) => { return (a === b); })) {
            this.setState({
                artifacts: this._createArtifacts(nextProps.workItemIds, nextProps.remoteContext)
            });
        }
    }

    private _getViewMode_SummarizedWithDetailsOnDemand(): JSX.Element {
        let maxWorkItemsDisplayed = WorkItemsAsArtifactsControl.MAX_WORKITEMS_TO_DISPLAY_IN_SUMMARIZED_VIEW_MODE;

        const result = (this.props.workItemIds.length <= maxWorkItemsDisplayed) ?

            this._displayList() :

            this._displaySummary();

        return result;
    }

    private _getViewMode_List(): JSX.Element {
        return this._displayList();
    }

    private _displayList(): JSX.Element {

        return (
            <div
                className={this.props.cssContainerClassName + " ltv-wi-artifacts-container-overflow"}
            >
                <div
                >
                    <LinkedArtifactsControl
                        tfsContext={this._linkedArtifactControlOptions.tfsContext}
                        gridViewOptions={this._linkedArtifactControlOptions.gridViewOptions}
                        viewOptions={this._linkedArtifactControlOptions.viewOptions}
                        readOnly={this._linkedArtifactControlOptions.readOnly}
                        linkTypeRefNames={this._linkedArtifactControlOptions.linkTypeRefNames}
                        artifactSubTypeFilters={this._linkedArtifactControlOptions.artifactSubTypeFilters}
                        columns={this._linkedArtifactControlOptions.columns}
                        sortColumns={this._linkedArtifactControlOptions.sortColumns}
                        cache={this._linkedArtifactControlOptions.cache}
                        artifactPageSize={this._linkedArtifactControlOptions.artifactPageSize}
                        onRemoveLinkedArtifact={this._linkedArtifactControlOptions.onRemoveLinkedArtifact}
                        onRender={this._linkedArtifactControlOptions.onRender}
                        zeroDataOptions={this._linkedArtifactControlOptions.zeroDataOptions}
                        linkedArtifacts={this.state.artifacts}
                        hostArtifact={this._linkedArtifactControlOptions.hostArtifact}
                    />
                </div>
            </div>
        );
    }

    private _displaySummary(): JSX.Element {
        let showSummary: boolean = (this.props.workItemIds.length <= WorkItemsAsArtifactsControl.MAX_WORKITEMS_TO_SHOW_IN_SUMMARY);
        let text: string = Utils_String.format(this.props.itemsResourceText, this.props.workItemIds.length);
        let { isCalloutVisible } = this.state;

        const overflowValue = "hidden";

        let summaryIconComponent = (
            <div ref={(menuButton) => this._iconButtonElement = menuButton} style={{ overflow: overflowValue }}>
                <IconButton
                    iconProps={{ iconName: "Info" }}
                    title={text}
                    className={WorkItemsAsArtifactsControl.CSS_CLASS_INFO_ICON}
                    ariaLabel={text}
                    onClick={this._onShowMenuClicked}
                />
            </div>
        );

        let summaryCalloutComponent = (
            <FabricCallout.Callout
                gapSpace={2}
                isBeakVisible={false}
                directionalHint={FabricCallout.DirectionalHint.bottomLeftEdge}
                target={this._iconButtonElement}
                setInitialFocus={true}
                onDismiss={this._onCalloutDismiss}
                className={WorkItemsAsArtifactsControl.CSS_CLASS_WORK_ITEMS_CALLOUT}
            >
                <div>
                    <LinkedArtifactsControl
                        tfsContext={this._linkedArtifactControlOptions.tfsContext}
                        gridViewOptions={this._linkedArtifactControlOptions.gridViewOptions}
                        viewOptions={this._linkedArtifactControlOptions.viewOptions}
                        readOnly={this._linkedArtifactControlOptions.readOnly}
                        linkTypeRefNames={this._linkedArtifactControlOptions.linkTypeRefNames}
                        artifactSubTypeFilters={this._linkedArtifactControlOptions.artifactSubTypeFilters}
                        columns={this._linkedArtifactControlOptions.columns}
                        sortColumns={this._linkedArtifactControlOptions.sortColumns}
                        cache={this._linkedArtifactControlOptions.cache}
                        artifactPageSize={this._linkedArtifactControlOptions.artifactPageSize}
                        onRemoveLinkedArtifact={this._linkedArtifactControlOptions.onRemoveLinkedArtifact}
                        onRender={this._linkedArtifactControlOptions.onRender}
                        zeroDataOptions={this._linkedArtifactControlOptions.zeroDataOptions}
                        linkedArtifacts={this.state.artifacts}
                        hostArtifact={this._linkedArtifactControlOptions.hostArtifact}
                    />
                </div>
            </FabricCallout.Callout>
        );

        return (
            <div className={this.props.cssContainerClassName}>
                <p className={WorkItemsAsArtifactsControl.CSS_CLASS_WORK_ITEMS_COUNT_SUMMARY} >{text}</p>
                {showSummary && summaryIconComponent}
                {showSummary && isCalloutVisible && summaryCalloutComponent}
            </div>
        );
    }

    @autobind
    private _onCalloutDismiss() {
        this.setState((prevState, props) => ({
            isCalloutVisible: !prevState.isCalloutVisible,
            artifacts: prevState.artifacts
        }));
    }

    @autobind
    private _onShowMenuClicked() {
        this.setState((prevState, props) => ({
            isCalloutVisible: true,
            artifacts: prevState.artifacts
        }));
    }

    private _validate(): void {
        Diag.Debug.assertIsNotNull(this.props.workItem, "Work Item is required.");
        Diag.Debug.assertIsNotNull(this.props.tfsContext, "Tfs context is required");
        Diag.Debug.assertIsNotNull(this.props.workItemIds, "Work Item Ids is required");
        Diag.Debug.assertIsNotNull(this.props.cssContainerClassName, "Container class name is required");

        if (this.props.workItemDisplayWidthPx) {
            Diag.Debug.assert(
                this.props.workItemDisplayWidthPx > 0,
                Utils_String.format(
                    "Work Item Display Width value '{0}' is not valid. Must be greater than zero.",
                    this.props.workItemDisplayWidthPx));
        }

        //  If view mode is summarized, resource text for items must be provided.
        if (this.props.viewMode === WorkItemsAsArtifactsControlViewMode.SummarizedWithDetailsOnDemand &&
            this.props.workItemIds.length > WorkItemsAsArtifactsControl.MAX_WORKITEMS_TO_DISPLAY_IN_SUMMARIZED_VIEW_MODE) {
            Diag.Debug.assertIsNotNull(this.props.itemsResourceText, "Items resource text is required");
        }
    }

    private _initialize(): void {
        this.state = {
            isCalloutVisible: false,
            artifacts: this._createArtifacts(this.props.workItemIds, this.props.remoteContext)
        };

        this._createArtifactControlOptions();
    }

    private _createArtifactControlOptions(): void {

        //  Creating an empty cache.
        var newCache = new SimpleWorkItemArtifactCache();
        newCache.setWorkItem(this.props.workItem);
        newCache.clear();

        this._linkedArtifactControlOptions = {
            tfsContext: this.props.tfsContext,
            viewOptions: {
                showGroupHeaders: false,
                viewMode: ViewMode.List,
                availableSpace: {
                    width: -1,
                    height: 0
                }
            },
            readOnly: this.props.readOnly === undefined ? true : this.props.readOnly,
            onRemoveLinkedArtifact: (param: ILinkedArtifact) => {
                if (!param || !this.props.onRemove) {
                    return;
                }

                const id: number = +param.id;
                if (!isNaN(id) && id > 0) {
                    this.props.onRemove(id);
                }
            },
            linkTypeRefNames: [
                WorkItemsAsArtifactsControl.LINK_TYPE_REF_NAME
            ],
            columns: [InternalKnownColumns.State, InternalKnownColumns.LastUpdate, InternalKnownColumns.Comment, InternalKnownColumns.Id],
            sortColumns: [{ column: InternalKnownColumns.Id, direction: SortDirection.Ascending }],
            cache: newCache,
            artifactPageSize: WorkItemsAsArtifactsControl.MAX_WORKITEMS_TO_SHOW_IN_SUMMARY,
            zeroDataOptions: {
                zeroDataExperienceViewMode: ZeroDataExperienceViewMode.Hidden
            },
            linkedArtifacts: this.state.artifacts,
        };
    }

    private _createArtifacts(workItemIds: number[], remoteLinkContext?: RemoteLinkContext): ILinkedArtifact[] {
        return workItemIds.map((workItemId: number): ILinkedArtifact => {
            const result: ILinkedArtifact = {
                id: workItemId.toString(10),
                tool: Artifacts_Constants.ToolNames.WorkItemTracking,
                type: Artifacts_Constants.ArtifactTypeNames.WorkItem,
                linkType: WorkItemsAsArtifactsControl.LINK_TYPE_REF_NAME,
                linkTypeDisplayName: "From",
                comment: null
            };
            if (remoteLinkContext) {
                result.tool = Artifacts_Constants.ToolNames.RemoteWorkItemTracking;
                result.remoteHostId = remoteLinkContext.remoteHostId;
                result.remoteHostName = remoteLinkContext.remoteHostName;
                result.remoteHostUrl = remoteLinkContext.remoteHostUrl;
                result.remoteProjectId = remoteLinkContext.remoteProjectId;
            }
            result.uri = Artifacts_Services.LinkingUtilities.encodeUri(result);
            return result;
        });
    }
}
