export const enum RepoConstants {
    AttachmentsFolder = "/.attachments",
    TemplatesFolder = ".pageTemplates",
    RootPath = "/",
}

export const enum WikiActionIds {
    Compare = "compare",
    Edit = "edit",
    History = "history",
    Publish = "publish",
    View = "view",
    Update = "update",
}

export const enum CompareViews {
    Compare = "compare",
    Preview = "preview",
}

export const enum ContributionKeys {
    ImmersiveWikiHub = "ms.vss-wiki-web.immersive-overview-hub",
    WikiHub = "ms.vss-wiki-web.overview-hub",
    WikiTreeDataProvider = "ms.vss-wiki-web.wiki-tree-items-data-provider",
    WikiAdminSecuriytDataProvider = "ms.vss-wiki-web.wiki-admin-security-data-provider",
    wikiMarkdownSyntaxContribution = "ms.vss-wiki-web.wiki-extension-markdown-syntax",
    WikiPageIdDataProvider = "ms.vss-wiki-web.wiki-page-id-data-provider", 
}

export const enum ContributionScope {
    Project = "project",
}

export const enum VersionControlConstants {
    MaxRevisionsToFetch = 1,
    defaultBranch = "",
    OCommitVersionPrefix = "PGC",
    MCommitVersionPrefix = "GC",
}

export const enum WikiTreeNodeConstants {
    WikiTreeNodeDragEvent = "WikiTreeNodeDragEvent",
}

export const enum WikiErrorConstants {
    RequestNoLongerValid = "RequestNoLongerValid",
}

export const enum WikiUrlParameters {
    Anchor = "anchor",
}

export const enum WikiUserSettingKeys {
    WikiName = "WikiName",
}

export const enum WikiPageArtifact {
    // Artifact name must not be changed. "WikiPage" artifact is registered as "Wiki Page"
    Name = "Wiki Page",
}

// Maximum page content size allowed per file is 18MB. Following value is in bytes.
export const MAX_PAGE_CONTENT_SIZE = 18 * 1024 * 1024;

// Maximum attachment size allowed per file is 18MB. Following value is in bytes.
export const MAX_ATTACHMENT_FILE_SIZE = 18 * 1024 * 1024;

/* Following flags when passed with data provider call, fetches only required data.
 * By default all are "true".
 */
export interface DataProviderDataFlags {
    // flag to fetch wiki repo data : cloneUrl, sshUrl, sshEnabled and repository
    fetchWikiRepoData: string;

    // flag to fetch list of wiki pages
    fetchWikiPages: string;
}

export const enum TemplateConstants {
    Identifier = "template",
    TemplateDirectory = "/.templates",
    Marker = ":",
    TemplateOpenTag = "container_template_open",
    TemplateCloseTag = "container_template_close",
}

export const enum WikiMarkdownConstants {
    WikiBrokenLinkClass = "wiki-broken-link",
}

export enum PreviewMode {
    Full,
    Live,
    Off,
}
