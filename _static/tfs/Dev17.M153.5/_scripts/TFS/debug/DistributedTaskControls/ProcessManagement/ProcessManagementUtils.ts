import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";

export class ProcessManagementUtils {

    public static isCapabilitySupported(capabilities: ProcessManagementCapabilities, capability: ProcessManagementCapabilities): boolean {
        return (capabilities & capability) === capability;
    }
}