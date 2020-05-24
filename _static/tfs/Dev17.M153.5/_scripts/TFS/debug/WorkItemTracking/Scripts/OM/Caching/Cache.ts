import * as Diag from "VSS/Diag";
import { IndexedDBCacheProvider } from "WorkItemTracking/Scripts/OM/Caching/IndexedDBCacheProvider";
import { ICacheData, ICacheProvider } from "WorkItemTracking/Scripts/OM/Caching/Interfaces";
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { NullCacheProvider } from "WorkItemTracking/Scripts/OM/Caching/NullCacheProvider";
import { traceMessage } from "WorkItemTracking/Scripts/Trace";
export { ICacheData, ICacheProvider };

/**
 * Gets an instance of ICacheProvider depending on the browser support
 */
export function constructCacheProvider(): ICacheProvider {
    if (IndexedDBCacheProvider.isSupported()) {
        return new IndexedDBCacheProvider();
    }

    traceMessage(
        CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
        "Caching",
        CIConstants.WITCustomerIntelligenceFeature.WIT_CACHE_PROVIDER_INIT,
        "Could not find supported WIT cache provider"
    );

    // No supported cache provider found, fall back to null cache provider so that we'll always retrieve from server
    return new NullCacheProvider();
}
