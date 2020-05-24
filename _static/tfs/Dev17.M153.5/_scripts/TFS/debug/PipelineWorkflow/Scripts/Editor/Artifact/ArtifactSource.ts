import Q = require("q");

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";
import { PipelineArtifactDefinition, PipelineArtifactTypeDefinition, PipelineArtifactVersionQueryResult } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseEditorWebPageDataHelper } from "PipelineWorkflow/Scripts/Editor/Sources/ReleaseEditorWebPageData";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as RMConstants from "ReleaseManagement/Core/Constants";
import * as RMContracts from "ReleaseManagement/Core/Contracts";
import * as Types from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";
import * as VSSContext from "VSS/Context";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
/**
 * @brief Source for DeployPipeline definition
 */
export class ArtifactSource extends ReleaseManagementSourceBase {

    public static artifactsDataSourceType: string = "artifacts";
    public static artifactItemsDataSourceType: string = "artifactItems";

    public static getKey(): string {
        return "ArtifactSource";
    }

    public postInputValuesQuery(inputValuesQuery: Contracts_FormInput.InputValuesQuery): IPromise<Contracts_FormInput.InputValuesQuery> {
        return this.getClient().postInputValuesQuery(inputValuesQuery);
    }

    public getArtifactTypesDefinition(): IPromise<PipelineArtifactTypeDefinition[]> {
        if (!this._artifactTypesDefinitionPromise) {
            this._artifactTypesDefinitionPromise = this.getClient().getArtifactTypesDefinition();
        }

        return this._artifactTypesDefinitionPromise;
    }

    public getPreFetchedArtifactTypeDefinitions(): PipelineArtifactTypeDefinition[] {
        return ReleaseEditorWebPageDataHelper.instance().getArtifactTypeDefinitions();
    }

    public getDefinitionArtifactsVersions(rdId: number, forceFetch: boolean = false, projectName?: string): IPromise<PipelineArtifactVersionQueryResult> {
        projectName = projectName || VSSContext.getDefaultWebContext().project.name;
        const key = Utils_String.format("{0}:{1}", projectName, rdId);
        if (!this._getDefinitionArtifactVersionsPromise[key] || forceFetch) {
            return this.getClient().getDefinitionArtifactsVersions(rdId, projectName).then((data: PipelineArtifactVersionQueryResult) => {
                this._getDefinitionArtifactVersionsPromise[key] = Q.resolve(data);
                return this._getDefinitionArtifactVersionsPromise[key];
            });
        }
        return this._getDefinitionArtifactVersionsPromise[key];
    }

    public getArtifactsVersion(artifacts: PipelineArtifactDefinition[]): IPromise<PipelineArtifactVersionQueryResult> {
        return this.getClient().getArtifactsVersion(artifacts);
    }

    public getArtifactVersionDetails(artifact: RMContracts.Artifact, version: string): Q.Promise<RMContracts.BuildVersion> {
        let deferred: Q.Deferred<RMContracts.BuildVersion> = Q.defer<RMContracts.BuildVersion>();
        if (artifact && artifact.definitionReference && version) {

            // we are going to make a inputvaluequery for the inputId id defaultVersionSpecific . Make a clone of artifact object for this purpose.
            // If we are not deep cloning it, the existing artifact would have new field in it.
            let clonedArtifact: RMContracts.Artifact = JQueryWrapper.extendDeep({}, artifact);
            let currentValues: { [key: string]: string; } = {};

            // Attach the detail of version that we want to fetch
            clonedArtifact.definitionReference[RMConstants.ArtifactDefinitionConstants.DefaultVersionSpecificId] = { id: version, name: version };

            // Insert all key associated with defintion reference to query input
            for (let key in clonedArtifact.definitionReference) {
                currentValues[key] = clonedArtifact.definitionReference[key].id;
            }

            currentValues[Types.ArtifactDefaultVersionConstants.DefaultVersionType] = Types.ArtifactDefaultVersionConstants.SpecificVersion;

            // Add project info if not allready present in defintion reference
            if (!clonedArtifact.definitionReference[RMConstants.ArtifactDefinitionConstants.ProjectId]) {
                const webContext = VSSContext.getDefaultWebContext();
                currentValues[RMConstants.ArtifactDefinitionConstants.ProjectId] = webContext.project.id;
            }

            let query: Contracts_FormInput.InputValuesQuery = <Contracts_FormInput.InputValuesQuery>{
                currentValues: currentValues,
                inputValues: [{ inputId: Types.ArtifactDefaultVersionConstants.DefaultVersionSpecific }],
                resource: clonedArtifact.type
            };

            this.postInputValuesQuery(query).then((result: Contracts_FormInput.InputValuesQuery) => {
                // Create build version from response
                let buildVersion: RMContracts.BuildVersion = this._createBuildVersionFromResult(result, version);
                deferred.resolve(buildVersion);
              }, (error) => {
                deferred.reject(error);
              });
        } else {
            deferred.reject(Resources.InvalidParmetersMessage);
        }

        return deferred.promise;
    }

    public static instance(): ArtifactSource {
        return SourceManager.getSource(ArtifactSource);
    }

    private _createBuildVersionFromResult(result: Contracts_FormInput.InputValuesQuery, version: string): RMContracts.BuildVersion {
        let buildVersion: RMContracts.BuildVersion = <RMContracts.BuildVersion>{};

        if (!!result && result.inputValues && result.inputValues.length > 0) {
            let inputValue: Contracts_FormInput.InputValues = result.inputValues[0];

            if (!!inputValue && inputValue.possibleValues && inputValue.possibleValues.length > 0) {
                let possibleValue = Utils_Array.first(inputValue.possibleValues, (artifactVersion): boolean => {
                    return Utils_String.localeIgnoreCaseComparer(artifactVersion.displayValue, version) === 0;
                });
                possibleValue = possibleValue || inputValue.possibleValues[0];

            if (possibleValue && possibleValue.data) {
              buildVersion.id = possibleValue.value;
              buildVersion.name = possibleValue.displayValue;
              buildVersion.definitionId = possibleValue.data[RMConstants.BuildVersionConstants.DefinitionIdKey];
              buildVersion.definitionName = possibleValue.data[RMConstants.BuildVersionConstants.DefinitionNameKey];
              buildVersion.sourceBranch = possibleValue.data[RMConstants.BuildVersionConstants.SourceBranchKey];
              buildVersion.sourceVersion = possibleValue.data[RMConstants.BuildVersionConstants.SourceVersionKey];
              buildVersion.sourceRepositoryId = possibleValue.data[RMConstants.BuildVersionConstants.RepositoryIdKey];
              buildVersion.sourceRepositoryType = possibleValue.data[RMConstants.BuildVersionConstants.RepositoryTypeKey];
            }
          }
        }
        return buildVersion;
    }

    private _artifactTypesDefinitionPromise: IPromise<PipelineArtifactTypeDefinition[]>;
    private _getDefinitionArtifactVersionsPromise: IDictionaryStringTo<IPromise<PipelineArtifactVersionQueryResult>> = {};
}
