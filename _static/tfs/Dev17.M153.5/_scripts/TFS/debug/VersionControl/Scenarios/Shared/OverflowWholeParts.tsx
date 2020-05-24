/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Flyout } from  "VersionControl/Scenarios/Shared/Flyout";

export interface OverflowWholePartsProps extends React.Props<OverflowWholeParts> {
}

export interface OverflowWholePartsState {
    partsWidth: number[];
    hiddenPartsCount: number;
}

function shallowEqualProps(first: OverflowWholePartsProps, second: OverflowWholePartsProps): boolean {
    return shallowEqualChildren(first.children, second.children);
}

function shallowEqualChildren(first: React.ReactNode, second: React.ReactNode): boolean {
    const firstFlatten = flattenChildren(first);
    const secondFlatten = flattenChildren(second);
    if (firstFlatten.length !== secondFlatten.length) {
        return false;
    }

    return firstFlatten.every((value, index) => value.key === secondFlatten[index].key);
}

function flattenChildren(children: React.ReactNode): JSX.Element[] {
    if (!children) {
        return [];
    }

    if (!Array.isArray(children)) {
        return [children as JSX.Element];
    }

    const array = children as JSX.Element[];
    return array
        .map(flattenChildren)
        .reduce((x, y) => x.concat(y), []);
}

/**
 * A component that displays children in available width, hiding parts entirely by the left.
 * Very aggresive refresh policy, it only renders again if children keys have changed.
 */
export class OverflowWholeParts extends React.Component<OverflowWholePartsProps, OverflowWholePartsState> {
    public state = {} as OverflowWholePartsState;

    public componentDidMount() {
        window.addEventListener("resize", this.refreshHiddenPartsCount);
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", this.refreshHiddenPartsCount);
    }

    public componentDidUpdate() {
        this.refreshHiddenPartsCount();
    }

    /**
     * Resets the parts folders for the new children.
     * It's aggresive, it only resets if children keys have changed.
     * @param nextProps Props for the next rendering.
     */
    public componentWillReceiveProps(nextProps: OverflowWholePartsProps): void {
        if (!shallowEqualProps(this.props, nextProps)) {
            this.setState({
                partsWidth: null,
                hiddenPartsCount: 0,
            } as OverflowWholePartsState);
        }
    }

    /**
     * Decides whether a new rendering is required.
     * It's aggresive, if children keys have not changed, it doesn't update.
     * @param nextProps Props for the next rendering.
     * @param nextState State for the next rendering.
     */
    public shouldComponentUpdate(nextProps: OverflowWholePartsProps, nextState: OverflowWholePartsState): boolean {
        return !shallowEqualProps(this.props, nextProps)
            || this.state.hiddenPartsCount !== nextState.hiddenPartsCount;
    }

    public render(): JSX.Element {
        const children = flattenChildren(this.props.children);

        const overflowFolders =
            <div className="overflow-flyout-content">
                {children.slice(0, this.state.hiddenPartsCount).reverse()}
            </div>;

        return (
            <div className="justify-aligner" ref="outer">
                { this.state.hiddenPartsCount > 0 &&
                    <Flyout
                        className="part-ellipsis"
                        dropdownContent={overflowFolders}
                        isBeakVisible={false}>
                        <span className="bowtie-icon bowtie-ellipsis"></span>
                    </Flyout>
                }
                <div className="path-explorer-parts" ref="inner">
                    { children.slice(this.state.hiddenPartsCount)}
                </div>
            </div>
        );
    }

    private refreshHiddenPartsCount = (): void => {
        const outerComponent = this.refs["outer"] as React.Component<any, any>;
        const innerDiv = this.refs["inner"] as HTMLDivElement;
        const outerDiv = ReactDOM.findDOMNode(outerComponent) as HTMLDivElement;

        const partsWidth = this.state.partsWidth || this.calculatePartsWidth(innerDiv.children);

        const ellipsisButtonWidth = 30;
        const innerRightMargin = 20;
        let partIndex = partsWidth.length - 1;
        let innerWidth = ellipsisButtonWidth + partsWidth[partIndex] + innerRightMargin;
        while (partIndex > 0) {
            innerWidth += partsWidth[partIndex - 1];
            if (innerWidth > outerDiv.offsetWidth) {
                break;
            }

            partIndex--;
        }

        this.setState({
            partsWidth,
            hiddenPartsCount: partIndex,
        });
    }

    private calculatePartsWidth(parts: HTMLCollection): number[] {
        const partsWidth: number[] = [];
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i] as HTMLElement;
            partsWidth.push(part.offsetWidth);
        }

        return partsWidth;
    }
}
