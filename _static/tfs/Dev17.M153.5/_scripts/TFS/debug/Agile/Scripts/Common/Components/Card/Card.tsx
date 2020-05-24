import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/Card/Card";

import * as React from "react";
import { css, getNativeProps, divProperties } from "OfficeFabric/Utilities";

export const Card: React.SFC<React.HTMLAttributes<HTMLDivElement>> = (props) => {
    const nativeProps = getNativeProps(props, divProperties);
    return (
        <div {...nativeProps} className={css("card", props.className)}>
            {props.children}
        </div>
    );
};