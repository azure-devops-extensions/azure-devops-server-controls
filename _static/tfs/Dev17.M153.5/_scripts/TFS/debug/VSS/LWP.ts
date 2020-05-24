import React = require("react");

interface ILWPPageContext {
    getService: <T>(serviceName: string) => T;
}

// This module contains method for the new Lightweight Web Platform support

/**
 * Gets an already loaded new-platform LWP module
 * 
 * @param moduleName Module path
 */
export function getLWPModule(moduleName: string): any {

    const LWL = (<any>window).LWL;
    if (LWL && LWL.req) {
        return LWL.req(moduleName);
    }

    return undefined;
}

/**
 * Attempts to gets an LWP service from this legacy platform code, using
 * the page context which was used by the legacy component hosting this code.
 * 
 * @param serviceName Name of the service
 */
export function getLWPService<T = any>(serviceName: string): T | undefined {
    let instance: T | undefined;

    const legacyModule = getLWPModule("VSS/Legacy/Legacy");
    if (legacyModule) {
        instance = legacyModule.getLWPService(serviceName);
    }

    return instance;
}

/**
 * Registers a React component with the new web platform (if available)
 * 
 * @param componentType Named component type
 * @param reactClass React component class
 */
export function registerLWPComponent(componentType: string, reactClass: React.ComponentClass<any>) {
    const Layout = getLWPModule("VSS/Platform/Layout");
    if (Layout) {
        Layout.VssComponent.register(componentType, reactClass);
    }
}