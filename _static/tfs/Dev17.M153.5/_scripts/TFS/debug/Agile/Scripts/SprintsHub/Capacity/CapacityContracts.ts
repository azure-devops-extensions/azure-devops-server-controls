import { TeamCapacityModel } from "Agile/Scripts/Capacity/CapacityModels";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { ISprintCapacityOptions } from "Agile/Scripts/SprintsHub/Common/SprintCapacityDataProvider";
import { ISprintViewPivotContext } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewContracts";
import { IUserAction } from "VSSUI/Utilities/IUserAction";

export interface IUser {
    id: string;
    displayName: string;
    uniqueName: string;
}

export interface IDaysOff {
    /**
     * Start date in UTC form
     */
    start: Date;
    /**
     * End date in UtC form
     */
    end: Date;
    ratio?: number;
    netDaysOff?: number;
}

export interface IActivity {
    name: string;
    // Maintain a number and a string because numbers must be shown localized
    capacityPerDay: number;
    displayValue: string;
}

export interface IUserCapacity {
    teamMember: IUser;
    activities: IActivity[];
    daysOff: IDaysOff[];
}

export interface ICapacity {
    userCapacities: IUserCapacity[];
    teamDaysOff: IDaysOff[];
    exceptionInfo?: ExceptionInfo;
}

export interface IInitialPayload {
    capacityOptions: ISprintCapacityOptions;
    teamCapacity: ICapacity;
}

export interface IInitializeCapacityPayload {
    iteration: Iteration;
    capacityOptions: ISprintCapacityOptions;
    teamCapacity: ICapacity;
}

export interface IAsyncOperationStatus {
    inprogress: boolean;
}

export const enum LoadingStatus {
    None = 0,
    Loading = 1,
    ErrorLoadingData = 2
}

export interface ICapacityState {
    isVeryFirstLoad: boolean;
    capacityDataStatus: LoadingStatus;
    isDirty: boolean;
    isValid: boolean;
    capacity: ICapacity;
    capacityOptions: ISprintCapacityOptions;
    showAddUserCallout: boolean;
    teamIteration: Iteration;
    focusDetails?: ICapacityGridFocusDetails;
    asyncOperationStatus?: IAsyncOperationStatus;
    showNoUserAddedMessage: boolean;
    fieldAggregator: FieldAggregator;
    teamCapacityModel: TeamCapacityModel;
    loadingWorkDetailsData: boolean;
    exceptionsInfo: ExceptionInfo[];
    workDetailsExceptionInfo: ExceptionInfo[];
    rightPanelId: string;
}

export interface IAddRemoveActivityPayload {
    user: IUser;
    index: number;
}

export interface IUpdateActivityPayload {
    user: IUser;
    index: number;
    activity: IActivity;
}

export interface IUpdateUserDaysOffPayload {
    user: IUser;
    daysOff: IDaysOff[];
}

export interface ICapacityGridRow {
    userCapacity: IUserCapacity;
    index: number;
}

export interface ICapacityActionContext {
    pivotContext: ISprintViewPivotContext;
    onAddNewItem: (ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, action?: IUserAction) => void;
    onSaveCapacity: () => void;
    onUndoChanges: () => void;
    onAddMissingTeamMembers: () => void;
    onCopyCapacity: () => void;
}

export interface ICapacityGridFocusDetails {
    teamMember: IUser;
    focusDaysOff: boolean;
    focusedActivityIndex: number;
}