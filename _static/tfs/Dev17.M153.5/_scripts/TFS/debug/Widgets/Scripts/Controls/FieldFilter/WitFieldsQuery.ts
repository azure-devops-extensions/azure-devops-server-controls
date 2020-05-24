
import * as Q from "q";
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery"

import Service = require("VSS/Service");
import { QueryAdapter } from "WorkItemTracking/Scripts/OM/QueryAdapter";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { ProjectCollection } from 'Presentation/Scripts/TFS/TFS.OM.Common';
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

/** WIT Legacy query for WIT Metadata scoped in a project.  */

export class WitFieldsQuery implements ICacheableQuery<WITOM.FieldDefinition[]> {
    private connection: Service.VssConnection;

    constructor(projectId: string) {
        let context = TFS_Host_TfsContext.TfsContext.getDefault();
        context.contextData.project.id = projectId;
        this.connection = ProjectCollection.getConnection(context);
    }

    public getKey(): string {
        let context = this.connection.getWebContext();
        return `${this.getQueryName()}.${context.project.id}`;
    }

    public getQueryName(): string {
        return "WitMetadataQuery";
    }

    public runQuery(): IPromise<WITOM.FieldDefinition[]> {
        let fieldsPromise = Q.defer<WITOM.FieldDefinition[]>();
        let queryAdapter = this.connection.getService<QueryAdapter>(QueryAdapter);
        queryAdapter.beginEnsureFields((fields: WITOM.FieldDefinition[]) => {
            fieldsPromise.resolve(fields);
        }, (error) => {
            fieldsPromise.reject(error);
        });
        return fieldsPromise.promise;
    }
}