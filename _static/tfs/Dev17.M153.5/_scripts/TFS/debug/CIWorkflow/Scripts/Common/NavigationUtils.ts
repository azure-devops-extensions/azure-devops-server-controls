import { OthersSource } from "CIWorkflow/Scripts/Common/Constants";

import * as NavigationService from "VSS/Navigation/Services";

export class NavigationUtils {

    public static getSourceFromUrl(): string {
        let state = NavigationService.getHistoryService().getCurrentState();
        let source = (state && state.source) ? state.source : OthersSource;

        return source;
    }

    public static getRepositoryNameFromUrl(): string {
        const state = NavigationService.getHistoryService().getCurrentState();
        const repositoryName = (state && state.repository) ? state.repository : "";

        return repositoryName;
    }
    
    public static getRepositoryTypeFromUrl(): string {
        const state = NavigationService.getHistoryService().getCurrentState();
        const repositoryType = (state && state.repositoryType) ? state.repositoryType : "";

        return repositoryType;
    }

    public static getConnectionIdFromUrl(): string {
        const state = NavigationService.getHistoryService().getCurrentState();
        return (state && state.connectionId) ? state.connectionId : "";
    }

    public static getBranchNameFromUrl(): string {
        const state = NavigationService.getHistoryService().getCurrentState();
        return (state && state.branchName) ? state.branchName : "";
    }

}