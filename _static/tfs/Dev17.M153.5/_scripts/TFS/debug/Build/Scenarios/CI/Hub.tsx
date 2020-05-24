import * as React from "react";
import * as ReactDOM from "react-dom";
import { CIViewContent } from "Build/Scenarios/CI/View";

import { VSS } from "VSS/SDK/Shim";

import "VSS/LoaderPlugins/Css!CIStyles";

VSS.register("build.CIHub", (context) => {
    ReactDOM.render(<CIViewContent />, context.$container[0]);
});