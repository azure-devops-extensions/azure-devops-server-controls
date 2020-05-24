import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import { IStoreOptions, Store } from "Presentation/Scripts/TFS/TFS.React";

import { IArtifactData } from "VSS/Artifacts/Services";
import { IMainComponentState, IDisplayOptions, ILinkedArtifactGroup, IMessage, FetchingDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Interfaces";
import {
    ViewMode, IZeroDataOptions, IInternalLinkedArtifactDisplayData, InternalKnownColumns, ZeroDataExperienceViewMode, FetchingLinks, SortDirection,
    ISortColumn, DefaultGridHeight, IViewOptions, IGridViewOptions
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import {ArtifactIconType} from "TFS/WorkItemTracking/ExtensionContracts";
import {
    ActionsHub, IChangeViewOptions, ISetLinkedArtifactsPayload, IChangeReadOnlyPayload, IFetchingLinksPayload, ISortLinkedArtifactsPayload,
    IMessagePayload, IZeroDataOptionsPayload, IFetchingDisplayDataPayload
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Flux/Actions";

import { ArtifactSorter } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/ArtifactSorting";
import { GroupSorter } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/GroupSorting";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export class LinkedArtifactsStore extends Store {
    private static DefaultSortColumns: ISortColumn[] = [{
        column: InternalKnownColumns.Link,
        direction: SortDirection.Ascending
    }];

    private _actionHub: ActionsHub;

    /** Link type reference names that are included in the control, also sets order of links to appear */
    private _linkTypeRefNames: string[];

    /** Message to show (e.g., warning, error, ...) */
    private _message: IMessage;

    /** Display options for control */
    private _displayOptions: IDisplayOptions;

    private _fetchingLinks: FetchingLinks;
    private _fetchingDisplayData: FetchingDisplayData;

    /** Current sort columns, default is the 'Link' column */
    private _sortColumns: ISortColumn[];

    // Grouped, resolved artifacts
    private _linkedArtifactGroups: ILinkedArtifactGroup[] = [];

    /** Artifact where links originate from */
    private _hostArtifact: IArtifactData;

    constructor(
        actionHub: ActionsHub,
        linkTypeRefNames: string[],
        sortColumns?: ISortColumn[],
        viewOptions?: IViewOptions,
        gridViewOptions?: IGridViewOptions,
        zeroDataOptions?: IZeroDataOptions,
        readOnly?: boolean,
        options?: IStoreOptions,
        artifactsPageSize?: number) {
        super(`${TFS_Core_Utils.GUIDUtils.newGuid()}_CHANGED`, options);

        this._actionHub = actionHub;
        this._actionHub.changeViewOptions.addListener(this._changeViewMode.bind(this));
        this._actionHub.changeZeroDataOptions.addListener(this._changeZeroDataExperience.bind(this));
        this._actionHub.changeFetchingLinks.addListener(this._changeFetchingLInks.bind(this));
        this._actionHub.changeFetchingDisplayData.addListener(this._changeFetchingDisplayData.bind(this));
        this._actionHub.changeReadOnly.addListener(this._setReadOnly.bind(this));

        this._actionHub.setLinkedArtifacts.addListener(this._setLinkedArtifacts.bind(this));
        this._actionHub.sortLinkedArtifacts.addListener(this._sortLinkedArtifacts.bind(this));

        this._actionHub.showMessage.addListener(this._showMessage.bind(this));

        this._linkTypeRefNames = linkTypeRefNames;
        this._sortColumns = sortColumns || LinkedArtifactsStore.DefaultSortColumns;

        this._fetchingDisplayData = FetchingDisplayData.Done;
        this._fetchingLinks = FetchingLinks.Done;

        // Set default display options
        this._displayOptions = {
            readOnly: readOnly ? readOnly : false,
            showGroupHeaders: !!viewOptions ? viewOptions.showGroupHeaders : true,
            viewMode: viewOptions && viewOptions.viewMode || ViewMode.List,
            availableSpace: viewOptions && viewOptions.availableSpace || {
                width: null,
                height: null
            },
            zeroDataOptions: {
                zeroDataExperienceViewMode: zeroDataOptions ? zeroDataOptions.zeroDataExperienceViewMode : ZeroDataExperienceViewMode.Default,
                message: zeroDataOptions && zeroDataOptions.message,
                action: zeroDataOptions && zeroDataOptions.action,
                onRenderZeroData: zeroDataOptions && zeroDataOptions.onRenderZeroData
            },
            gridViewOptions: gridViewOptions || {
                maxGridHeight: DefaultGridHeight,
                autoSizeGrid: true
            },
            artifactPageSize: artifactsPageSize || 6
        };
    }

    public getState(): IMainComponentState {
        // Clone any internal objects
        return {
            displayOptions: {
                readOnly: this._displayOptions.readOnly,
                showGroupHeaders: this._displayOptions.showGroupHeaders,
                viewMode: this._displayOptions.viewMode,
                zeroDataOptions: {
                    zeroDataExperienceViewMode: this._displayOptions.zeroDataOptions.zeroDataExperienceViewMode,
                    action: this._displayOptions.zeroDataOptions.action,
                    message: this._displayOptions.zeroDataOptions.message,
                    onRenderZeroData: this._displayOptions.zeroDataOptions.onRenderZeroData
                },
                availableSpace: this._displayOptions.availableSpace,
                artifactPageSize: this._displayOptions.artifactPageSize,
                gridViewOptions: this._displayOptions.gridViewOptions
            },
            hostArtifact: this._hostArtifact,
            linkedArtifactGroups: this._linkedArtifactGroups,
            sortColumns: this._sortColumns,
            message: this._message,
            fetchingDisplayData: this._fetchingDisplayData,
            fetchingLinks: this._fetchingLinks
        };
    }

    private _changeViewMode(payload: IChangeViewOptions) {
        let emitChange = false;
        if (this._displayOptions.viewMode !== payload.viewOptions.viewMode) {
            this._displayOptions.viewMode = payload.viewOptions.viewMode;
            emitChange = true;
        }

        if (!!payload.viewOptions.availableSpace &&
            (this._displayOptions.availableSpace.height !== payload.viewOptions.availableSpace.height ||
            this._displayOptions.availableSpace.width !== payload.viewOptions.availableSpace.width)) {
            this._displayOptions.availableSpace = payload.viewOptions.availableSpace;
            emitChange = true;
        }

        if (emitChange) {
            this.emitChanged();
        }
    }

    private _setReadOnly(payload: IChangeReadOnlyPayload) {
        this._displayOptions.readOnly = payload.readOnly;

        this.emitChanged();
    }

    private _changeFetchingLInks(payload: IFetchingLinksPayload) {
        this._fetchingLinks = payload.fetchingLinks;

        this.emitChanged();
    }

    private _changeFetchingDisplayData(payload: IFetchingDisplayDataPayload) {
        this._fetchingDisplayData = payload.fetchingDisplayData;

        this.emitChanged();
    }

    private _changeZeroDataExperience(payload: IZeroDataOptionsPayload) {
        if (this._compareZeroDataOptions(this._displayOptions.zeroDataOptions, payload.zeroDataOptions)) {
			this._displayOptions.zeroDataOptions = payload.zeroDataOptions;

			this.emitChanged();
		}
    }

    private _setLinkedArtifacts(payload: ISetLinkedArtifactsPayload) {
        this._linkedArtifactGroups = payload.groupedLinkedArtifacts;
        this._hostArtifact = payload.hostArtifact;

        // Ensure current sort order is applied to groups and artifacts
        this._sort();

        this.emitChanged();
    }

    private _sortLinkedArtifacts(payload: ISortLinkedArtifactsPayload) {
        this._sortColumns = payload.sortColumns;
        this._sort();

        this.emitChanged();
    }

    private _sort() {
        this._sortArtifacts();
        this._sortGroups();
    }

    private _sortArtifacts() {
        let sorter = new ArtifactSorter();
        sorter.sortArtifactsInGroups(this._linkedArtifactGroups, this._sortColumns);
    }

    private _sortGroups() {
        let sorter = new GroupSorter();
        sorter.sort(this._linkTypeRefNames, this._linkedArtifactGroups);
    }

    private _showMessage(payload: IMessagePayload) {
        this._message = payload.message;
        this.emitChanged();
    }

    private _compareZeroDataOptions(options1: IZeroDataOptions, options2: IZeroDataOptions) {
        let actionMessage1 = !!options1.action ? options1.action.actionMessage : null;
        let actionMessage2 = !!options2.action ? options2.action.actionMessage : null;

        if (options1.zeroDataExperienceViewMode !== options2.zeroDataExperienceViewMode ||
            options1.message !== options2.message ||
            actionMessage1 !== actionMessage2) {
            return true;
        }

        return false;
    }
}