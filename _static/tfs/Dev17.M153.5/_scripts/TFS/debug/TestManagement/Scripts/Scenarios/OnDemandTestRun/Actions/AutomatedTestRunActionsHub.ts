import { Action } from "VSS/Flux/Action";
import { Build } from "TFS/Build/Contracts";
import { ReleaseDefinition, ReleaseDefinitionEnvironment } from "ReleaseManagement/Core/Contracts";

export interface IAutomatedTestRunOptions {
    selectedPlan: any;
    automatedTestPointIds: number[];
    selectedBuild: Build;
    selectedReleaseDefinition: ReleaseDefinition;
    selectedReleaseEnvironmentId: number;
}

export interface IReleaseCreationInfo {
    releaseUrl: string;
    releaseName: string;
    testRunUrl: string;
}

export interface ICapabilitiesCheckCompletedPayload {
    success: boolean;
    reason?: string;
}

/**
 * A container for the current instances of the actions that can be triggered from Validation Dialog
 */
export class AutomatedTestRunActionsHub{
    public automatedTestsDiscovering = new Action<void>();
    public automatedTestsDiscovered = new Action<number>();
    public releaseEnvironmentTestRunCapabilitiesCheckStarted = new Action<void>();
    public releaseEnvironmentTestRunCapabilitiesCheckCompleted = new Action<ICapabilitiesCheckCompletedPayload>();
    public triggeringRelease = new Action<void>();
    public triggeredRelease = new Action<IReleaseCreationInfo>();
    public triggeringReleaseError = new Action<string>();
    public closeDialog = new Action<void>();
}
