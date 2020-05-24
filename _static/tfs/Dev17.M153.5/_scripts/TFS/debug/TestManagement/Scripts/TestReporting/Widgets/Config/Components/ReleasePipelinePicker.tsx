import { getId } from 'OfficeFabric/Utilities';

import { Release } from 'Widgets/Scripts/DataServices/ConfigurationQueries/Release';

import { PipelinePickerBase } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/PipelinePickerBase';
import { withPipelinesConfigContext } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesContext";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { Workflow } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';

export const ReleasePipelinePicker = withPipelinesConfigContext(
    class extends PipelinePickerBase {

        componentDidMount() {
            this.props.pipelinesContext.actionCreator.demandReleasePipelines();
        }

        protected getLabelId(): string {
            return getId('release-pipeline-picker');
        }

        protected getLabelText(): string {
            return Resources.ReleaseDefinitionTextPlural;
        }

        protected getRowLabelText(): string {
            return Resources.ReleaseDefinitionText;
        }

        protected getValue(): Release[] {
            return this.configProperties[this.props.propertyName];
        }

        protected getPipelineKey(item: Release): string {
            return String(item.ReleaseDefinitionId);
        }

        protected getDefinitions(): { [key: string]: Release } {
            return this.pipelinesSelector.getReleasePipelines(this.configProperties);
        }

        protected getDefaultPropertyName(): string {
            return "ms.azdev.pipelines.components.release-pipelines-picker";
        }

        protected isLoading(): boolean {
            return !this.pipelinesSelector.isReleasePipelinesLoaded(this.configProperties);
        }

        protected getWorkflow(): Workflow {
            return Workflow.Release;
        }
    }
);