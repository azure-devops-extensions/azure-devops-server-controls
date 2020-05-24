/* tslint:disable:no-unnecessary-override */
import * as Q from "q";

import { IMarketplaceData, MarketplaceLinkHelper } from "DistributedTaskControls/Common/MarketplaceLinkHelper";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import * as ContractsPlatform from "VSS/Common/Contracts/Platform";
import * as Context from "VSS/Context";
import { InstalledExtension, RequestedExtension } from "VSS/Contributions/Contracts";
import * as Diag from "VSS/Diag";
import * as ExtensionManagementRestClientAsync from "VSS/ExtensionManagement/RestClient";
import * as GalleryContracts from "VSS/Gallery/Contracts";
import * as GalleryRestClientAsync from "VSS/Gallery/RestClient";
import * as Locations from "VSS/Locations";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";


/**
 * @brief Source implementation for Extensions related communications with the server
 */
export class ExtensionDefinitionSource extends SourceBase {
   
    public static getKey(): string {
        return "ExtensionDefinitionSource";
    }

    public getExtensionsList(forceRefresh?: boolean): IPromise<GalleryContracts.PublishedExtension[]> {
        let deferred = Q.defer<GalleryContracts.PublishedExtension[]>();

        if (forceRefresh || !this._extensionsPromise) {
            this.getMarketplaceData().then((data: IMarketplaceData) => {
                if (data) {
                    let extensionsPromise = this.getExtensions(data.marketplaceUrl, this._category);

                    extensionsPromise.then((extensions: GalleryContracts.PublishedExtension[]) => {
                        deferred.resolve(extensions);
                        }, (error) => {
                            deferred.reject(error);
                            this._extensionsPromise = null;
                    });
                }
                else {
                    Diag.logError("Unexpected Error: Marketplace data provider is returning null.");
                }                
            }, (error) => {
                deferred.reject(error);
                this._extensionsPromise = null;

                Diag.logError(error);                                 
            });
            this._extensionsPromise = deferred.promise;                                
        }

        return this._extensionsPromise;
    }

    public getInstalledExtensionsList(forceRefresh?: boolean): IPromise<InstalledExtension[]> {
        let deferred = Q.defer<InstalledExtension[]>();

        if (forceRefresh || !this._installedExtensionsPromise) {
            let installedExtensionsPromise = this.getInstalledExtensions();

            installedExtensionsPromise.then((installedExtensions: InstalledExtension[]) => {
                deferred.resolve(installedExtensions);
            }, (error) => {
                deferred.reject(error);
                this._installedExtensionsPromise = null;
            });
            this._installedExtensionsPromise = deferred.promise;            
        }

        return this._installedExtensionsPromise;
    }

    public getRequestedExtensionsList(forceRefresh?: boolean): IPromise<RequestedExtension[]> {
        let deferred = Q.defer<RequestedExtension[]>();

        if (forceRefresh || !this._requestedExtensionsPromise) {
            let extensionDefinitionsPromise = this.getRequestedExtensions();

            extensionDefinitionsPromise.then((requestedExtensions: RequestedExtension[]) => {
                deferred.resolve(requestedExtensions);
            }, (error) => {
                deferred.reject(error);
                this._requestedExtensionsPromise = null;
            });
            this._requestedExtensionsPromise = deferred.promise;
        }

        return this._requestedExtensionsPromise;
    }

    public getMarketplaceData(): IPromise<IMarketplaceData> {
        let deferred = Q.defer<IMarketplaceData>();
        
        if (!Context.getPageContext().webAccessConfiguration.isHosted) {
            this._beginGetMarketPlaceData().then((data: IMarketplaceData) => {
                deferred.resolve(data);
            }, (error) => {
                deferred.reject(error);
            });
        }
        else {
            this._getGalleryLocation().then((url: string) => {
                deferred.resolve({marketplaceUrl: url, serverKey: null} as IMarketplaceData);
            }, (error) => {
                deferred.reject(error);
            });
        }

        return deferred.promise;
    }

    public static instance(): ExtensionDefinitionSource {
        return SourceManager.getSource(ExtensionDefinitionSource);
    }

    private _getGalleryLocation(): IPromise<string> {
        let deferred = Q.defer<string>();

        if (!this._galleryLocationPromise) {
            VSS.using(["VSS/Gallery/RestClient"], (GalleryRestClient: typeof GalleryRestClientAsync) => {
                let galleryServiceInstanceId = GalleryRestClient.GalleryHttpClient.serviceInstanceId;            
                Locations.beginGetServiceLocation(galleryServiceInstanceId , ContractsPlatform.ContextHostType.Deployment).then((galleryRootUrl: string) => {
                    deferred.resolve(galleryRootUrl);
                }, (error) => {
                    // deferred.reject(error);
                    // this._galleryLocationPromise = null;

                    // Using fallback marketplace url which is fetched from data provider.
                    this._beginGetMarketPlaceData().then((data: IMarketplaceData) => {
                        data ? deferred.resolve(data.marketplaceUrl) : Diag.logError("Unexpected Error: Marketplace data provider is returning null.");
                    }, (error) => {
                        deferred.reject(error);
                        this._galleryLocationPromise = null; 
                    });
                });
                }, (error) => {
                    deferred.reject(error);
                    this._galleryLocationPromise = null; 
            });
            this._galleryLocationPromise = deferred.promise;            
        }
        
        return this._galleryLocationPromise;
    }

