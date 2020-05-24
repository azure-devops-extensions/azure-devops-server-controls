import { autobind } from "OfficeFabric/Utilities";
import * as Telemetry from "VSS/Telemetry/Services";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

interface IClassStack {
    className: string;

    // When true, indicates that the className is explicity marked for ally-monitor
    explicitMonitor: boolean;
}

/**
 * This is an experiment for now, will track effectivenes on one of the Agile features,
 * if successful will move to a better place
 *
 * Measures accessibility by monitoring hops needed to reach an element on page before interacting with it
 * Definitions
 * hops: Havigation using Tabs, Arrow Keys or Mouse Clicks
 * Interation: Key strokes other than used in hops
 */
export class AccessibilityMonitor {
    private static _instance: AccessibilityMonitor;
    public static getInstance(): AccessibilityMonitor {
        if (!AccessibilityMonitor._instance) {
            AccessibilityMonitor._instance = new AccessibilityMonitor();
        }
        return AccessibilityMonitor._instance;
    }

    /**
     * Starts the monitor
     */
    public start(area: string, feature: string): void {
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAccessibilityMonitor)) {
            return;
        }

        this._area = area;
        this._feature = feature;
        window.addEventListener("keydown", this._handleInputEvent);
        window.addEventListener("click", this._handleInputEvent);
    }

    /**
     * Stops the monitor
     */
    public stop(): void {
        if (!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAccessibilityMonitor)) {
            return;
        }

        this._area = "";
        this._feature = "";
        this._restart();
        Telemetry.flush();
        window.removeEventListener("keydown", this._handleInputEvent);
        window.removeEventListener("click", this._handleInputEvent);
    }

    private _restart(): void {
        this._hopCount = 0;
    }

    private _increment(): void {
        this._hopCount++;
    }

    /**
     * Publishes hopcount for given action and restarts the counter
     */
    private _actionPerformed(actionName: string): void {
        const telemetryData: Telemetry.TelemetryEventData = new Telemetry.TelemetryEventData(this._area, this._feature, {
            scenario: "accessibility",
            action: actionName,
            hopCount: this._hopCount
        });

        Telemetry.publishEvent(telemetryData);

        this._restart();
    }

    /**
     * Gets css class stack for given element
     */
    private _getClassStack(element: Element, stackSize: number = 0): IClassStack {
        // Do not get stack size over 10 hops for better perf
        if (!element || stackSize >= 10) {
            return { className: "", explicitMonitor: false };
        }

        const classNames: string = element.getAttribute("class");
        if (classNames) {
            const index: number = classNames.indexOf("ally-monitor");
            let className = "";
            if (index > -1) {
                const end: number = classNames.indexOf(" ", index);
                if (end > -1) {
                    className = classNames.substr(index, end - index);
                } else {
                    className = classNames.substr(index);
                }
                return { className: className, explicitMonitor: true };
            }
        }

        const retVal: IClassStack = this._getClassStack(element.parentElement, stackSize + 1);
        if (!retVal.explicitMonitor && classNames) {
            retVal.className = classNames + " < " + retVal.className;
        }

        return retVal;
    }

    @autobind
    private _handleInputEvent(): void {
        const activeElement: Element = document.activeElement;

        if (this._activeElement !== activeElement) {
            // User hopped from one element to other, increment the hopCount
            this._increment();
        } else if (this._activeElement && this._hopCount > 0) {
            // User pressed a non navigation key
            // It took more than 0 hops to reach the current element
            const classStack = this._getClassStack(this._activeElement);

            // Either the class is marked for explicit monitoring 
            // or the hopCount is greater than 5, this is to highlight any scenarios
            // that might need improvements
            if (classStack.explicitMonitor || this._hopCount > 5) {
                this._actionPerformed(classStack.className);
            }

            this._restart();
        }

        this._activeElement = document.activeElement;
    }

    // Number of hops to reach activeElement, this could be tabs or arrow keys
    private _hopCount: number = 0;
    private _activeElement: Element;
    private _area: string;
    private _feature: string;
    private _registeredAccessibleUser: boolean;
}
