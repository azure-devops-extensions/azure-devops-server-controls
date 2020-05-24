import { IIconProps } from "OfficeFabric/Icon";
import { css } from "OfficeFabric/Utilities";
import { bowtieIcon } from "VersionControl/Scenarios/Shared/Constants";

export function getBowtieIconProps(className: string): IIconProps {
    const iconProps: IIconProps = {
        className: css(bowtieIcon, className)
    } as IIconProps;

    return iconProps;
}