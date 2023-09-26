sap.ui.define(
  [
    "jquery.sap.global",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/History",
    "sap/ui/export/library",
    "sap/ui/export/Spreadsheet",
    "sap/ui/table/RowAction",
    "sap/ui/table/RowActionItem",
  ],
  function (
    jQuery,
    Controller,
    JSONModel,
    MessageToast,
    Filter,
    Sorter,
    FilterOperator,
    History,
    exportLibrary,
    Spreadsheet,
    RowAction,
    RowActionItem
  ) {
    "use strict";

    return Controller.extend(
      "br.com.fortlev.cadmaterial.cadmaterial.controller.Interno",
      {
        _oResponsivePopover: null,
        onInit: function (oEvent) {
          this.mode = undefined;
          var oView = this.getView();

          //Controles
          var newModel1 = new JSONModel({
            visibleHeader: true,
            filtro: false,
          });
          oView.setModel(newModel1, "newModel");

          //Actions Navigation
          var oTable = this.byId("tabelaProc");
          var fnPress = this.onClick.bind(this);
          var oTemplate = new RowAction({
            items: [
              new RowActionItem({
                type: "Navigation",
                press: fnPress,
                visible: "{Available}",
              }),
            ],
          });
          oTable.setRowActionTemplate(oTemplate);
          oTable.setRowActionCount(1);
        },

        onClick: function (oEvent) {
          var oItem = oEvent.getSource();
          var oRouter = sap.ui.core.UIComponent.getRouterFor(this);

          console.log(oItem);
          oRouter.navTo("detalhes", {
            id: window.encodeURIComponent(
              oItem.getBindingContext().getPath().substr(1)
            ),
          });
        },

        novoCadastro: function (oEvent) {
          var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
          let oModel = this.getOwnerComponent().getModel("engenharia")
          oModel.setData({})
          oModel.refresh
          oRouter.navTo("cadastro");
        },

        filtrar: function (oEvent) {
          var oTable = this.byId("tabelaProc");

          var aColumns = oTable.getColumns();
          for (var i = 0; i < aColumns.length; i++) {
            oTable.filter(aColumns[i], null);
          }
        },

        atualizar: function (oEvent) {
          this.getView().getModel().refresh(true);
        },

        onNavBack: function () {
          /*
        var oHistory = History.getInstance();
        var sPrevHash = oHistory.getPreviousHash();

        if (sPrevHash !== undefined) {
          window.history.go(-1);
        } else {
          var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
          oRouter.navTo("");
        }*/
        },

        exportUI: function () {
          var aCols, oRowBinding, oSettings, oSheet, oTable;

          if (!this._oTable) {
            this._oTable = this.byId("tabelaProc");
          }

          oTable = this._oTable;
          oRowBinding = oTable.getBinding("rows");
          aCols = this.createColumnConfig();

          oSettings = {
            workbook: {
              columns: aCols,
              hierarchyLevel: "Level",
            },
            dataSource: oRowBinding,
            fileName: "export.xlsx",
          };

          oSheet = new Spreadsheet(oSettings);
          oSheet.build().finally(function () {
            oSheet.destroy();
          });
        },

        createColumnConfig: function () {
          var aCols = [];

          aCols.push({
            label: "ID",
            property: "IdProc",
          });

          aCols.push({
            label: "Usuario",
            property: "Usuario",
          });

          aCols.push({
            label: "Status",
            property: "Status",
          });

          aCols.push({
            label: "Data",
            property: "Datum",
          });

          aCols.push({
            label: "Timlo",
            property: "Hora",
          });

          aCols.push({
            label: "Denominação",
            property: "Maktx",
          });

          aCols.push({
            label: "Tipo de Material",
            property: "Mtart",
          });

          aCols.push({
            label: "UM Básica",
            property: "Meins",
          });

          aCols.push({
            label: "Peso Líquido",
            property: "Ntgew",
          });

          aCols.push({
            label: "Peso Bruto",
            property: "Brgew",
          });

          aCols.push({
            label: "Unidade de Peso",
            property: "Gewei",
          });

          aCols.push({
            label: "Volume",
            property: "Volum",
          });

          aCols.push({
            label: "UM Volume",
            property: "Voleh",
          });

          aCols.push({
            label: "NCM",
            property: "Steuc",
          });

          aCols.push({
            label: "Grupo de Mercadoria",
            property: "Matkl",
          });

          aCols.push({
            label: "Classe de Avaliação",
            property: "Bklas",
          });

          return aCols;
        },

        onBindingChange: function (oEvent) {
          this.getView()
            .byId("tabelaProc")
            .setVisibleRowCount(oEvent.getSource().getLength());
        },
      }
    );
  }
);
