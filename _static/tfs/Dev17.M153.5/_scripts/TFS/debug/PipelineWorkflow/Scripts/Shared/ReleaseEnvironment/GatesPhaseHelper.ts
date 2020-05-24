import { DeployPhase as SnapshotDeployPhase, DeployPhaseStatus, DeployPhaseTypes, GatesDeployPhase, GateStatus, ReleaseDefinitionGatesOptions, ReleaseDefinitionGatesStep, ReleaseDeployPhase, ReleaseGates, ReleaseGatesPhase } from "ReleaseManagement/Core/Contracts";

export class GatesPhaseHelper {
    public static getFirstInProgressReleaseGatesPhase(phases: ReleaseDeployPhase[]): ReleaseGatesPhase {
        return (phases || []).find(p => p && p.phaseType === DeployPhaseTypes.DeploymentGates && p.status === DeployPhaseStatus.InProgress) as ReleaseGatesPhase;
    }

    public static getFirstInProgressReleaseGatesPhaseAsReleaseGates(phases: ReleaseDeployPhase[]): ReleaseGates {
        const gatesPhase = this.getFirstInProgressReleaseGatesPhase(phases);
        if (gatesPhase) {
            return this.getReleaseGatesPhaseAsReleaseGates(gatesPhase as ReleaseGatesPhase);
        }

        return null;
    }

    public static getReleaseGatesPhaseAsReleaseGates(gatesPhase: ReleaseGatesPhase): ReleaseGates {
        if (gatesPhase) {
            return { ...gatesPhase, status: this._getGatesPhaseStatus(gatesPhase), lastModifiedOn: new Date() } as ReleaseGates;
        }

        return null;
    }

    public static getGatesPhaseSnapshotAsReleaseDefinitionGatesStep(gatesPhaseSnapshot: GatesDeployPhase): ReleaseDefinitionGatesStep {
        let gatesStep: ReleaseDefinitionGatesStep = null;
        if (gatesPhaseSnapshot) {
            const timeout = gatesPhaseSnapshot.deploymentInput ? gatesPhaseSnapshot.deploymentInput.timeoutInMinutes : 0;
            const options = { ...gatesPhaseSnapshot.deploymentInput, timeout: timeout, isEnabled: true } as ReleaseDefinitionGatesOptions;
            gatesStep = { id: 0, gatesOptions: options, gates: [] } as ReleaseDefinitionGatesStep;
            for (const workflow of gatesPhaseSnapshot.workflowTasks) {
                gatesStep.gates.push({ tasks: [workflow] });
            }
        }

        return gatesStep;
    }

    public static getFirstInProgressGatesPhaseSnapshotAsReleaseDefinitionGatesStep(phasesSnapshot: SnapshotDeployPhase[], deployPhases: ReleaseDeployPhase[]): ReleaseDefinitionGatesStep {
        const gatesPhase = this.getFirstInProgressReleaseGatesPhase(deployPhases);
        if (gatesPhase && phasesSnapshot && phasesSnapshot.length > 0) {
            const snapshot = phasesSnapshot.find(s => s.rank === gatesPhase.rank) || {};
            return this.getGatesPhaseSnapshotAsReleaseDefinitionGatesStep(snapshot as GatesDeployPhase);
        }

        return null;
    }

    private static _getGatesPhaseStatus(deployPhase: ReleaseDeployPhase): GateStatus {
        const phaseStatus = deployPhase ? deployPhase.status : DeployPhaseStatus.Undefined;
        switch (phaseStatus) {
            case DeployPhaseStatus.InProgress:
                return GateStatus.InProgress;

            case DeployPhaseStatus.PartiallySucceeded:
            case DeployPhaseStatus.Succeeded:
                return GateStatus.Succeeded;

            case DeployPhaseStatus.Failed:
                return GateStatus.Failed;

            case DeployPhaseStatus.Canceled:
            case DeployPhaseStatus.Cancelling:
                return GateStatus.Canceled;

            case DeployPhaseStatus.Skipped:
            case DeployPhaseStatus.NotStarted:
            case DeployPhaseStatus.Undefined:
            default:
                return GateStatus.Pending;
        }
    }
}