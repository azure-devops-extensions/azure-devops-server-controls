/// <reference types="jquery" />

import { 
    Constants as MentionConstants, 
    ArtifactMentionParser, 
    ArtifactMentionParserTextResult
} from "Mention/Scripts/TFS.Mention";

/**
 * This parser is used to scan string/html content for anything that looks like a PR mention
 * The results will then be passed to rendering so that content that looks like !123 will instead
 * rendering as a PR mention link
 */
export class PullRequestMentionParser extends ArtifactMentionParser {

    /**
     * used to scan text content (such as discussions) for pull request mentions
     */
    public parseFromText(text: string): ArtifactMentionParserTextResult[] {
        let artifacts:ArtifactMentionParserTextResult[] = [];
        let pattern = new RegExp(`(${MentionConstants.PATTERN_WORD_START_SEPARATOR})!([0-9]{1,10})(?=(${MentionConstants.PATTERN_WORD_END_SEPARATOR}))`, "ig");
        let match;
        while (match = pattern.exec(text)) {
            let start = match.index;
            let end = pattern.lastIndex;
            let startBoundary = match[1];
            if (startBoundary && startBoundary.length) {
                // move the start back if a boundary character was captured
                start += startBoundary.length;
            }
            artifacts.push({
                index: {
                    start: start,
                    end: end,
                },
                id: match[2]
            });
        }
        return artifacts;
    }

    public getArtifactType(): string {
        return "PullRequest";
    }
}

export function createParser(): PullRequestMentionParser {
    return new PullRequestMentionParser();
}