import {Plan} from "TFS/Work/Contracts";
import {IViewData} from "ScaledAgile/Scripts/Main/Models/ViewsInterfaces";
export interface IViewsMapper {
    mapViewData(list: Plan): IViewData;
}