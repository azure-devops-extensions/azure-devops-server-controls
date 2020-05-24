/// <reference path='../../References/VSS.SDK.Interfaces.d.ts' />
/// <reference types="q" />

import Authentication_Contracts = require("VSS/Authentication/Contracts");
import Authentication_Services = require("VSS/Authentication/Services");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import ExtensionManagement_RestClient = require("VSS/ExtensionManagement/RestClient");
import Q = require("q");
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");

/**
* Provides a wrapper around the REST client for getting and saving extension setting values
* @serviceId "vss.extensionSettings"
*/
export class ExtensionDataService implements IExtensionDataService {
    private _extensionManagementPromise: IPromise<ExtensionManagement_RestClient.ExtensionManagementHttpClient>;
    private _publisherName: string;
    private _extensionName: string;

    private static DEFAULT_SCOPE_TYPE = "Default";
    private static CURRENT_DEFAULT_SCOPE_VALUE = "Current";
    private static USER_SCOPE_TYPE = "User";
    private static CURRENT_USER_SCOPE_VALUE = "Me";
    private static SETTINGS_COLLECTION_NAME = "$settings";
    private static _serviceInstances: { [extensionId: string]: ExtensionDataService; } = {};

    constructor(publisherName: string, extensionName: string, registrationId: string, webContext: Contracts_Platform.WebContext) {
        this._publisherName = publisherName;
        this._extensionName = extensionName;

        let tokenPromise: IPromise<Authentication_Contracts.WebSessionToken>;
        if (registrationId) {
            tokenPromise = Authentication_Services.getToken(registrationId, null, null, true);
        }
        else {
            tokenPromise = Authentication_Services.getExtensionToken(publisherName, extensionName);
        }

        this._extensionManagementPromise = tokenPromise.then((token: Authentication_Contracts.WebSessionToken) => {
            
            if (!token) {
                return null;
            }
            
            var authTokenManager = new Authentication_Services.WebSessionTokenManager(token);
            var connection = new Service.VssConnection(webContext, Contracts_Platform.ContextHostType.ProjectCollection);
            return connection.beginGetServiceUrl(ExtensionManagement_RestClient.ExtensionManagementHttpClient.serviceInstanceId).then(
                (serviceUrl: string) => {
                    var emsClient = new ExtensionManagement_RestClient.ExtensionManagementHttpClient3_1(serviceUrl);
                    emsClient.authTokenManager = authTokenManager;
                    return emsClient;
                });
        });
    }

    /**
    * Factory method for creating/getting an instance of the extension settings service.
    *
    * @param extensionId The extension id to get or save settings for
    */
    public static getServiceInstance(publisherName: string, extensionName: string, registrationId: string, webContext?: Contracts_Platform.WebContext): ExtensionDataService {
        var extensionId = publisherName + "." + extensionName;
        var serviceInstance = ExtensionDataService._serviceInstances[extensionId];
        if (!serviceInstance) {
            serviceInstance = new ExtensionDataService(publisherName, extensionName, registrationId, webContext);
            ExtensionDataService._serviceInstances[extensionId] = serviceInstance;
        }
        return serviceInstance;
    }

