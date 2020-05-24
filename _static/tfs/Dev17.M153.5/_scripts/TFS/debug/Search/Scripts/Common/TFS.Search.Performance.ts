// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Performance = require("VSS/Performance");

export class PerfConstants {
    public static Area = "SearchPortal";

    // Code perf scenarios
    public static RedirectedSearchPreviewOfFirstCodeResult = "VSO.Search.Code.RedirectedSearchPreviewOfFirstResult";
    public static PreviewOfFirstCodeResult = "VSO.Search.Code.PreviewOfFirstResult";
    public static FirstCodeSearchWithPreview = "VSO.Search.Code.FirstSearchWithPreview";
    public static SubsequentCodeSearchWithPreview = "VSO.Search.Code.SubsequentSearchWithPreview";
    public static PreviewOfSelectedCodeResult = "VSO.Search.Code.ResultSelectionChange";
    public static GetAccountFiltersForCodeResults = "VSO.Search.Code.GetAccountFilters";
    public static CodeSearchReactViewRendering = "VSO.Search.Code.ReactViewRendering";

    // Wit perf scenarios
    public static RedirectedSearchPreviewOfFirstWorkItemResult = "VSO.Search.WorkItem.RedirectedSearchPreviewOfFirstResult";
    public static PreviewOfFirstWorkItemResult = "VSO.Search.WorkItem.PreviewOfFirstWorkItemResult";
    public static FirstWorkItemSearchWithPreview = "VSO.Search.WorkItem.FirstSearchWithPreview";
    public static SubsequentWorkItemSearchWithPreview = "VSO.Search.WorkItem.SubsequentSearchWithPreview";
    public static PreviewOfSelectedWorkItemResult = "VSO.Search.WorkItem.WorkItemResultSelectionChange";
    public static WorkItemSearchReactViewRendering = "VSO.Search.WorkItem.ReactViewRendering";

    // Split time keys
    public static InitializeSearchProvidersStart = "VSO.Search.InitializeSearchProviders_Start"
    public static InitializeSearchProvidersEnd = "VSO.Search.InitializeSearchProviders_End"
    public static CodeResultPreviewOnNewSearchStart = "VSO.Search.CodeResultPreviewOnANewSearch_Start";
    public static CodeResultPreviewOnNewSearchEnd = "VSO.Search.CodeResultPreviewOnANewSearch_End";
    public static GetRepoContextStart = "VSO.Search.GetRepoContext_Start";
    public static GetRepoContextEnd = "VSO.Search.GetRepoContext_End";
    public static SearchQueryStart = "VSO.Search.SearchQuery_Start";
    public static SearchQueryEnd = "VSO.Search.SearchQuery_End";
    public static TenantSearchQueryStart = "VSO.Search.TenantSearchQuery_Start";
    public static TenantSearchQueryEnd = "VSO.Search.TenantSearchQuery_End";
    public static FileContentFetchStart = "VSO.Search.FileContentFetch_Start";
    public static FileContentFetchEnd = "VSO.Search.FileContentFetch_End";
    public static CustomFileContentFetchStart = "VSO.Search.CustomFileContentFetch_Start";
    public static CustomFileContentFetchEnd = "VSO.Search.CustomFileContentFetch_End";
    public static WorkItemSearchResultsRendered = "VSO.Search.WorkItemSearchResultsRendered";    
}

export class PerfScenario {
    private scenario: Performance.IScenarioDescriptor;

    constructor(scenario: Performance.IScenarioDescriptor) {
        this.scenario = scenario;
    }

    public split(splitName: string) {
        this.scenario.addSplitTiming(splitName);
    }
}

/**
 * Starts redirected code search perf scenario from navigationStartTime and mark the scenario as TTI
 */
export function startRedirectedCodeSearchScenario(): void {
    Performance.getScenarioManager().startScenarioFromNavigation(PerfConstants.Area, PerfConstants.RedirectedSearchPreviewOfFirstCodeResult, true);
    Performance.getScenarioManager().startScenarioFromNavigation(PerfConstants.Area, PerfConstants.FirstCodeSearchWithPreview, true);
}

/**
 * Starts subsequent code search perf scenario
 */
