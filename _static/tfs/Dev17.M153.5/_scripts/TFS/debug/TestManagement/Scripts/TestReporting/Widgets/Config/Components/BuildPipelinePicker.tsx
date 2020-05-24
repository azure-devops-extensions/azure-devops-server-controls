import { getId } from 'OfficeFabric/Utilities';

import { BuildDefinition } from 'Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition';

import { PipelinePickerBase } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/PipelinePickerBase';
import { withPipelinesConfigContext } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';

export const BuildPipelinePicker = withPipelinesConfigContext(
    class extends PipelinePickerBase {

        componentDidMount() {
            this.props.pipelinesContext.actionCreator.demandBuildPipelines();
        }

        protected getLabelId(): string {
            return getId('build-pipeline-picker');
        }

        protected getLabelText(): string {
            return Resources.BuildDefinitionTextPlural;
        }

        protected getRowLabelText(): string {
            return Resources.BuildDefinitionText;
        }

        protected getValue(): BuildDefinition[] {
            return this.configProperties[this.props.propertyName];
        }

        protected getPipelineKey(item: BuildDefinition): string {
            return String(item.BuildDefinitionId);
        }

        protected getDefinitions(): { [key: string]: BuildDefinition } {
            return this.pipelinesSelector.getBuildPipelines(this.configProperties);
        }

        protected getDefaultPropertyName(): string {
            return "ms.azdev.pipelines.components.build-pipelines-picker";
        }

        protected isLoading(): boolean {
            return !this.pipelinesSelector.isBuildPipelinesLoaded(this.configProperties);
        }

        protected getWorkflow(): Workflow {
            return Workflow.Build;
        }
    }
);