/// <reference types="react" />

import Q = require("q");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemControl, IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WorkItemControlComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlComponent";
import { WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { handleError } from "VSS/VSS";

/** Work item control type for JQuery based controls */
export interface IWorkItemControlType {
    new (...args: any[]): WorkItemControl;
}

/** Work item control type for React based controls */
export interface IWorkItemControlTypeReact {
    new (...args: any[]): WorkItemControlComponent<any, any>;
}

export enum RenderType {
    /** Control is based on JQuery and follows the BaseControl pattern */
    JQuery = 0,

    /** Control is written using React and can be hosted as a React component */
    React = 1
}

/** Work item control preview component */
export interface IWorkItemControlPreview {
    canPreview: (workItemType: WITOM.WorkItemType, fieldRefName: string, workItem?: WITOM.WorkItem) => boolean;
    getPreview: (workItemType: WITOM.WorkItemType, workItem: WITOM.WorkItem, options: IWorkItemControlOptions) => JSX.Element | JQuery;
}

/** Work item control preview configuration */
export interface IWorkItemControlPreviewConfiguration {   
    /** Preview type name or type */
    previewType: string | IWorkItemControlPreview;

    /** Optional module to async load for work item preview comp */
    requiredModule?: string;

    /** Render type of the preview */
    renderType: RenderType;
}

/** Registration for a single work item control */
export interface IWorkItemControlRegistration {
    /** Name of control type in required module or control type */
    controlType: string | IWorkItemControlType | IWorkItemControlTypeReact;

    /** Render type of the control */
    renderType: RenderType;

    /** Optional module to async load for work item type */
    requiredModule?: string;

    /** Optional configuration for a preview mode */
    previewConfiguration?: IWorkItemControlPreviewConfiguration;
}

/** Factory to determine control name to type mapping at runtime */
export interface IWorkItemControlTypeFactory {
    /**
     * @param controlOptions Options for the requested control
     * @param workItemType Optional work item type for which to get the control
     */     
    (controlOptions?: IWorkItemControlOptions, workItemType?: WITOM.WorkItemType): IWorkItemControlRegistration;
}

export interface IWorkItemControlTypeResult {
    renderType: RenderType;
    controlType: IWorkItemControlType | IWorkItemControlTypeReact;

    previewConfiguration: IWorkItemControlPreviewConfiguration;
}

/** Registered work item controls */
var workItemControlRegistrations: IDictionaryStringTo<IWorkItemControlRegistration | IWorkItemControlTypeFactory> = {};

/**
 * Register a work item control
 * @param controlName Name under which the control should be registered
 * @param controlType Type of control OR Name of type in async-loaded module
 * @param requiredModule Optional, async required module
 */
export function registerWorkItemFormControl(
    controlName: string,
    controlType: string | IWorkItemControlType,
    requiredModule?: string): void {
    controlName = controlName.toUpperCase();

    Diag.Debug.assert(
        typeof controlType !== "string" || !!requiredModule,
        "Provide either a concrete type, or a type name with a module path");

    registerWorkItemControlAdvanced(controlName, {
        controlType: controlType,
        renderType: RenderType.JQuery,
        requiredModule: requiredModule,
        previewConfiguration: null
    });
}

/**
 * Register a factory for the control name. Factories are resolved after registrations
 * @param controlName Control name
 * @param factory Factory that returns type of control to instantiate
 */
export function registerWorkItemControlTypeFactory(controlName: string, factory: IWorkItemControlTypeFactory): void {    
    controlName = controlName.toUpperCase();
    workItemControlRegistrations[controlName] = factory;
}

/**
 * Register a work item control by providing the whole registration
 * @param controlName Name under which the control should be registered
 * @param registration Control registration
 */
export function registerWorkItemControlAdvanced(controlName: string, registration: IWorkItemControlRegistration) {
    controlName = controlName.toUpperCase();
    workItemControlRegistrations[controlName] = registration;
}

/**
 * Get registration for control name
 * @param controlName Control name
 */
export function getWorkItemControlRegistration(controlName: string): IWorkItemControlRegistration | IWorkItemControlTypeFactory {
    return workItemControlRegistrations[controlName.toUpperCase()];
}

export interface IWorkItemControlTypeQuery {
    controlName: string,

    controlOptions?: IWorkItemControlOptions,
    workItemType?: WITOM.WorkItemType
}

/**
 * Get the type for a registered control
 * @param controlName Name of the control to get
 * @param callback Callback that will be called with control type and registration
 */
export function beginGetWorkItemControl(
    control: string | IWorkItemControlTypeQuery,
    callback: (controlResult: IWorkItemControlTypeResult) => void): void {
    let controlType: string | IWorkItemControlType = null;
    let requiredModule: string = null;
    let registration: IWorkItemControlRegistration;

    let controlName: string;
    let controlQuery: IWorkItemControlTypeQuery;
    if (typeof control === "string") {
        controlName = control;
        controlQuery = {
            controlName: control
        };
    } else {
        controlName = control.controlName;
        controlQuery = control;
    }

    if (controlName) {
        controlName = controlName.toUpperCase();

        let registrationOrFactory = workItemControlRegistrations[controlName];

        if (typeof registrationOrFactory === "object") {
            registration = registrationOrFactory;
            controlType = <string | IWorkItemControlType>registration.controlType;
            requiredModule = registration.requiredModule;
        }
        else if (typeof registrationOrFactory === "function") {
            // Invoke factory to get type and required module
            registration = registrationOrFactory(controlQuery.controlOptions, controlQuery.workItemType);

            controlType = <string | IWorkItemControlType>registration.controlType;
            requiredModule = registration.requiredModule;
        }

        if (controlType && requiredModule) {
            // Control type has registered for a module that needs to be loaded before
            // the control can be constructed. Load the module.
            VSS.using([requiredModule], (moduleLoaded) => {
                if (typeof controlType === "string") {
                    if (moduleLoaded[controlType]) {
                        const type = moduleLoaded[controlType];
                        callback({
                            renderType: registration.renderType,
                            controlType: type,
                            previewConfiguration: registration.previewConfiguration
                        });
                    } else {
                        const msg = `Could not find work item control '${controlName}' in module '${requiredModule}'`;
                        logError(msg);
                    }
                } else {
                    callback({
                        renderType: registration.renderType,
                        controlType: controlType,
                        previewConfiguration: registration.previewConfiguration
                    });
                }
            });

            return;
        }
    }

    if (controlType && typeof controlType !== "string") {
        Diag.Debug.assert(!!registration);

        // We do have a concrete type
        callback({
            renderType: registration.renderType,
            controlType: controlType,
            previewConfiguration: registration.previewConfiguration
        });
    } else {
        const message = `Could not find type for work item control: '${controlName}'. Legacy extensions are no longer supported in new work item form.`;
        logError(message);

        callback({
            renderType: RenderType.JQuery,
            controlType: null,
            previewConfiguration: null
        });
    }
}

/**
 * Get work item control preview component
 * @param config Configuration for preview component
 */
export function beginGetPreviewComponent(config: IWorkItemControlPreviewConfiguration): IPromise<IWorkItemControlPreview | string> {
    if (!config.requiredModule) {
        Diag.Debug.assert(typeof config.previewType !== "string");

        return Q(config.previewType);
    }

    if (typeof config.previewType === "string") {
        const previewComponent: string = config.previewType;

        return VSS.requireModules([config.requiredModule]).spread(mod => {
            return mod[previewComponent];
        });
    }
   
    throw new Error("Work item preview component not found");
}

function logError(msg) {
    // Fail in debug mode, log warning for production
    Diag.Debug.fail(msg);
    if (window.console && window.console.warn) {
        window.console.warn(msg);
    }
};