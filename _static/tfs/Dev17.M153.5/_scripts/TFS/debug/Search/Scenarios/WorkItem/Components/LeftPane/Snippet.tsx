import * as React from "react";
import { ResultsViewConstants } from "Search/Scenarios/WorkItem/Constants";
import { sanitizeHtml } from "Search/Scenarios/WorkItem/Utils";
import { HighlightFragment } from "Search/Scenarios/WorkItem/Flux/Stores/SnippetFragmentCache";

import "VSS/LoaderPlugins/Css!Search/Scenarios/WorkItem/Components/LeftPane/Snippet";

export interface SnippetProps {
    fragmentFieldReferenceNames: string[];

    fragments: IDictionaryStringTo<HighlightFragment>;
}

export const Snippet: React.StatelessComponent<SnippetProps> = (props: SnippetProps) => {
    if (props.fragmentFieldReferenceNames.length > 0) {
        return (
            <div className="work-item-highlighted-text">
                {
                    props.fragmentFieldReferenceNames.map((refName, index) => {
                        let fieldNameToLower = props.fragments[refName].fieldName
                            ? props.fragments[refName].fieldName.toLowerCase()
                            : props.fragments[refName].fieldName,
                            displayName: string = ResultsViewConstants.FieldNameToDisplayName[fieldNameToLower];

                        displayName = displayName ? displayName : props.fragments[refName].fieldName;
                        return (
                            <span key={index}>
                                <span className="workitem-snippet-prop-label">{displayName}</span>
                                : <span dangerouslySetInnerHTML={{
                                    __html: props.fragments[refName].highlights.map((v, idx) => {
                                        return sanitizeHtml(v);
                                    }).join("... ") + (index < props.fragmentFieldReferenceNames.length - 1 ? "..." : "")
                                }}
                                    style={{
                                        whiteSpace: "normal"
                                    }} />
                            </span>
                        )
                    })
                }
            </div>);
    }
    else {
        return <div />;
    }
}