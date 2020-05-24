import React = require("react");

import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ExternalLink";

export interface IProps {
    className?: string;
    text: string;
    href: string;
    newTab?: boolean;
    onClick?: () => void;
}

const ExternalLinkPure = (props: IProps): JSX.Element => {
    return (
        <span className={props.className}>
            <SafeLink href={props.href} target={props.newTab ? "_blank" : "_self"} onClick={props.onClick}>
                {props.text}
                <span className="external-link-icon bowtie-icon bowtie-navigate-external" />
            </SafeLink>
        </span>);
};

export class ExternalLink extends React.Component<IProps, any> {
    public render(): JSX.Element {

        let { className } = this.props;

        return <ExternalLinkPure
            {...this.props}
            className={css("external-link", className)} />;
    }

    public shouldComponentUpdate(nextProps: IProps): boolean {
        return nextProps.text !== this.props.text
            || nextProps.href !== this.props.href
            || nextProps.className !== this.props.className;
    }
}