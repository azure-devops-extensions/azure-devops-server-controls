import PresentationResource = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Artifacts_Services = require("VSS/Artifacts/Services");
import { IArtifactIcon, ILinkedArtifact, ILinkedArtifactAdditionalData, ILinkedArtifactPrimaryData } from "TFS/WorkItemTracking/ExtensionContracts";
export const DefaultGridHeight = 300;
export const LINKED_ARTIFACTS_CUSTOMER_INTELLIGENCE_AREA = "linkedArtifacts";

export enum LinkColumnType {
    String,
    Integer,
    DateTime,
    PlainText,
    Html,
    TreePath,
    Double,
    Guid,
    Boolean,
    Identity
}

export enum ViewMode {
    /** Display control in list mode */
    List,

    /** Display control in grid mode with truncated columns */
    Grid,

    /** Display control in grid mode with all columns visible */
    FullGrid
}

export interface IAvailableSpace {
    /** Width for the control to fill */
    width: number;

    /** Height for the control to fill */
    height: number;
}

export interface IViewOptions {
    /** Value indicating whether to show group headers in list view mode */
    showGroupHeaders?: boolean;

    /** Desired view mode of the control */
    viewMode: ViewMode;

    /** Available space for the control to draw itself in. Setting this is required for grid view modes */
    availableSpace?: IAvailableSpace;
}

/** Grid view mode specific options */
export interface IGridViewOptions {
    /** The minimum number of columns to show in the partial grid view mode */
    minColumnsInGridView?: number;

    /** Maximum height to use when the control is in grid view mode, and autoSizeGrid is enabled. Defaults to 300px */
    maxGridHeight?: number;

    /** Value indicating whether the control in grid mode should grow until maxGridHeight is reached. Defaults to true */
    autoSizeGrid?: boolean;
}


/** Zero Data View Mode */
export enum ZeroDataExperienceViewMode {
    /** Zero data experience is hidden */
    Hidden,
    /** Zero data experience is shown */
    Default,
    /** Custom rendering callback is used */
    Custom
}

/** Indicate if the host is fetching links */
export enum FetchingLinks {
    /** Indicates that host is not fetching links */
    Done,

    /** Indicates that host is fetching links */
    InProgress
}

/** Action for Zero Data Experience e.g. Create Branch */
export interface IZeroDataAction {
    /** Action message */
    actionMessage: string;

    /** Optional action call back */
    actionCallback?: () => boolean
}

export interface IZeroDataOptions {
    /** Zero data experience view mode */
    zeroDataExperienceViewMode: ZeroDataExperienceViewMode;

    /** Optional Zero data experience message, if not provided a default message will be shown. */
    message?: string;

    /** Optional Zero data action */
    action?: IZeroDataAction;

    /** Optional zero data rendering function. Returned content will be shown for zero data experience. */
    onRenderZeroData?: (message?: string, action?: IZeroDataAction) => JSX.Element;
}

export interface IColumn {
    /** Display name of column */
    name: string;

    /** Reference name of field to show as column value */
    refName: string;

    /** Optional type of column content */
    type?: LinkColumnType;
}

export enum SortDirection {
    Ascending = 1,
    Descending = -1
}

export interface ISortColumn {
    /** Reference name of colum to define sorting for */
    column: IColumn;

    /** Sort direction */
    direction: SortDirection
}

export interface ILinkedArtifactSubtypeFilterConfiguration {
    /** If specified, only the given artifact sub-types will be included. For example, 'Task' is subtype for 'WorkItem' artifact */
    artifactSubtypes?: string[];

    /** Optional, value indicating whether only artifacts in current project should be shown */
    inCurrentProject?: boolean;
}

/** Interface for an artifact cache provided by consumer of control */
export interface ILinkedArtifactsCache {
    /**
     * Set value for cache, existing values should be overriden
     * @param key Key for cache
     * @param value Value to set
     */
    set(key: string, value: IInternalLinkedArtifactDisplayData): void;

