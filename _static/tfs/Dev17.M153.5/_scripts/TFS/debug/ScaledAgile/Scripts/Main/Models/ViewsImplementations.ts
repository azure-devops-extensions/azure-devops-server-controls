import { IdentityRef } from "VSS/WebApi/Contracts";
import { IViewsStoreData, IViewData, IViewBounds } from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
import * as Culture from "VSS/Utils/Culture";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { PlanUserPermissions, CardSettings, FilterClause, Marker } from "TFS/Work/Contracts";

export class ViewsStoreData implements IViewsStoreData {
    view: IViewData;
}

export class ViewData implements IViewData {
    id: string;
    name: string;
    type: string;
    validationState: ValidationState;
    message: string;
    createdByIdentity: IdentityRef;
    description: string;
    modifiedDate: Date;
    userPermissions: PlanUserPermissions;
    revision: number;
    cardSettings: CardSettings;
    criteria: FilterClause[];
    markers: Marker[];

    constructor() {
    }
}

export class ViewBounds implements IViewBounds {
    constructor(public width: number, public height: number) {
        if (!width) {
            throw Error("width must be defined");
        }
        if (!height) {
            throw Error("height must be defined");
        }
    }
}
