import * as React from "react";

export interface TextWithAnchorsProps {
    /**
    * E.g. "Having problems authenticating in Git? Be sure to get the latest version of {} or our plugins for {}, {} or {}."
    *
    * "{}" will be replaced with anchors. 
    */
    templatizedText: string;
    anchors: IAnchor[];
    className?: string;
}

export interface IAnchor {
    text: string;
    link: string;
    onAnchorClick?(): void;
}

export const TextWithAnchors = (props: TextWithAnchorsProps): JSX.Element => {
    const parts: string[] = props.templatizedText.split("{}");
    const numParts = parts.length;
    const className: string = props.className ? props.className : "";
    return (
        <span className={className}>
            {
                parts.map((stringPart: string, index: number) => {
                    if (index === numParts - 1) {
                        return (
                            <span key={index}>{stringPart}</span>
                        );
                    } else {
                        const anchor: IAnchor = props.anchors[index];
                        return (
                            <TextFollowedByAnchor
                                text={stringPart}
                                anchor={anchor}
                                key={index}
                                />
                        );
                    }
                })
            }
        </span>
    );
}

interface TextFollowedByAnchorProps {
    text: string;
    anchor: IAnchor;
}

const TextFollowedByAnchor = (props: TextFollowedByAnchorProps): JSX.Element => {
    return (
        <span>
            <span>{props.text}</span>
            {   props.anchor.onAnchorClick
                ? <a href={props.anchor.link} onClick={props.anchor.onAnchorClick} target="_blank" rel="noopener noreferrer">{props.anchor.text}</a>
                : <a href={props.anchor.link} target="_blank" rel="noopener noreferrer">{props.anchor.text}</a>
            }
        </span>
    );
}