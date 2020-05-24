import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";

export interface IDeliveryTimelineMarkersData extends IModelWithValidation {
    /**
     * Markers settings 
     */
    markers: IMarkersSettingData[];
}

export interface IMarkersSettingData {
    /**
     * Setting guid identifier. This is a temporary setting generated on the fly when the setting row is generated. The goal
     * of this id is to have a unique identifier on the row to cache data associated with the row. This is never persisted on the
     * server.
     */
    id: string;

    /**
     * Color 
     */
    color: string;

    /**
     * Date of marker
     */
    date: IMarkerSettingValue<Date>;

    /**
     * Label - name for marker that will be dispalyed
     */
    label: IMarkerSettingValue<string>;
}

export interface IMarkerSettingValue<T> extends IModelWithValidation {
    value: T;
}
