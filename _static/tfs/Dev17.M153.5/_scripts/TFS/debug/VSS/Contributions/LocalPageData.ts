/// <reference path='../../VSS/References/VSS.SDK.Interfaces.d.ts' />

import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Diag = require("VSS/Diag");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Serialization = require("VSS/Serialization");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");

let dataProviderResult: Contributions_Contracts.DataProviderResult;

function readJsonScript(elementId: string) {

    // Read from already-processed jsonIslandData property
    const jsonIslandData = (window as any).jsonIslandData;
    if (jsonIslandData && jsonIslandData[elementId]) {
        return jsonIslandData[elementId];
    }

    let element = document.getElementById(elementId);
    if (element) {
        let text = element.textContent;
        if (text) {
            return Serialization.deserializeVssJsonObject<any>(text);
        }
    }
    return null;
}

let dataProviderScope: { name?: string, value?: string } = {};
let dataProviderScopeSet = false;

/**
 * Gets the scope name and value of the data providers loaded by the page initially.
 */
export function getDataProviderScope(): { name?: string, value?: string } {
    return dataProviderScope;
}

/**
 * Gets the current data provider results
 */
export function getDataProviderResults(): Contributions_Contracts.DataProviderResult {
    // Only read from JSON island when data provider result is undefined. Allow setting it to null to clear the results.
    if (dataProviderResult === undefined) {
        dataProviderResult = Serialization.deserializeJsonIsland<Contributions_Contracts.DataProviderResult>($(".vss-web-page-data"), null);
        if (!dataProviderResult) {
            dataProviderResult = readJsonScript("dataProviders");
            if (dataProviderResult && dataProviderResult.exceptions) {
                for (let contributionId in dataProviderResult.exceptions) {
                    Diag.logWarning(Utils_String.format(Resources_Platform.DataProviderFailureMessageFormat, contributionId, dataProviderResult.exceptions[contributionId].message));
                }
            }
        }

        if (!dataProviderScopeSet) {
            if (dataProviderResult) {
                dataProviderScope.name = dataProviderResult.scopeName;
                dataProviderScope.value = dataProviderResult.scopeValue;
            }

            dataProviderScopeSet = true;
        }
    }
    return dataProviderResult;
}

/**
 * Clears the data provider results
 */
export function clearDataProviderResults() {
    // Set to null in which case getDataProviderResults will not attempt to read from page initial JSON island data
    dataProviderResult = null;
}

/**
 * Resets the data provider results to their initial state from JSON island data
 */
export function resetDataProviderResults(): Contributions_Contracts.DataProviderResult {
    // Set to undefined which will cause getDataProviderResults to read from page initial JSON island data
    dataProviderResult = undefined;

    // Scope needs to be reset when reading a complete new set of data provider result (FPS load)
    dataProviderScopeSet = false;
    
    return getDataProviderResults();
}

/**
 * Resets the data provider result object to the specified result
 * 
 * @param result Data provider result
 */
export function addDataProviderResults(result: Contributions_Contracts.DataProviderResult) {

    let providerResults = getDataProviderResults();
    if (!providerResults) {
        providerResults = {} as Contributions_Contracts.DataProviderResult;
        dataProviderResult = providerResults;
    }

    if (result.data) {
        if (!providerResults.data) {
            providerResults.data = result.data;
        }
        else {
            $.extend(providerResults.data, result.data);
        }
    }

    if (result.sharedData) {
        if (!providerResults.sharedData) {
            providerResults.sharedData = result.sharedData;
        }
        else {
            // deep copy of the shared data
            $.extend(true, providerResults.sharedData, result.sharedData);
        }
    }

    if (result.resolvedProviders) {
        if (!providerResults.resolvedProviders) {
            providerResults.resolvedProviders = result.resolvedProviders;
        }
        else {
            providerResults.resolvedProviders = providerResults.resolvedProviders.concat(result.resolvedProviders);
        }
    }
}

/**
 * Gets the contributed data for the specified contribution
 * 
 * @param contributionId Full id of the data provider contribution
 * @param contractMetadata Optional contract metdata to use when deserializing the result
 */
export function getData<T>(contributionId: string, contractMetadata?: Serialization.ContractMetadata): T {
    let result: T;

    let providerResults = getDataProviderResults();
    if (providerResults && providerResults.data) {
        result = providerResults.data[contributionId] as T;
        if (contractMetadata) {
            result = Serialization.ContractSerializer.deserialize(result, contractMetadata, false) as T;
        }
    }
    return result;
}

/**
 * Sets the data provider data for the given data provider contribution
 * 
 * @param contributionId Id of the data provider contribution
 * @param data Data provider result
 */
export function overrideData(contributionId: string, data: any) {
    let providerResults = getDataProviderResults();
    if (providerResults && providerResults.data) {
        providerResults.data[contributionId] = data;
    }
}

/**
 * Clears results for a given data provider contribution.
 *
 * @param contributionId Id of the data provider contribution
 */
export function removeData(contributionId: string) {
    let providerResults = getDataProviderResults();
    if (providerResults && providerResults.data) {
        delete providerResults.data[contributionId];
    }
}

/**
 * Gets the shared contributed data for the given key
 * 
 * @param sharedDataKey Shared data key
 * @param contractMetadata Optional contract metdata to use when deserializing the result
 */
export function getSharedData<T>(sharedDataKey: string, contractMetadata?: Serialization.ContractMetadata): T {
    let result: T;

    let providerResults = getDataProviderResults();
    if (providerResults && providerResults.sharedData) {
        result = providerResults.sharedData[sharedDataKey] as T;
        if (contractMetadata) {
            result = Serialization.ContractSerializer.deserialize(result, contractMetadata, false) as T;
        }
    }
    return result;
}

document.body.addEventListener("legacyFpsComplete", () => {
    // Set to undefined which will cause getDataProviderResults to read from page initial JSON island data
    dataProviderResult = undefined;

    // Scope needs to be reset when reading a complete new set of data provider result (FPS load)
    dataProviderScopeSet = false;
});
