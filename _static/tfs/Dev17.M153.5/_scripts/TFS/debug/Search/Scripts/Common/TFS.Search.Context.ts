// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Context = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

var tfsContext = Context.TfsContext.getDefault();

/**
 * Wraps TfsContext and provides customizations based on current context (account vs project)
 * Search exposes Tfs artifacts such as code etc at account context which are actually scoped
 * to project collection. This class impersonates project collection from account scope if needed
 */
export class SearchContext {

    /**
     * Returns the original context
     */
    public static getDefaultContext(): Context.TfsContext {
        return tfsContext;
    }

    /**
     * Returns Tfs context to use. In case the page is in account context, creates a collection context
     * @param collectionName Collection name to use, if not specified, "defaultcollection" is assumed
     * @param clone makes a new copy of the context
     */
    public static getTfsContext(collectionName?: string, clone?: boolean): Context.TfsContext {
        var searchTfsContext: Context.TfsContext;

        if (SearchContext.isAccountContext()) {
            var collection: string = collectionName || "defaultcollection";
            searchTfsContext = SearchContext.createCollectionTfsContext(collection);
        }
        else {
            searchTfsContext = clone ? <Context.TfsContext> $.extend(true, {}, tfsContext) : tfsContext;
        }

        return searchTfsContext;
    }

    /**
     * Checks if we are in account context or not.
     * @return Returns true if we are in account context else false.
     */
    public static isAccountContext(): boolean {
        return (tfsContext.navigation.serviceHost.hostType === Context.NavigationContextLevels.Application);
    }

    /**
     * Checks if we are in account or collection context
     * @return Returns true if we are in account or collection context else false.
     */
    public static isAccountOrCollectionContext(): boolean {
        return (SearchContext.isAccountContext()
                || !tfsContext.navigation.project
                || tfsContext.navigation.project === "");
    }

    /**
     * Checks if we are in Hosted or not.
     * @return Returns true if we are in Hosted else false.
     */
    public static isHosted(): boolean {
        return (tfsContext.isHosted === true);
    }

    /**
     * Creates a collection context for the given collection name
     */
    public static createCollectionTfsContext(collectionName: string): Context.TfsContext {
        var collectionServiceHost: Context.IServiceHost = SearchContext.createCollectionServiceHost(collectionName);
        return tfsContext.getCollectionTfsContext(collectionServiceHost);
    }

    /**
     * Creates a collection service host (provides collection context) for the given collection name
     */
    public static createCollectionServiceHost(collectionName: string): Context.IServiceHost {
        var collectionServiceHost: Context.IServiceHost = {
            instanceId: "",
            name: collectionName,
            hostType: Context.TeamFoundationHostType.ProjectCollection,
            vDir: "/" + collectionName + "/",
            relVDir: collectionName,
            uri: tfsContext.navigation.serviceHost.uri + collectionName + "/"
        };

        return collectionServiceHost;
    }

    /**
     * Returns Tfs search controller path for the given action
     */
    public static getActionUrl(action: string): string {
        return SearchContext.getTfsContext().getActionUrl(action, "search", { area: "api" });
    }

    /**
     * Returns Tfs search controller path for the given action
     */
    public static getRoutedActionUrl(action: string, routeData: any): string {
        return SearchContext.getTfsContext().getActionUrl(action, "search", routeData);
    }

    /**
    * Returns root request path that includes collection
    */
    public static getRootRequestPath(collectionName?: string): string {
        if (SearchContext.isAccountContext()) {
            var collection: string = collectionName || "DefaultCollection";
            return tfsContext.navigation.publicAccessPoint.uri + collection + "/";
        }
        else {
            return tfsContext.navigation.serviceHost.vDir;
        }
    }

    /**
    * Returns root request path that includes collection
    */
    public static getRootApplicationPath(): string {
        return tfsContext.navigation.publicAccessPoint.uri;
    }
}
