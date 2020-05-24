import * as React from "react";

export interface GroupHeaderProps {
    groupName: string;
    countText: string;
    groupHeaderRef?: (ref: HTMLDivElement | null) => void;
}

export class GroupHeader extends React.Component<GroupHeaderProps, {}> {

    public render(): JSX.Element {
        return (
            <div ref={this.props.groupHeaderRef} className={"group-header"}>
                <span className={"header-primary-text"}>
                    {this.props.groupName}
                </span>
                <span className={"header-secondary-text"}>
                    {this.props.countText}
                </span>
            </div>
        );
    }
}
