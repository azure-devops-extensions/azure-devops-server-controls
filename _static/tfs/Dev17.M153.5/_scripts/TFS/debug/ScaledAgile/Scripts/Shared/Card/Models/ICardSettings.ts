import { IItem, IFieldDefinition } from "ScaledAgile/Scripts/Shared/Models/IItem";

export enum IdentityPickerRenderingOption {
    AvatarOnly,
    FullName,
    AvatarAndFullName
}

export interface IAdditionalField {
    /**
     * Unique identifier of an additional field that is generated client-side to cache data associated with the row
     */
    identifier: string;
    /**
     * display name edited/selected by user on the client side
     */
    name: string;
    /**
     * Additional field reference name
     */ 
    referenceName: string;
    /**
     * true if referenceName is in the supported field names
     */ 
    isValid: boolean; 
}

/**
 * Interface for the card settings.
 * The properties are optional, to follow the server contract,
 * wherein, we send only those properties down to the client, which have explicitly been set.
 */
export interface ICardSettings {
    /**
     * Indicates if the ID should be displayed on the card
     */
    showId?: boolean;
    /**
    * Indicates if assigned to field should be displayed on the card
    */
    showAssignedTo?: boolean;
    /**
     * get AssignedTo rendering option. Respected only if showAssignedTo is true
     */
    assignedToRenderingOption?: IdentityPickerRenderingOption;
    /**
    * Indicates if state should be displayed on the card
    */
    showState?: boolean;
    /**
     * Indicates if the Tags control should be displayed on the card
     */
    showTags?: boolean;
    /**
     * Indicates if empty fields should be shown or not
     */
    showEmptyFields?: boolean;
    /**
     * An array of additional card fields to be displayed on the card (in order)
     */
    additionalFields?: IAdditionalField[];
}

/**
 * Card rendering options used by Card component
 */
export interface ICardRenderingOptions {
    /**
     * Indicates if the ID should be displayed on the card
     */
    showId?: boolean;
    /**
     * get AssignedTo rendering option
     */
    assignedToRenderingOption?: IdentityPickerRenderingOption;
    /**
     * Indicates if the Tags control should be displayed on the card
     */
    showTags?: boolean;
    /**
     * Indicates if assignedTo field should be shown or not
     */
    showAssignedTo(item: IItem): boolean;
    /**
     * An array of additional card fields to be displayed on the card (in order)
     */
    getAdditionalFields(item: IItem): IFieldDefinition[];
}
