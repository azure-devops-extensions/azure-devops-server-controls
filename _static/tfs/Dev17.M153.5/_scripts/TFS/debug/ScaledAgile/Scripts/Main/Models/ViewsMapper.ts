import { IViewData } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import { ViewData } from "ScaledAgile/Scripts/Main/Models/ViewsImplementations";
import { IViewsMapper } from "ScaledAgile/Scripts/Main/Models/IViewsMapper";
import { Plan, PlanType } from "TFS/Work/Contracts";
import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";

export class ViewsMapper implements IViewsMapper {
    public mapViewData(plan: Plan): IViewData {
        let view = new ViewData();
        view.id = plan.id;
        view.name = plan.name;
        view.createdByIdentity = plan.createdByIdentity;
        view.description = plan.description;
        view.modifiedDate = plan.modifiedDate;
        view.userPermissions = plan.userPermissions;
        view.revision = plan.revision;
        
        if (plan.properties && plan.properties.cardSettings) {
            view.cardSettings = plan.properties.cardSettings;
        }

        if (plan.properties && plan.properties.criteria) {
            view.criteria = plan.properties.criteria;
        }

        if (plan.properties && plan.properties.markers) {
            view.markers = plan.properties.markers;
        }
        
        let type = PlanType[plan.type];
        if (!type) {
            type = plan.type.toString();
        }
        view.type = type;
        return view;
    }
}
