import * as React from "react";
import { IconButton } from "OfficeFabric/Button"
import { IconFontSizes } from "OfficeFabric/Styling"
import { css } from "OfficeFabric/Utilities"
import * as AgileResources from "Agile/Scripts/Resources/TFS.Resources.Agile"

import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/RightPaneHeader/RightPaneHeader";

export interface IRightPaneHeaderProps {
    title: string;
    description?: string;
    onDismissClicked: () => void;
    className?: string;
}

export class RightPaneHeader extends React.PureComponent<IRightPaneHeaderProps> {
    public render(): JSX.Element {
        return (
            <div className="right-pane-container">
                <div className={css("right-pane-header", this.props.className)}>
                    <div className="right-pane-header-title-row">
                        <h3 className="right-pane-header-title">
                            {this.props.title}
                        </h3>
                        <IconButton
                            styles={{
                                root: {
                                    fontSize: IconFontSizes.large
                                }
                            }}
                            className={"right-pane-header-close-button"}
                            onClick={this.props.onDismissClicked}
                            ariaLabel={AgileResources.Close}
                            iconProps={{ iconName: 'Cancel' }}
                        />
                    </div>
                    {this.props.description &&
                        <div className="right-pane-header-description">
                            {this.props.description}
                        </div>
                    }
                </div>
                <div className="right-pane-content-scroll-container">
                    {this.props.children}
                </div>
            </div>
        );
    }
}