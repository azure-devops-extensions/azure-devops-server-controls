import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";

export enum WebLayoutLinksControlViewMode {
    Dynamic, // show List if the width is small (less than 480px) or switches to Grid otherwise
    List, // always list
    Grid // always grid
}

export enum WebLayoutLinksControlZeroDataExperience {
    Default,
    Development,

    /** @internal, use call to action rendering for zero data experience */
    CallToAction
}

export enum WebLayoutLinksControlColumnTruncation {
    Auto,
    Off
}

export interface IWebLayoutLinksControlListViewOptions {
    pageSize: number;
    groupLinks: boolean;
}

export interface IWebLayoutLinksControlLinkColumns {
    truncation?: WebLayoutLinksControlColumnTruncation;
    columnNames: string[];
}

export enum WebLayoutLinksControlLinkFilterKind {
    External,
    WorkItem
}

export interface IWebLayoutLinksControlLinkFilter {
    linkFilterKind: WebLayoutLinksControlLinkFilterKind;
    linkFilterType: string;
}

export interface IWebLayoutLinksControlOptions extends IWorkItemControlOptions {
    //Tags in the xml
    listViewOptions: IWebLayoutLinksControlListViewOptions;
    columns: IWebLayoutLinksControlLinkColumns;
    linkFilters: IWebLayoutLinksControlLinkFilter[];
    workItemTypeFilters: string[];

    //Attributes in xml
    viewMode: WebLayoutLinksControlViewMode; 
    zeroDataExperience: WebLayoutLinksControlZeroDataExperience;
    showCallToAction: boolean; //Default is true    
    scopeWorkItemTypesToProject: boolean; //default is false

    // Private options

    /** Hide 'add new'/'add existing' buttons */
    hideActions: boolean;
}

export class WebLayoutLinksControlXmlValues {
    public static IncludeAllLinks = "System.Links.IncludeAll";
    public static ForwardLinkSuffix = "-Forward";
    public static ReverseLinkSuffix = "-Reverse";
}