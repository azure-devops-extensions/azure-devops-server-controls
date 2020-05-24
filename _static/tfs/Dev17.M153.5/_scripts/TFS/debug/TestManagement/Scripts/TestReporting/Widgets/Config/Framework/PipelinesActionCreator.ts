import { ConfigActionCreator } from "VSSPreview/Config/Framework/ConfigActionCreator";

import { PipelinesPropertyKeys } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesPropertyKeys";
import { PipelinesDataProvider } from "TestManagement/Scripts/TestReporting/Widgets/Config/Framework/PipelinesDataProvider";

import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

export class PipelinesActionCreator {
    private pipelinesDataProvider = new PipelinesDataProvider();

    constructor(private configActionCreator: ConfigActionCreator) {}

    public demandBuildPipelines(): void {
        this.pipelinesDataProvider.getBuildPipelines().then(
            buildPipelines => {
                this.configActionCreator.setProperty(PipelinesPropertyKeys.BuildPipelines, buildPipelines);
            },
            reason => {
                this.configActionCreator.handleError(Resources.ConfigLoadBuildPipelinesFailedMessage)
            }
        )
    }

    public demandReleasePipelines(): void {
        this.pipelinesDataProvider.getReleasePipelines().then(
            releasePipelines => {
                this.configActionCreator.setProperty(PipelinesPropertyKeys.ReleasePipelines, releasePipelines);
            },
            reason => {
                this.configActionCreator.handleError(Resources.ConfigLoadReleasePipelinesFailedMessage)
            }
        )
    }
}