import * as React from "react";

export interface IDropdownListItemProps extends React.ClassAttributes<any> {
    /**
     * bowtie-icon to display in list (ex. "bowtie-record")
     */
    icon?: string;

    /**
     * Text to display for row
     */
    text: string;

    /**
     * Hover tooltip
     */
    title?: string;

    /**
     * Callback executed on click.
     */
    onClick?(): void;

    /**
     * Is this row disabled.
     */
    isDisabled?: boolean;
}

/**
 * A component to render a row inside of a SimpleDropdownList component.
 */
export const DropdownListItem = (props: IDropdownListItemProps): JSX.Element => {
    return (
        <li className="dropdown-row" onClick={props.onClick} title={props.title}>
            { props.icon ? <span className={"bowtie-icon " + props.icon}/> : null }
            <span> {props.text} </span>
        </li >
    );
}
