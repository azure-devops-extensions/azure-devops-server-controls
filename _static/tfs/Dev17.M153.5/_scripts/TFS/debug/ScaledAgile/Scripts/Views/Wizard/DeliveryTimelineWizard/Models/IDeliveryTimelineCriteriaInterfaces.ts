import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { IFieldShallowReference } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";

/**
 * Represent the list of the criteria settings
 */
export interface IDeliveryTimelineCriteriaData extends IModelWithValidation {
    /**
     * Criteria settings 
     */
    criteria: ICriteriaSettingData[];

    /**
     * Available field options in the dropdown
     */
    availableFields: IFieldShallowReference[];
}

/**
 * Represent each row of the criteria setting
 */
export interface ICriteriaSettingData extends ICriteriaSelectedSettingData {
    /**
     * Available operator options in the dropdown
     */
    availableOperators: IFieldShallowReference[];

    /**
     * Available values in the dropdown
     */
    availableValues: IFieldShallowReference[];
}

/**
 * Represent selected value of the criteria setting
 */
export interface ICriteriaSelectedSettingData {
    /**
     * Setting guid identifier. This is a temporary setting generated on the fly when the setting row is generated. The goal
     * of this id is to have a unique identifier on the row to cache data associated with the row. This is never persisted on the
     * server.
     */
    id: string;

    /**
     * Current selected field
     */
    field: IFieldShallowReference;

    /**
    * Current selected operator
    * id - invariant operator name
    * name - localized operator name
    */
    operator: IFieldShallowReference;

    /**
     * Current selected value
     */
    value: IFieldShallowReference;

    /**
     * Control type for the value
     */
    valueControlType: FieldValueControlTypeEnum;
}

/**
 * Represent control type for the Value Control. Used for rendering different control based on type.
 */
export enum FieldValueControlTypeEnum {
    Default,
    Dropdown,
    TreePath,
    Identity,
}

/**
 * Filter Clause constants
 */
export namespace FilterClauseConstants {
    /**
     * AND operator
     */
    export const andOperator = "AND";
}


