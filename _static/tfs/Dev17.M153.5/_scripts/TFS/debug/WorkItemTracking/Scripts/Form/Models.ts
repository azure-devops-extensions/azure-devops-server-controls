export interface IContribution {
    contribution?: IWitContribution;
    isContribution?: boolean;
}

export interface ILayout {
    pages: IPage[];

    systemControls: IControl[];

    showEmptyReadOnlyFields?: boolean;

    /** client only for now, optional page describing the header/core fields layout */
    headerPage?: IPage;
}

export interface IPage extends IContribution {
    id: string;
    label: string;
    visible: boolean;
    pageType: PageType;
    layoutMode: PageLayoutMode;
    inherited: boolean;
    locked: boolean;
    sections: ISection[];
}

export interface ISection {
    groups: IGroup[];
    id: string;
}

export interface IGroup extends IContribution {
    label: string;
    id: string;
    order: number;
    visible: boolean;
    inherited: boolean;
    controls: IControl[];
    height?: number;
}

export interface IWitContribution {
    contributionId: string;
    height?: number;
    showOnDeletedWorkItem?: boolean;
    inputs?: IDictionaryStringTo<any>;
}

export enum PageType {
    custom = 1,
    history = 2,
    links = 3,
    attachments = 4,
    /** Client only for now */
    header = 5
}

/**
 * FirstColumnWide - Default system layout mode - First column is wider than other columns
 * EqualColumns - All columns are equal width
 */
export enum PageLayoutMode {
    firstColumnWide = 1,
    equalColumns = 2
}

export interface IControl extends IContribution {
    id: string;
    controlType: string;
    watermark: string;
    label: string;
    metadata: string;
    order: number;
    visible: boolean;
    hideLabel: boolean;
    readonly: boolean;
    replacesFieldReferenceName?: string;
    inherited: boolean;
    height?: number;
}

/**
 * User settings related to the layout
 */
export interface ILayoutUserSettings {
    /**
     * user settings for the processes in the collection
     */
    processSettings: IProcessSettings[];

    /**
     * user settings for the projects in the collection
     */
    projectSettings: IProjectSettings[];

    isWitDialogFullScreen: boolean;
}

/**
 * user settings for the process
 */
export interface IProcessSettings {
    /**
     * the process guid
     */
    processId: string;

    /**
     * user settings for the work item types in the collection
     */
    workItemTypeSettings: IWorkItemTypeSettings[];
}

/**
 * user settings for the process
 */
export interface IProjectSettings {
    /**
     * the project guid
     */
    projectId: string;

    /**
     * user settings for the work item types in the project
     */
    workItemTypeSettings: IWorkItemTypeSettings[];
}

/**
 * user settings for the work item types in the collection
 */
export interface IWorkItemTypeSettings {
    /**
     * name for the work item type
     */
    refName: string;

    /**
     * list of group ids that are collapsed in this work item type on the desktop form
     */
    collapsedGroups: string[];

    /**
     * list of group ids that are collapsed in this work item type on the mobile form
     */
    mobileCollapsedGroups: string[];
}

/**
 * Gets the available height and width.
 */
export interface IAvailableDrawSpace {
    width: number;
    height: number;
}
