import { WidgetSize } from 'TFS/Dashboards/Contracts';
import * as WidgetContracts from 'TFS/Dashboards/WidgetContracts';

/** Describes what changed from the last known state.
 *  Important for reload scenario, to allow bypassing of costly querying and main body rendering.
 */
export enum ChangeFlags {
    none = 0,

    name = 1,
    sizeInPixels = 2,
    customSettings = 4,

    all = (name | sizeInPixels | customSettings)
}

/** Describes what framework operation originated a change event.  */
export enum WidgetFrameworkOperationId {
    preload,
    load,
    reload,
    lightbox,
    listen_lightboxResized,
    listen_lightboxOptions
}

/** Describes what a widget implementer needs to know to render. */
export interface NormalizedWidgetConfig {
    name: string;
    isLightBox: boolean;
    sizeInPixels: WidgetContracts.Size;
    customSettings: WidgetContracts.CustomSettings;

    /** Optional Legacy property, for non-lightbox scenario. Expresses widget size from Dashboard centric POV of rows and columns. */
    sizeInGrid?: WidgetSize;
}

export interface WidgetCreationOptions {
    typeId: string;
    getId: () => IPromise<string>;
}

export interface WidgetConfigChange {
    /*** Identifies the Framework operation which triggered this change.  */
    operationId: WidgetFrameworkOperationId;

    /*** The new configuration state of the widget */
    config: NormalizedWidgetConfig;

    /*** The changes detected between new config and old config. */
    detectedChanges: ChangeFlags;

    /** Creation-time parameters of the Widget. */
    widgetCreationOptions: WidgetCreationOptions;
}

export interface IWidgetSettings{
    
}