import { WorkflowTask, DeploymentAttempt, DeployPhaseStatus, DeployPhaseTypes, ManualIntervention, ManualInterventionStatus, ReleaseDeployPhase, ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class ManualInterventionHelper {
    public static getPendingManualInterventionInEnvironment(environment: ReleaseEnvironment): ManualIntervention {
        if (!environment || !environment.deploySteps || environment.deploySteps.length <= 0) {
            return null;
        }

        const latestDeployment = this.getLatestDeploymentAttempt(environment.deploySteps);
        const deployPhases = latestDeployment ? latestDeployment.releaseDeployPhases : [];

        return this.getFirstInterventionWithStatusInPhasesWithStatus(deployPhases, DeployPhaseStatus.InProgress, ManualInterventionStatus.Pending);
    }

    public static getLatestDeploymentAttempt(deploySteps: DeploymentAttempt[]): DeploymentAttempt {
        // TODO :: duplicate code, need refactor.
        if (!deploySteps || deploySteps.length <= 0) {
            return null;
        }

        const latestAttempt = Math.max(...deploySteps.map(deployStep => deployStep.attempt));
        return deploySteps.find(deployStep => deployStep.attempt === latestAttempt);
    }

    public static getFirstInterventionWithStatusInPhasesWithStatus(phases: ReleaseDeployPhase[], phaseStatus: DeployPhaseStatus, miStatus: ManualInterventionStatus): ManualIntervention {
        const phasesWithStatus = (this.getPhasesWithManualInterventions(phases) || []).filter(phase => phase && phase.status === phaseStatus);
        for (const phaseWithStatus of phasesWithStatus) {
            const manualIntervention = phaseWithStatus.manualInterventions.find(mi => mi && mi.status === miStatus);
            if (manualIntervention) {
                return manualIntervention;
            }
        }

        return null;
    }

    public static getManualInterventionByIdInEnvironment(releaseEnvironment: ReleaseEnvironment, manualInterventionId: number): ManualIntervention {
        const deploySteps = releaseEnvironment ? releaseEnvironment.deploySteps || [] : [];
        for (const deployStep of deploySteps) {
            const filteredPhases = this.getPhasesWithManualInterventions(deployStep && deployStep.releaseDeployPhases ? deployStep.releaseDeployPhases : []);
            for (const filteredPhase of filteredPhases) {
                const manualIntervention = filteredPhase.manualInterventions.find(mi => mi.id === manualInterventionId);
                if (manualIntervention) {
                    return manualIntervention;
                }
            }
        }

        return null;
    }

    public static getPhasesWithManualInterventions(phases: ReleaseDeployPhase[]): ReleaseDeployPhase[] {
        return (phases || []).filter(phase => phase && phase.phaseType === DeployPhaseTypes.RunOnServer && phase.manualInterventions && phase.manualInterventions.length > 0);
    }
}