sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend(
    "br.com.fortlev.cadmaterial.cadmaterial.controller.Principal",
    {
      onInit: function (oEvent) {},

      openInterno: function (oEvent) {
        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        oRouter.navTo("interno");
      },

      openRevenda: function (oEvent) {},
    }
  );
});
