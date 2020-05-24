import * as WorkContracts from "TFS/Work/Contracts";

import { PlanType } from "TFS/Work/Contracts";
import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { IDeliveryTimelineConfigurationDetail } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";

export interface IWizardData {
    /**
     * The id of the view
     */
    id?: string;

    /**
     * The name of the view
     */
    name: IDeliveryTimelineConfigurationDetail;

    /**
     * The description of the view
     */
    description: IDeliveryTimelineConfigurationDetail;

    /**
     * The view type
     */
    viewType: PlanType;

    /**
     * Team backlog mappings
     */
    teamBacklogMappings: ITeamBacklogMappingsProperties;

    /**
     * Criteria
     */
    criteria: ICriteriaProperties;

    /**
     * Indicate whether the whole wizard is valid
     */
    isValid: boolean;

    /**
     * Is the wizard currently saving - ie has the user clicked create on the create plan page?
     */
    isSaving: boolean;
}

export interface ITeamBacklogMappingsProperties {
    /**
     * team backlog mappings
     */
    teamBacklogMappings: WorkContracts.TeamBacklogMapping[];
    /**
     * Indicate whether the setting is valid or not
     */
    validationState: IModelWithValidation;
}

export interface ICriteriaProperties {
    /**
     * filter clauses
     */
    filterClauses: WorkContracts.FilterClause[];
    /**
     * Indicate whether the setting is valid or not
     */
    validationState: IModelWithValidation;
}

/**
 * Generic id and name pair of the field used in combo box
 */
export interface IFieldShallowReference {
    /**
     * id of the field
     */
    id: string;
    /**
     * Value of the field
     */
    name: string;
    /**
     * The state of the value
     */
    valueState: ValueState;
}

export enum ValueState {
    IsLoading,
    ReadyAndValid,
    ReadyButInvalid
}
