sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
  ],
  function (Controller, UIComponent, History, JSONModel, MessageBox) {
    "use strict";

    return Controller.extend(
      "br.com.fortlev.cadmaterial.cadmaterial.controller.Cadastro",
      {
        onInit: function (oEvent) {

          this._disableDateManualInput("grupoMercEngenharia");

          let oModel = this.getOwnerComponent().getModel("engenharia").setData({})
          var newModel1 = new JSONModel({
            conf: false,
            save: true,
            editable: true,
          });
          this.getView().setModel(newModel1, "newModel");

          this.getOwnerComponent()
            .getModel()
            .metadataLoaded()
            .then((event) => {
              let oCad = this.getOwnerComponent()
                .getModel()
                .createEntry("/MATPROCSet");

              this.getView().setModel(new JSONModel(oCad), "cad");
            });
        },
        onNavBack: function () {
          let oModel = this.getOwnerComponent().getModel("engenharia").setData({})
          var oView = this.getView();
          if (!oView.getModel("newModel").getProperty("/save")) {
            this.switchProp(true);
          } else {
            var oHistory = History.getInstance();
            var sPrevHash = oHistory.getPreviousHash();

            if (sPrevHash !== undefined) {
              window.history.go(-1);
            } else {
              var oRouter = UIComponent.getRouterFor(this);
              oRouter.navTo("interno");
            }
          }
        },

        savePress: function () {
          this.switchProp(false);
        },

        cancPress: function () {
          this.switchProp(true);
        },

        confPress: function () {
          var oView = this.getView();
          var oCad = oView.getModel("cad");
          var oData = {
            d: oView.getModel("cad").oData.getObject(),
          };
          var oRouter = UIComponent.getRouterFor(this);
          const that = this
          MessageBox.confirm("Deseja confirmar o envio da Solicitação?", {
            title: "Confirmação de Cadastro",
            onClose: function (oAction) {
              if (oAction == "OK") {
                delete oData.d.__metadata;

                //Binding
                oData.d.Maktx = oCad.getProperty("/Maktx");
                oData.d.Mtart = oCad.getProperty("/Mtart");
                oData.d.Meins = oCad.getProperty("/Meins");
                oData.d.Ntgew = oCad.getProperty("/Ntgew");
                oData.d.Brgew = oCad.getProperty("/Brgew");
                oData.d.Gewei = oCad.getProperty("/Gewei");
                oData.d.Volum = oCad.getProperty("/Volum");
                oData.d.Voleh = oCad.getProperty("/Voleh");
                oData.d.Steuc = oCad.getProperty("/Steuc");
                oData.d.Matkl = oCad.getProperty("/Matkl");
                oData.d.Bklas = oCad.getProperty("/Bklas");

                //Validate Eng fields
                let engenhariaData = that.getOwnerComponent().getModel("engenharia").getData()
                const response = that.validateMandatoryFields("Engenharia", engenhariaData)

                if (response.emptyFields) {
                  MessageBox.error(
                    response.message
                  );
                  return
                }

                //Create
                sap.ui.core.BusyIndicator.show(0);
                oView.getModel().create("/MATPROCSet", oData, {
                  success: async function (oData, response) {
                    //oData -  contains the data of the newly created entry
                    //response -  parameter contains information about the response of the request (this may be your message)
                    await that.createEngenharia(response.data.IdProc)
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.success("Solicitação registrada com sucesso!", {
                      onClose: function (oAction) {
                        var oHistory = History.getInstance();
                        var sPrevHash = oHistory.getPreviousHash();

                        if (sPrevHash !== undefined) {
                          window.history.go(-1);
                        } else {
                          oRouter.navTo("interno");
                        }
                      },
                    });
                  },

                  error: function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    //oError - contains additional error information.
                    MessageBox.error(
                      "Ocorreu um erro ao registrar a Solicitação. Tente novamente mais tarde!"
                    );
                  },
                });
              }
            },
          });
        },
        createEngenharia: async function (materialId) {
          let oModel = this.getOwnerComponent().getModel("engenharia").getData()
          oModel.IdProc = materialId
          const oService = this.getView().getModel()
          return new Promise(async (resolve, reject) => {
            oService.create("/Engenharia", oModel, {
              success: function (oModel, response) {
                sap.ui.core.BusyIndicator.hide();
                resolve("Engenharia criada")
              },

              error: function (oError) {
                sap.ui.core.BusyIndicator.hide();
                //oError - contains additional error information.
                reject("Error criando Engenharia")
              },
            });
          });
        },
        validateMandatoryFields: function (section, jsonData) {
          let response = {
            emptyFields: false,
            message: ""
          }
          let campoDict
          if (section === "Engenharia") {

            campoDict = {
              "Descricao": "Descrição Curta",
              "DescricaoLonga": "Descrição Detalhada",
              "UnidMedida": "Unidade de medida",
              "Matkl": "Grupo de mercadoria",
              "TipoMaterial": "Tipo do Material",
              "Aplicacao": "Aplicação (utilização)",
              "Cor": "Cor",
              "Fabricante": "Fabricante",
              "RefFabricante": "Referência Fabricante",
              "Altura": "Altura",
              "Largura": "Largura",
              "Comprimento": "Comprimento",
              "Espessura": "Espessura",
              "DiameterRadio": "Diâmetro/Raio",
              "Tensao": "Tensão",
              "Amperagem": "Amperagem",
            }

            const camposVacios = [];

            for (const campo in campoDict) {
              if (campoDict.hasOwnProperty(campo)) {
                if (!jsonData[campo] || jsonData[campo].trim() === "") {
                  camposVacios.push(campoDict[campo]);
                }
              }
            }

            if (camposVacios.length === 0) {
              response.message = "Todos los campos están completos"
              return response
            } else if (camposVacios.length === 1) {
              response.message = `O campo ${camposVacios[0]} é obrigatório.`;
              response.emptyFields = true
              return response
            } else {
              const ultimoCampo = camposVacios.pop();
              const camposVaciosString = camposVacios.join(", ");
              response.message = `Os campos ${camposVaciosString} e ${ultimoCampo} são obrigatórios`;
              response.emptyFields = true
              return response
            }
          }
        },
        _disableDateManualInput: function (sId) {
          let oDatePicker = this.getView().byId(sId);
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var oDateInner = this.$().find('.sapMInputBaseInner');
              var oID = oDateInner[0].id;
              $('#' + oID).attr("disabled", "disabled");
            }
          }, oDatePicker);
        },
        switchProp: function (bool) {
          var oView = this.getView();

          oView.getModel("newModel").setProperty("/save", bool);
          oView.getModel("newModel").setProperty("/conf", !bool);
          oView.getModel("newModel").setProperty("/editable", bool);
        },

      }
    );
  }
);