    /**
    * Returns a promise for retrieving a setting at the provided key and scope
    *
    * @param key The key to retrieve a value for
    * @param documentOptions The scope in which the value is stored - default value is account-wide
    */
    public getValue<T>(key: string, documentOptions?: IDocumentOptions): IPromise<T> {
        documentOptions = this._checkDocumentOptions(documentOptions);

        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.getDocumentByName(this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, ExtensionDataService.SETTINGS_COLLECTION_NAME, key).then(
                (doc: any) => {
                    return doc.value;
                },
                (error: Error) => {
                    return documentOptions.defaultValue;
                });
        });
    }

    /**
    * Returns a promise for retrieving a list of settings at the provided keys and scope
    *
    * @param keys The keys to retrieve values for
    * @param documentOptions The scope in which the values are stored - default value is collection-wide
    */
    public getValues(keys: string[], documentOptions?: IDocumentOptions): IPromise<{[key: string]: any }> {
        documentOptions = this._checkDocumentOptions(documentOptions);

        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.getDocumentsByName(this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, ExtensionDataService.SETTINGS_COLLECTION_NAME).then(
                (docs: any[]) => {
                    const values = {};
                    const docsById = this._createDictionaryForArray(docs);
                    keys.forEach((key: string) => {
                        if (key in docsById && docsById[key].hasOwnProperty("value")) {
                            values[key] = docsById[key].value;
                        }
                        else {
                            values[key] = documentOptions.defaultValue;
                        }
                    });
                    return values;
                },
                (error: Error) => {
                    return {};
                });
        });
    }

    /**
    * Returns a promise for saving a setting at the provided key and scope
    *
    * @param key The key to save a value for
    * @param value The value to save
    * @param documentOptions The scope in which the value is stored - default value is account-wide
    */
    public setValue<T>(key: string, value: T, documentOptions?: IDocumentOptions): IPromise<T> {
        var doc = {
            id: key,
            value: value,
            __etag: -1
        };
        documentOptions = this._checkDocumentOptions(documentOptions);

        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.setDocumentByName(doc, this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, ExtensionDataService.SETTINGS_COLLECTION_NAME).then((doc: any) => {
                return doc.value;
            });
        });
    }

    /**
    * Returns a promise for saving a collection of settings at the provided keys and scope
    *
    * @param keyValuePairs A set of key/value pairs to set values for
    * @param documentOptions The scope in which the values are stored - default value is collection-wide
    */
    public setValues(keyValuePairs: {[key: string]: any }, documentOptions?: IDocumentOptions): IPromise<any[]> {
        documentOptions = this._checkDocumentOptions(documentOptions);

        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return Q.all(Object.keys(keyValuePairs).map((key) => {
                var doc = {
                    id: key,
                    value: keyValuePairs[key],
                    __etag: -1
                };

                return emsClient.setDocumentByName(doc, this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, ExtensionDataService.SETTINGS_COLLECTION_NAME).then((doc: any) => {
                    return doc.value;
                });
            }));
        });
    }

    /**
    * Returns a promise for getting a document with the provided id in the provided collection
    *
    * @param collectionName The name of the collection where the document lives
    * @param id The id of the document in the collection
    * @param documentOptions The scope in which the value is stored - default value is account-wide
    */
    public getDocument(collectionName: string, id: string, documentOptions?: IDocumentOptions): IPromise<any> {
        documentOptions = this._checkDocumentOptions(documentOptions);
        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.getDocumentByName(this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, collectionName, id);
        });
    }

    /**
    * Returns a promise for getting all of the documents in the provided collection
    *
    * @param collectionName The name of the collection where the document lives
    * @param documentOptions The scope in which the value is stored - default value is account-wide
    */
    public getDocuments(collectionName: string, documentOptions?: IDocumentOptions): IPromise<any[]> {
        documentOptions = this._checkDocumentOptions(documentOptions);
        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.getDocumentsByName(this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, collectionName);
        });
    }

    /**
    * Returns a promise for creating a document in the provided collection
    *
    * @param collectionName The name of the collection where the document lives
    * @param doc The document to store
    * @param documentOptions The scope in which the value is stored - default value is account-wide
    */
    public createDocument(collectionName: string, doc: any, documentOptions?: IDocumentOptions): IPromise<any> {
        documentOptions = this._checkDocumentOptions(documentOptions);
        this._checkDocument(doc);
        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.createDocumentByName(doc, this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, collectionName);
        });
    }

    /**
    * Returns a promise for setting a document in the provided collection
    * Creates the document if it does not exist, otherwise updates the existing document with the id provided
    *
    * @param collectionName The name of the collection where the document lives
    * @param doc The document to store
    * @param documentOptions The scope in which the value is stored - default value is account-wide
    */
    public setDocument(collectionName: string, doc: any, documentOptions?: IDocumentOptions): IPromise<any> {
        documentOptions = this._checkDocumentOptions(documentOptions);
        this._checkDocument(doc);
        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.setDocumentByName(doc, this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, collectionName);
        });
    }

    /**
    * Returns a promise for updating a document in the provided collection
    * A document with the id provided must exist
    *
    * @param collectionName The name of the collection where the document lives
    * @param doc The document to store
    * @param documentOptions The scope in which the value is stored - default value is account-wide
    */
    public updateDocument(collectionName: string, doc: any, documentOptions?: IDocumentOptions): IPromise<any> {
        documentOptions = this._checkDocumentOptions(documentOptions);
        this._checkDocument(doc);
        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.updateDocumentByName(doc, this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, collectionName);
        });
    }

    /**
    * Returns a promise for deleting the document at the provided scope, collection and id
    *
    * @param collectionName The name of the collection where the document lives
    * @param id The id of the document in the collection
    * @param documentOptions The scope in which the value is stored - default value is account-wide
    */
    public deleteDocument(collectionName: string, id: string, documentOptions?: IDocumentOptions): IPromise<void> {
        documentOptions = this._checkDocumentOptions(documentOptions);
        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.deleteDocumentByName(this._publisherName, this._extensionName, documentOptions.scopeType, documentOptions.scopeValue, collectionName, id);
        });
    }

    /**
    * Returns a promise for querying a set of collections
    *
    * @param collections The list of collections to query. Assumes Default Scope Type and Current Scope Value
    */
    public queryCollectionNames(collectionNames: string[]): IPromise<Contributions_Contracts.ExtensionDataCollection[]> {
        var collections = collectionNames.map<Contributions_Contracts.ExtensionDataCollection>((collectionName: string) => {
            return {
                collectionName: collectionName,
                scopeType: ExtensionDataService.DEFAULT_SCOPE_TYPE,
                scopeValue: ExtensionDataService.CURRENT_DEFAULT_SCOPE_VALUE,
                documents: []
            };
        });
        var query: Contributions_Contracts.ExtensionDataCollectionQuery = { collections: collections };
        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.queryCollectionsByName(query, this._publisherName, this._extensionName);
        });
    }

    /**
    * Returns a promise for querying a set of collections
    *
    * @param collections The list of collections to query. Each collection will contain its collectionName, scopeType, and scopeValue
    */
    public queryCollections(collections: Contributions_Contracts.ExtensionDataCollection[]): IPromise<Contributions_Contracts.ExtensionDataCollection[]> {
        var query: Contributions_Contracts.ExtensionDataCollectionQuery = { collections: collections };
        return this._extensionManagementPromise.then((emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) => {
            this._checkForClient(emsClient);
            return emsClient.queryCollectionsByName(query, this._publisherName, this._extensionName);
        });
    }

    private _checkDocument(document: any): void {
        if ($.isArray(document)) {
            throw new Error("The document cannot be an array.");
        }
    }

    private _checkDocumentOptions(documentOptions: IDocumentOptions): IDocumentOptions {
        if (!documentOptions) {
            documentOptions = { scopeType: "" };
        }
        if (documentOptions.scopeType === "") {
            documentOptions.scopeType = ExtensionDataService.DEFAULT_SCOPE_TYPE;
        }
        if (documentOptions.scopeType.toLowerCase() === ExtensionDataService.DEFAULT_SCOPE_TYPE.toLowerCase() && !documentOptions.scopeValue) {
            documentOptions.scopeValue = ExtensionDataService.CURRENT_DEFAULT_SCOPE_VALUE;
        }
        else if (documentOptions.scopeType.toLowerCase() === ExtensionDataService.USER_SCOPE_TYPE.toLowerCase() && !documentOptions.scopeValue) {
            documentOptions.scopeValue = ExtensionDataService.CURRENT_USER_SCOPE_VALUE;
        }
        else if (!documentOptions.scopeValue) {
            documentOptions.scopeValue = ExtensionDataService.CURRENT_DEFAULT_SCOPE_VALUE;
        }

        return documentOptions;
    }

    private _checkForClient(emsClient: ExtensionManagement_RestClient.ExtensionManagementHttpClient) {
        if (!emsClient) {
            const error = new Error("Cannot access data for users who are anonymous or not members of the account.");
            error.name = "AccessCheckException";
            throw error;
        }
    }

    private _createDictionaryForArray(docs: any[]): { [key: string]: any } {
        const docsById = {};
        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            if (doc.id) {
                docsById[doc.id] = doc;
            }
        }
        return docsById;
    }
}

SDK_Shim.VSS.register('ms.vss-web.data-service', (context: IDefaultGetServiceContext) => {
    return ExtensionDataService.getServiceInstance(context.extensionContext.publisherId, context.extensionContext.extensionId, context.hostManagementServiceOptions.registrationId, <any>context.webContext);
});
SDK_Shim.VSS.register('data-service', (context: IDefaultGetServiceContext) => {
    return ExtensionDataService.getServiceInstance(context.extensionContext.publisherId, context.extensionContext.extensionId, context.hostManagementServiceOptions.registrationId, <any>context.webContext);
});
