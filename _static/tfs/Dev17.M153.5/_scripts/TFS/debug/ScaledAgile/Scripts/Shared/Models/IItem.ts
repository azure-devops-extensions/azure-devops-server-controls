import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { FilterState } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IItemBase } from "ScaledAgile/Scripts/Shared/Models/IItemBase";

export enum ItemSaveStatus {
    /** Item is currently being saved */
    IsSaving,

    /** Item has been saved */
    Saved,

    /** Item is in an error state */
    Error
}

/**
 * Represent an item.
 */
export interface IItem extends IItemBase {
    /** Optional parent id */
    parentId?: number;

    /**
     * Saving status of the item.
     */
    saveStatus?: ItemSaveStatus;

    /** 
     * Optional message to display for item.
     */
    message?: string;

    /** 
     * Flag indicate if the item is hidden
     */
    isHidden: boolean;

    /**
     * Set item hidden state
     * @param value the hidden state
     * @returns New item instance with updated hidden state
     */
    setIsHidden(value: boolean): IItem;

    /**
     * Set current field values
     * @returns New item instance with updated field values
     */
    setFieldValues(values: IDictionaryStringTo<any>): IItem;

    /**
     * Set status with an optional message
     * @param status Status to set for item
     * @param message Optional error message
     * @returns New item instance with status and message set
     */
    setStatus(status: ItemSaveStatus, message?: string): IItem;

    /**
     * Set parentId
     * @param parentId The parent id of the item
     * @returns New item instance with parentId set
     */
    setParentId(parentId: number): IItem;

    /**
     * Merge the given item with the current item and return a new instance
     * @param update Item to merge
     */
    merge(update: IItem): IItem;

    /**
     * Clone a Item object
     * @returns The newly cloned Item instance
     */
    clone(): IItem;

    /**
     * Y-position of the top of the item within the viewport
     */
    top: number;

    /**
     * Height of an item not including the cardMargin.
     */
    height: number;
}

export interface IItems {
    /**
     * Used by the action to know which one is loaded and which one is not (just id)
     */
    cards: IItem[];
}

/**
 * Interface representing a work item field definition
 */
export interface IFieldDefinition {
    /**
     * The field id
     */
    id: number;

    /**
     * The field refrence name
     */
    referenceName: string;

    /**
     * The field type (ie: string, boolean, datetime)
     */
    type: WITConstants.FieldType;

    /**
     * The field label display name
     */
    name: string;

    /**
     * Indicates if the field definition is queryable via the work item tracking
     * object model.
     */
    isQueryable?: () => boolean;

    /**
     * Indicates the usage of the field definition as defined in the work item tracking
     * object model {FieldUsages} enum type.
     */
    usages?: number;

    /**
     * Indicates if the field defintition is for an identity field.
     */
    isIdentity?: boolean;

    /**
     * Indicates if the field defintition supports text query.
     */
    supportsTextQuery?: () => boolean;
}

export interface IItemStatusChangePayload {
    /** Id of item to change status for */
    id: number;

    /** Status to change item to */
    status: ItemSaveStatus;

    /** Optional message */
    message?: string;
}

export enum UpdateMode {
    /** Override exiting items and with passed items */
    FullItemOverride,
    /** Only update the exiting item with the given new field value */
    FieldUpdate
}

export interface IItemsUpdatePayload {
    /**
     *  The id to item map for updated items.
     */
    itemMap: IDictionaryNumberTo<IItem>;
    /**
     *  The way of updating the items, see enum UpdateMode.
     */
    updateMode: UpdateMode;
}

/**
 * Interface for update filter
 */
export interface IFilterUpdateData {
    /**
     *  filter state for update
     */
    filter: FilterState;
}
