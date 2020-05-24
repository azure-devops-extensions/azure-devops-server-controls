import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import * as WorkContracts from "TFS/WorkItemTracking/Contracts";

export interface IWorkCustomizationHubData {
    processes: IProcess[];
    fields: WorkContracts.WorkItemField[];
    allowedValues: IDictionaryStringTo<string[]>;
    controlContributionInputLimit: number;
    canCreateProcess: boolean;
}
