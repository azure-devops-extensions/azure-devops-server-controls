import Telemetry = require("VSS/Telemetry/Services");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export interface CustomerIntelligenceProperty {
    name: string;
    value: string;
}

/**
 * Provides a VC-specific wrapper around Telemetry events and methods for publishing CI data with consistent context
 * including the current View, Tab, and RepositoryId for each event.
 */
export class CustomerIntelligenceData extends Telemetry.TelemetryEventData {

    private _isPublished: boolean = false;

    public constructor() {
        super(CustomerIntelligenceConstants.VERSION_CONTROL_AREA, "", {});
    }

    /** Returns a new instance that includes a clone of this instance's properties. */
    public clone(): CustomerIntelligenceData {
        const clone = new CustomerIntelligenceData();
        clone.area = this.area;
        clone.feature = this.feature;
        clone.properties = $.extend({}, this.properties);
        return clone;
    }

    public isPublished() {
        return this._isPublished;
    }

    // Common published properties (others may be added directly the properties dictionary as needed)
    public getView(): string { return this.properties["View"] || ""; }
    public setView(view: string) { this.properties["View"] = view; }

    public getRepositoryId(): string { return this.properties["RepositoryId"] || ""; }
    public setRepositoryId(repositoryId: string) { this.properties["RepositoryId"] = repositoryId; }

    public getTab(): string { return this.properties["Tab"] || ""; }
    public setTab(tab: string) { this.properties["Tab"] = tab; }

    /**
     * Publish this event data with the given feature name.
     * @param feature the main feature name for telemetry
     * @param publishOnce if true (default) and reusing CustomerIntelligenceData objects, then do not publish this more than once
     * @param actionSource an optional name of the source of the action.  Examples: ContextMenu, Button, Toolbar, etc.
     * @param immediate if false (default) then queue for a batch call.  Set to true when page navigation will occur.
     * @param properties any additional property to add to telementary
     */
    public publish(feature: string, publishOnce: boolean = true, actionSource?: string, immediate: boolean = false, properties?: CustomerIntelligenceProperty[]) {
        const shouldPublish = !(publishOnce && this._isPublished);
        if (shouldPublish) {
            this.feature = feature;
            if (actionSource) {
                this.properties[CustomerIntelligenceConstants.ACTIONSOURCE] = actionSource;
            }

            if (properties) {
                for (const property of properties) {
                    this.properties[property.name] = property.value;
                }
            }            
            Telemetry.publishEvent(this, immediate);
            this._isPublished = true;
        }
    }

    /** Adds the Tab property and publishes for the first Tab viewing. This method might get moved to a BaseTab class in the future. */
    public static publishFirstTabView(tabName: string, source: any, tabOptions: any) {
        if (source.customerIntelligenceData && !tabOptions.customerIntelligenceData) {
            const ciData: CustomerIntelligenceData = source.customerIntelligenceData;
            ciData.setTab(tabName);
            tabOptions.customerIntelligenceData = ciData;
            ciData.publish(tabName + ".FirstView", true);
        }
    }
}
