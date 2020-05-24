import VSS = require("VSS/VSS");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";

/**
 * A repository service.
 */
export interface IRepositoryService { };

/**
 * Constructor type for a repository service.
 */
export interface IRepositoryServiceConstructor<T extends IRepositoryService> {
    new (context: RepositoryContext): T
}

class RepositoryServiceFactory {
    private static _services: IDictionaryStringTo<IRepositoryService> = {};

    public static getService<T extends IRepositoryService>(serviceType: IRepositoryServiceConstructor<T>, repositoryContext: RepositoryContext): T {
        const repositoryId = repositoryContext ? repositoryContext.getRepositoryId() : "contextless";
        const serviceName = "gitRepositoryService." + VSS.getTypeName(serviceType) + repositoryId;

        // Try for the cached service.
        let instance = <T>this._services[serviceName];

        // Otherwise, make a new one.
        if (!instance) {
            instance = <T>(new serviceType(repositoryContext));
            this._services[serviceName] = instance;
        }

        return <T>instance;
    }
}

/**
 * Get a repository-level service.
 * @param serviceType Type of the repository service to get.
 * @param repositoryContext The Git repository context.
 * @returns The cached instance of the repository-level service.
 */
export function getRepositoryService<T extends IRepositoryService>(
    serviceType: IRepositoryServiceConstructor<T>,
    repositoryContext: RepositoryContext): T {

    return RepositoryServiceFactory.getService(serviceType, repositoryContext);
}