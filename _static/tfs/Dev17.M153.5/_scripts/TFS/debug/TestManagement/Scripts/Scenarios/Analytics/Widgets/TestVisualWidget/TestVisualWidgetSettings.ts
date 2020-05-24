import * as TCMContracts from "TFS/TestManagement/Contracts";

/**
 * Describes the configuration of the widget for use by view, config and pinning.
 */
export class TestVisualWidgetSettings {
    public definitionId: number;
    public contextType: TCMContracts.TestResultsContextType;
}

export class TestVisualWidgetSettingsSerializer {
    public static parse(settingsString: string): TestVisualWidgetSettings {
        return JSON.parse(settingsString) as TestVisualWidgetSettings;
    }

    public static serialize(settingsObject: TestVisualWidgetSettings): string {
        return JSON.stringify(settingsObject);
    }

    /**
     * Reports if supplied settings are valid/complete.
     */
    public static isValid(settingsObject: TestVisualWidgetSettings): boolean {
        return settingsObject != null &&
            settingsObject.contextType != null &&
            settingsObject.definitionId != null;
    }
}