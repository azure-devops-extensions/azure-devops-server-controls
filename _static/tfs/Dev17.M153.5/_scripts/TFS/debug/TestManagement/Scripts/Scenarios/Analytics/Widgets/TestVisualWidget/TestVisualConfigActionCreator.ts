import * as Service from "VSS/Service";
import { ConfigActionCreator } from "VSSPreview/Config/Framework/ConfigActionCreator";
import { TestVisualConfigDataManager } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualConfigDataManager";
import { BuildDefinitionStateAdapter } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/BuildDefinitionStateAdapter";

/**
 * Manages Configuration state.
 * Built over WidgetConfigActionCreator, which manages state as a loosely typed dictionary.
 */
export class TestVisualConfigActionCreator {
    private dataManager = new TestVisualConfigDataManager();
    constructor(private widgetConfigActionCreator: ConfigActionCreator) {}

    public demandBuilds(): void {
        this.dataManager.getDefinitions().then(
            projects => {
                BuildDefinitionStateAdapter.setBuilds(this.widgetConfigActionCreator, projects);                        
            },
            reason => {
                this.widgetConfigActionCreator.handleError(reason);
            }
        );
    }
}