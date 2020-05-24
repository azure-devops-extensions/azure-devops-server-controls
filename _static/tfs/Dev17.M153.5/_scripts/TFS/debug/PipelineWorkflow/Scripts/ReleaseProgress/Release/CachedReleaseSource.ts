import * as Q from "q";

import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { ReleaseProgressDataHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseProgressData";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

export class CachedReleaseSource extends ReleaseManagementSourceBase {

    public static getKey(): string {
        return "CachedReleaseSource";
    }

    public static instance(): CachedReleaseSource {
        return SourceManager.getSource(CachedReleaseSource);
    }

    public getRelease(releaseId: number, includeAllApprovals?: boolean, forceRefresh?: boolean): IPromise<ReleaseContracts.Release> {
        let preFetchedRelease = null;
        if (!forceRefresh) {
            preFetchedRelease = ReleaseProgressDataHelper.instance().getRelease();
        }

        // Return preFetchedRelease when releaseId is same as prefetched release id else make service call to get data
        if (preFetchedRelease && preFetchedRelease.id === releaseId) {
            return Q.resolve(preFetchedRelease);
        }
        else {
            return this.getClient().getRelease(releaseId, includeAllApprovals).then((release: ReleaseContracts.Release) => {
                ReleaseProgressDataHelper.instance().updateRelease(release);
                return Q.resolve(release);
            }, (error) => {
                return Q.reject(error);
            });
        }
    }

    public updateRelease(release: ReleaseContracts.Release): IPromise<ReleaseContracts.Release> {
        if (release && release.id > 0) {
            return this.getClient().updateRelease(release).then((release: ReleaseContracts.Release) => {
                ReleaseProgressDataHelper.instance().updateRelease(release);
                return Q.resolve(release);
            },
                (error) => {
                    return Q.reject(error);
                });
        } else {
            Q.reject(Resources.ReleaseIdInvalidError);
        }
    }

    public getReleaseForceUpdateDurationInSec(): number {
        return ReleaseProgressDataHelper.instance().getReleaseForceUpdateDurationInSec();
    }
}
