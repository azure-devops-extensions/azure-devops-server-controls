import * as React from "react";

export interface Props {
    text: string;
    imageUrl: string;
    imageAltText?: string;
}

export const PageError: React.StatelessComponent<Props> =
    (props: Props) => {
        return (
            <div className="page-error">
                <div>
                    <img src={props.imageUrl} alt={props.imageAltText}/>
                </div>
                <div className="page-error-message">
                    <span>{props.text}</span>
                </div>
            </div>
        );
};
