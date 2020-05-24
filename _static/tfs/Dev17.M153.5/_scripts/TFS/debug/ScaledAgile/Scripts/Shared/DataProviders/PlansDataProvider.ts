import * as Q from "q";
import { ViewPerfScenarioManager, ScaledAgileTelemetry } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";

import { Plan, CreatePlan, UpdatePlan } from "TFS/Work/Contracts";

import { BaseDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/BaseDataProvider";
import { IPlansDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/IPlansDataProvider";
import * as Utils_Core from "VSS/Utils/Core";

/**
 * Base plans operations (without mappers) that add performance and telemetry information.
 */
export class PlansDataProvider extends BaseDataProvider implements IPlansDataProvider {
    /**
     * See IPlansDataProvider.getAllPlans
     */
    public getAllPlans(): IPromise<Plan[]> {
        ViewPerfScenarioManager.split("GetAllPlansStart");
        return this._getWorkHttpClient().getPlans(this._getProjectId()).then(
            (plans: Plan[]) => {
                ViewPerfScenarioManager.split("GetAllPlansEnd");
                return plans;
            },
            (error: any) => {
                ViewPerfScenarioManager.split("GetAllPlansEnd");
                return Q.reject(error);
            });
    }

    /**
     * See IPlansDataProvider.createPlan
     */
    public createPlan(plan: CreatePlan): IPromise<Plan> {
        return this._getWorkHttpClient().createPlan(plan, this._getProjectId()).then(
            (createdPlan: Plan) => {
                ScaledAgileTelemetry.onCreatePlanSucceeded(createdPlan);
                return createdPlan;
            });
    }

    /**
     * Delete a plan
     * @param {string} planId the ID of the plan
     * @returns IPromise<void>
     */
    public deletePlan(planId: string): IPromise<void> {
        return this._getWorkHttpClient().deletePlan(this._getProjectId(), planId).then<void>(
            () => {
                ScaledAgileTelemetry.onDeletePlanSucceeded(planId);
            });
    }

    /**
     * Creates a copy of a plan with the given plan name
     * @param planId id of a plan to copy
     * @param planName new plan name
     * @returns IPromise<Plan>
     */
    public copyPlan(planId: string, planName: string): IPromise<Plan> {
        const projectId = this._getProjectId();
        return this._getWorkHttpClient().getPlan(projectId, planId).then(
            (plan: Plan) => { 
                return this._copyPlan(projectId, plan, planName); 
            }
        );
    }

    private _copyPlan(projectId: string, plan: Plan, planName: string): IPromise<Plan> {
        let sourceProperties = plan.properties;
        let newPlan = {
            description: plan.description,
            name: planName,
            properties: sourceProperties,
            type: plan.type
        } as CreatePlan;

        return this._getWorkHttpClient().createPlan(newPlan, projectId).then(
            (createdPlan: Plan) => {
                ScaledAgileTelemetry.onCreatePlanSucceeded(createdPlan, true);

                // createPlan doesn't support setting extended properties like card settings & markers
                // hence invoke updatePlan to set those in another call. This extra call can be removed
                // once createPlan supports setting card settings & markers
                let updatePlan = {
                    description: createdPlan.description,
                    name: createdPlan.name,
                    properties: sourceProperties,
                    revision: createdPlan.revision,
                    type: createdPlan.type
                } as UpdatePlan;

                return new Promise((resolve, reject) => {
                    this._getWorkHttpClient().updatePlan(updatePlan, projectId, createdPlan.id).then(
                        resolve,
                        (reason: any ) => {
                            ScaledAgileTelemetry.onUpdatePlanRetry(createdPlan.id);
                            // If the update plan request fails, wait 1 second and try to update the plan again
                            // This can happen sometimes, see #1104004
                            Utils_Core.delay(this, 1000, () => {
                                this._getWorkHttpClient().updatePlan(updatePlan, projectId, createdPlan.id).then(resolve, reject);
                            });
                    });
                });
            } 
        );
    }
}