export function startSubsequentCodeSearchScenario(): void {
    Performance.getScenarioManager().startScenario(PerfConstants.Area, PerfConstants.PreviewOfFirstCodeResult);
    Performance.getScenarioManager().startScenario(PerfConstants.Area, PerfConstants.SubsequentCodeSearchWithPreview);
}

/**
 * Starts code result selection change search perf scenario
 */
export function startCodeResultSelectionChangeScenario(): void {
    Performance.getScenarioManager().startScenario(PerfConstants.Area, PerfConstants.PreviewOfSelectedCodeResult);
}

/**
 * Starts Get Account Filters For Code scenario
 */
export function startGetAccountFiltersForCodeScenario(): PerfScenario {
    return new PerfScenario(Performance.getScenarioManager().startScenario(
        PerfConstants.Area, PerfConstants.GetAccountFiltersForCodeResults));
}

/**
 * Ends Get Account Filters For Code scenario
 */
export function endGetAccountFiltersForCodeScenario(): void {
    Performance.getScenarioManager().endScenario(PerfConstants.Area, PerfConstants.GetAccountFiltersForCodeResults);
}

/**
 * Aborts Get Account Filters For Code scenario
 */
export function abortGetAccountFiltersForCodeScenario(): void {
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.GetAccountFiltersForCodeResults);
}

/**
 * Aborts all active code search perf scenarios
 */
export function abortCodeSearchPerfScenarios(): void {
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.RedirectedSearchPreviewOfFirstCodeResult);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.PreviewOfFirstCodeResult);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.PreviewOfSelectedCodeResult);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.GetAccountFiltersForCodeResults);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.FirstCodeSearchWithPreview);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.SubsequentCodeSearchWithPreview);
}

/**
 * Starts redirected wit search perf scenario from navigationStartTime and mark the scenario as TTI
 */
export function startRedirectedWitSearchScenario(): void {
    Performance.getScenarioManager().startScenarioFromNavigation(PerfConstants.Area, PerfConstants.RedirectedSearchPreviewOfFirstWorkItemResult, true);
    Performance.getScenarioManager().startScenarioFromNavigation(PerfConstants.Area, PerfConstants.FirstWorkItemSearchWithPreview, true);
}

/**
 * Starts subsequent wit search perf scenario
 */
export function startSubsequentWitSearchScenario(): void {
    Performance.getScenarioManager().startScenario(PerfConstants.Area, PerfConstants.PreviewOfFirstWorkItemResult);
    Performance.getScenarioManager().startScenario(PerfConstants.Area, PerfConstants.SubsequentWorkItemSearchWithPreview);
}

/**
 * Starts wit result selection change search perf scenario
 */
export function startWitResultSelectionChangeScenario(): void {
    Performance.getScenarioManager().startScenario(PerfConstants.Area, PerfConstants.PreviewOfSelectedWorkItemResult);
}

/**
 * Aborts all active wit search perf scenarios
 */
export function abortWitSearchPerfScenarios(): void {
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.RedirectedSearchPreviewOfFirstWorkItemResult);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.PreviewOfFirstWorkItemResult);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.FirstWorkItemSearchWithPreview);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.SubsequentWorkItemSearchWithPreview);
    Performance.getScenarioManager().abortScenario(PerfConstants.Area, PerfConstants.PreviewOfSelectedWorkItemResult);
}

/**
 * Starts a perf scenario for given scenario name
 */
export function startScenario(name: string): void {
    Performance.getScenarioManager().startScenario(PerfConstants.Area, name);
}

/**
 * Ends an active named perf scenario
 */
export function endScenario(name: string): void {
    Performance.getScenarioManager().endScenario(PerfConstants.Area, name);
}

/**
 * Adds split time to all active perf scenarios
 */
export function split(splitName: string): void {
    Performance.getScenarioManager().split(splitName);
}

/**
 * Returns current timestamp
 */
export function getTimestamp(): number {
    return Performance.getTimestamp();
}

/**
 * Returns page navigation start timestamp
 */
export function getNavigationStartTimestamp(): number {
    return Performance.getNavigationStartTimestamp();
}
