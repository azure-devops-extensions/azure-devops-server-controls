import React = require("react");

export interface FormattedComponentProps extends React.HTMLProps<HTMLElement> {
    format: string;
    elementType?: string;  //defaults to span
}

/**
 * component for using tokenized localized resources with component replacements
 * @param format formatting string with numbered replacement tokens of the form {N} where N
                 is the zero-based index of the argument to use
 * @param children arguments used for the token replacement - all child elements must have a key specified
 */
export class FormattedComponent extends React.Component<FormattedComponentProps, {}> {
    public render(): JSX.Element {
        if (!this.props.format) {
            return null;
        }

        const formatSegments: string[] = this.props.format.split(/\{(?=[0-9]+\})/);
        const segments: any[] = [];

        //The first returned segment can't contain a marker.  It will be empty if format starts with a marker
        if (formatSegments[0].length) {
            segments.push(formatSegments[0]);
        }

        const childrenArray: any[] = React.Children.toArray(this.props.children);

        let index: number;
        const numSegments: number = formatSegments.length;
        for (index = 1; index < numSegments; ++index) {
            //all segments starting with 1 must start with a marker
            const argIndex: number = parseInt(formatSegments[index]);
            if (argIndex >= 0) {
                if (argIndex < childrenArray.length) {
                    segments.push(childrenArray[argIndex]);
                }
            }

            const markerClose: number = formatSegments[index].indexOf("}");
            const remainder: string = formatSegments[index].substr(markerClose + 1);
            if (remainder.length) {
                segments.push(remainder);
            }
        }

        const htmlProps = $.extend({}, this.props);
        delete htmlProps.format;
        delete htmlProps.elementType;
        delete htmlProps.children;

        return React.createElement(
            this.props.elementType ? this.props.elementType : "span",
            htmlProps,
            segments);
    }
}
