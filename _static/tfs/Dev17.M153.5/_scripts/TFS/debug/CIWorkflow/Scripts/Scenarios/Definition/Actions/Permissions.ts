import { Action } from "VSS/Flux/Action";
import { PermissionEvaluation } from "VSS/Security/Contracts";

// permissions
export const permissionsRetrieved = new Action<PermissionEvaluation[]>();