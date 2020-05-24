// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict"

import Utils_String = require("VSS/Utils/String");
import CodeContracts = require("Search/Scripts/Contracts/TFS.Search.Code.Contracts");

export class Utils {
    public static getComparer(fieldReferenceName: string, sortOrder: string): any {
        return (first: CodeContracts.CodeResult, second: CodeContracts.CodeResult) => {

            let v1 = first[fieldReferenceName],
                v2 = second[fieldReferenceName];
            let compareValue: any;
            //This is to handle "show more" row which is a part of results to be sorted but its fieldReferenceName is not defined.
            //So we append show more to the end.
            if (typeof (v1) === "undefined") {
                return 1;
            }
            else if (typeof (v2) === "undefined") {
                return -1;
            }

            if (Utils_String.ignoreCaseComparer("relevance", fieldReferenceName) === 0) {
                compareValue = v1 - v2;
            }
            else {
                compareValue = Utils_String.ignoreCaseComparer(v1, v2);
            }

            return (sortOrder === "desc") ? -compareValue : compareValue;
        };
    }
    public static sort(source: any, comparer: any): Array<any> {
        let sortedArray: Array<any>;
        if (source && $.isArray(source) && comparer) {
            sortedArray = (source as Array<any>).sort(comparer);
        }

        return sortedArray;
    }

}