import Search_Shared_Contracts = require("Search/Scripts/Generated/Search.SharedLegacy.Contracts");

/***
* Temporarily adding these interfaces. It will be replaced by the one which is auto-generated when our controllers become genclient compliant
*/

export interface CodeQueryResponse extends Search_Shared_Contracts.EntitySearchResponse {
    query: SearchQuery;
    results: CodeResults;
}

export interface CodeResult {
    /**
     * Branch of the result file. TODO : [hapahuja] - This field is deprecated.
     */
    branch: string;
    /**
     * ChangeId is the Id of last change in the result file.
     */
    changeId: string;
    /**
     * Collection of the result file.
     */
    collection: string;
    /**
     * ContentId of the resultId.
     */
    contentId: string;
    /**
     * Name of the result file.
     */
    fileName: string;
    /**
     * TODO : [hapahuja] - This field is deprecated. Number of hits in the result file.
     */
    hitCount: number;
    /**
     * TODO : [hapahuja] -This field is deprecated. List of hit offsets in the result file.
     */
    hits: Search_Shared_Contracts.Hit[];
    /**
     * Dictionary of field to hit offsets in the result file. key identifies the area in which hit's were found, for ex: file content/file name etc. In subsequent sprints, Hits defined above will be a member of this.
     */
    matches: { [key: string] : Search_Shared_Contracts.Hit[]; };
    /**
     * Path at which result file is present.
     */
    path: string;
    /**
     * Project of the result file.
     */
    project: string;
    /**
     * Repository of the result file.
     */
    repository: string;
    /**
     * Repository ID of the result file. If not accessible or of type TFVC it is null
     */
    repositoryId: string;
    /**
     * Version Control type of the result file. It returns 'Git' or 'Tfvc' type.
     */
    vcType: VersionControlType;
    /**
     * Branches of the result file.
     */
    versions: string[];
}

export interface CodeResults {
    count: number;
    values: CodeResult[];
}

export interface SearchQuery extends Search_Shared_Contracts.EntitySearchQuery {
}

export enum VersionControlType {
    Git = 0,
    Tfvc = 1,
    Custom = 2
}

export var TypeInfo = {
    CodeQueryResponse: <any>{
    },
    CodeResult: <any>{
    },
    CodeResults: <any>{
    },
    VersionControlType: {
        enumValues: {
            "git": 0,
            "tfvc": 1,
            "custom": 2
        }
    },
};

TypeInfo.CodeQueryResponse.fields = {
    errors: {
        isArray: true,
        typeInfo: Search_Shared_Contracts.TypeInfo.ErrorData
    },
    results: {
        typeInfo: TypeInfo.CodeResults
    }
};

TypeInfo.CodeResult.fields = {
    vcType: {
        enumType: TypeInfo.VersionControlType
    }
};

TypeInfo.CodeResults.fields = {
    values: {
        isArray: true,
        typeInfo: TypeInfo.CodeResult
    }
};