import * as WidgetContracts from "TFS/Dashboards/WidgetContracts";
import { WidgetSize } from "TFS/Dashboards/Contracts";
import { WidgetOptions } from "Dashboards/Scripts/Contracts";
import * as WidgetHelpers from "TFS/Dashboards/WidgetHelpers";
import * as Performance from "VSS/Performance";
import * as TFS_Dashboards_Telemetry from "Dashboards/Scripts/Telemetry";

import Utils_String = require("VSS/Utils/String");
import {ChangeFlags, NormalizedWidgetConfig, WidgetConfigChange, WidgetCreationOptions, WidgetFrameworkOperationId} from "Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts";


/*** 
 *   Responsible for providing a clean, coherent abstraction of Widget events to modern Widget implementers, from calls of the Dashboard-Widget API.
 *   In particular - exposes context on for when repaint behaviors are required, and uses a uniform data representation for requests.
 *   This allows new, 1st party widgets to avoid locally re-implementing behaviors missing from the dashboard framework contract
 *   (until these deficiencies can be rectified in a revised public SDK).
 * 
 *   Note: If you are implementing a widget in React, use ReactWidgetBase.
 */
export abstract class ModernWidgetBase implements WidgetContracts.IConfigurableWidget {
    private widgetOptions: WidgetOptions;
    protected performanceScenario: Performance.IScenarioDescriptor;

    constructor(widgetOptions: WidgetOptions) {
        this.widgetOptions = widgetOptions;
        this.performanceScenario = this.widgetOptions.performanceScenario;
    }

    // Neccessary for providing continuity of config when incomplete/inconsistent context is provided by framework (e.g. listen events).
    private lastConfig: NormalizedWidgetConfig;

    /** This method must be implemented by derived Widgets. */
    protected abstract render(change: WidgetConfigChange): IPromise<WidgetContracts.WidgetStatus>;

    public preload(widgetSettings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        // Replicating the approximate timing of when BaseWidget would log that a widget was initialized (internal only step, for parity with base widget)
        this.addSplitTiming(TFS_Dashboards_Telemetry.WidgetSplits.WidgetInitialized);
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(widgetSettings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        return this.commonLoad(WidgetFrameworkOperationId.reload, widgetSettings).then((promise)=>{
            this.addSplitTiming(TFS_Dashboards_Telemetry.WidgetSplits.WidgetRendered);
            return promise;
        });
    }

    public reload(widgetSettings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        return this.commonLoad(WidgetFrameworkOperationId.reload, widgetSettings);
    }

    private commonLoad(operationId: WidgetFrameworkOperationId, widgetSettings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        let newConfig = this.NormalizeConfig(widgetSettings);
        let change = this.recordChange(operationId, newConfig);
        this.lastConfig = newConfig;

        return this.render(change);
    }

    public lightbox(widgetSettings: WidgetContracts.WidgetSettings, lightboxSize: WidgetContracts.Size): IPromise<WidgetContracts.WidgetStatus> {
        let newConfig = this.NormalizeConfig(widgetSettings, lightboxSize);
        let change = this.recordChange(WidgetFrameworkOperationId.lightbox, newConfig);
        this.lastConfig = newConfig;
        return this.render(change);
    }

    public listen(event: string, args: any): void {
        if (event === WidgetHelpers.WidgetEvent.LightboxResized) {
            let castArgs: WidgetContracts.EventArgs<WidgetContracts.Size> = args;
            let lightboxSize = castArgs.data;

            let newConfig = this.lastConfig;
            newConfig.sizeInPixels = lightboxSize;
            let change = this.recordChange(WidgetFrameworkOperationId.listen_lightboxResized, newConfig);
            this.lastConfig = newConfig;

            this.render(change);
        } else if (event === WidgetHelpers.WidgetEvent.LightboxOptions) {
            // TODO: Task 1016059: Handle WidgetEvent Lightbox Options

        }
        // Any other listen events are treated as unrecognized.
        // Note: Although these paths do entail a repaint, no return promise is involved on the listen path contract.
    }

    protected addSplitTiming(name: string, elapsedTime?: number) {
        if (this.performanceScenario) {
            this.performanceScenario.addSplitTiming(name, elapsedTime);
        }
    }

    /** Exposes minimal neccessary set of creation-time widget options. */
    private getWidgetCreationOptions(): WidgetCreationOptions {
        return {
            getId: () => {
                return this.widgetOptions.widgetService.then((service) => {
                    return service.getWidgetId().then((widgetId: string) => {
                        return widgetId;
                    });
                })
            },
            typeId: this.widgetOptions.typeId
        };
    }

    private NormalizeConfig(widgetSettings: WidgetContracts.WidgetSettings, lightboxSize?: WidgetContracts.Size): NormalizedWidgetConfig {
        let isLightBox = lightboxSize != null;
        return {
            name: widgetSettings.name,
            customSettings: widgetSettings.customSettings,
            sizeInPixels: !isLightBox ? this.extractSize(widgetSettings) : lightboxSize,
            isLightBox: isLightBox,
            sizeInGrid: !isLightBox ? widgetSettings.size : null
        };

    }

    /*** Describes what changed between old and new config to provide a diff. */
    private compareConfig(before: NormalizedWidgetConfig, after: NormalizedWidgetConfig): ChangeFlags {
        if (before == after) {
            return ChangeFlags.none;
        }
        else if (before == null || after == null) {
            return ChangeFlags.all; //If one of the configurations is null, 
        }
        else {
            let result = ChangeFlags.none;
            if (!Utils_String.equals(before.name, after.name)) {
                result |= ChangeFlags.name;
            }
            if (!Utils_String.equals(before.customSettings.data, after.customSettings.data) || before.customSettings.version != before.customSettings.version) {
                result |= ChangeFlags.customSettings;
            }
            if (before.sizeInPixels.width != after.sizeInPixels.width ||
                before.sizeInPixels.height != after.sizeInPixels.height) {
                result |= ChangeFlags.sizeInPixels;
            }
            return result;
        }
    }

    private recordChange(operationId: WidgetFrameworkOperationId, updatedConfig: NormalizedWidgetConfig): WidgetConfigChange {
        let changeDescription = {
            operationId: operationId,
            config: updatedConfig,
            detectedChanges: this.compareConfig(this.lastConfig, updatedConfig),
            widgetCreationOptions: this.getWidgetCreationOptions()
        };
        this.lastConfig = updatedConfig;
        return changeDescription;
    }


    private extractSize(widgetSettings: WidgetContracts.WidgetSettings): WidgetContracts.Size {
        return {
            width: WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(widgetSettings.size.columnSpan),
            height: WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(widgetSettings.size.rowSpan)
        } as WidgetContracts.Size;
    }
}