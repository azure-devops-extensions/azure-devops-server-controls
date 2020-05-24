import * as TFS_AgileCommon from 'Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon';
import { TfsContext } from 'Presentation/Scripts/TFS/TFS.Host.TfsContext';
import * as TFS_OM_Common from 'Presentation/Scripts/TFS/TFS.OM.Common';
import Q = require('q');
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery"

/** Expresses Agile Process Config REST Api as cacheable query.  */
export class ProjectProcessConfigurationQuery implements ICacheableQuery<TFS_AgileCommon.ProjectProcessConfiguration>{

    private projectId: string;

    constructor(projectId?: string) {
        if (projectId == null) {
            let contextData = TfsContext.getDefault().contextData;
            this.projectId = contextData.project.id;
        } else {
            this.projectId = projectId;
        }
    }

    public getKey(): string {
        return this.getQueryName() + '.' + this.projectId;
    }

    public getQueryName(): string {
        return "ProjectProcessConfigurationQuery";
    }

    public runQuery(): IPromise<TFS_AgileCommon.ProjectProcessConfiguration> {

        var deferred = Q.defer<TFS_AgileCommon.ProjectProcessConfiguration>();

        TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TFS_AgileCommon.ProjectProcessConfigurationService>(TFS_AgileCommon.ProjectProcessConfigurationService).beginGetProcessSettings(
            (processSettings: TFS_AgileCommon.ProjectProcessConfiguration) => {
                deferred.resolve(processSettings);
            },
            (e) => {
                deferred.reject(e);
            });

        return deferred.promise;
    }
}