/**
 * Defines states common to all GIT source control
 */
export interface ICommonGitState {
    checkoutSubmodules: boolean;
    checkoutNestedSubmodules: boolean;
    cleanOptions?: string;
    depth?: string;
    gitLfsSupportStatus?: boolean;
    reportBuildStatus?: boolean;
    shallowFetchStatus?: boolean;
    skipSyncSourcesStatus?: boolean;
}