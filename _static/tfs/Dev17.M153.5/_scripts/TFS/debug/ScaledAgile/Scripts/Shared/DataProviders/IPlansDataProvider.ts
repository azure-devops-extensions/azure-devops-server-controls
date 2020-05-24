import { Plan, CreatePlan } from "TFS/Work/Contracts";

export interface IPlansDataProvider {
    /**
     * Get all of the plans.
     * @returns {IPromise<Plan[]>} promise to be resolved with all the plans.
     */
    getAllPlans(): IPromise<Plan[]>;

    /**
     * Create a new plan.
     * @returns {IPromise<Plan>} promise to be resolved with the new plan.
     */
    createPlan(plan: CreatePlan): IPromise<Plan>;

    /**
     * Delete a plan.
     * @param {string} planId the ID of the plan.
     * @returns {IPromise<void>} promise to be resolved when the plan has been deleted.
     */
    deletePlan(planId: string): IPromise<void>;

    /**
     * Copies a plan.
     * @param {string} planId the ID of the plan.
     * @param {string} planName new plan name.
     * @returns {IPromise<void>} promise to be resolved when the plan has been added.
     */
    copyPlan(planId: string, planName: string): IPromise<Plan>;
}
