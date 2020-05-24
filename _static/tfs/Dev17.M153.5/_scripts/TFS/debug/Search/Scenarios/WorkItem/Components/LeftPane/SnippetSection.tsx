import * as React from "react";
import { ResultsViewConstants } from "Search/Scenarios/WorkItem/Constants";
import { Snippet } from "Search/Scenarios/WorkItem/Components/LeftPane/Snippet";
import { sanitizeHtml, getFieldValue } from "Search/Scenarios/WorkItem/Utils";
import { WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";
import { HighlightFragment } from "Search/Scenarios/WorkItem/Flux/Stores/SnippetFragmentCache";

import { domElem } from "VSS/Utils/UI";

export interface SnippetSectionProps {
    aggregatedHits: IDictionaryStringTo<HighlightFragment>;

    item: WorkItemResult;

    getFragments: (key: string) => IDictionaryStringTo<HighlightFragment>;

    setFragments: (key: string, value: IDictionaryStringTo<HighlightFragment>) => void;
}

export interface SnippetSectionState {
    availableWidth: number;
}

export class SnippetSection extends React.Component<SnippetSectionProps, SnippetSectionState> {
    private divRef: HTMLElement;

    constructor(props: SnippetSectionProps) {
        super(props);
        this.state = {
            availableWidth: null
        };
    }

    public render() {
        const item = this.props.item, workItemId = getFieldValue(item.fields, "system.id");
        let fragments: IDictionaryStringTo<HighlightFragment> = (this.props.getFragments && this.props.getFragments(workItemId));
        if (!fragments && this.state.availableWidth) {
            const $measureContainer = $(domElem("div", "work-item-highlighted-text"))
                .css({
                    "top": -5000,
                    "left": -5000,
                    "position": "absolute",
                    "width": this.state.availableWidth
                }).appendTo(document.body);
            let summaryTextWithinAvailableSpace = "";

            fragments = {};

            // construct summary div.
            for (let i in item.hits) {
                const hit = item.hits[i];
                summaryTextWithinAvailableSpace = "";
                fragments[hit.fieldReferenceName] ?
                    (fragments[hit.fieldReferenceName].highlights =
                        fragments[hit.fieldReferenceName].highlights.concat(hit.highlights)) :
                    (fragments[hit.fieldReferenceName] = {
                        "fieldName": hit.fieldName,
                        "highlights": hit.highlights
                    });

                for (let key in fragments) {
                    if (ResultsViewConstants.MetadataFields.indexOf(key.toLowerCase()) < 0) {
                        const fieldNameToLower = fragments[key].fieldName ? fragments[key].fieldName.toLowerCase() : fragments[key].fieldName;
                        let displayName: string = ResultsViewConstants.FieldNameToDisplayName[fieldNameToLower];

                        displayName = displayName ? displayName : fragments[key].fieldName;

                        summaryTextWithinAvailableSpace += "<span style=\"color: #999999\">{0}</span>: {1}"
                            .replace("{0}", displayName)
                            .replace("{1}", fragments[key].highlights.map((value, index) => {
                                return sanitizeHtml(value);
                            }).join("... "));
                        summaryTextWithinAvailableSpace += "... ";
                    }
                }

                summaryTextWithinAvailableSpace = summaryTextWithinAvailableSpace.substr(0, summaryTextWithinAvailableSpace.length - 4);
                $measureContainer.html(summaryTextWithinAvailableSpace);
                const height = $measureContainer.height();
                $measureContainer.empty();

                // available space exhausted. Not able to accomodate further more snippets so bail out.
                if (height > 32) {
                    break;
                }
            }

            $measureContainer.remove();

            // all highest ranked fragments are accomodated within the available real estate. Append the fragments for properties which haven't occurred even once in the summary yet.
            // So that on expanding the middle pane they will show up on their own. 
            // It is better to accomodate as much snippets as possible once user starts resizing the available width rather than showing just the one created earlier, 
            // even though there is more space to draw more.
            for (let fieldRerenceName in this.props.aggregatedHits) {
                // if the fieldName is not in metadata already shown, and the the fieldName is not the part of summary text yet.
                if (ResultsViewConstants.MetadataFields.indexOf(fieldRerenceName.toLowerCase()) < 0 && !fragments[fieldRerenceName]) {
                    fragments[fieldRerenceName] = this.props.aggregatedHits[fieldRerenceName];
                }
            }

            // set the cache for future use.
            this.props.setFragments && this.props.setFragments(workItemId, fragments);
        }

        // Fragments would be null after initial render.
        fragments = fragments || {};

        // filter out only those fields which are not there in metada data section.
        const fragmentFieldReferenceNames = Object.keys(fragments).filter((k, j) => {
            return ResultsViewConstants.MetadataFields.indexOf(k.toLowerCase()) < 0;
        });

        return (
            <div ref={(htmlElementRef) => {
                this.divRef = htmlElementRef;
            }}>
                <Snippet
                    fragmentFieldReferenceNames={fragmentFieldReferenceNames}
                    fragments={fragments} />
            </div>);
    }

    public componentDidMount() {
        const availableWidth = this.divRef ? this.divRef.clientWidth : 0;
        this.setState({
            availableWidth: availableWidth
        });
    }
}