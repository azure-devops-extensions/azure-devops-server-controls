// css
import "VSS/LoaderPlugins/Css!Policy/Scenarios/Shared/PathFilter";
// libs
import * as React from "react";
import { autobind, css, getId } from "OfficeFabric/Utilities";

// controls
import { Callout } from "OfficeFabric/Callout";
import { Icon } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { TextField, ITextFieldProps } from "OfficeFabric/TextField";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";

// scenario
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface PathFilterProps extends React.HTMLProps<HTMLDivElement> {
    readonlyMode?: boolean;
    filenamePatterns: string[];
    onChanged?: (newValue: string[]) => void;
}

export interface PathFilterState {
    // User can click to bring up a help box for settting file paths
    isPathsHelpCalloutVisible?: boolean;

    // We fill in paths text field, but don't want to clobber user input while the control is focused
    pathTextFieldHasFocus?: boolean;
}

export class PathFilter extends React.Component<PathFilterProps, PathFilterState> {

    private _calloutTarget: HTMLElement;

    public static readonly DefaultPathsMaxLength: number = 30000;

    constructor(props: PathFilterProps) {
        super(props);

        this.state = {
            isPathsHelpCalloutVisible: false,
            pathTextFieldHasFocus: false,
        };
    }

    public render(): JSX.Element {
        const {
            readonlyMode,
            filenamePatterns,
        } = this.props;

        const {
            isPathsHelpCalloutVisible,
            pathTextFieldHasFocus,
        } = this.state;

        let paths: string;

        if (filenamePatterns && filenamePatterns.length > 0) {
            paths = filenamePatterns.join(";");
        }
        else {
            paths = "";
        }

        const textFieldId = getId("pathFilterTextField");

        // These let the user edit an existing policy with a string which is too long, but not create a new one.
        // If they edit a value which is too long, they can't make it longer but they can make it shorter.

        const pathsMaxLength: number =
            Math.max(paths.length, PathFilter.DefaultPathsMaxLength);

        return <div className={this.props.className}>

            <Label htmlFor={textFieldId}>
                <span>{Resources.PathFilterOptional}</span>
                <TooltipHost
                    hostClassName="pathFilter-info-tooltip-host"
                    calloutProps={{ gapSpace: 4 }}
                    tooltipProps={{
                        onRenderContent: this._renderTooltipContent,
                        className: "paths-help-callout"
                    }}
                    directionalHint={DirectionalHint.topCenter}>
                    <Icon
                        ariaLabel={Resources.PathsHelpTextHeader}
                        role={"note"}
                        className={css("bowtie-icon", "bowtie-status-info-outline")}
                        tabIndex={0} />
                </TooltipHost>
            </Label>

            <TextField
                id={textFieldId}
                disabled={readonlyMode}
                /* This keeps us from clobbering the value while the user is actively typing */
                value={this.state.pathTextFieldHasFocus ? undefined : paths}
                className="paths-textField"
                onFocus={this._pathsOnFocusOnBlur}
                onBlur={this._pathsOnFocusOnBlur}
                placeholder={Resources.NoFilterSet}
                onChanged={this._textOnChanged}
                maxLength={pathsMaxLength} />
        </div>;
    }

    @autobind
    private _renderTooltipContent(): JSX.Element {
        return <div className="paths-help-container">
            <div>{Resources.PathsHelpTextHeader}</div>
            <ul className="paths-help-list">
                <li>{Resources.PathsHelpText1}<br />{Resources.PathsHelpText1ex}</li>
                <li>{Resources.PathsHelpText2}<br />{Resources.PathsHelpText2ex}</li>
                <li>{Resources.PathsHelpText3}<br />{Resources.PathsHelpText3ex}</li>
                <li>{Resources.PathsHelpText4}</li>
            </ul>
        </div>;
    }

    @autobind
    private _pathsOnFocusOnBlur(ev: React.FocusEvent<ITextFieldProps>): void {
        this.setState({
            pathTextFieldHasFocus: (ev.type === "focus")
        });
    }

    @autobind
    private _textOnChanged(newValue: string) {
        if (this.props.onChanged) {
            let filenamePatterns: string[];

            if (!newValue || !newValue.length) {
                filenamePatterns = undefined;
            }
            else {
                filenamePatterns = newValue
                    .split(";")
                    .filter(v => v && v.length > 0);
            }

            this.props.onChanged(filenamePatterns);
        }
    }

    @autobind
    private _togglePathsHelpVisible(ev: React.MouseEvent<HTMLButtonElement>): void {
        this.setState({ isPathsHelpCalloutVisible: !this.state.isPathsHelpCalloutVisible });
    }
}
