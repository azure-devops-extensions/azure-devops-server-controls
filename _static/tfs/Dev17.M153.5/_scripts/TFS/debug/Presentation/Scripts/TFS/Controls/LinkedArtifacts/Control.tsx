/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!Controls/LinkedArtifacts/LinkedArtifacts";

import React = require("react");
import ReactDOM = require("react-dom");

import * as Diag from "VSS/Diag";

import Utils_Core = require("VSS/Utils/Core");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");

import * as VSS_Telemetry from "VSS/Telemetry/Services";

import { IArtifactData } from "VSS/Artifacts/Services";

import { MessageAreaType } from "VSS/Controls/Notifications";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ViewMode, IColumn, InternalKnownColumns, ILinkedArtifactsCache, ILinkedArtifactSubtypeFilterConfiguration,
    IInternalLinkedArtifactDisplayData , IZeroDataOptions, IZeroDataAction, ISortColumn, SortDirection, IViewOptions, IGridViewOptions,
    LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import {ILinkedArtifact} from "TFS/WorkItemTracking/ExtensionContracts";
import { LinkedArtifactsStore } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Store";
import {
    ActionsHub, IAddLinkedArtifactsPayload, IRemoveLinkedArtifactsPayload, IChangeLinkedArtifactCommentPayload,
    IFetchingLinksPayload
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Actions";
import { ActionsCreator } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/ActionsCreator";
import { ArtifactFilterHelper } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/Filtering";

import { MainComponent } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Components/MainComponent";

export interface ILinkedArtifactControlOptions {
    /** Tfs context to use for any calls or to get project information */
    tfsContext: TfsContext;

    /** Optional: Specific view options when the control is shown in grid mode */
    gridViewOptions?: IGridViewOptions;

    /** General view options for the control */
    viewOptions: IViewOptions;

    /** Value indicating whether the control should be displayed in read only mode */
    readOnly?: boolean;

    /** Order of groups to display. Groups specified here will be displayed in the given order */
    linkTypeRefNames: string[];

    /** Linked artifacts filter configuration per tool */
    artifactSubTypeFilters?: IDictionaryStringTo<ILinkedArtifactSubtypeFilterConfiguration>;

    /** Columns to display in control */
    columns?: IColumn[];

    /** List of columns to sort by. The order of the array determines the order of the columns */
    sortColumns?: ISortColumn[];

    /**
     * Optional: Cache to store resolved linked artifacts. 
     *
     * Can be used, for example, when the linked artifacts control is used on the work item form. Since work items are 
     * cached, we also want to cache resolved linked artifacts for the lifetime of the work item.
     */
    cache?: ILinkedArtifactsCache;

    /**
     * Maximum number of artifacts to show
     */
    artifactPageSize?: number;

    /**
     * Optional callback that will be called when an artifact is removed
     */
    onRemoveLinkedArtifact?: IFunctionPR<ILinkedArtifact, void>;

    /**
     * Optional callback that will be called when an artifact's comment is changed
     */
    onChangeLinkedArtifactComment?: IFunctionPPR<ILinkedArtifact, string, void>;

    /** Optional method that is invoked after rendering */
    onRender?: IEventHandler;

    /** Zero Data options */
    zeroDataOptions?: IZeroDataOptions;

    /** Linked artifacts to show */
    linkedArtifacts?: ILinkedArtifact[];

    /** Host artifact where links originate from */
    hostArtifact?: IArtifactData;
}

export class LinkedArtifactsControl extends React.Component<ILinkedArtifactControlOptions, {}> {
    private static DEFAULT_COLUMNS: IColumn[] = [InternalKnownColumns.State, InternalKnownColumns.LastUpdate, InternalKnownColumns.Comment];

    private _actionsCreator: ActionsCreator;
    private _store: LinkedArtifactsStore;

    constructor(props: ILinkedArtifactControlOptions) {
        super(props);

        Diag.Debug.assertIsNotNull(props, "props");
        Diag.Debug.assertIsNotNull(props.tfsContext, "Tfs context is required");

        // Create required components
        let actionsHub = new ActionsHub();
        let filterHelper = new ArtifactFilterHelper(this.props.linkTypeRefNames, this.props.artifactSubTypeFilters);

        this._store = new LinkedArtifactsStore(
            actionsHub,
            this.props.linkTypeRefNames,
            this.props.sortColumns,
            this.props.viewOptions,
            this.props.gridViewOptions,
            this.props.zeroDataOptions,
            this.props.readOnly,
            null,
            this.props.artifactPageSize);

        this._actionsCreator = new ActionsCreator(
            this.props.tfsContext,
            actionsHub,
            this._getColumns(),
            filterHelper,
            this.props.cache);

        // Listen to delete/edit actions
        actionsHub.removeLinkedArtifact.addListener(this._onRemoveArtifact.bind(this));
        actionsHub.changeLinkedArtifactComment.addListener(this._onChangedLinkComment.bind(this));

        // Set initial data
        if (this.props.linkedArtifacts) {
            this.setLinkedArtifacts(this.props.linkedArtifacts, this.props.hostArtifact);
        }
    }

    public componentWillReceiveProps(nextProps: ILinkedArtifactControlOptions) {
        if (nextProps && nextProps.linkedArtifacts) {
            this.setLinkedArtifacts(nextProps.linkedArtifacts, nextProps.hostArtifact);
        }
    }

    /**
     * Sets linked artifacts to display
     * @param linkedArtifacts Linked artifacts to display on the control 
     * @param hostArtifact Optional host artifact
     */
    public setLinkedArtifacts(linkedArtifacts: ILinkedArtifact[], hostArtifact?: IArtifactData) {
        this._actionsCreator.setLinks(linkedArtifacts, hostArtifact);
    }

    /**
     * Update view options for control
     * @param viewOptions Updated view options
     */
    public setViewOptions(viewOptions: IViewOptions) {
        this._actionsCreator.changeViewOptions(viewOptions);
    }

    /**
     * Set read only state of control
     * @param readOnly Value indicating whether control should be read only
     */
    public setReadOnly(readOnly: boolean) {
        this._actionsCreator.changeReadOnly(readOnly);
    }

    /**
     * Set zero data options
     * @param zeroDataOptions Value indicating Zero Data Options for the control
     */
    public setZeroDataOptions(zeroDataOptions: IZeroDataOptions) {
        this._actionsCreator.changeZeroDataOptions(zeroDataOptions);
    }

    /**
     * Sets whether loading data
     * @param fetchingLinksPayload Payload indicating if the links are being fetched.
     */
    public setFetchingLinks(fetchingLinksPayload: IFetchingLinksPayload) {
        this._actionsCreator.changeFetchingLinks(fetchingLinksPayload.fetchingLinks);
    }

    /**
     * Show a message of the given type on the control
     * @param type Type of message
     * @param text Text of message
     */
    public setMessage(type: MessageAreaType, text: string) {
        this.setMessage(type, text);
    }

    /**
     * Clear any currently visible message
     */
    public clearMessage() {
        this._actionsCreator.clearMessage();
    }

    public render(): JSX.Element {
        return <MainComponent
            store={ this._store }
            actionsCreator={ this._actionsCreator }
            columns={ this._getColumns() }
            onRender={ this._onRender.bind(this) }
            ref="element" />
    }

    /** Event handler for removing an artifact */
    protected _onRemoveArtifact(payload: IRemoveLinkedArtifactsPayload) {
        if (this._store.getState().displayOptions.readOnly) {
            // Artifacts cannot be deleted in read only mode
            Diag.Debug.fail("Link remove action raised yet the display state is read-only");
            return;
        }

        if (this.props.onRemoveLinkedArtifact) {
            // Actions are not allowed to call actions. Since the consumer might call one of our methods, move to another tick here
            Utils_Core.delay(null, 0, () => {
                this.props.onRemoveLinkedArtifact(payload.linkedArtifactToRemove);
            });
        }
    }

    /** Event handler for changing an artifact comment */
    protected _onChangedLinkComment(payload: IChangeLinkedArtifactCommentPayload) {
        if (this._store.getState().displayOptions.readOnly) {
            // Artifact comments cannot be changed in read only mode
            Diag.Debug.fail("Link comment change action raised yet the display state is read-only");
            return;
        }

        if (this.props.onChangeLinkedArtifactComment) {
            // Actions are not allowed to call actions. Since the consumer might call one of our methods, move to another tick here
            Utils_Core.delay(null, 0, () => {
                this.props.onChangeLinkedArtifactComment(payload.linkedArtifactToChange, payload.newComment);
            });
        }

        VSS_Telemetry.publishEvent(new VSS_Telemetry.TelemetryEventData(
            LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA, "editLinkComment", {
                linkType: payload.linkedArtifactToChange.linkTypeDisplayName,
                commentLength: payload.newComment.length
            }
        ));
    }

    private _getColumns(): IColumn[] {
        let columns = this.props && this.props.columns || LinkedArtifactsControl.DEFAULT_COLUMNS;

        // include the Links column as the first column if it is not present in the options.
        var primaryColumnIndex = Utils_Array.findIndex(columns, c => Utils_String.equals(c.refName, InternalKnownColumns.Link.refName, true));
        if (primaryColumnIndex > 0) {
            // move the primary column to the front by removing it from the list and adding it to the front
            columns.splice(primaryColumnIndex, 1);
            columns.unshift(InternalKnownColumns.Link);
        } else if (primaryColumnIndex === -1) {
            // add the primary column to the front
            columns.unshift(InternalKnownColumns.Link);
        }

        return columns;
    }

    private _onRender() {
        if (this.props.onRender) {
            this.props.onRender();
        }
    }
}
