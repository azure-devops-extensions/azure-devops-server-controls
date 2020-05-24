import * as PipelineContracts from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as RMUtilsCore from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import * as DistributedTask_Common_Contracts from "TFS/DistributedTaskCommon/Contracts";
import * as VssContext from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
import * as WebApi_Contracts from "VSS/WebApi/Contracts";

export class ReleaseDefinitionModel implements PipelineContracts.PipelineDefinition {
    public id: number;
    public revision: number;
    public name: string;
    public description: string;
    public source: PipelineContracts.PipelineDefinitionSource_Type;
    public comment: string;
    public releaseNameFormat: string;
    public retentionPolicy: PipelineContracts.PipelineDefinitionRetentionPolicy;
    public createdOn: Date;
    public createdBy: WebApi_Contracts.IdentityRef;
    public modifiedOn: Date;
    public modifiedBy: WebApi_Contracts.IdentityRef;
    public isDeleted: boolean;
    public environments: PipelineContracts.PipelineDefinitionEnvironment[];
    public artifacts: PipelineContracts.PipelineArtifact[];
    public variables: { [key: string]: PipelineContracts.PipelineVariable; };
    public variableGroups: number[];
    public triggers: PipelineContracts.PipelineTriggerBase[];
    public url: string;
    public _links: any;
    public lastRelease : PipelineContracts.PipelineReference;
    public path: string;
    public tags: string[];
    public properties: any;
    public status: string;
    public pipelineProcess: PipelineContracts.PipelineProcess;
    public projectReference: PipelineContracts.ProjectReference;

    constructor(name: string, defaultEnvironment?: PipelineContracts.PipelineDefinitionEnvironment) {
        this.id = 0;
        this.name = name;
        this.source = PipelineContracts.PipelineDefinitionSource.UserInterface;
        this.comment = null;
        this.createdOn = new Date();
        this.createdBy = null;
        this.modifiedBy = null;
        this.modifiedOn = new Date();
        this.environments = [];
        this.artifacts = [];
        this.variables = {};
        this.variableGroups = [];
        this.triggers = [];
        this.lastRelease = null;
        this.tags = [];
    }
}

export class Artifact implements PipelineContracts.PipelineArtifact {
    public alias: string;
    public type: string;
    public definitionReference: { [key: string]: PipelineContracts.PipelineArtifactSourceReference; };
    public isPrimary: boolean;
    public sourceId: string; // obsolete
    public isRetained: boolean;

    public static create(artifact: PipelineContracts.PipelineArtifact): Artifact {
        let newArtifact: Artifact = new Artifact();

        if (artifact) {
            newArtifact.type = artifact.type;
            if (artifact.definitionReference) {
                newArtifact.definitionReference = artifact.definitionReference;
            }
            newArtifact.alias = artifact.alias;
            newArtifact.isPrimary = artifact.isPrimary;
        }

        return newArtifact;
    }

    public static createArtifact(definition: PipelineContracts.PipelineArtifactSourceReference, artifactType: PipelineContracts.PipelineArtifactTypes_Type, connection?: PipelineContracts.PipelineArtifactSourceReference, project?: PipelineContracts.PipelineArtifactSourceReference): PipelineContracts.PipelineArtifact {
        let definitionReference: { [key: string]: PipelineContracts.PipelineArtifactSourceReference } = {};

        switch (artifactType) {
            case PipelineContracts.PipelineArtifactTypes.Build:
                if (project) {
                    definitionReference[PipelineContracts.PipelineArtifactDefinitionConstants.ProjectId] = {
                        id: project.id,
                        name: project.name
                    };
                }
                else {
                    definitionReference[PipelineContracts.PipelineArtifactDefinitionConstants.ProjectId] = {
                        id: VssContext.getDefaultWebContext().project.id,
                        name: VssContext.getDefaultWebContext().project.name
                    };
                }

                // Set default artifact version to Latest for newly created RDs
                definitionReference[PipelineContracts.PipelineArtifactConstants.DefaultVersionType] = {
                    id: PipelineContracts.PipelineArtifactConstants.Latest,
                    name: Resources.DefaultArtifactLatestText
                };
                break;
            case PipelineContracts.PipelineArtifactTypes.JenkinsId:
                if (!!connection) {
                    definitionReference[PipelineContracts.PipelineArtifactDefinitionConstants.ConnectionId] = {
                        id: connection.id,
                        name: connection.name
                    };
                }
                break;
        }

        definitionReference[PipelineContracts.PipelineArtifactDefinitionConstants.DefinitionId] = {
            id: definition.id,
            name: definition.name
        };

        return {
            definitionReference: definitionReference,
            alias: this._getSanitizedAliasName(definition.name),
            type: artifactType,
            sourceId: "",
            isPrimary: false
        } as PipelineContracts.PipelineArtifact;
    }

    private static _getSanitizedAliasName(artifactDefinitionName: string): string {

        // TFVC repository Name starts with $/
        if (Utils_String.startsWith(artifactDefinitionName, PipelineContracts.PipelineStringConstants.TfvcRootId)) {
            artifactDefinitionName = artifactDefinitionName.substring(PipelineContracts.PipelineStringConstants.TfvcRootId.length);
        }

        // Github repo name contains /
        artifactDefinitionName = artifactDefinitionName.replace("/", "_");

        // Removing all other invalid characters from definition name
        return artifactDefinitionName.replace(/[\\/:*?"<>|]/g, "");
    }
}