/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");
import Ajax = require("Presentation/Scripts/TFS/SPS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");

// VSS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("SPS.Users", exports);
