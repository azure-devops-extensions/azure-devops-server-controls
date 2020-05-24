import { Action } from "VSS/Flux/Action";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";


export var showCreateInheritedProcessAction = new Action<IProcess>();
export var clearCreateInheritedProcessAction = new Action<void>();