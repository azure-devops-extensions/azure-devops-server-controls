// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

// definitions for web calls
export class WebApiConstants {

    public static Area = "search";

    // Search query entity resource location ids
    public static CodeQueryResultsLocationId = "948CA594-7923-4834-B721-7F3875F51E6C";
    public static TenantCodeQueryResultsLocationId = "21A1F7F9-8DB1-4F7E-8CFB-4AE78E972088";
    public static ProjectQueryResultsLocationId = "84F82F3E-772F-4294-ADE5-231E40B9EE23";

    public static CodeIndexLocationId = "5A15DEB0-9F03-4B84-A004-2F1C6717D8B4";

    public static SearchApiVersion = "1.0-preview.1";

    // TFS controller API for search queries

    public static codeIndexApi = "codeIndex";
    public static PostCodeQueryTfsApi = "postCodeQuery";
    public static PostProjectQueryTfsApi = "postProjectQuery";
    public static PostWorkItemQueryTfsApi = "postWorkItemQuery";
    public static PostTenantCodeQueryTfsApi = "postTenantCodeQuery";
    public static ConditionalWorkitemSearchFaultIn = "workItemSearchConditionalFaultin";

    // Search service REST API
    public static ProjectQueryResultsApi = "projectQueryResults";

    public static CodeQueryResultsApi = "codeQueryResults";

    public static CodeIndexApi = "codeIndex";

}

/*
* Define the typeInfo object for the response recieved from the search service.
* The response contains an enum which is serialized to string value by the vssf framework,
* type info object defined here specifies the deserialization properties for an enum received as string
* the deserialization code at the client side will take care of it converting back to integer value
* given that we have specified the enum type here e.g. versionContronEnumType.
*/
export var TypeInfo = {
    ICodeSearchQueryResponse: {
        fields: <any> null
    },
    CodeResults: {
        fields: <any> null
    },
    CodeResult: {
        fields: <any> null
    },
    VersionControlEnumType: {
        enumValues: {
            "git": 0,
            "tfvc": 1,
            "custom": 2
        }
    },
    IProjectSearchQueryResponse: {
        fields: <any> null
    }
}

TypeInfo.CodeResult.fields = {
    vcType: {
        enumType: TypeInfo.VersionControlEnumType
    }
}

TypeInfo.CodeResults.fields = {
    values: {
        isArray: true,
        typeInfo: TypeInfo.CodeResult
    }
}

TypeInfo.ICodeSearchQueryResponse.fields = {
    results: {
        typeInfo: TypeInfo.CodeResults
    }
}