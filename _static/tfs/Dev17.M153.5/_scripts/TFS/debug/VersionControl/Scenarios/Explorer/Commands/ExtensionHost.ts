/**
 * Interface to communicate an extension with the host page.
 */
export interface IExtensionHost {
    /**
     * Display message in the page notification bar.
     */
    notify(message: string, specialType: string): void;

    /**
     * Publish a telemetry event from this extension.
     */
    publishTelemetryEvent(feature: string, extraProperties?: IDictionaryStringTo<any>): void;
}
