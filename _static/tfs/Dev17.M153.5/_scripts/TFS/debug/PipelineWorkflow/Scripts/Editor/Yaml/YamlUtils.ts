import { PipelineDefinition } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { PipelineProcessTypes, YamlFileSourceTypes, YamlPipelineProcessResources } from "ReleaseManagement/Core/Contracts";
import * as EditorModels from "PipelineWorkflow/Scripts/Editor/Common/EditorModels";

export class YamlUtils {
    public static getEmptyYamlDefinition(): PipelineDefinition {
        let pipelineDefinition = new EditorModels.ReleaseDefinitionModel("New Yaml Pipeline");
        pipelineDefinition.path = AllDefinitionsContentKeys.PathSeparator;
        pipelineDefinition.pipelineProcess = {
            type: PipelineProcessTypes.Yaml,
            filename: "",
            fileSource: {
                type: YamlFileSourceTypes.TFSGit,
                sourceReference: {
                    "RepositoryId": {
                        id: "",
                        name: ""
                    },
                    "Branch": {
                        id: "",
                        name: ""
                    },
                    "ProjectId": {
                        id: "",
                        name: ""
                    }
                }
            },
            errors: [],
            resources: {

            } as YamlPipelineProcessResources
        };

        return pipelineDefinition;
    }
}