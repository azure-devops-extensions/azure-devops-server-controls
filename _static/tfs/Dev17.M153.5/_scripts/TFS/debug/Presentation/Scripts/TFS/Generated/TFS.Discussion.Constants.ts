
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.VisualStudio.Services.CodeReview.Discussion.WebApi
//----------------------------------------------------------


export module DiscussionThreadPropertyNames {
    export var ItemPath = "Microsoft.TeamFoundation.Discussion.ItemPath";
    export var StartLine = "Microsoft.TeamFoundation.Discussion.Position.StartLine";
    export var EndLine = "Microsoft.TeamFoundation.Discussion.Position.EndLine";
    export var StartColumn = "Microsoft.TeamFoundation.Discussion.Position.StartColumn";
    export var EndColumn = "Microsoft.TeamFoundation.Discussion.Position.EndColumn";
    export var StartCharPosition = "Microsoft.TeamFoundation.Discussion.Position.StartCharPosition";
    export var EndCharPosition = "Microsoft.TeamFoundation.Discussion.Position.EndCharPosition";
    export var PositionContext = "Microsoft.TeamFoundation.Discussion.Position.PositionContext";
}

export module DiscussionWebApiConstants {
    export var MultipleThreadsLocationId = "a50ddbe2-1a1d-4c55-857f-73c6a3a31722";
    export var ThreadsLocationId = "010054f6-d9ed-4ed2-855f-7f86bff10c02";
    export var ThreadsBatchLocationId = "255a0b5e-3c2f-43c2-a688-36c878210ba2";
    export var MultipleCommentsLocationId = "20933fc0-b6a7-4a57-8111-a7458da5441b";
    export var CommentsLocationId = "495211bd-b463-4578-86fe-924ea4953693";
    export var AreaId = "6823169A-2419-4015-B2FD-6FD6F026CA00";
    export var AreaName = "discussion";
    export var MultipleThreadsLocationIdString = "A50DDBE2-1A1D-4C55-857F-73C6A3A31722";
    export var ThreadsLocationIdString = "010054F6-D9ED-4ED2-855F-7F86BFF10C02";
    export var MultipleCommentsLocationIdString = "20933FC0-B6A7-4A57-8111-A7458DA5441B";
    export var CommentsLocationIdString = "495211BD-B463-4578-86FE-924EA4953693";
    export var CodeReviewArtifactType = "ReviewId";
    export var CodeReviewArtifactTool = "CodeReview";
    export var MaxCommentContentLength = 150000;
}

export interface ArtifactDiscussionThread {
    _links: any;
    artifactUri: string;
    comments: DiscussionComment[];
    commentsCount: number;
    id: number;
    isDeleted: boolean;
    lastUpdatedDate: Date;
    properties: any;
    publishedDate: Date;
    status: DiscussionStatus;
    workItemId: number;
}

/**
* The type of a comment.
*/
export enum CommentType {
    Unknown = 0,
    Text = 1,
    CodeChange = 2,
    System = 3,
}

export interface DiscussionComment {
    _links: any;
    author: any;
    canDelete: boolean;
    commentType: CommentType;
    content: string;
    /**
    * CommentId in a thread always starting from 1.
    */
    id: any;
    isDeleted: boolean;
    lastContentUpdatedDate: Date;
    lastUpdatedDate: Date;
    /**
    * Used for comment replies. It must be a commentId of a comment in comment list of a thread.
    */
    parentId: any;
    publishedDate: Date;
    threadId: number;
    usersLiked: any[];
}

/**
* The severity of a discussion.
*/
export enum DiscussionSeverity {
    Unknown = 0,
    Low = 1,
    Normal = 2,
    High = 3,
}

/**
* The status of a discussion.
*/
export enum DiscussionStatus {
    Unknown = 0,
    Active = 1,
    Fixed = 2,
    WontFix = 3,
    Closed = 4,
    ByDesign = 5,
    Pending = 6,
}

export interface DiscussionThread {
    _links: any;
    artifactUri: string;
    comments: DiscussionComment[];
    commentsCount: number;
    id: number;
    /**
    * A discussion is considered as deleted when all its comments are deleted. If thread has comments property set to null or Comments.Length is zero then return false. This property returns false by default because for all REST API calls comments property is not set.
    */
    isDeleted: boolean;
    lastUpdatedDate: Date;
    properties: any;
    publishedDate: Date;
    status: DiscussionStatus;
    workItemId: number;
}

export var TypeInfo = {
    ArtifactDiscussionThread: {
        fields: <any>null
    },
    CommentType: {
        enumValues: {
            "unknown": 0,
            "text": 1,
            "codeChange": 2,
            "system": 3,
        }
    },
    DiscussionComment: {
        fields: <any>null
    },
    DiscussionSeverity: {
        enumValues: {
            "unknown": 0,
            "low": 1,
            "normal": 2,
            "high": 3,
        }
    },
    DiscussionStatus: {
        enumValues: {
            "unknown": 0,
            "active": 1,
            "fixed": 2,
            "wontFix": 3,
            "closed": 4,
            "byDesign": 5,
            "pending": 6,
        }
    },
    DiscussionThread: {
        fields: <any>null
    }
}

TypeInfo.ArtifactDiscussionThread.fields = {
    publishedDate: {
        isDate: true
    },
    lastUpdatedDate: {
        isDate: true
    },
    comments: {
        isArray: true,
        typeInfo: TypeInfo.DiscussionComment
    },
    status: {
        enumType: TypeInfo.DiscussionStatus
    }
}
TypeInfo.DiscussionComment.fields = {
    publishedDate: {
        isDate: true
    },
    lastUpdatedDate: {
        isDate: true
    },
    lastContentUpdatedDate: {
        isDate: true
    },
    commentType: {
        enumType: TypeInfo.CommentType
    }
}
TypeInfo.DiscussionThread.fields = {
    publishedDate: {
        isDate: true
    },
    lastUpdatedDate: {
        isDate: true
    },
    comments: {
        isArray: true,
        typeInfo: TypeInfo.DiscussionComment
    },
    status: {
        enumType: TypeInfo.DiscussionStatus
    }
}


