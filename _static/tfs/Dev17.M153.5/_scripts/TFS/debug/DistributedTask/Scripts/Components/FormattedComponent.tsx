import React = require("react");

export interface FormattedComponentProps extends React.HTMLProps<HTMLElement> {
    // Format string. Format items like {0}, {1}, etc. will be replaced by child components
    format: string;

    // Type of HTML element to create. Defaults to <span>
    elementType?: string;
}

/**
 * component for using tokenized localized resources with component replacements
 * @param format formatting string with numbered replacement tokens of the form {N} where N
                 is the zero-based index of the argument to use
 * @param children arguments used for the token replacement
 */
export const FormattedComponent: React.StatelessComponent<FormattedComponentProps> =
    (props: FormattedComponentProps): JSX.Element => {
        // destructure props object
        const {
            format,
            elementType,
            children,
            ...htmlProps
        } = props;

        if (!format) {
            return null;
        }

        // This splits the format string into a sequence of [string,item#,string,item#,string]
        // For example, if format is "a {0} b {2} c {1} d", the split output will be ["a ", "0", " b ", "2", " c ", "1", " d"]

        const formatSegments = format.split(/(?:\{)([0-9]+)(?:\})/);
        const numSegments = formatSegments.length;

        let childrenIn: React.ReactChild[] = React.Children.toArray(children);

        let childrenOut: React.ReactNode[] = [];

        for (let segmentIndex = 0; segmentIndex < numSegments; ++segmentIndex) {

            const segment = formatSegments[segmentIndex];

            // Every other entry is either a format index or a string. The first and last are strings; odd entries will be indices.

            if (segmentIndex & 1) {
                // Formatting index

                const childIndex = parseInt(segment);

                childrenOut.push(childrenIn[childIndex])

                // Unlike string.format(), we don't let you use the same index more than once. If we let you use a format string
                // like "foo {0} bar {0} baz {0}...", the same child component instance would appear at multiple places in the DOM.
                // That would be bad.

                childrenIn[childIndex] = null;
            }
            else {
                // String

                childrenOut.push(segment);
            }
        }

        return React.createElement(
            elementType ? elementType : "span",
            htmlProps,
            childrenOut);
    }
