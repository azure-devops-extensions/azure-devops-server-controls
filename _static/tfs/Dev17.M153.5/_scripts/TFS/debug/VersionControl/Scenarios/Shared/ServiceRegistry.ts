/**
 * ServiceRegistry is a static object that allows for registering and getting services by type
 * This can be used by React/Flux Objects to query for interface implementations without taking
 * a direct dependency on any specific implementation.
 *
 * During page initialization, call ServiceRegistry.initialize() followed by registering all required interface implementations
 * Components can call getService(IMyService) to get the implementation that was registered
 * During page disposal, call ServiceRegistry.dispose() to remove all service references from the registry 
 */
export class ServiceRegistry {
    private _services: IDictionaryStringTo<any> = {};

    private static _instance: ServiceRegistry;

    /**
     * Initialize the ServiceRegistry
     */
    public static initialize(): void {
        if (ServiceRegistry._instance) {
            throw "ServiceRegistry was already initialized and not disposed";
        }

        ServiceRegistry._instance = new ServiceRegistry();
    }

    /**
     * Remove all services from the service dictionary to be garbage collected
     */
    public static dispose(): void {
        ServiceRegistry._instance = null;
    }

    /**
     * Register a service for use on the page. Example: ServiceRegistry.registerService(myServiceInstance, IMyService)
     * @param service The concrete implementation to be used
     * @param serviceInterface The interface type that this service implements
     */
    public static registerService<IMPLEMENTATION extends INTERFACE, INTERFACE>(service: IMPLEMENTATION, serviceInterface: ServiceInterface<INTERFACE>) {
        if (!ServiceRegistry._instance) {
            throw "ServiceRegistry has not been initialized";
        }
        if (!service) {
            throw "implementation is invalid";
        }

        const serviceName = serviceInterface.getServiceName();

        if (!serviceName) {
            throw "interface name is invalid";
        }
        if (ServiceRegistry._instance._services[serviceName]) {
            throw serviceName + " is already registered";
        }
        ServiceRegistry._instance._services[serviceName] = service;
    }

    /**
     * Get a service by type. Example: let myService = ServiceRegistry.getService(IMyService)
     * @param serviceInterface The interface type you want to retrieve the implementation for
     */
    public static getService<INTERFACE>(serviceInterface: ServiceInterface<INTERFACE>): INTERFACE {
        if (!ServiceRegistry._instance) {
            // don't throw an error in case some old listener or timer tries to get a service during page cleanup
            return null;
        }

        const serviceName: string = serviceInterface.getServiceName();

        if (!serviceName) {
            throw "interface name is invalid";
        }

        return ServiceRegistry._instance._services[serviceName];
    }
}

export type ServiceInterface<T> = Function & {
    prototype: T,
    getServiceName(): string;
};
