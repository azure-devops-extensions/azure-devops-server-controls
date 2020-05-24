import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import * as Q from "q";

import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { IBuildDefinitionProperties } from "PipelineWorkflow/Scripts/Common/Types";
import { BuildServiceClient } from "PipelineWorkflow/Scripts/ServiceClients/BuildServiceClient";

import { BuildDefinition } from "TFS/Build/Contracts";

/**
 * @brief Source for VSTSBuildArtifact
 */
export class VSTSBuildArtifactSource extends SourceBase {

    constructor() {
        super();
        this._projectTagsMap = {};
        this._buildServiceClient = ServiceClientManager.GetServiceClient<BuildServiceClient>(BuildServiceClient);
    }

    public static getKey(): string {
        return "VSTSBuildArtifactSource";
    }

    public static instance(): VSTSBuildArtifactSource {
        return SourceManager.getSource(VSTSBuildArtifactSource);
    }

    public getProjectTags(projectId: string): IPromise<string[]> {
        if (!this._projectTagsMap[projectId]) {
            this._projectTagsMap[projectId] = this._buildServiceClient.getProjectTags(projectId);
        }
        return this._projectTagsMap[projectId];
    }

    public getBuildDefinitionProperties(definitionId: number, projectId: string, useOlderVersionApi?: boolean): IPromise<IBuildDefinitionProperties> {
        let defer = Q.defer<IBuildDefinitionProperties>();
        this._buildServiceClient.getDefinition(definitionId, projectId, useOlderVersionApi).then((buildDefinition: BuildDefinition) => {
            if (buildDefinition && buildDefinition.repository) {
                defer.resolve({
                    repositoryId: buildDefinition.repository.id,
                    repositoryType: buildDefinition.repository.type
                });
            }

        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    public getBuildDefinition(definitionId: number, projectId: string): IPromise<BuildDefinition> {
        let defer = Q.defer<BuildDefinition>();
        this._buildServiceClient.getDefinition(definitionId, projectId).then((buildDefinition: BuildDefinition) => {
            if (buildDefinition && buildDefinition.repository) {
                defer.resolve(buildDefinition);
            }

        }, (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    private _projectTagsMap: IDictionaryStringTo<IPromise<string[]>>;
    private _buildServiceClient: BuildServiceClient;
}
