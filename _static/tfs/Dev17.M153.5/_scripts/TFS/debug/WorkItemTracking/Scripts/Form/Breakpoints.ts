import { IBreakPoint } from "VSSUI/ResponsiveViewport";

const LargeWidth = 1400;
const MediumWidth = 1050;
const SmallWidth = 800;

export const Large: IBreakPoint = {
    minWidth: MediumWidth,
    className: "large"
};

export const Medium: IBreakPoint = {
    maxWidth: MediumWidth,
    minWidth: SmallWidth,
    className: "medium"
};

export const Small: IBreakPoint = {
    maxWidth: SmallWidth,
    className: "small"
};

export const WorkItemFormBreakpoints: ReadonlyArray<IBreakPoint> = [
    Large,
    Medium,
    Small
];
