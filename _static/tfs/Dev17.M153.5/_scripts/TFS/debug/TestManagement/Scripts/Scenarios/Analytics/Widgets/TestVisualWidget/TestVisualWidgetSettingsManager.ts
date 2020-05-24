import Q = require("q");

import { CustomSettings } from "TFS/Dashboards/WidgetContracts";
import { SettingsManagerBase } from "Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase";
import { TestVisualWidgetSettings, TestVisualWidgetSettingsSerializer } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetSettings";

import * as TCMContracts from "TFS/TestManagement/Contracts";
import { TestVisualConfigDataManager } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualConfigDataManager";
import { TestVisualWidgetConstants } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetConstants";

/**
 * Encapsulates responsability of initializing and recognizing well formed settings for this Widget Type.
 */
export class TestVisualWidgetSettingsManager extends SettingsManagerBase<TestVisualWidgetSettings> {
    public getFeatureName(): string {
        return TestVisualWidgetConstants.featureName;
    }

    /**
     * Performs neccessary legwork to produce default Settings, if possible.
     */
    public generateDefaultSettings(): IPromise<TestVisualWidgetSettings> {
        return Q(this.generateDefaultSettingsImpl());
    }

    private generateDefaultSettingsImpl(): IPromise<TestVisualWidgetSettings> {
        return new TestVisualConfigDataManager().getDefinitions().then((buildDefinitions) => {
            const firstDefinitionId = (buildDefinitions != null && buildDefinitions[0] != null) ? buildDefinitions[0].BuildDefinitionId : null;
            let settings = {
                contextType: TCMContracts.TestResultsContextType.Build,
                definitionId: firstDefinitionId, //Use first available Definition
            } as TestVisualWidgetSettings;
            return settings;
        });
    }

    /**
     * Packs custom settings in form expected by framework "CustomSettings" interface
     */
    public static formatAsCustomSettings(settings: TestVisualWidgetSettings): CustomSettings {
        return { data: TestVisualWidgetSettingsSerializer.serialize(settings) };
    }
}