    private _beginGetMarketPlaceData(): IPromise<IMarketplaceData>{
        let deferred = Q.defer<IMarketplaceData>();
        
        MarketplaceLinkHelper.beginGetMarketPlaceData().then((data: IMarketplaceData) => {
            deferred.resolve(data);
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;        
    }

    // Returns list of all extensions
    private getExtensions(galleryRootUrl: string, category: string): IPromise<GalleryContracts.PublishedExtension[]> {
        let deferred = Q.defer<GalleryContracts.PublishedExtension[]>();
        let query = <GalleryContracts.ExtensionQuery>{
            filters: [],
            assetTypes: ["Microsoft.VisualStudio.Services.Icons.Small"],
            flags: GalleryContracts.ExtensionQueryFlags.IncludeCategoryAndTags |
                   GalleryContracts.ExtensionQueryFlags.IncludeFiles |
                   GalleryContracts.ExtensionQueryFlags.IncludeInstallationTargets |
                   GalleryContracts.ExtensionQueryFlags.IncludeLatestVersionOnly |              
                   GalleryContracts.ExtensionQueryFlags.IncludeStatistics |
                   GalleryContracts.ExtensionQueryFlags.ExcludeNonValidated
        };

        query.filters.push(<GalleryContracts.QueryFilter>{
            criteria: [
                {
                    filterType: GalleryContracts.ExtensionQueryFilterType.Category,
                    value: category
                },
                {
                    filterType: GalleryContracts.ExtensionQueryFilterType.InstallationTarget,
                    value: "Microsoft.VisualStudio.Services.Cloud"
                },
                {
                    filterType: GalleryContracts.ExtensionQueryFilterType.ExcludeWithFlags,
                    value: this._getExtensionFlagValue()
                },
            ], 
            sortBy: GalleryContracts.SortByType.InstallCount,
            sortOrder: GalleryContracts.SortOrderType.Descending
        });

        this._queryExtensions(galleryRootUrl, query).then((extensions: GalleryContracts.PublishedExtension[]) => {
            deferred.resolve(extensions);
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    private _queryExtensions(galleryRootUrl: string, query: GalleryContracts.ExtensionQuery): IPromise<GalleryContracts.PublishedExtension[]> {
        let deferred = Q.defer<GalleryContracts.PublishedExtension[]>();
        
        VSS.requireModules(["VSS/Gallery/RestClient"]).spread((GalleryRestClient: typeof GalleryRestClientAsync) => {

            let galleryClient = new GalleryRestClient.GalleryHttpClient3_1(galleryRootUrl);
            galleryClient.forceOptionsCallForAutoNegotiate = false;

           // Now populate data once everything is available
           galleryClient.queryExtensions(query).then((queryResult: GalleryContracts.ExtensionQueryResult) => {
               // Resolve with extensions result
               deferred.resolve(queryResult.results[0].extensions);
           }, (error) => {
               deferred.reject(error);
           });
       });

       return deferred.promise;
    }
    
    private getInstalledExtensions(): IPromise<InstalledExtension[]> {
        let deferred = Q.defer<InstalledExtension[]>();

        this._getExtensionManagementClient().then((client) => {
            // Get installed extensions
            client.getInstalledExtensions().then((installedExtensions: InstalledExtension[]) => {
                deferred.resolve(installedExtensions);
            }, (error) => {
                deferred.reject(error);
            });
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    private getRequestedExtensions(): IPromise<RequestedExtension[]> {
        let deferred = Q.defer<RequestedExtension[]>();
        // Get EMS client
        this._getExtensionManagementClient().then((client) => {
            // Get requested extensions
            client.getRequests().then((requestedExtensions: RequestedExtension[]) => {
                deferred.resolve(requestedExtensions);
            }, (error) => {
                deferred.reject(error);
            });
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }
    
    private _getExtensionManagementClient(): IPromise<ExtensionManagementRestClientAsync.ExtensionManagementHttpClient> {
        let deferred = Q.defer<ExtensionManagementRestClientAsync.ExtensionManagementHttpClient>();

        if (!this._extensionManagementClientPromise) {
            VSS.requireModules(["VSS/ExtensionManagement/RestClient"]).spread((ExtensionManagementRestClient: typeof ExtensionManagementRestClientAsync) => {
                deferred.resolve(Service.getClient(ExtensionManagementRestClient.ExtensionManagementHttpClient));
            }, (error) => {
                deferred.reject(error);
            });
            this._extensionManagementClientPromise = deferred.promise;
        }
        
        return this._extensionManagementClientPromise;
    }

    private _getExtensionFlagValue(): string {
        return (GalleryContracts.PublishedExtensionFlags.BuiltIn | GalleryContracts.PublishedExtensionFlags.System | GalleryContracts.PublishedExtensionFlags.Unpublished).toString();
    }

    private _extensionsPromise: IPromise<GalleryContracts.PublishedExtension[]>;
    private _installedExtensionsPromise: IPromise<InstalledExtension[]>;
    private _requestedExtensionsPromise: IPromise<RequestedExtension[]>;
    private _extensionManagementClientPromise: IPromise<ExtensionManagementRestClientAsync.ExtensionManagementHttpClient>;
    private _galleryLocationPromise: IPromise<string>;
    private readonly _category: string = "Build and release";
}