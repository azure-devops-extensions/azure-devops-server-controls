/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\client\sourcecontrol\clientgeneratorconfigs\genclient.json
 */

"use strict";

import TFS_VersionControl_Contracts = require("TFS/VersionControl/Contracts");

/**
 * Modes for displaying comments in the Changes Explorer grid
 */
export enum ChangeExplorerGridCommentsMode {
    Default = 0,
    Off = 1,
    OnlyFilesWithComments = 2,
    CommentsOnly = 3,
    ActiveCommentsUnderFiles = 4,
    OnlyFilesWithActiveComments = 5
}

/**
 * Modes for displaying items in the Change Explorer grid
 */
export enum ChangeExplorerGridDisplayMode {
    FilesByFolder = 0,
    FilesOnly = 1,
    FullTree = 2,
    SingleFoldersExceptFirstlevel = 3
}

/**
 * Modes for displaying code review creation control
 */
export enum CodeReviewCreateMode {
    Basic = 1,
    Advanced = 2
}

/**
 * Modes for remembering landing page selection
 */
export enum CodeReviewLandingPageMode {
    RequestedByMe = 0,
    AssignedToMe = 1,
    AssignedToTeam = 2,
    AllPullRequests = 3
}

export interface DefaultRepositoryInformation {
    defaultGitRepoName: string;
    defaultGitRepoUrl: string;
    defaultRepoCanFork: boolean;
    defaultRepoId: string;
    defaultRepoIsFork: boolean;
    defaultRepoIsGit: boolean;
    /**
     * If on a Code URL and the requested repository name wasn't found, else null.
     */
    notFoundRepoName: string;
    supportsTfvc: boolean;
}

/**
 * Options for the image viewer mode
 */
export enum DiffViewerImageMode {
    Flipper = 1,
    TrueDiff = 2,
    TwoUp = 3
}

/**
 * Options for Diff viewer orientation
 */
export enum DiffViewerOrientation {
    SideBySide = 1,
    Inline = 2
}

export interface EditorPreferences {
    foldingEnabled: boolean;
    minimapEnabled: boolean;
    theme: string;
    whiteSpaceEnabled: boolean;
    wordWrapEnabled: boolean;
}

export interface FavoriteItemModel {
    path: string;
    repositoryId: string;
    version: string;
}

/**
 * Modes for remembering the state of the delete source branch checkbox on the Complete Merge Dialog
 */
export enum MergeOptionsDeleteSourceCheckboxMode {
    Unchecked = 0,
    Checked = 1
}

/**
 * Modes for remembering the state of the squash merge checkbox on the Complete Merge Dialog
 */
export enum MergeOptionsSquashMergeCheckboxMode {
    Unchecked = 0,
    Checked = 1
}

/**
 * Modes for remembering the state of the transition work items checkbox on the Complete Merge Dialog
 */
export enum MergeOptionsTransitionWorkItemsCheckboxMode {
    Unchecked = 0,
    Checked = 1
}

/**
 * Expand/Collapse state for the description block on the Pull Request Review
 */
export enum PullRequestActivityDescriptionExpanded {
    Expanded = 0,
    Collapsed = 1
}

/**
 * Sort order for the activity feed for the Pull Request Review
 */
export enum PullRequestActivityOrder {
    Time_NewFirst = 1,
    Time_OldFirst = 2
}

export interface VersionControlAdminViewModel {
    defaultGitRepositoryId: string;
    gitRepositories: TFS_VersionControl_Contracts.GitRepository[];
    gitRepositoryPermissionSet: string;
    projectGuid: string;
    projectUri: string;
    projectVersionControlInfo: TFS_VersionControl_Contracts.VersionControlProjectInfo;
    tfsRepositoryPermissionSet: string;
}

export interface VersionControlRepositoryOption {
    category: string;
    displayHtml: string;
    key: string;
    value: boolean;
}

export interface VersionControlUserPreferences {
    changeExplorerGridCommentsMode: ChangeExplorerGridCommentsMode;
    changeExplorerGridDisplayMode: ChangeExplorerGridDisplayMode;
    codeReviewCreateMode: CodeReviewCreateMode;
    codeReviewLandingPageMode: CodeReviewLandingPageMode;
    diffViewerImageMode: DiffViewerImageMode;
    diffViewerOrientation: DiffViewerOrientation;
    editorPreferences: EditorPreferences;
    mergeOptionsDeleteSourceCheckboxMode: MergeOptionsDeleteSourceCheckboxMode;
    mergeOptionsSquashMergeCheckboxMode: MergeOptionsSquashMergeCheckboxMode;
    mergeOptionsTransitionWorkItemsCheckboxMode: MergeOptionsTransitionWorkItemsCheckboxMode;
    pullRequestActivityDescriptionExpanded: PullRequestActivityDescriptionExpanded;
    pullRequestActivityFilter: number;
    pullRequestActivityOrder: PullRequestActivityOrder;
    pullRequestListCustomCriteria: string;
    summaryDiffOrientation: DiffViewerOrientation;
}

