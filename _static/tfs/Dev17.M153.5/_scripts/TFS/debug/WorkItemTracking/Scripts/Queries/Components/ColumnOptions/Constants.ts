export namespace ColumnOptionConstants {
    export const DRAGDROP_COLUMNS_CONTEXT_ID = "dragdropcolumn";
    export const DRAGDROP_SORT_CONTEXT_ID = "dragdropsort";
    export const DRAG_TYPE = "column-field";
}

export interface IColumnField {
    identifier: string;
    fieldRefName: string;
    fieldId: number;
    name: string;
    isInvalid?: boolean;
    error?: string;
    isRequired?: boolean;
    asc?: boolean;
    isHidden?: boolean;
}
