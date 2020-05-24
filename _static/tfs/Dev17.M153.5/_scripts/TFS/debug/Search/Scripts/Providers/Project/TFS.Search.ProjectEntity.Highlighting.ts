// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Project_Contracts = require("Search/Scripts/Contracts/TFS.Search.Project.Contracts");

export class ProjectEntityHighlighting {

    /**
    * Constructs and returns highlighted content from project result object for a field.
    * @param result Project result object.
    * @param field One of the result fields for which highligted content is calculated.
    *
    * @returns Highlighted content for a field
    */
    public getHighlightedContent(result: Project_Contracts.ProjectResult, field: string): string {
        var highlights: string[] = this.getHighlightsForAField(result, field),
            content: string = "";
    
        for (var highlight in highlights) {
            content = content + highlights[highlight] + " ... ";
        }
    
        return content;
    }

    /**
    * Constructs and returns list of highlights for a field in a result.
    * @param result Project result object.
    * @param field One of the result fields for which highligted content is calculated.
    *
    * @returns List of highlights for a field
    */
    public getHighlightsForAField(result: Project_Contracts.ProjectResult, field: string): string[] {
        var hits: Project_Contracts.IHighlight[] = result.hits;

        for (var hit in hits) {
            if (hits[hit].field === field) {
                return hits[hit].highlights;
            }
        }

        return null;
    }

}