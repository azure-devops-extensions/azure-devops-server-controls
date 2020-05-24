/**
 * Represent an item.
 */
export interface IItemBase {
    /**
     * Item id
     */
    id: number;

    /**
     * Get current field values
     */
    fieldValues: IDictionaryStringTo<any>;

    /**
     * Gets the field value for the field reference name
     * @returns {any} the value 
     */
    getFieldValue(refName: string): any;
}
