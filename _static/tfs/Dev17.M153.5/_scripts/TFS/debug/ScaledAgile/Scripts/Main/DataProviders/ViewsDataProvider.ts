import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import * as Q from "q";
import { Plan, UpdatePlan } from "TFS/Work/Contracts";
import { BaseDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/BaseDataProvider";
import { IViewsDataProvider } from "ScaledAgile/Scripts/Main/DataProviders/IViewsDataProvider";
import { IViewData, IViewsStoreData, IUpdateViewPayload } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { IViewsMapper } from "ScaledAgile/Scripts/Main/Models/IViewsMapper";

export class ViewsDataProvider extends BaseDataProvider implements IViewsDataProvider {
    private _mapper: IViewsMapper;

    constructor(mapper: IViewsMapper) {
        super();
        this._mapper = mapper;
    }

    /**
     * Get the plan.
     * @param {string} planId - The plan ID. Could be valid or not.
     * @return IPromise<IViewsStoreData>
     */
    public getPlan(planId: string): IPromise<IViewsStoreData> {
        return this._getWorkHttpClient().getPlan(this._getProjectId(), planId)
            .then((plan: Plan) => {
                const views = this._mapper.mapViewData(plan);
                return Q.resolve({
                    view: views
                } as IViewsStoreData);
            }, () => Q.reject(new Error(ScaledAgileResources.ViewNotFoundExceptionMessage)));
    }

    /**
     * Updates a plan with new properties
     * @param {IUpdateViewPayload} updatePlanPayload New properties for the plan plus the plan id.
     * @returns {IPromise<IViewData>}
     */
    public updatePlan(payload: IUpdateViewPayload): IPromise<IViewData> {
        const planDetails = {
            revision: payload.planRevision,
            type: payload.planType,
            name: payload.name,
            description: payload.description,
            properties: payload.properties
        } as UpdatePlan;

        return this._getWorkHttpClient().updatePlan(planDetails, this._getProjectId(), payload.planId)
            .then((response: Plan) => {
                let mappedViews = this._mapper.mapViewData(response);
                return mappedViews;
            });
    }
}
