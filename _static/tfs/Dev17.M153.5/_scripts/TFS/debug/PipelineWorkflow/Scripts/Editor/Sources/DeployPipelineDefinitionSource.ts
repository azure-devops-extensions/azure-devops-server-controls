/**
* @brief Source for functionality related to Pipeline Definition
*/
import * as Q from "q";

import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { IReleaseDefinitionsResult, PipelineDefinition, PipelineDefinitionRevision, PipelineSettings, ReleaseDefinitionQueryOrder } from "PipelineWorkflow/Scripts/Common/Types";
import { TemplateConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as VSS_Context from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
/**
 * @brief Source for DeployPipeline definition
 */
export class DeployPipelineDefinitionSource extends ReleaseManagementSourceBase {

    constructor() {
        super();
        this._getEnvironmentTemplatePromise = {};
    }

    public static getKey(): string {
        return "DeployPipelineDefinitionSource";
    }

    public get(definitionId: number, forceFetch: boolean = false, projectName?: string): IPromise<PipelineDefinition> {
        projectName = projectName || VSS_Context.getDefaultWebContext().project.name;
        const key = Utils_String.format("{0}:{1}", projectName, definitionId);
        if (!this._getDefinitionPromise[key] || forceFetch) {
            let preFetchedDefinition = ReleaseEditorWebPageDataHelper.instance().getReleaseDefinition();
            if (!forceFetch && preFetchedDefinition && preFetchedDefinition.id === definitionId) {
                this._getDefinitionPromise[key] = Q.resolve(preFetchedDefinition);
                return this._getDefinitionPromise[key];
            }
            else {
                return (<IPromise<PipelineDefinition>>this.getClient().getDefinition(definitionId, projectName) as IPromise<PipelineDefinition>).then((releaseDefinition: PipelineDefinition) => {
                    this._getDefinitionPromise[key] = Q.resolve(releaseDefinition);
                    return this._getDefinitionPromise[key];
                }, (error: any) => {
                    return Q.reject(error);
                });
            }
        }
        return this._getDefinitionPromise[key];
    }

    public create(definition: PipelineDefinition): IPromise<PipelineDefinition> {
        return this.getClient().createDefinition(definition).then((savedDefinition: PipelineDefinition) => {
            ReleaseEditorWebPageDataHelper.instance().updateReleaseDefinition(savedDefinition);
            return Q.resolve(savedDefinition);
        });
    }

    public save(definition: PipelineDefinition): IPromise<PipelineDefinition> {
        return this.getClient().saveDefinition(definition).then((savedDefinition: PipelineDefinition) => {
            ReleaseEditorWebPageDataHelper.instance().updateReleaseDefinition(savedDefinition);
            return Q.resolve(savedDefinition);
        });
    }

    public getSettings(): IPromise<PipelineSettings> {
        let preFetchedSettings = ReleaseEditorWebPageDataHelper.instance().getReleaseSettings();
        if (preFetchedSettings) {
            return Q.resolve(preFetchedSettings);
        }
        else {
            return this.getClient().getSettings();
        }
    }

    public getEnvironmentTemplate(templateId: string): IPromise<RMContracts.ReleaseDefinitionEnvironmentTemplate> {
        let prefetchedEmptyTemplate = ReleaseEditorWebPageDataHelper.instance().getEmptyEnvironmentTemplate();
        if (templateId === TemplateConstants.EmptyTemplateGuid && !!prefetchedEmptyTemplate) {
            return Q.resolve(prefetchedEmptyTemplate);
        }

        if (!this._getEnvironmentTemplatePromise[templateId]) {
            this._getEnvironmentTemplatePromise[templateId] = this.getClient().getEnvironmentTemplate(templateId);
        }

        return this._getEnvironmentTemplatePromise[templateId];
    }

    public getDefinitionRevisions(definitionId: number): IPromise<PipelineDefinitionRevision[]> {
        return this.getClient().getDefinitionRevisions(definitionId);
    }

    public static instance(): DeployPipelineDefinitionSource {
        return SourceManager.getSource(DeployPipelineDefinitionSource);
    }

    public getDefinitionRevision(definitionId: number, revision: number): IPromise<string> {
        return this.getClient().getDefinitionRevision(definitionId, revision);
    }

    public saveWithApiVersion(definition: PipelineDefinition, apiversion: string): IPromise<PipelineDefinition> {
        return this.getClient().saveDefinitionUsingApiVersion(definition, apiversion).then((savedDefinition: PipelineDefinition) => {
            ReleaseEditorWebPageDataHelper.instance().updateReleaseDefinition(savedDefinition);
            return Q.resolve(savedDefinition);
        });
    }

    public getReleaseDefinitions(searchText: string): IPromise<IReleaseDefinitionsResult> {
        return this.getClient().getReleaseDefinitions(searchText, null, null, null, ReleaseDefinitionQueryOrder.NameAscending);
    }

    public getReleaseDefinitionsForArtifactSource(
        artifactType: string,
        artifactSourceId: string,
        expand?: RMContracts.ReleaseDefinitionExpands,
        releaseProjectName?: string): IPromise<RMContracts.ReleaseDefinition[]> {
            releaseProjectName = releaseProjectName || VSS_Context.getDefaultWebContext().project.name;
            if (artifactSourceId !== this._artifactSourceId){
                this._artifactSourceId = artifactSourceId;
                this._getReleaseDefinitionsForArtifactSourcePromise = {};
            }
            if (!this._getReleaseDefinitionsForArtifactSourcePromise[releaseProjectName]){
                return this.getClient().getReleaseDefinitionsForArtifactSource(artifactType, artifactSourceId, expand, releaseProjectName).then((data: RMContracts.ReleaseDefinition[])  => {
                    this._getReleaseDefinitionsForArtifactSourcePromise[releaseProjectName] = Q.resolve(data);
                    return this._getReleaseDefinitionsForArtifactSourcePromise[releaseProjectName];
                });
            }
            return this._getReleaseDefinitionsForArtifactSourcePromise[releaseProjectName];
        }
    private _getEnvironmentTemplatePromise: IDictionaryStringTo<IPromise<RMContracts.ReleaseDefinitionEnvironmentTemplate>>;
    private _getDefinitionPromise: IDictionaryStringTo<IPromise<PipelineDefinition>> = {};
    private _getReleaseDefinitionsForArtifactSourcePromise: IDictionaryStringTo<IPromise<RMContracts.ReleaseDefinition[]>> = {};
    private _artifactSourceId = Utils_String.empty;
}
