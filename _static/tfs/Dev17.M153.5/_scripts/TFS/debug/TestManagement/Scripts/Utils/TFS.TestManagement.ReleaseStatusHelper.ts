import * as RMContracts from "ReleaseManagement/Core/Contracts";

export enum ComputedReleaseStatus {
    Undefined = 0,
    Draft = 1,
    InProgress = 2,
    Completed = 3,
    Abandoned = 4
}

export interface IReleaseStatusToComputedStatusMap {
    // Cannot use enum types in mapping. Hence using number.
    [releaseStatus: number]: number;
}

export interface IComputedStatusToReleaseStatusMap {
    // Cannot use enum types in mapping. Hence using number.
    [computedReleaseStatus: number]: number;
}

// TODO 1179685: Port to Common/Utils folder
export class ReleaseStatusHelper {
    public static getComputedReleaseStatus(release: RMContracts.Release): ComputedReleaseStatus {

        if (ReleaseStatusHelper._releaseStatusMap[release.status] === undefined) {
            return ReleaseStatusHelper._isReleaseRunning(release.environments) ? ComputedReleaseStatus.InProgress : ComputedReleaseStatus.Completed;
        }

        return ReleaseStatusHelper._releaseStatusMap[release.status];
    }

    private static _isReleaseRunning(environments: RMContracts.ReleaseEnvironment[]): boolean {
        if (!environments) {
            return false;
        }

        return environments.some((env: RMContracts.ReleaseEnvironment) => {
            return env.status === RMContracts.EnvironmentStatus.Queued || env.status === RMContracts.EnvironmentStatus.InProgress;
        });
    }

    private static _initialize() {
        if (!ReleaseStatusHelper._releaseStatusMap) {
            ReleaseStatusHelper._releaseStatusMap = <IReleaseStatusToComputedStatusMap>{};
            ReleaseStatusHelper._releaseStatusMap[RMContracts.ReleaseStatus.Undefined] = ComputedReleaseStatus.Undefined;
            ReleaseStatusHelper._releaseStatusMap[RMContracts.ReleaseStatus.Draft] = ComputedReleaseStatus.Draft;
            ReleaseStatusHelper._releaseStatusMap[RMContracts.ReleaseStatus.Abandoned] = ComputedReleaseStatus.Abandoned;
        }

        if (!ReleaseStatusHelper._computedStatusToReleaseStatusMap) {
            ReleaseStatusHelper._computedStatusToReleaseStatusMap = <IComputedStatusToReleaseStatusMap>{};
            ReleaseStatusHelper._computedStatusToReleaseStatusMap[ComputedReleaseStatus.Undefined] = RMContracts.ReleaseStatus.Undefined;
            ReleaseStatusHelper._computedStatusToReleaseStatusMap[ComputedReleaseStatus.Draft] = RMContracts.ReleaseStatus.Draft;
            ReleaseStatusHelper._computedStatusToReleaseStatusMap[ComputedReleaseStatus.Abandoned] = RMContracts.ReleaseStatus.Abandoned;
            ReleaseStatusHelper._computedStatusToReleaseStatusMap[ComputedReleaseStatus.InProgress] = RMContracts.ReleaseStatus.Active;
            ReleaseStatusHelper._computedStatusToReleaseStatusMap[ComputedReleaseStatus.Completed] = RMContracts.ReleaseStatus.Active;
        }

        // Returning null is required as we want to mimic static constructor and we are fooling
        // that toInit is being initialize with this function call.
        return null;
    }

    private static _releaseStatusMap: IReleaseStatusToComputedStatusMap;
    private static _computedStatusToReleaseStatusMap: IComputedStatusToReleaseStatusMap;
    private static toInit: any = ReleaseStatusHelper._initialize();
}