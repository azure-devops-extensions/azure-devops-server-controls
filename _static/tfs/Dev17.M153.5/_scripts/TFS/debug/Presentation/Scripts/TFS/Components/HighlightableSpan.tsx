import * as React from "react";

export interface HighlightableSpanProps {
    className?: string;
    text: string;
    highlight: string;
}

export const HighlightableSpan = (props: HighlightableSpanProps): JSX.Element => {
    if (!props.highlight) {
        return <span className={props.className}>{props.text}</span>;
    }

    return (
        <span className={props.className}>
            {getHighlightChildren(props)}
        </span>);
};

function getHighlightChildren({ text, highlight }: HighlightableSpanProps): React.ReactNode[] {
    const regularParts = text.toLocaleLowerCase().split(highlight.toLocaleLowerCase());

    const builder = createResultsBuilder(text, highlight.length);
    for (let index = 0; index < regularParts.length; index++) {
        if (index > 0) {
            builder.addMarker();
        }

        builder.addRegular(regularParts[index].length);
    }

    return builder.results;
}

function createResultsBuilder(text: string, highlightLength: number) {
    const results: React.ReactNode[] = [];
    let position = 0;

    function add(part: string, element?: JSX.Element) {
        results.push(element || part);
        position += part.length;
    }

    return {
        addRegular(partLength: number) {
            add(text.substr(position, partLength));
        },

        addMarker() {
            const part = text.substr(position, highlightLength);
            add(part, <mark key={position}>{part}</mark>);
        },

        results,
    };
}