    /**
     * Get resolved artifact data from cache
     * @param key Key to get value for
     * @returns Value for key 
     */
    get(key: string): IInternalLinkedArtifactDisplayData;

    /**
     * Invalidates the specified cache entry
     * @param key Key to invalidate
     */
    invalidate(key: string): void;
}

/**
 * Well known columns supported by the linked artifacts control
 */
export const InternalKnownColumns = {
    /** Mandatory column showing a summary of the linked artifact */
    Link: {
        name: PresentationResource.LinkedArtifacts_ColumnHeader_Link,
        refName: "Link"
    } as IColumn,

    /** Id of linked artifact */
    Id: {
        name: PresentationResource.LinkedArtifacts_ColumnHeader_Id,
        refName: "System.Id"
    } as IColumn,

    /** Current state of linked artifact */
    State: {
        name: PresentationResource.LinkedArtifacts_ColumnHeader_State,
        refName: "System.State"
    } as IColumn,

    /** Last update of linked artifact */
    LastUpdate: {
        name: PresentationResource.LinkedArtifacts_ColumnHeader_LastUpdate,
        refName: "System.ChangedDate"
    } as IColumn,

    /** Comment set for a link */
    Comment: {
        name: PresentationResource.LinkedArtifacts_ColumnHeader_Comment,
        refName: "System.Links.Comment"
    } as IColumn
}

export namespace HostArtifactAdditionalData {
    export const ProjectName = "PROJECT_NAME";
    export const ProjectId = "PROJECT_ID";
}

/** Data about the host artifact where links to any other artifact originate from */
export interface IHostArtifact extends Artifacts_Services.IArtifactData {
    /** Additional data to be passed for this host artifact */
    additionalData?: IDictionaryStringTo<any>;
}
export interface IEvent extends UIEvent {
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    which?: number;
    button?: number;
}
/** Defines the Title row for Artifact */
export interface IInternalLinkedArtifactPrimaryData extends ILinkedArtifactPrimaryData{
    /** Name of type (e.g., "Bug" for a workitem, or "Commit" for a VC artifact) */
    typeName?: string;

    /** Information about the user */
    user?: {
        /** Any prefix we want in the title/tooltip e.g. Assigned To or Created By  */
        titlePrefix?: string,

        /** User's display name */
        displayName: string,

        /** User's TFIS/VSID */
        id?: string,

        /** User's email address */
        email?: string,

        /** User's unique name */
        uniqueName?: string,

        /** Avatar url */
        imageUrl?: string
    };

    /** Callback. If any other value than 'true' is returned, the link specified in the href will be opened */
    callback?: (miscData: any, hostArtifact?: IHostArtifact,e?: IEvent) => boolean;

    /** Any misc data need to be passed to callback */
    miscData?: any;

    /** Additional icon that will appear before the artifact type icon */
    additionalPrefixIcon?: IArtifactIcon;
}

/** Defines artifact calls to actions */
export interface ILinkedArtifactAction extends ILinkedArtifactAdditionalData {

    /** Action href */
    href?: string;

    /** Callback  */
    callback?: (miscData: any, hostArtifact?: IHostArtifact) => void;

    /** Any misc data need to be passed to callback */
    miscData: any;
}

export interface IInternalLinkedArtifactDisplayData extends ILinkedArtifact{
    
    /** Title row for the artifact */
    primaryData?: IInternalLinkedArtifactPrimaryData;

    /** Zero or more additional data */
    additionalData?: IDictionaryStringTo<ILinkedArtifactAdditionalData>;

    /** Optional action */
    action?: ILinkedArtifactAction;

    /** Any other data a dataprovider wants to stash for later processing */
    miscData?: any;

    /** 
    If this is set, columns will be taken into account when caching this artifact. 
    When a data provider always returns all columns in additionalData, then this should not be set
    */
    isColumnDependent?: boolean;

    /** Any error associated with the artifact */
    error?: Error;
}

export namespace Events {
    export const ForceRerender = "LA_FORCE_RERENDER";
}