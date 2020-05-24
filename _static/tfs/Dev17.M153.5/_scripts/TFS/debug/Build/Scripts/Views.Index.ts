import {BuildView2} from "Build/Scripts/Views";

import {TfsContext} from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Controls from "VSS/Controls";
import * as VSS from "VSS/VSS";

VSS.classExtend(BuildView2, TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(BuildView2, ".buildvnext-view");