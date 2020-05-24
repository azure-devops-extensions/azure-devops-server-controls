/// <reference types="react" />

import "VSS/LoaderPlugins/Css!MyExperiences/Scenarios/MyWork/Components/Pivot";

import * as React from "react";

import * as PivotComponent from "OfficeFabric/Pivot";
import { autobind } from "OfficeFabric/Utilities";

export interface IPivotProps {
    pivots: IPivotTabProps[];
    pivotOptions?: PivotComponent.IPivotProps;
}

export interface IPivotTabProps extends PivotComponent.IPivotItemProps {
    pivotContent: JSX.Element;
}

export class Pivot extends React.Component<IPivotProps> {
    private _refs: IDictionaryStringTo<HTMLDivElement> = {};

    public render(): JSX.Element {
        let pivotProps: PivotComponent.IPivotProps = {
            linkFormat: PivotComponent.PivotLinkFormat.links,
            linkSize: PivotComponent.PivotLinkSize.normal
        };

        pivotProps = $.extend(pivotProps, this.props.pivotOptions);

        return (
            <div className="pivot-component">
                <PivotComponent.Pivot {...pivotProps} >
                    {
                        this.props.pivots.map((pivotItemProps: IPivotTabProps) => {
                            return (
                                <PivotComponent.PivotItem
                                    linkText={pivotItemProps.linkText}
                                    itemKey={pivotItemProps.itemKey}
                                    key={pivotItemProps.itemKey}
                                    onRenderItemLink={this._onRenderItemLink}
                                >
                                    {pivotItemProps.pivotContent}
                                </PivotComponent.PivotItem>
                            );
                        })
                    }
                </PivotComponent.Pivot>
            </div>
        );
    }

    /**
     * Scroll the given pivot into visible area of the browser window
     * @param pivotKey The pivot key
     */
    public scrollIntoView(pivotKey: string) {
        const element = this._refs[pivotKey];
        if (element) {
            element.scrollIntoView(false);
        }
    }

    @autobind
    private _onRenderItemLink(link: PivotComponent.IPivotItemProps, defaultRender: (props: PivotComponent.IPivotItemProps) => JSX.Element): JSX.Element {
        return (
            <div ref={(element: HTMLDivElement) => this._storeRef(link.itemKey, element)}>
                {defaultRender(link)}
            </div>
        );
    }

    private _storeRef(key: string, element: HTMLDivElement): void {
        this._refs[key] = element;
    }
}
