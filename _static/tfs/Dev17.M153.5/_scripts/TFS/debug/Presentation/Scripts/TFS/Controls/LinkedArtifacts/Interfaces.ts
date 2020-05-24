/**
 * @file Contains interfaces shared across the LinkedArtifacts control. Not for external usage
 */

import { MessageAreaType } from "VSS/Controls/Notifications";

import {
    ViewMode, IColumn, IInternalLinkedArtifactDisplayData , IZeroDataAction, IZeroDataOptions, FetchingLinks, ISortColumn, SortDirection, IGridViewOptions, IAvailableSpace
} from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";

import { IArtifactData } from "VSS/Artifacts/Services";

export interface ILinkedArtifactGroup {
    /** Name of group to display */
    displayName: string;

    /** Type of artifacts in group */
    linkType: string;

    /** Linked artifacts in group */
    linkedArtifacts: IInternalLinkedArtifactDisplayData [];
}

/** Indicates if the display data is being fetched */
export enum FetchingDisplayData {
    Done,
    InProgress
}

export interface IDisplayOptions {
    /** Value indicating whether group headers should be shown */
    showGroupHeaders: boolean;

    /** Value indicating whether control should be displayed in read only mode */
    readOnly: boolean;

    /** Current view mode of control */
    viewMode: ViewMode;

    /** Available space for the control to draw */
    availableSpace: IAvailableSpace;

    /** Grid specific view options */
    gridViewOptions: IGridViewOptions;

    /** Page size when showing artifacts in List view */
    artifactPageSize: number;
    
    /** Zero Data options */
    zeroDataOptions: IZeroDataOptions;
}

export interface IMessage {
    text: string;
    type: MessageAreaType;
}

/** 
 * Main component state
 */
export interface IMainComponentState {
    /** Display options for components */
    displayOptions: IDisplayOptions;

    /** Optional host artifact */
    hostArtifact?: IArtifactData;

    /** Groups of linked artifacts to show */
    linkedArtifactGroups: ILinkedArtifactGroup[];

    /** Current set of sort columns */
    sortColumns: ISortColumn[];

    /** Message */
    message: IMessage;

    /** Host is fetching links */
    fetchingLinks: FetchingLinks;

    /** Control is fetching display data */
    fetchingDisplayData: FetchingDisplayData;

}