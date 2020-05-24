///<reference path='../References/VSS.SDK.Interfaces.d.ts' />

// This module provides a shim for VSS.SDK. This allows internal components to be written
// once and work whether the component is hosted in an iframe or in the parent frame.

import Q = require("q");
import SDK_XDM = require("VSS/SDK/XDM");
import VSS_VSS = require("VSS/VSS");

export interface IVssSdk {
    
    /**
    * Get a contributed service from the parent host.
    *
    * @param contributionId Full id of the service contribution
    * @param context Optional context information to use when obtaining the service instance
    */
    getService<T>(serviceId: string, context?: Object): IPromise<T>;

    /**
    * Get contributions that target a given contribution id. The returned contributions have a method to get a registered object within that contribution.
    *
    * @param targetContributionId Contributions that target the contribution with this id will be returned
    */
    getServiceContributions(targetContributionId: string): IPromise<IServiceContribution[]>;

    /**
    * Register an object (instance or factory method) that this extension exposes to the host frame.
    *
    * @param instanceId unique id of the registered object
    * @param instance Either: (1) an object instance, or (2) a function that takes optional context data and returns an object instance.
    */
    register(instanceId: string, instance: Object | { (contextData?: any): Object; }): void;

    /**
    * Removes an object that this extension exposed to the host frame.
    *
    * @param instanceId unique id of the registered object
    */
    unregister(instanceId: string): void;

    /**
    * Get an instance of an object registered with the given id
    *
    * @param instanceId unique id of the registered object
    * @param contextData Optional context data to pass to the contructor of an object factory method
    */
    getRegisteredObject(instanceId: string, contextData?: Object): Object;

    /**
    * Requests the parent window to resize the container for this extension based on the current extension size.
    */
    resize();
}

/**
* Interface for the context data object passed to the registered factory method for internal content
*/
export interface InternalContentContextData {

    /**
    * JQuery container to create the content within
    */
    $container: JQuery;

    /**
    * Container element to create the content within
    */
    container: HTMLElement;

    /**
    * Options to pass to the created control
    */
    options: any;
    
    /**
    * Register an object (instance or factory method) scoped only to the host control that is exposing this content.
    *
    * @param instanceId unique id of the registered object
    * @param instance Either: (1) an object instance, or (2) a function that takes optional context data and returns an object instance.
    */
    registerInstance: (instanceId: string, instance: Object | { (contextData?: any): Object; }) => void;
}

/**
* Register a method to be used for initialization of internally contributed content
*
* @param instanceId unique id of the registered method
* @param method A function that takes an InternalContentContextData object and optionally returns a control.
*/
export function registerContent(instanceId: string, method: (contextData: InternalContentContextData) => any) {
    VSS.register(instanceId, method);
}

class HostFrameVssSdk implements IVssSdk {

    /**
    * Get a contributed service from the parent host.
    *
    * @param contributionId Full id of the service contribution
    * @param context Optional context information to use when obtaining the service instance
    */
    public getService<T>(contributionId: string, context?: Object): IPromise<T> {
        return VSS_VSS.requireModules(["VSS/SDK/Host"]).spread((_SDK_Host) => {
            var hostManagementService = new _SDK_Host.HostManagementService({});
            return hostManagementService.getServiceContribution(contributionId).then((serviceContribution) => {
                return serviceContribution.getInstance(serviceContribution.id, context);
            });
        });
    }

    /**
    * Get contributions that target a given contribution id. The returned contributions have a method to get a registered object within that contribution.
    *
    * @param targetContributionId Contributions that target the contribution with this id will be returned
    */
    public getServiceContributions(targetContributionId: string): IPromise<IServiceContribution[]> {
        return VSS_VSS.requireModules(["VSS/SDK/Host"]).spread((_SDK_Host) => {
            var hostManagementService = new _SDK_Host.HostManagementService({});
            return hostManagementService.getServiceContributions(targetContributionId);
        });
    }

    /**
    * Register an object (instance or factory method) that this extension exposes to the host frame.
    *
    * @param instanceId unique id of the registered object
    * @param instance Either: (1) an object instance, or (2) a function that takes optional context data and returns an object instance.
    */
    public register(instanceId: string, instance: Object | { (contextData?: any): Object; }) {
        SDK_XDM.globalObjectRegistry.register(instanceId, instance);
    }

    /**
    * Removes an object that this extension exposed to the host frame.
    *
    * @param instanceId unique id of the registered object
    */
    public unregister(instanceId: string) {
        SDK_XDM.globalObjectRegistry.unregister(instanceId);
    }

    /**
    * Get an instance of an object registered with the given id
    *
    * @param instanceId unique id of the registered object
    * @param contextData Optional context data to pass to the contructor of an object factory method
    */
    public getRegisteredObject(instanceId: string, contextData?: Object): Object {
        return SDK_XDM.globalObjectRegistry.getInstance(instanceId, contextData);
    }

    /**
    * Requests the parent window to resize the container for this extension based on the current extension size.
    */
    public resize() {
        // No-op for the host frame
    }
}

export function isSdkReferenced() {
    return !!((<any>window).VSS && (<any>window).VSS.VssSDKVersion);
}

export var VSS: IVssSdk;

if (isSdkReferenced()) {
    VSS = (<any>window).VSS;
}
else {
    VSS = new HostFrameVssSdk();
}