export interface VersionControlViewModel {
    activeImportRequest: TFS_VersionControl_Contracts.GitImportRequest;
    cloneUrl: string;
    defaultGitBranchName: string;
    deletedUserDefaultBranchName: string;
    gitRepository: TFS_VersionControl_Contracts.GitRepository;
    isEmptyRepository: boolean;
    openInVsLink: string;
    projectGuid: string;
    projectUri: string;
    projectVersionControlInfo: TFS_VersionControl_Contracts.VersionControlProjectInfo;
    repositoryPermissionSet: string;
    reviewMode: boolean;
    showCloneButtonOnL2Header: boolean;
    sshEnabled: boolean;
    sshUrl: string;
    vcUserPreferences: VersionControlUserPreferences;
}

export var TypeInfo = {
    ChangeExplorerGridCommentsMode: {
        enumValues: {
            "default": 0,
            "off": 1,
            "onlyFilesWithComments": 2,
            "commentsOnly": 3,
            "activeCommentsUnderFiles": 4,
            "onlyFilesWithActiveComments": 5
        }
    },
    ChangeExplorerGridDisplayMode: {
        enumValues: {
            "filesByFolder": 0,
            "filesOnly": 1,
            "fullTree": 2,
            "singleFoldersExceptFirstlevel": 3
        }
    },
    CodeReviewCreateMode: {
        enumValues: {
            "basic": 1,
            "advanced": 2
        }
    },
    CodeReviewLandingPageMode: {
        enumValues: {
            "requestedByMe": 0,
            "assignedToMe": 1,
            "assignedToTeam": 2,
            "allPullRequests": 3
        }
    },
    DiffViewerImageMode: {
        enumValues: {
            "flipper": 1,
            "trueDiff": 2,
            "twoUp": 3
        }
    },
    DiffViewerOrientation: {
        enumValues: {
            "sideBySide": 1,
            "inline": 2
        }
    },
    MergeOptionsDeleteSourceCheckboxMode: {
        enumValues: {
            "unchecked": 0,
            "checked": 1
        }
    },
    MergeOptionsSquashMergeCheckboxMode: {
        enumValues: {
            "unchecked": 0,
            "checked": 1
        }
    },
    MergeOptionsTransitionWorkItemsCheckboxMode: {
        enumValues: {
            "unchecked": 0,
            "checked": 1
        }
    },
    PullRequestActivityDescriptionExpanded: {
        enumValues: {
            "expanded": 0,
            "collapsed": 1
        }
    },
    PullRequestActivityOrder: {
        enumValues: {
            "time_NewFirst": 1,
            "time_OldFirst": 2
        }
    },
    VersionControlAdminViewModel: <any>{
    },
    VersionControlUserPreferences: <any>{
    },
    VersionControlViewModel: <any>{
    },
};

TypeInfo.VersionControlAdminViewModel.fields = {
    gitRepositories: {
        isArray: true,
        typeInfo: TFS_VersionControl_Contracts.TypeInfo.GitRepository
    },
    projectVersionControlInfo: {
        typeInfo: TFS_VersionControl_Contracts.TypeInfo.VersionControlProjectInfo
    }
};

TypeInfo.VersionControlUserPreferences.fields = {
    changeExplorerGridCommentsMode: {
        enumType: TypeInfo.ChangeExplorerGridCommentsMode
    },
    changeExplorerGridDisplayMode: {
        enumType: TypeInfo.ChangeExplorerGridDisplayMode
    },
    codeReviewCreateMode: {
        enumType: TypeInfo.CodeReviewCreateMode
    },
    codeReviewLandingPageMode: {
        enumType: TypeInfo.CodeReviewLandingPageMode
    },
    diffViewerImageMode: {
        enumType: TypeInfo.DiffViewerImageMode
    },
    diffViewerOrientation: {
        enumType: TypeInfo.DiffViewerOrientation
    },
    mergeOptionsDeleteSourceCheckboxMode: {
        enumType: TypeInfo.MergeOptionsDeleteSourceCheckboxMode
    },
    mergeOptionsSquashMergeCheckboxMode: {
        enumType: TypeInfo.MergeOptionsSquashMergeCheckboxMode
    },
    mergeOptionsTransitionWorkItemsCheckboxMode: {
        enumType: TypeInfo.MergeOptionsTransitionWorkItemsCheckboxMode
    },
    pullRequestActivityDescriptionExpanded: {
        enumType: TypeInfo.PullRequestActivityDescriptionExpanded
    },
    pullRequestActivityOrder: {
        enumType: TypeInfo.PullRequestActivityOrder
    },
    summaryDiffOrientation: {
        enumType: TypeInfo.DiffViewerOrientation
    }
};

TypeInfo.VersionControlViewModel.fields = {
    activeImportRequest: {
        typeInfo: TFS_VersionControl_Contracts.TypeInfo.GitImportRequest
    },
    gitRepository: {
        typeInfo: TFS_VersionControl_Contracts.TypeInfo.GitRepository
    },
    projectVersionControlInfo: {
        typeInfo: TFS_VersionControl_Contracts.TypeInfo.VersionControlProjectInfo
    },
    vcUserPreferences: {
        typeInfo: TypeInfo.VersionControlUserPreferences
    }
};
